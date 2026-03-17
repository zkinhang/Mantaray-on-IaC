"""Minimal WebRTC camera streamer for standalone testing."""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
from fractions import Fraction
from typing import Any

import cv2
from aiohttp import web
from aiortc import RTCPeerConnection, RTCSessionDescription
from aiortc.mediastreams import MediaStreamError, MediaStreamTrack
from av import VideoFrame


LOGGER = logging.getLogger("webrtc_streamer")


def parse_device(device: str) -> int | str:
    try:
        return int(device)
    except ValueError:
        return device


class CameraSource:
    def __init__(self, device: int | str, width: int = 1280, height: int = 960, fps: int = 60) -> None:
        self.device = device
        self.width = width
        self.height = height
        self.fps = fps
        self._capture = cv2.VideoCapture(device)
        self._capture.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        self._capture.set(cv2.CAP_PROP_FRAME_WIDTH, width)
        self._capture.set(cv2.CAP_PROP_FRAME_HEIGHT, height)
        self._capture.set(cv2.CAP_PROP_FPS, fps)
        self._capture.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc(*"MJPG"))
        self._lock = asyncio.Lock()

        if not self._capture.isOpened():
            raise RuntimeError(f"Could not open camera device: {device}")

    async def read(self) -> Any:
        async with self._lock:
            ok, frame = await asyncio.to_thread(self._capture.read)
        if not ok:
            raise MediaStreamError
        return frame

    async def close(self) -> None:
        async with self._lock:
            await asyncio.to_thread(self._capture.release)


class CameraVideoTrack(MediaStreamTrack):
    kind = "video"

    def __init__(self, source: CameraSource) -> None:
        super().__init__()
        self.source = source
        self._frame_index = 0
        self._time_base = Fraction(1, source.fps)

    async def recv(self) -> VideoFrame:
        frame = await self.source.read()
        video_frame = VideoFrame.from_ndarray(frame, format="bgr24")
        video_frame.pts = self._frame_index
        video_frame.time_base = self._time_base
        self._frame_index += 1
        return video_frame


def cors_headers() -> dict[str, str]:
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
    }


async def options_handler(_: web.Request) -> web.Response:
    return web.Response(status=204, headers=cors_headers())


async def offer_handler(request: web.Request) -> web.Response:
    app = request.app
    params = await request.json()
    LOGGER.info("Received SDP offer")

    peer_connection = RTCPeerConnection()
    app["peer_connections"].add(peer_connection)

    @peer_connection.on("connectionstatechange")
    async def on_connectionstatechange() -> None:
        LOGGER.info("Peer connection state changed to %s", peer_connection.connectionState)
        if peer_connection.connectionState in {"failed", "closed", "disconnected"}:
            await peer_connection.close()
            app["peer_connections"].discard(peer_connection)

    offer = RTCSessionDescription(sdp=params["sdp"], type=params["type"])
    await peer_connection.setRemoteDescription(offer)
    peer_connection.addTrack(CameraVideoTrack(app["camera_source"]))

    answer = await peer_connection.createAnswer()
    await peer_connection.setLocalDescription(answer)

    payload = {
        "sdp": peer_connection.localDescription.sdp,
        "type": peer_connection.localDescription.type,
    }
    return web.Response(
        text=json.dumps(payload),
        content_type="application/json",
        headers=cors_headers(),
    )


async def health_handler(request: web.Request) -> web.Response:
    payload = {
        "status": "ok",
        "device": str(request.app["camera_source"].device),
        "peers": len(request.app["peer_connections"]),
    }
    return web.Response(
        text=json.dumps(payload),
        content_type="application/json",
        headers={"Access-Control-Allow-Origin": "*"},
    )


async def on_shutdown(app: web.Application) -> None:
    for peer_connection in list(app["peer_connections"]):
        await peer_connection.close()
    app["peer_connections"].clear()
    await app["camera_source"].close()


def build_app(device: int | str) -> web.Application:
    app = web.Application()
    app["camera_source"] = CameraSource(device)
    app["peer_connections"] = set()
    app.router.add_route("OPTIONS", "/offer", options_handler)
    app.router.add_post("/offer", offer_handler)
    app.router.add_get("/health", health_handler)
    app.on_shutdown.append(on_shutdown)
    return app


def main() -> None:
    parser = argparse.ArgumentParser(description="Standalone WebRTC camera streamer")
    parser.add_argument("--device", default="0", help="Camera device index or path, for example 0 or /dev/video0")
    parser.add_argument("--port", type=int, default=8080, help="HTTP port for signaling")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")

    app = build_app(parse_device(args.device))
    LOGGER.info("Starting WebRTC streamer on 0.0.0.0:%s using device %s", args.port, args.device)
    web.run_app(app, host="0.0.0.0", port=args.port)


if __name__ == "__main__":
    main()