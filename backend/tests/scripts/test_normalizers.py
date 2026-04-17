import pytest
from scripts.sync.normalizers import norm_dni, norm_name, fuzzy_norm


class TestNormDni:
    def test_strips_dots_dashes_spaces(self):
        assert norm_dni("24.178.035 K") == "24178035K"
        assert norm_dni("48568424-Z") == "48568424Z"

    def test_uppercase(self):
        assert norm_dni("52270935p") == "52270935P"

    def test_empty_and_none(self):
        assert norm_dni("") == ""
        assert norm_dni(None) == ""

    def test_zero_is_empty(self):
        assert norm_dni("0") == ""

    def test_handles_nie(self):
        assert norm_dni("X8740471B") == "X8740471B"

    def test_accepts_numeric_excel_values(self):
        assert norm_dni(24178035) == "24178035"

    def test_float_zero_treated_as_empty(self):
        assert norm_dni("0.0") == ""
        assert norm_dni(0) == ""
        assert norm_dni(0.0) == ""


class TestNormName:
    def test_strips_accents(self):
        assert norm_name("Martínez") == "MARTINEZ"
        assert norm_name("Compañy") == "COMPANY"

    def test_uppercase(self):
        assert norm_name("josé") == "JOSE"

    def test_empty(self):
        assert norm_name("") == ""
        assert norm_name(None) == ""


class TestFuzzyNorm:
    def test_removes_non_alpha(self):
        assert fuzzy_norm("O'Donnel") == "ODONNEL"
        assert fuzzy_norm("Martín-Sánchez") == "MARTINSANCHEZ"

    def test_strips_corrupted_accents(self):
        # Prod has "Martnez" (missing í) vs Excel "MARTÍNEZ"
        assert fuzzy_norm("Martnez") == "MARTNEZ"
        assert fuzzy_norm("MARTÍNEZ") == "MARTINEZ"

    def test_collapses_whitespace(self):
        assert fuzzy_norm("  Juan   Carlos  ") == "JUAN CARLOS"
