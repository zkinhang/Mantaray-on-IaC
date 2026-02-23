"""Minimal WebRTC signaling server for per-stream rooms."""

import asyncio
import logging
from typing import Dict, Set
from urllib.parse import parse_qs, urlparse

import websockets

STREAM_CLIENTS: Dict[str, Set[websockets.WebSocketServerProtocol]] = {}


def _get_stream_id(path: str) -> str:
    query = parse_qs(urlparse(path).query)
    return query.get("stream", ["default"])[0]


async def _handler(ws: websockets.WebSocketServerProtocol) -> None:
    stream_id = _get_stream_id(ws.path)
    clients = STREAM_CLIENTS.setdefault(stream_id, set())
    clients.add(ws)
    logging.info("Client connected stream=%s total=%d", stream_id, len(clients))

    try:
        async for message in ws:
            for peer in list(clients):
                if peer is not ws:
                    await peer.send(message)
    except websockets.ConnectionClosed:
        pass
    finally:
        clients.discard(ws)
        if not clients:
            STREAM_CLIENTS.pop(stream_id, None)
        logging.info("Client disconnected stream=%s remaining=%d", stream_id, len(clients))


async def _main() -> None:
    logging.basicConfig(level=logging.INFO, format="[signaling] %(message)s")
    async with websockets.serve(_handler, "0.0.0.0", 9000, ping_interval=20, ping_timeout=20):
        logging.info("Listening on ws://0.0.0.0:9000")
        await asyncio.Future()


if __name__ == "__main__":
    asyncio.run(_main())
