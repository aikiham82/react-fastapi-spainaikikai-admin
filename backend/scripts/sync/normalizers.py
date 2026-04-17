"""Pure string normalization helpers for matching Excel rows to prod documents."""

import re
import unicodedata


def norm_dni(raw: str | None) -> str:
    """Normalize DNI/NIE: strip punctuation+spaces, uppercase, treat '0' as empty."""
    if not raw:
        return ""
    cleaned = re.sub(r"[\.\-\s]", "", str(raw)).upper().strip()
    if cleaned == "0":
        return ""
    return cleaned


def norm_name(raw: str | None) -> str:
    """Strip accents (NFKD) and uppercase."""
    if not raw:
        return ""
    decomposed = unicodedata.normalize("NFKD", str(raw))
    ascii_only = "".join(c for c in decomposed if not unicodedata.combining(c))
    return ascii_only.upper().strip()


def fuzzy_norm(raw: str | None) -> str:
    """Aggressive normalization: strip accents, non-alpha, collapse whitespace."""
    if not raw:
        return ""
    decomposed = unicodedata.normalize("NFKD", str(raw))
    ascii_only = "".join(c for c in decomposed if not unicodedata.combining(c))
    alpha_only = re.sub(r"[^A-Za-z\s]", "", ascii_only)
    collapsed = re.sub(r"\s+", " ", alpha_only).strip()
    return collapsed.upper()
