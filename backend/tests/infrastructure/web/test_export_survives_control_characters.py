"""One stored text with a control character must not take an export down."""

import openpyxl
import pytest
from pydantic import ValidationError

from src.infrastructure.web.dto.member_payment_dto import MemberPaymentUpdateRequest
from src.infrastructure.web.routers.import_export import _build_excel

pytestmark = [pytest.mark.unit]


def exported_value(value):
    output = _build_excel("Pagos", [("concept", "Concepto", lambda row: row)], [value])
    return openpyxl.load_workbook(output).active.cell(row=2, column=1).value


@pytest.mark.parametrize(
    "value",
    ["qa\x0bmarker", "qa\x00marker", "qa\x08marker", "qa\x1fmarker", "qa￾marker", "qa￿marker"],
    ids=["vertical-tab", "null", "backspace", "unit-separator", "non-character-fffe", "non-character-ffff"],
)
def test_a_character_excel_cannot_store_becomes_a_space(value):
    assert exported_value(value) == "qa marker"


def test_tab_and_line_break_stay_because_excel_stores_them():
    assert exported_value("uno\tdos\ntres") == "uno\tdos\ntres"


@pytest.mark.parametrize("value", [15.5, 2026], ids=["float", "int"])
def test_a_value_that_is_not_text_is_left_alone(value):
    assert exported_value(value) == value


def test_a_formula_is_still_exported_as_text():
    assert exported_value("=1+1") == "=1+1"


def test_a_concept_of_200_characters_is_accepted():
    assert len(MemberPaymentUpdateRequest(concept="a" * 200).concept) == 200


def test_a_longer_concept_is_refused():
    with pytest.raises(ValidationError):
        MemberPaymentUpdateRequest(concept="a" * 201)
