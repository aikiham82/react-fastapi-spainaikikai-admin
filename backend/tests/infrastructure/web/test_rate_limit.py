"""A public endpoint limits how often one client can make it work."""

from types import SimpleNamespace

import pytest

from src.infrastructure.web.rate_limit import SlidingWindowLimiter, client_ip

pytestmark = pytest.mark.unit


class Clock:
    def __init__(self):
        self.now = 1000.0

    def __call__(self):
        return self.now


def test_a_client_is_refused_over_the_limit_and_allowed_again_later():
    clock = Clock()
    limiter = SlidingWindowLimiter(max_requests=2, window_seconds=60, clock=clock)

    assert [limiter.allow("a"), limiter.allow("a"), limiter.allow("a")] == [True, True, False]

    clock.now += 61

    assert limiter.allow("a") is True


def test_each_client_has_its_own_limit():
    limiter = SlidingWindowLimiter(max_requests=1, window_seconds=60, clock=Clock())

    assert [limiter.allow("a"), limiter.allow("b")] == [True, True]


def test_it_forgets_clients_rather_than_growing_without_end():
    limiter = SlidingWindowLimiter(max_requests=1, window_seconds=60, clock=Clock(), max_clients=2)

    for client in ("a", "b", "c"):
        limiter.allow(client)

    assert len(limiter._hits) <= 2


def test_a_blocked_client_stays_blocked_when_idle_clients_are_forgotten():
    clock = Clock()
    limiter = SlidingWindowLimiter(max_requests=1, window_seconds=60, clock=clock, max_clients=2)
    limiter.allow("idle")
    clock.now += 61
    limiter.allow("blocked")

    limiter.allow("new")

    assert limiter.allow("blocked") is False


def test_addresses_of_one_ipv6_network_share_a_limit():
    first = client_ip(request_from("2001:db8:1:2::a"))
    second = client_ip(request_from("2001:db8:1:2::b"))

    assert first == second


def request_from(forwarded_for=None, host="10.0.0.5"):
    headers = {"x-forwarded-for": forwarded_for} if forwarded_for else {}
    return SimpleNamespace(headers=headers, client=SimpleNamespace(host=host))


def test_the_client_is_the_address_the_proxy_added_not_one_the_caller_sent():
    assert client_ip(request_from("1.1.1.1, 203.0.113.9")) == "203.0.113.9"


def test_without_a_proxy_the_client_is_the_connection():
    assert client_ip(request_from()) == "10.0.0.5"
