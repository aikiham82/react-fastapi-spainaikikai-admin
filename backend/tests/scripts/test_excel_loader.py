"""Unit tests for fee-amount label resolution in the Excel loader.

The secretary sometimes types a text label ('Cuota An.' / 'Seg. Acc.') in the amount
column instead of the number; those cells must resolve to the standard amount, not 0.
"""

from scripts.sync.constants import (
    DEFAULT_CUOTA_KYU_AMOUNT,
    DEFAULT_SEGURO_ACCIDENTES_AMOUNT,
)
from scripts.sync.excel_loader import _resolve_cuota, _resolve_seg_acc


def test_cuota_numeric_passthrough():
    assert _resolve_cuota(70.0, "dan") == 70.0
    assert _resolve_cuota(15, "kyu") == 15.0


def test_cuota_label_resolves_for_kyu():
    assert _resolve_cuota("Cuota An.", "kyu") == float(DEFAULT_CUOTA_KYU_AMOUNT)
    assert _resolve_cuota("cuota anual", "kyu_infantil") == float(DEFAULT_CUOTA_KYU_AMOUNT)


def test_cuota_label_not_resolved_for_dan():
    """Dan cuotas vary (20/70) and are never labeled; don't guess."""
    assert _resolve_cuota("Cuota An.", "dan") == 0.0


def test_cuota_unknown_text_is_zero():
    assert _resolve_cuota("???", "kyu") == 0.0
    assert _resolve_cuota(None, "kyu") == 0.0


def test_seg_acc_numeric_passthrough():
    assert _resolve_seg_acc(15.0) == 15.0


def test_seg_acc_label_resolves():
    assert _resolve_seg_acc("Seg. Acc.") == float(DEFAULT_SEGURO_ACCIDENTES_AMOUNT)
    assert _resolve_seg_acc("seguro accidentes") == float(DEFAULT_SEGURO_ACCIDENTES_AMOUNT)


def test_seg_acc_unknown_text_is_zero():
    assert _resolve_seg_acc("foo") == 0.0
    assert _resolve_seg_acc(None) == 0.0
