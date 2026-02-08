"""Payment routes."""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Form

from src.infrastructure.web.dto.payment_dto import (
    PaymentCreate,
    PaymentResponse,
    PaymentRefundRequest,
    InitiatePaymentRequest,
    InitiatePaymentResponse,
    RedsysWebhookRequest,
    RedsysWebhookResponse
)
from src.infrastructure.web.dto.annual_payment_dto import (
    InitiateAnnualPaymentRequest,
    InitiateAnnualPaymentResponse,
    AnnualPaymentLineItem,
    MemberPaymentAssignment
)
from src.application.use_cases.payment.initiate_annual_payment_use_case import MemberAssignment
from src.infrastructure.web.mappers_payment import PaymentMapper
from src.infrastructure.web.dependencies import (
    get_all_payments_use_case,
    get_payment_use_case,
    get_create_payment_use_case,
    get_initiate_redsys_payment_use_case,
    get_initiate_annual_payment_use_case,
    get_refund_payment_use_case,
    get_delete_payment_use_case,
    get_process_redsys_webhook_use_case
)
from src.infrastructure.web.dependencies import get_auth_context
from src.infrastructure.web.authorization import AuthContext
from src.domain.exceptions.payment import DuplicatePaymentForYearError
from src.config.settings import get_app_settings

router = APIRouter(prefix="/payments", tags=["payments"])


@router.get("", response_model=List[PaymentResponse])
async def get_payments(
    limit: int = 100,
    club_id: Optional[str] = None,
    member_id: Optional[str] = None,
    payment_year: Optional[int] = None,
    get_all_use_case = Depends(get_all_payments_use_case),
    ctx: AuthContext = Depends(get_auth_context)
):
    """Get all payments, optionally filtered by club, member, or year."""
    payments = await get_all_use_case.execute(limit, club_id, member_id, payment_year)
    return PaymentMapper.to_response_list(payments)


@router.get("/{payment_id}", response_model=PaymentResponse)
async def get_payment(
    payment_id: str,
    get_payment_use_case = Depends(get_payment_use_case),
    ctx: AuthContext = Depends(get_auth_context)
):
    """Get payment by ID."""
    payment = await get_payment_use_case.execute(payment_id)
    return PaymentMapper.to_response_dto(payment)


@router.post("/initiate", response_model=InitiatePaymentResponse)
async def initiate_payment(
    payment_request: InitiatePaymentRequest,
    get_initiate_use_case = Depends(get_initiate_redsys_payment_use_case),
    ctx: AuthContext = Depends(get_auth_context)
):
    """Initiate payment through Redsys."""
    app_settings = get_app_settings()

    # Build URLs for Redsys callbacks
    base_url = app_settings.backend_base_url
    frontend_url = app_settings.frontend_base_url

    try:
        result = await get_initiate_use_case.execute(
            member_id=payment_request.member_id,
            club_id=payment_request.club_id,
            payment_type=payment_request.payment_type,
            amount=payment_request.amount,
            success_url=f"{frontend_url}/payment/success",
            failure_url=f"{frontend_url}/payment/failure",
            webhook_url=f"{base_url}/api/v1/payments/webhook",
            related_entity_id=payment_request.related_entity_id,
            description=payment_request.description,
            payment_year=payment_request.payment_year
        )
    except DuplicatePaymentForYearError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e)
        )

    return InitiatePaymentResponse(
        payment_id=result.payment_id,
        order_id=result.order_id,
        payment_url=result.form_data.payment_url,
        ds_signature_version=result.form_data.ds_signature_version,
        ds_merchant_parameters=result.form_data.ds_merchant_parameters,
        ds_signature=result.form_data.ds_signature
    )


@router.post("/annual/initiate", response_model=InitiateAnnualPaymentResponse)
async def initiate_annual_payment(
    payment_request: InitiateAnnualPaymentRequest,
    get_initiate_use_case = Depends(get_initiate_annual_payment_use_case),
    ctx: AuthContext = Depends(get_auth_context)
):
    """Initiate annual payment through Redsys."""
    app_settings = get_app_settings()

    # Build URLs for Redsys callbacks
    base_url = app_settings.backend_base_url
    frontend_url = app_settings.frontend_base_url

    # Convert DTO member assignments to domain objects
    member_assignments = None
    if payment_request.member_assignments:
        member_assignments = [
            MemberAssignment(
                member_id=a.member_id,
                member_name=a.member_name,
                payment_types=a.payment_types
            ) for a in payment_request.member_assignments
        ]

    try:
        result = await get_initiate_use_case.execute(
            payer_name=payment_request.payer_name,
            club_id=payment_request.club_id,
            payment_year=payment_request.payment_year,
            include_club_fee=payment_request.include_club_fee,
            kyu_count=payment_request.kyu_count,
            kyu_infantil_count=payment_request.kyu_infantil_count,
            dan_count=payment_request.dan_count,
            fukushidoin_shidoin_count=payment_request.fukushidoin_shidoin_count,
            seguro_accidentes_count=payment_request.seguro_accidentes_count,
            seguro_rc_count=payment_request.seguro_rc_count,
            success_url=f"{frontend_url}/payment/success",
            failure_url=f"{frontend_url}/payment/failure",
            webhook_url=f"{base_url}/api/v1/payments/webhook",
            member_assignments=member_assignments
        )
    except DuplicatePaymentForYearError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e)
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    return InitiateAnnualPaymentResponse(
        payment_id=result.payment_id,
        order_id=result.order_id,
        total_amount=result.total_amount,
        line_items=[
            AnnualPaymentLineItem(
                item_type=item.item_type,
                description=item.description,
                quantity=item.quantity,
                unit_price=item.unit_price,
                total=item.total
            ) for item in result.line_items
        ],
        payment_url=result.form_data.payment_url,
        ds_signature_version=result.form_data.ds_signature_version,
        ds_merchant_parameters=result.form_data.ds_merchant_parameters,
        ds_signature=result.form_data.ds_signature
    )


@router.post("/webhook", response_model=RedsysWebhookResponse)
async def redsys_webhook(
    Ds_SignatureVersion: str = Form(...),
    Ds_MerchantParameters: str = Form(...),
    Ds_Signature: str = Form(...),
    get_process_webhook_use_case = Depends(get_process_redsys_webhook_use_case)
):
    """
    Handle Redsys webhook callback.

    This endpoint does NOT require authentication as it's called by Redsys servers.
    Security is ensured through signature verification.
    """
    try:
        result = await get_process_webhook_use_case.execute(
            ds_signature=Ds_Signature,
            ds_merchant_parameters=Ds_MerchantParameters,
            ds_signature_version=Ds_SignatureVersion
        )

        return RedsysWebhookResponse(
            success=result.success,
            message=result.message,
            payment_id=result.payment.id,
            invoice_number=result.invoice.invoice_number if result.invoice else None
        )
    except Exception as e:
        # Log the error but return OK to Redsys
        # Redsys expects HTTP 200 even on errors
        return RedsysWebhookResponse(
            success=False,
            message=str(e)
        )


@router.put("/{payment_id}/refund", response_model=PaymentResponse)
async def refund_payment(
    payment_id: str,
    refund_data: PaymentRefundRequest,
    get_refund_use_case = Depends(get_refund_payment_use_case),
    ctx: AuthContext = Depends(get_auth_context)
):
    """Refund payment."""
    payment = await get_refund_use_case.execute(payment_id, refund_data.refund_amount)
    return PaymentMapper.to_response_dto(payment)


@router.get("/{payment_id}/status", response_model=PaymentResponse)
async def get_payment_status(
    payment_id: str,
    get_payment_use_case = Depends(get_payment_use_case),
    ctx: AuthContext = Depends(get_auth_context)
):
    """Check payment status."""
    payment = await get_payment_use_case.execute(payment_id)
    return PaymentMapper.to_response_dto(payment)


@router.delete("/{payment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_payment(
    payment_id: str,
    get_delete_use_case = Depends(get_delete_payment_use_case),
    ctx: AuthContext = Depends(get_auth_context)
):
    """Delete payment."""
    await get_delete_use_case.execute(payment_id)
    return None
