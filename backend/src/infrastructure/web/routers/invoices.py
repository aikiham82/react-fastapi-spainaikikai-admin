"""Invoice routes."""

from typing import List, Optional
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from io import BytesIO

from src.infrastructure.web.dto.invoice_dto import (
    InvoiceResponse,
    InvoiceLineItemResponse,
    InvoiceListResponse
)
from src.infrastructure.web.dependencies import (
    get_all_invoices_use_case,
    get_invoice_use_case,
    get_invoices_by_member_use_case,
    get_download_invoice_pdf_use_case,
    get_regenerate_invoice_pdf_use_case
)
from src.infrastructure.web.dependencies import get_current_active_user
from src.domain.entities.user import User
from src.domain.exceptions.invoice import InvoiceNotFoundError, InvoicePDFGenerationError

router = APIRouter(prefix="/invoices", tags=["invoices"])


def _invoice_to_response(invoice) -> InvoiceResponse:
    """Convert invoice entity to response DTO."""
    return InvoiceResponse(
        id=invoice.id,
        invoice_number=invoice.invoice_number,
        payment_id=invoice.payment_id,
        member_id=invoice.member_id,
        club_id=invoice.club_id,
        license_id=invoice.license_id,
        customer_name=invoice.customer_name,
        customer_address=invoice.customer_address,
        customer_tax_id=invoice.customer_tax_id,
        customer_email=invoice.customer_email,
        line_items=[
            InvoiceLineItemResponse(
                description=item.description,
                quantity=item.quantity,
                unit_price=item.unit_price,
                tax_rate=item.tax_rate
            )
            for item in invoice.line_items
        ],
        subtotal=invoice.subtotal,
        tax_amount=invoice.tax_amount,
        total_amount=invoice.total_amount,
        status=invoice.status.value,
        issue_date=invoice.issue_date,
        due_date=invoice.due_date,
        paid_date=invoice.paid_date,
        pdf_path=invoice.pdf_path,
        notes=invoice.notes,
        created_at=invoice.created_at,
        updated_at=invoice.updated_at
    )


@router.get("", response_model=List[InvoiceResponse])
async def get_all_invoices(
    status: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    limit: int = 100,
    get_all_use_case = Depends(get_all_invoices_use_case),
    current_user: User = Depends(get_current_active_user)
):
    """Get all invoices with optional filters."""
    invoices = await get_all_use_case.execute(
        status=status,
        start_date=start_date,
        end_date=end_date,
        limit=limit
    )
    return [_invoice_to_response(inv) for inv in invoices]


@router.get("/member/{member_id}", response_model=List[InvoiceResponse])
async def get_member_invoices(
    member_id: str,
    limit: int = 100,
    get_invoices_use_case = Depends(get_invoices_by_member_use_case),
    current_user: User = Depends(get_current_active_user)
):
    """Get all invoices for a member."""
    invoices = await get_invoices_use_case.execute(member_id, limit)
    return [_invoice_to_response(inv) for inv in invoices]


@router.get("/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice(
    invoice_id: str,
    get_invoice_use_case = Depends(get_invoice_use_case),
    current_user: User = Depends(get_current_active_user)
):
    """Get invoice by ID."""
    try:
        invoice = await get_invoice_use_case.execute(invoice_id)
        return _invoice_to_response(invoice)
    except InvoiceNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.get("/{invoice_id}/pdf")
async def download_invoice_pdf(
    invoice_id: str,
    download_use_case = Depends(get_download_invoice_pdf_use_case),
    current_user: User = Depends(get_current_active_user)
):
    """Download invoice PDF."""
    try:
        result = await download_use_case.execute(invoice_id)
        return StreamingResponse(
            BytesIO(result.pdf_bytes),
            media_type=result.content_type,
            headers={
                "Content-Disposition": f"attachment; filename={result.filename}"
            }
        )
    except InvoiceNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except InvoicePDFGenerationError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/{invoice_id}/regenerate-pdf", response_model=InvoiceResponse)
async def regenerate_invoice_pdf(
    invoice_id: str,
    regenerate_use_case = Depends(get_regenerate_invoice_pdf_use_case),
    current_user: User = Depends(get_current_active_user)
):
    """Regenerate invoice PDF."""
    try:
        invoice = await regenerate_use_case.execute(invoice_id)
        return _invoice_to_response(invoice)
    except InvoiceNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except InvoicePDFGenerationError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
