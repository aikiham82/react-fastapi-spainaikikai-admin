"""Tests for setting a club logo."""

import pytest
from unittest.mock import AsyncMock, MagicMock

from src.domain.entities.club import Club
from src.domain.exceptions.club import ClubNotFoundError
from src.application.use_cases.club.set_club_logo_use_case import SetClubLogoUseCase


def clubs_holding(club):
    clubs = MagicMock()
    clubs.find_by_id = AsyncMock(return_value=club)
    clubs.update = AsyncMock(side_effect=lambda c: c)
    return clubs


@pytest.mark.unit
@pytest.mark.asyncio
async def test_stores_the_logo_url_on_the_club():
    clubs = clubs_holding(Club(id="club-1", name="Dojo Ejemplo"))

    club = await SetClubLogoUseCase(clubs).execute("club-1", "/uploads/clubs/club-1.jpg?v=1")

    assert club.logo_url == "/uploads/clubs/club-1.jpg?v=1"
    clubs.update.assert_awaited_once()


@pytest.mark.unit
@pytest.mark.asyncio
async def test_an_unknown_club_is_not_found():
    clubs = clubs_holding(None)

    with pytest.raises(ClubNotFoundError):
        await SetClubLogoUseCase(clubs).execute("club-1", "/uploads/clubs/club-1.jpg?v=1")
    clubs.update.assert_not_called()
