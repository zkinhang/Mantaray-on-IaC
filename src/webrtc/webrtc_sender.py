"""WebRTC sender using GStreamer webrtcbin."""

import argparse
import asyncio
import json
import logging
import threading
from typing import Optional

import websockets

try:
    import gi  # type: ignore
    gi.require_version("Gst", "1.0")
    gi.require_version("GstWebRTC", "1.0")
    from gi.repository import Gst, GstSdp, GstWebRTC, GLib  # type: ignore
except Exception as exc:  # pragma: no cover - runtime dependency
    raise SystemExit("GStreamer GI bindings not available: %s" % exc) from exc


class WebRTCSender:
    def __init__(self, args: argparse.Namespace) -> None:
        self.args = args
        self.ws: Optional[websockets.WebSocketClientProtocol] = None
        self.asyncio_loop: Optional[asyncio.AbstractEventLoop] = None

        Gst.init(None)
        self.pipeline = Gst.parse_launch(self._build_pipeline())
        self.webrtc = self.pipeline.get_by_name("webrtcbin")
        if not self.webrtc:
            raise RuntimeError("Failed to get webrtcbin from pipeline")

        self.webrtc.connect("on-ice-candidate", self._on_ice_candidate)
        self.webrtc.connect("pad-added", self._on_pad_added)

        self.mainloop = GLib.MainLoop()
        self.mainloop_thread = threading.Thread(target=self.mainloop.run, daemon=True)

    def _build_pipeline(self) -> str:
        caps = (
            f"video/x-raw,width={self.args.width},height={self.args.height},"
            f"framerate={self.args.fps}/1"
        )

        if self.args.encoder == "v4l2h264enc":
            enc = (
                f"v4l2h264enc extra-controls=controls,video_bitrate={self.args.bitrate * 1000} "
                "! video/x-h264,profile=baseline"
            )
            pay = "h264parse ! rtph264pay config-interval=1 pt=96"
            rtp_caps = "application/x-rtp,media=video,encoding-name=H264,payload=96"
        elif self.args.encoder == "x264enc":
            enc = (
                "x264enc tune=zerolatency speed-preset=ultrafast "
                f"bitrate={self.args.bitrate} key-int-max={self.args.key_int} "
                "! video/x-h264,profile=baseline"
            )
            pay = "h264parse ! rtph264pay config-interval=1 pt=96"
            rtp_caps = "application/x-rtp,media=video,encoding-name=H264,payload=96"
        elif self.args.encoder == "vp8enc":
            enc = (
                f"vp8enc deadline=1 target-bitrate={self.args.bitrate * 1000} "
                f"keyframe-max-dist={self.args.key_int}"
            )
            pay = "rtpvp8pay pt=96"
            rtp_caps = "application/x-rtp,media=video,encoding-name=VP8,payload=96"
        else:
            raise ValueError("Unsupported encoder: %s" % self.args.encoder)

        return (
            f"v4l2src device={self.args.device} ! {caps} ! videoconvert ! queue "
            f"! {enc} ! {pay} ! {rtp_caps} ! webrtcbin name=webrtcbin"
        )

    def start(self) -> None:
        self.pipeline.set_state(Gst.State.PLAYING)
        self.mainloop_thread.start()

    async def connect_signaling(self) -> None:
        self.asyncio_loop = asyncio.get_running_loop()
        async with websockets.connect(self.args.signaling) as ws:
            self.ws = ws
            logging.info("Connected signaling %s", self.args.signaling)
            async for message in ws:
                await self._handle_message(message)

    async def _handle_message(self, message: str) -> None:
        payload = json.loads(message)
        msg_type = payload.get("type")

        if msg_type == "offer":
            await self._handle_offer(payload.get("sdp", ""))
        elif msg_type == "ice":
            candidate = payload.get("candidate")
            if candidate:
                self.webrtc.emit("add-ice-candidate", candidate.get("sdpMLineIndex", 0), candidate.get("candidate", ""))

    async def _handle_offer(self, sdp: str) -> None:
        _res, sdp_msg = GstSdp.SDPMessage.new()
        GstSdp.SDPMessage.parse_buffer(sdp.encode(), sdp_msg)
        offer = GstWebRTC.WebRTCSessionDescription.new(GstWebRTC.WebRTCSDPType.OFFER, sdp_msg)

        self.webrtc.emit("set-remote-description", offer, None)

        promise = Gst.Promise.new_with_change_func(self._on_answer_created, None, None)
        self.webrtc.emit("create-answer", None, promise)

    def _on_answer_created(self, promise: Gst.Promise, _user_data, _unused) -> None:
        reply = promise.get_reply()
        answer = reply.get_value("answer")
        self.webrtc.emit("set-local-description", answer, None)

        sdp_text = answer.sdp.as_text()
        self._send_ws({"type": "answer", "sdp": sdp_text})

    def _on_ice_candidate(self, _webrtc, mlineindex, candidate) -> None:
        self._send_ws({
            "type": "ice",
            "candidate": {
                "candidate": candidate,
                "sdpMLineIndex": int(mlineindex),
            },
        })

    def _on_pad_added(self, _webrtc, _pad) -> None:
        # Sendonly pipeline; no need to link pads.
        return

    def _send_ws(self, message: dict) -> None:
        if not self.ws or not self.asyncio_loop:
            return
        data = json.dumps(message)
        asyncio.run_coroutine_threadsafe(self.ws.send(data), self.asyncio_loop)


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="GStreamer WebRTC sender")
    parser.add_argument("--device", default="/dev/video0")
    parser.add_argument("--signaling", default="ws://127.0.0.1:9000?stream=rov")
    parser.add_argument("--encoder", default="v4l2h264enc", choices=["v4l2h264enc", "x264enc", "vp8enc"])
    parser.add_argument("--width", type=int, default=1280)
    parser.add_argument("--height", type=int, default=720)
    parser.add_argument("--fps", type=int, default=30)
    parser.add_argument("--bitrate", type=int, default=2000, help="kbit/s for H.264 or target-bitrate for VP8")
    parser.add_argument("--key-int", type=int, default=30)
    return parser.parse_args()


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="[webrtc] %(message)s")
    args = _parse_args()
    sender = WebRTCSender(args)
    sender.start()
    asyncio.run(sender.connect_signaling())


if __name__ == "__main__":
    main()
