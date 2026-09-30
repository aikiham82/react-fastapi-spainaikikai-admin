from datetime import datetime

import pytest

from src.infrastructure.scheduler.notification_scheduler import NotificationScheduler

pytestmark = pytest.mark.unit


@pytest.mark.parametrize(
    "now, expected",
    [
        (datetime(2026, 9, 10, 7, 0), datetime(2026, 9, 10, 8, 0)),
        (datetime(2026, 9, 10, 9, 0), datetime(2026, 9, 11, 8, 0)),
        (datetime(2026, 9, 30, 8, 0), datetime(2026, 10, 1, 8, 0)),
        (datetime(2026, 2, 28, 12, 0), datetime(2026, 3, 1, 8, 0)),
        (datetime(2026, 12, 31, 23, 59), datetime(2027, 1, 1, 8, 0)),
    ],
)
def test_next_run_rolls_over_month_and_year_ends(now, expected):
    scheduler = NotificationScheduler(notification_use_case=None)

    assert scheduler._next_run(now) == expected
