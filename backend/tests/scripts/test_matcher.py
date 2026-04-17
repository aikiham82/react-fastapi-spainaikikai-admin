from scripts.sync.matcher import MatchResult, Matcher


def make_excel(num="1", first="Juan", last1="Garcia", last2="Lopez",
               dni="12345678A", club_id="club_a"):
    from scripts.sync.excel_loader import ExcelMemberRow
    return ExcelMemberRow(
        num_socio=num, first_name=first, last1=last1, last2=last2,
        dni_raw=dni, email="", phone="", birth_date=None,
        address="", city="", province="", postal_code="", country="Spain",
        club_id=club_id, club_name="Club A",
    )


def make_prod(_id="p1", first="Juan", last="Garcia Lopez",
              dni="12345678A", club_id="club_a"):
    return {"_id": _id, "first_name": first, "last_name": last,
            "dni": dni, "club_id": club_id}


def test_match_by_dni():
    m = Matcher([make_prod()])
    result = m.match(make_excel())
    assert result.method == "dni"
    assert result.prod_id == "p1"


def test_match_by_dni_with_punctuation():
    m = Matcher([make_prod(dni="12345678A")])
    excel = make_excel(dni="12.345.678-A")
    assert m.match(excel).method == "dni"


def test_match_by_name_when_dni_missing():
    m = Matcher([make_prod(dni="")])
    excel = make_excel(dni="")
    result = m.match(excel)
    assert result.method == "name+club"
    assert result.prod_id == "p1"


def test_match_by_name_with_corrupted_accents():
    # Prod has "Martnez" (corrupt), Excel has "MARTÍNEZ"
    m = Matcher([make_prod(first="Isabel", last="Martnez Moya", dni="")])
    excel = make_excel(first="ISABEL", last1="MARTÍNEZ", last2="MOYA", dni="")
    assert m.match(excel).method == "name+club"


def test_no_match_inserts_new():
    m = Matcher([make_prod()])
    excel = make_excel(num="999", dni="99999999Z", club_id="other")
    result = m.match(excel)
    assert result.method == "new"
    assert result.prod_id is None


def test_skipped_when_no_club_and_no_dni():
    m = Matcher([make_prod()])
    excel = make_excel(dni="", club_id="")
    result = m.match(excel)
    assert result.method == "skip"
    assert result.reason == "empty_club_no_dni"


def test_prefers_dni_over_name():
    m = Matcher([
        make_prod(_id="p1", dni="11111111A"),
        make_prod(_id="p2", dni="22222222B"),
    ])
    excel = make_excel(dni="22222222B")
    assert m.match(excel).prod_id == "p2"
