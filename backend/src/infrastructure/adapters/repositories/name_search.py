import re
import unicodedata

ACCENTED_VARIANTS = {
    "a": "aàáâäÀÁÂÄ",
    "e": "eèéêëÈÉÊË",
    "i": "iìíîïÌÍÎÏ",
    "o": "oòóôöÒÓÔÖ",
    "u": "uùúûüÙÚÛÜ",
    "n": "nñÑ",
    "c": "cçÇ",
}


def _fold(char: str) -> str:
    decomposed = unicodedata.normalize("NFD", char)
    return "".join(c for c in decomposed if not unicodedata.combining(c)).lower()


def _char_pattern(char: str) -> str:
    variants = ACCENTED_VARIANTS.get(_fold(char))
    if variants is None:
        return re.escape(char)
    return f"[{re.escape(variants + char)}]"


def _word_pattern(word: str) -> str:
    return "".join(_char_pattern(char) for char in word)


def name_search_filter(term: str) -> dict:
    words = term.replace(",", " ").split()
    if not words:
        return {}
    return {
        "$and": [
            {
                "$or": [
                    {"first_name": {"$regex": _word_pattern(word), "$options": "i"}},
                    {"last_name": {"$regex": _word_pattern(word), "$options": "i"}},
                ]
            }
            for word in words
        ]
    }
