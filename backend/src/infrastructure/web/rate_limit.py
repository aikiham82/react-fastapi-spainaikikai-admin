"""In-memory request limits for public endpoints. The API runs one uvicorn process."""

import time
from typing import Callable, Dict, List

from fastapi import Request


class SlidingWindowLimiter:
    def __init__(
        self,
        max_requests: int,
        window_seconds: float,
        clock: Callable[[], float] = time.monotonic,
        max_clients: int = 10_000,
    ):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.clock = clock
        self.max_clients = max_clients
        self._hits: Dict[str, List[float]] = {}

    def allow(self, client: str) -> bool:
        now = self.clock()
        recent = [hit for hit in self._hits.get(client, []) if now - hit < self.window_seconds]
        allowed = len(recent) < self.max_requests
        if allowed:
            recent.append(now)
        if client not in self._hits and len(self._hits) >= self.max_clients:
            self._hits.clear()
        self._hits[client] = recent
        return allowed


def client_ip(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for", "")
    if forwarded_for:
        return forwarded_for.split(",")[-1].strip()
    return request.client.host if request.client else "unknown"
