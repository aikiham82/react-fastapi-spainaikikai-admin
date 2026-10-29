import re

import pytest

from src.infrastructure.adapters.repositories.name_search import name_search_filter

pytestmark = [pytest.mark.unit]


def matches(term, first_name, last_name):
    member = {"first_name": first_name, "last_name": last_name}
    return all(
        any(re.search(condition[field]["$regex"], member[field], re.IGNORECASE) for condition in word["$or"] for field in condition)
        for word in name_search_filter(term).get("$and", [])
    )


def test_words_in_any_order_match_first_and_last_name():
    assert matches("soto lucia", "Lucia", "Fernandez Soto")
    assert matches("lucia fernandez", "Lucia", "Fernandez Soto")
    assert not matches("lucia garcia", "Lucia", "Fernandez Soto")


def test_a_lowercase_unaccented_term_matches_a_capitalised_accented_name():
    assert matches("lucia fernandez", "Lucía", "Fernández Soto")
    assert matches("ines lopez", "INÉS", "LÓPEZ DÍAZ")
    assert matches("raul", "RAÚL", "Pérez")


def test_an_accented_term_matches_an_unaccented_name():
    assert matches("Fernández", "ANA BELEN", "VIDAL FERNANDEZ")


def test_n_matches_enye():
    assert matches("nunez", "Ana", "Núñez")
    assert matches("ibanez", "ANA", "IBAÑEZ")


def test_a_matches_grave_accent():
    assert matches("marca", "Pere", "Marçà")
    assert matches("alex", "ÀLEX", "Puig")


def test_a_name_typed_exactly_matches_whatever_its_accent():
    assert matches("João", "João", "Silva")
    assert matches("Ştefan", "Ştefan", "Popescu")


def test_a_comma_separates_words():
    assert matches("Fernández, Lucía", "Lucía", "Fernández Soto")


def test_regex_characters_are_matched_literally():
    assert matches("garcia (jr", "Carlos", "García (Jr)")
    assert not matches(".*", "Carlos", "García")
    assert r"\(" in name_search_filter("(jr")["$and"][0]["$or"][0]["first_name"]["$regex"]


def test_a_blank_term_filters_nothing_out():
    assert name_search_filter("   ") == {}
