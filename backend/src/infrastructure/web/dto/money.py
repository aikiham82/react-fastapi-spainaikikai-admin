"""Money as it may enter the API: never negative, and small enough that its sums stay finite."""

from typing import Annotated

from pydantic import Field

MAX_MONEY = 1_000_000

Money = Annotated[float, Field(allow_inf_nan=False, ge=0, le=MAX_MONEY)]
