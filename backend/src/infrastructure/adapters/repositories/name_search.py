import re
import unicodedata
from collections import defaultdict

MATCHES_NOTHING = {"_id": {"$in": []}}


def _fold(char: str) -> str:
    decomposed = unicodedata.normalize("NFD", char)
    return "".join(c for c in decomposed if not unicodedata.combining(c)).lower()


def _latin_variants() -> dict:
    variants = defaultdict(set)
    for code in range(0xC0, 0x250):
        char = chr(code)
        base = _fold(char)
        if len(base) == 1 and base.isascii() and base.isalpha():
            variants[base].update({base, char})
    return {base: "".join(sorted(chars)) for base, chars in variants.items()}


LATIN_VARIANTS = _latin_variants()


def _char_pattern(char: str) -> str:
    variants = LATIN_VARIANTS.get(_fold(char))
    if variants is None:
        return re.escape(char)
    return f"[{re.escape(variants + char)}]"


def name_search_filter(term: str) -> dict:
    printable = "".join(char for char in term if char.isprintable() or char.isspace())
    patterns = ["".join(_char_pattern(char) for char in word) for word in printable.replace(",", " ").split()]
    if not patterns:
        return MATCHES_NOTHING
    return {
        "$and": [
            {
                "$or": [
                    {"first_name": {"$regex": pattern, "$options": "i"}},
                    {"last_name": {"$regex": pattern, "$options": "i"}},
                    {"dni": {"$regex": pattern, "$options": "i"}},
                ]
            }
            for pattern in patterns
        ]
    }
