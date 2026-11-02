"""In-memory request limits for public endpoints. The API runs one uvicorn process."""

import ipaddress
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
        recent = self._recent(client, now)
        allowed = len(recent) < self.max_requests
        if allowed:
            recent.append(now)
        if client not in self._hits and len(self._hits) >= self.max_clients:
            self._forget_idle_clients(now)
        self._hits[client] = recent
        return allowed

    def _recent(self, client: str, now: float) -> List[float]:
        return [hit for hit in self._hits.get(client, []) if now - hit < self.window_seconds]

    def _forget_idle_clients(self, now: float) -> None:
        self._hits = {client: hits for client in self._hits if (hits := self._recent(client, now))}
        if len(self._hits) >= self.max_clients:
            self._hits.clear()


def _network_of(address: str) -> str:
    try:
        ip = ipaddress.ip_address(address)
    except ValueError:
        return address
    return str(ipaddress.ip_network(f"{ip}/64", strict=False)) if ip.version == 6 else str(ip)


def client_ip(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for", "")
    if forwarded_for:
        return _network_of(forwarded_for.split(",")[-1].strip())
    return _network_of(request.client.host) if request.client else "unknown"
