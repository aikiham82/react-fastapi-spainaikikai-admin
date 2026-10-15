"""A club admin reads the invoices of their own club only."""

from datetime import datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi import FastAPI, status
from fastapi.testclient import TestClient

from src.domain.entities.invoice import Invoice, InvoiceLineItem, InvoiceStatus
from src.domain.exceptions.invoice import InvoicePDFGenerationError
from src.infrastructure.web.dependencies import (
    get_all_invoices_use_case,
    get_auth_context,
    get_download_invoice_pdf_use_case,
    get_invoice_use_case,
    get_invoices_by_member_use_case,
    get_member_repository,
    get_regenerate_invoice_pdf_use_case,
)
from src.infrastructure.web.routers.invoices import router
from tests.api.callers import (
    FOREIGN_MEMBER,
    OTHER_CLUB,
    OWN_CLUB,
    OWN_MEMBER,
    MembersByClub,
    club_admin,
    super_admin,
)

pytestmark = [pytest.mark.api, pytest.mark.auth]


def invoice_of(club_id, invoice_id="invoice-id"):
    return Invoice(
        id=invoice_id, invoice_number="2026-0001", payment_id="payment-id", member_id=OWN_MEMBER,
        club_id=club_id, customer_name="Club Example", status=InvoiceStatus.PAID,
        subtotal=10.0, tax_total=0.0, total=10.0,
    )


@pytest.fixture
def use_cases():
    return SimpleNamespace(
        get_all=AsyncMock(), get_one=AsyncMock(), by_member=AsyncMock(), pdf=AsyncMock(), regenerate=AsyncMock()
    )


@pytest.fixture
def client_as(use_cases):
    def build(ctx, stored_club=OWN_CLUB) -> TestClient:
        stored = invoice_of(stored_club)
        use_cases.get_all.execute.return_value = [
            invoice_of(OWN_CLUB, "invoice-own"),
            invoice_of(OTHER_CLUB, "invoice-foreign"),
            invoice_of(None, "invoice-without-club"),
        ]
        use_cases.get_one.execute.return_value = stored
        use_cases.by_member.execute.return_value = [stored]
        use_cases.regenerate.execute.return_value = stored
        use_cases.pdf.execute.return_value = SimpleNamespace(
            pdf_bytes=b"pdf", content_type="application/pdf", filename="invoice.pdf"
        )

        app = FastAPI()
        app.include_router(router, prefix="/api/v1")
        app.dependency_overrides = {
            get_auth_context: lambda: ctx,
            get_member_repository: lambda: MembersByClub(),
            get_all_invoices_use_case: lambda: use_cases.get_all,
            get_invoice_use_case: lambda: use_cases.get_one,
            get_invoices_by_member_use_case: lambda: use_cases.by_member,
            get_download_invoice_pdf_use_case: lambda: use_cases.pdf,
            get_regenerate_invoice_pdf_use_case: lambda: use_cases.regenerate,
        }
        return TestClient(app)

    return build


def by_invoice(client: TestClient) -> dict:
    return {
        "detail": client.get("/api/v1/invoices/invoice-id").status_code,
        "pdf": client.get("/api/v1/invoices/invoice-id/pdf").status_code,
        "regenerate": client.post("/api/v1/invoices/invoice-id/regenerate-pdf").status_code,
    }


def test_a_club_admin_lists_only_the_invoices_of_their_club(client_as):
    response = client_as(club_admin()).get("/api/v1/invoices")

    assert response.status_code == status.HTTP_200_OK
    assert [invoice["id"] for invoice in response.json()] == ["invoice-own"]


def test_a_stored_invoice_entity_is_listed(client_as, use_cases):
    issued = datetime(2026, 10, 15, 7, 57, 17)
    client = client_as(super_admin())
    use_cases.get_all.execute.return_value = [Invoice(
        id="invoice-real", invoice_number="2025-000002", payment_id="payment-id", member_id=OWN_CLUB,
        club_id=OWN_CLUB, customer_name="Club Example", status=InvoiceStatus.ISSUED, issue_date=issued,
        line_items=[InvoiceLineItem(description="Licencia DAN", quantity=3, unit_price=20)],
        subtotal=60, tax_total=0.0, total=60.0, created_at=issued, updated_at=issued,
    )]

    response = client.get("/api/v1/invoices")

    assert response.status_code == status.HTTP_200_OK
    listed = response.json()[0]
    assert (listed["total_amount"], listed["tax_amount"], listed["issue_date"][:10]) == (60.0, 0.0, "2026-10-15")


@pytest.mark.parametrize("request_pdf", [
    lambda client: client.get("/api/v1/invoices/invoice-id/pdf"),
    lambda client: client.post("/api/v1/invoices/invoice-id/regenerate-pdf"),
])
def test_a_failed_pdf_does_not_reveal_the_cause(client_as, use_cases, request_pdf):
    client = client_as(super_admin())
    failure = InvoicePDFGenerationError("2026-0001", "/srv/invoices/secret.pdf: Permission denied")
    use_cases.pdf.execute.side_effect = failure
    use_cases.regenerate.execute.side_effect = failure

    response = request_pdf(client)

    assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
    assert response.json() == {"detail": "No se pudo generar el PDF de la factura"}


def test_the_invoice_response_does_not_reveal_the_pdf_path(client_as, use_cases):
    client = client_as(super_admin())
    stored = invoice_of(OWN_CLUB)
    stored.pdf_path = "/srv/invoices/2026-0001.pdf"
    use_cases.get_one.execute.return_value = stored

    body = client.get("/api/v1/invoices/invoice-id").json()

    assert "pdf_path" not in body
    assert "/srv/" not in str(body)


def test_an_unknown_invoice_status_is_a_422(client_as, use_cases):
    response = client_as(super_admin()).get("/api/v1/invoices?status=void")

    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    use_cases.get_all.execute.assert_not_called()


def test_a_club_admins_limit_counts_their_own_invoices(client_as, use_cases):
    response = client_as(club_admin()).get("/api/v1/invoices?limit=1")

    assert [invoice["id"] for invoice in response.json()] == ["invoice-own"]
    assert use_cases.get_all.execute.call_args.kwargs["limit"] == 0


def test_a_super_admin_lists_every_invoice(client_as):
    response = client_as(super_admin()).get("/api/v1/invoices")

    assert len(response.json()) == 3


@pytest.mark.parametrize("stored_club", [OTHER_CLUB, None])
def test_a_club_admin_is_refused_an_invoice_outside_their_club(client_as, use_cases, stored_club):
    answered = by_invoice(client_as(club_admin(), stored_club=stored_club))

    assert answered == {name: status.HTTP_403_FORBIDDEN for name in answered}
    use_cases.pdf.execute.assert_not_called()
    use_cases.regenerate.execute.assert_not_called()


def test_a_club_admin_works_with_an_invoice_of_their_club(client_as):
    answered = by_invoice(client_as(club_admin()))

    assert answered == {name: status.HTTP_200_OK for name in answered}


def test_a_club_admin_reads_the_invoices_of_their_own_members_only(client_as, use_cases):
    client = client_as(club_admin())

    assert client.get(f"/api/v1/invoices/member/{OWN_MEMBER}").status_code == status.HTTP_200_OK
    assert client.get(f"/api/v1/invoices/member/{FOREIGN_MEMBER}").status_code == status.HTTP_403_FORBIDDEN
    assert use_cases.by_member.execute.call_count == 1


def test_a_super_admin_works_with_any_invoice(client_as):
    client = client_as(super_admin(), stored_club=OTHER_CLUB)

    answered = by_invoice(client)

    assert answered == {name: status.HTTP_200_OK for name in answered}
    assert client.get(f"/api/v1/invoices/member/{FOREIGN_MEMBER}").status_code == status.HTTP_200_OK
