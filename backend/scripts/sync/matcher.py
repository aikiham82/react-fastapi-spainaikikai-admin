"""Match Excel member rows against production members."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from .excel_loader import ExcelMemberRow
from .normalizers import fuzzy_norm, norm_dni


def _consonant_skeleton(s: str) -> str:
    """Reduce a fuzzy-normalized name to its consonant skeleton.

    Handles corrupt accents in prod data where accented vowels were
    dropped entirely (e.g. "Martnez" vs "MARTÍNEZ"): both collapse
    to "MRTNZ" and can be matched.
    """
    return "".join(c for c in s if c not in "AEIOU ")


@dataclass
class MatchResult:
    method: str  # "dni" | "name+club" | "new" | "skip"
    prod_id: str | None
    reason: str = ""


class Matcher:
    def __init__(self, prod_members: list[dict[str, Any]]) -> None:
        self._prod = prod_members
        self._by_dni: dict[str, dict[str, Any]] = {}
        self._by_name_club: dict[tuple[str, str], dict[str, Any]] = {}
        self._by_skeleton_club: dict[tuple[str, str], dict[str, Any]] = {}
        for m in prod_members:
            d = norm_dni(m.get("dni"))
            if d:
                self._by_dni[d] = m
            full = fuzzy_norm(
                f"{m.get('first_name', '')} {m.get('last_name', '')}"
            )
            club = m.get("club_id", "")
            if full and club:
                self._by_name_club[(full, club)] = m
                skeleton = _consonant_skeleton(full)
                if skeleton:
                    self._by_skeleton_club[(skeleton, club)] = m

    def match(self, row: ExcelMemberRow) -> MatchResult:
        dni = norm_dni(row.dni_raw)
        if dni and dni in self._by_dni:
            return MatchResult(method="dni", prod_id=str(self._by_dni[dni]["_id"]))

        if not row.club_id:
            if not dni:
                return MatchResult(
                    method="skip", prod_id=None, reason="empty_club_no_dni"
                )
            return MatchResult(method="new", prod_id=None)

        full = fuzzy_norm(f"{row.first_name} {row.last1} {row.last2}")
        key = (full, row.club_id)
        if key in self._by_name_club:
            return MatchResult(
                method="name+club",
                prod_id=str(self._by_name_club[key]["_id"]),
            )

        # Fallback: consonant-skeleton match to handle corrupt accents in
        # prod data (e.g. "Martnez" ≈ "MARTÍNEZ" → both "MRTNZ").
        skeleton = _consonant_skeleton(full)
        skel_key = (skeleton, row.club_id)
        if skeleton and skel_key in self._by_skeleton_club:
            return MatchResult(
                method="name+club",
                prod_id=str(self._by_skeleton_club[skel_key]["_id"]),
            )

        return MatchResult(method="new", prod_id=None)
