"""A datetime a request may send with a timezone, stored the naive UTC way MongoDB expects."""

from datetime import datetime, timezone
from typing import Annotated

from pydantic import AfterValidator


def as_naive_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value
    return value.astimezone(timezone.utc).replace(tzinfo=None)


NaiveDatetime = Annotated[datetime, AfterValidator(as_naive_utc)]
