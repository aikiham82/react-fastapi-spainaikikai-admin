"""Invoice for a payment already marked as paid: one line per stored line item."""
import json
import logging
from datetime import datetime
from typing import List, Optional

from src.application.ports.club_repository import ClubRepositoryPort
from src.application.ports.invoice_repository import InvoiceRepositoryPort
from src.application.ports.member_repository import MemberRepositoryPort
from src.application.ports.pdf_service import PDFServicePort
from src.application.use_cases.invoice.invoice_customer import build_invoice_customer
from src.config.settings import get_invoice_settings
from src.domain.entities.invoice import Invoice, InvoiceLineItem, InvoiceStatus
from src.domain.entities.payment import Payment

logger = logging.getLogger(__name__)


async def create_payment_invoice(
    payment: Payment,
    invoice_repository: Optional[InvoiceRepositoryPort],
    member_repository: MemberRepositoryPort,
    club_repository: Optional[ClubRepositoryPort],
    pdf_service: Optional[PDFServicePort],
) -> Optional[Invoice]:
    if not invoice_repository:
        return None

    customer = await build_invoice_customer(payment, member_repository, club_repository)

    invoice_year = payment.payment_year or datetime.utcnow().year
    invoice_number = await invoice_repository.get_next_invoice_number(invoice_year)
    invoice_settings = get_invoice_settings()

    tax_rate = invoice_settings.tax_rate * 100
    try:
        items_data = json.loads(payment.line_items_data) if payment.line_items_data else []
    except json.JSONDecodeError:
        items_data = []
    line_items = [
        InvoiceLineItem(
            description=item.get("description", ""),
            quantity=item.get("quantity", 1),
            unit_price=item.get("unit_price", 0),
            tax_rate=tax_rate,
        )
        for item in items_data
    ] or [InvoiceLineItem(description=f"Pago manual - {payment.payment_year}", quantity=1, unit_price=payment.amount, tax_rate=tax_rate)]

    invoice_member_id = payment.member_id or payment.club_id

    invoice = Invoice(
        invoice_number=invoice_number,
        payment_id=payment.id,
        member_id=invoice_member_id,
        club_id=payment.club_id,
        customer_name=customer.name,
        customer_email=customer.email,
        customer_address=customer.address,
        customer_phone=customer.phone,
        line_items=line_items,
        status=InvoiceStatus.ISSUED,
        issue_date=datetime.utcnow(),
        payment_date=payment.payment_date or datetime.utcnow(),
        payment_method=payment.payment_method.value,
    )
    invoice.calculate_totals()

    if pdf_service:
        try:
            pdf_path = await pdf_service.save_invoice_pdf(
                invoice=invoice,
                output_dir=invoice_settings.output_dir,
                company_name=invoice_settings.company_name,
                company_address=invoice_settings.company_address,
                company_tax_id=invoice_settings.company_tax_id,
                logo_path=invoice_settings.logo_path if invoice_settings.logo_path else None,
            )
            invoice.pdf_path = pdf_path
        except Exception:
            logger.warning(
                "PDF generation failed for invoice %s",
                invoice.invoice_number,
                exc_info=True,
            )

    return await invoice_repository.create(invoice)
