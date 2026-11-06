"""Payment routes."""

import logging

from dataclasses import asdict
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Form
from fastapi.responses import HTMLResponse

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
    MemberPaymentAssignment,
    PrefillAnnualPaymentResponse,
    PrefillMemberAssignment as PrefillMemberAssignmentDTO
)
from src.application.use_cases.payment.initiate_annual_payment_use_case import MemberAssignment
from src.infrastructure.web.mappers_payment import PaymentMapper
from src.infrastructure.web.dependencies import (
    get_all_payments_use_case,
    get_payment_use_case,
    get_create_payment_use_case,
    get_initiate_redsys_payment_use_case,
    get_initiate_annual_payment_use_case,
    get_prefill_annual_payment_use_case,
    get_refund_payment_use_case,
    get_delete_payment_use_case,
    get_process_redsys_webhook_use_case
)
from src.infrastructure.web.dependencies import (
    get_auth_context,
    get_license_repository,
    get_member_repository,
    get_payment_repository,
    get_price_configuration_repository,
)
from src.infrastructure.web.authorization import (
    AuthContext,
    require_club_access,
    require_member_access,
    require_not_received_by_card,
    require_super_admin,
)
from src.application.use_cases.payment.refuse_licences_that_do_not_fit import refuse_licences_that_do_not_fit
from src.domain.exceptions.payment import (
    DuplicatePaymentForYearError,
    PaymentAlreadyCompletedError,
    PaymentAlreadyExistsError,
    PaymentNotFoundError,
    InvalidPaymentStatusError,
    InvalidPaymentDataError,
    InvalidRefundAmountError,
)
from src.infrastructure.web.dto.manual_payment_dto import (
    ManualPaymentRequest,
    ManualPaymentResponse,
    ConfirmPaymentRequest,
)
from src.infrastructure.web.dto.exam_payment_dto import (
    ExamPaymentRequest,
    InitiateExamPaymentResponse,
    ManualExamPaymentRequest,
    ManualExamPaymentResponse,
)
from src.infrastructure.web.redsys_redirect import PAGE_HEADERS, make_redirect_token, message_page, read_redirect_token, redirect_page
from src.domain.entities.payment import UNFINISHED_PAYMENT_STATUSES
from src.domain.entities.member_payment import EXAM_ORDER
from src.infrastructure.web.dto.price_configuration_dto import PriceConfigurationResponse
from src.infrastructure.web.routers.price_configurations import price_configuration_response
from src.infrastructure.web.dependencies import (
    get_initiate_exam_payment_use_case,
    get_register_manual_exam_payment_use_case,
    get_register_manual_payment_use_case,
    get_confirm_payment_received_use_case,
)
from src.application.use_cases.payment.register_manual_payment_use_case import ManualMemberAssignment
from src.config.settings import get_app_settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/payments", tags=["payments"])
public_router = APIRouter(prefix="/payments", tags=["payments"])
self_service_router = APIRouter(prefix="/payments", tags=["payments"])

PAYMENT_DENIED = "Access denied to this payment"
SEMINAR_PAYMENT_TYPES = {"seminar", "seminar_oficialidad"}


async def _require_payment_access(ctx: AuthContext, payment, member_repository) -> None:
    """A payment belongs to its club, or to the club of its member when it has no club."""
    if payment.club_id or not payment.member_id:
        require_club_access(ctx, payment.club_id, PAYMENT_DENIED)
    else:
        await require_member_access(ctx, payment.member_id, member_repository, PAYMENT_DENIED)


async def _require_stored_payment_access(ctx: AuthContext, payment_id: str, payment_repository, member_repository) -> None:
    if ctx.is_super_admin:
        return
    payment = await payment_repository.find_by_id(payment_id)
    if not payment:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=PAYMENT_DENIED)
    await _require_payment_access(ctx, payment, member_repository)
    require_not_received_by_card(ctx, payment)


@router.get("", response_model=List[PaymentResponse])
async def get_payments(
    limit: int = 0,
    club_id: Optional[str] = None,
    member_id: Optional[str] = None,
    payment_year: Optional[int] = None,
    get_all_use_case = Depends(get_all_payments_use_case),
    member_repository = Depends(get_member_repository),
    ctx: AuthContext = Depends(get_auth_context)
):
    """Get all payments, optionally filtered by club, member, or year."""
    if not ctx.is_super_admin:
        require_club_access(ctx, ctx.club_id)
        if member_id:
            await require_member_access(ctx, member_id, member_repository)
        club_id = ctx.club_id

    payments = await get_all_use_case.execute(limit, club_id, member_id, payment_year)
    return PaymentMapper.to_response_list(payments)


@router.get("/annual/prefill", response_model=PrefillAnnualPaymentResponse)
async def prefill_annual_payment(
    club_id: str,
    payment_year: int,
    get_prefill_use_case=Depends(get_prefill_annual_payment_use_case),
    ctx: AuthContext = Depends(get_auth_context),
):
    """Get prefill data for the annual payment form based on club members."""
    require_club_access(ctx, club_id)
    result = await get_prefill_use_case.execute(
        club_id=club_id,
        payment_year=payment_year,
        payer_name=ctx.user.username if ctx.user else "",
    )

    return PrefillAnnualPaymentResponse(
        payer_name=result.payer_name,
        include_club_fee=result.include_club_fee,
        club_fee_already_paid=result.club_fee_already_paid,
        kyu_count=result.kyu_count,
        kyu_infantil_count=result.kyu_infantil_count,
        dan_count=result.dan_count,
        fukushidoin_count=result.fukushidoin_count,
        shidoin_count=result.shidoin_count,
        seguro_accidentes_count=result.seguro_accidentes_count,
        seguro_rc_count=result.seguro_rc_count,
        member_assignments=_to_assignment_dtos(result.member_assignments),
        source=result.source,
        paid_assignments=_to_assignment_dtos(result.paid_assignments),
    )


def _to_assignment_dtos(assignments) -> list[PrefillMemberAssignmentDTO]:
    return [
        PrefillMemberAssignmentDTO(
            member_id=a.member_id,
            member_name=a.member_name,
            payment_types=a.payment_types,
        )
        for a in assignments
    ]


@router.get("/{payment_id}", response_model=PaymentResponse)
async def get_payment(
    payment_id: str,
    get_payment_use_case = Depends(get_payment_use_case),
    member_repository = Depends(get_member_repository),
    ctx: AuthContext = Depends(get_auth_context)
):
    """Get payment by ID."""
    payment = await get_payment_use_case.execute(payment_id)
    await _require_payment_access(ctx, payment, member_repository)
    return PaymentMapper.to_response_dto(payment)


@router.post("/initiate", response_model=InitiatePaymentResponse)
async def initiate_payment(
    payment_request: InitiatePaymentRequest,
    get_initiate_use_case = Depends(get_initiate_redsys_payment_use_case),
    member_repository = Depends(get_member_repository),
    ctx: AuthContext = Depends(get_auth_context)
):
    """Initiate payment through Redsys."""
    require_club_access(ctx, payment_request.club_id)
    if payment_request.member_id:
        await require_member_access(ctx, payment_request.member_id, member_repository)
    if not ctx.is_super_admin and payment_request.payment_type in SEMINAR_PAYMENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seminar payments are started from the seminar"
        )

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
    member_repository = Depends(get_member_repository),
    license_repository = Depends(get_license_repository),
    ctx: AuthContext = Depends(get_auth_context)
):
    """Initiate annual payment through Redsys."""
    require_club_access(ctx, payment_request.club_id)
    if not ctx.is_super_admin and payment_request.member_assignments:
        club_members = await member_repository.find_by_club_id(ctx.club_id, limit=0)
        own_member_ids = {member.id for member in club_members}
        if any(a.member_id not in own_member_ids for a in payment_request.member_assignments):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this member"
            )
        try:
            await refuse_licences_that_do_not_fit(
                license_repository,
                club_members,
                [(a.member_id, item) for a in payment_request.member_assignments for item in a.payment_types],
                payment_request.payment_year,
                datetime.utcnow(),
            )
        except InvalidPaymentDataError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

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
            fukushidoin_count=payment_request.fukushidoin_count,
            shidoin_count=payment_request.shidoin_count,
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


@public_router.get("/exam/return", response_class=HTMLResponse)
async def return_from_exam_payment(result: str = ""):
    """Public page the bank sends a member back to after paying an exam from the card app."""
    if result == "ok":
        return HTMLResponse(message_page("Pago completado. Ya puedes volver a la app."), headers=PAGE_HEADERS)
    return HTMLResponse(message_page("El pago no se ha completado. No se ha cobrado nada."), headers=PAGE_HEADERS)


@public_router.get("/{payment_id}/redsys-redirect", response_class=HTMLResponse)
async def open_redsys_form(payment_id: str, token: str, payment_repository=Depends(get_payment_repository)):
    """Public page the card app opens: it posts the signed form to the bank."""
    form = read_redirect_token(token, payment_id)
    if form is None:
        return HTMLResponse(message_page("Este enlace de pago no es válido o ha caducado."), status_code=status.HTTP_403_FORBIDDEN, headers=PAGE_HEADERS)
    payment = await payment_repository.find_by_id(payment_id)
    if payment is None or payment.status not in UNFINISHED_PAYMENT_STATUSES:
        return HTMLResponse(message_page("Este pago ya no está pendiente."), status_code=status.HTTP_409_CONFLICT, headers=PAGE_HEADERS)
    return HTMLResponse(redirect_page(form), headers=PAGE_HEADERS)


@public_router.post("/webhook", response_model=RedsysWebhookResponse)
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
    except Exception:
        logger.exception("Redsys notification could not be processed")
        return RedsysWebhookResponse(
            success=False,
            message="Error procesando la notificación"
        )


@router.put("/{payment_id}/refund", response_model=PaymentResponse)
async def refund_payment(
    payment_id: str,
    refund_data: PaymentRefundRequest,
    get_refund_use_case = Depends(get_refund_payment_use_case),
    payment_repository=Depends(get_payment_repository),
    member_repository=Depends(get_member_repository),
    ctx: AuthContext = Depends(get_auth_context)
):
    """Refund payment. Super admin, or the admin of the payment's club."""
    await _require_stored_payment_access(ctx, payment_id, payment_repository, member_repository)
    try:
        payment = await get_refund_use_case.execute(payment_id, refund_data.refund_amount)
    except InvalidRefundAmountError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return PaymentMapper.to_response_dto(payment)


@router.get("/{payment_id}/status", response_model=PaymentResponse)
async def get_payment_status(
    payment_id: str,
    get_payment_use_case = Depends(get_payment_use_case),
    member_repository = Depends(get_member_repository),
    ctx: AuthContext = Depends(get_auth_context)
):
    """Check payment status."""
    payment = await get_payment_use_case.execute(payment_id)
    await _require_payment_access(ctx, payment, member_repository)
    return PaymentMapper.to_response_dto(payment)


@router.post("/manual", response_model=ManualPaymentResponse, status_code=status.HTTP_201_CREATED)
async def register_manual_payment(
    request: ManualPaymentRequest,
    use_case=Depends(get_register_manual_payment_use_case),
    member_repository=Depends(get_member_repository),
    license_repository=Depends(get_license_repository),
    ctx: AuthContext = Depends(get_auth_context),
):
    """Register a manual payment (cash/transfer/other). Super admin, or the admin of that club for its own members."""
    require_club_access(ctx, request.club_id)
    if not ctx.is_super_admin:
        club_members = await member_repository.find_by_club_id(request.club_id)
        club_member_ids = {m.id for m in club_members}
        if any(a.member_id not in club_member_ids for a in request.member_assignments):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this member")
    try:
        if not ctx.is_super_admin:
            await refuse_licences_that_do_not_fit(
                license_repository,
                club_members,
                [(a.member_id, item) for a in request.member_assignments for item in a.payment_types],
                request.payment_year,
                datetime.utcnow(),
            )
        result = await use_case.execute(
            payer_name=request.payer_name,
            club_id=request.club_id,
            payment_year=request.payment_year,
            payment_method=request.payment_method,
            member_assignments=[
                ManualMemberAssignment(
                    member_id=a.member_id,
                    member_name=a.member_name,
                    payment_types=a.payment_types,
                )
                for a in request.member_assignments
            ],
            include_club_fee=request.include_club_fee,
        )
    except DuplicatePaymentForYearError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    except InvalidPaymentDataError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    return ManualPaymentResponse(
        payment=PaymentMapper.to_response_dto(result.payment),
        member_payment_count=len(result.member_payments),
        invoice_number=result.invoice.invoice_number if result.invoice else None,
    )


@self_service_router.get("/exam-prices", response_model=List[PriceConfigurationResponse])
async def get_exam_prices(
    repository=Depends(get_price_configuration_repository),
    ctx: AuthContext = Depends(get_auth_context),
):
    """Active exam fee prices, in grade order, for any signed-in caller."""
    prices = {p.key: p for p in await repository.find_by_keys([exam.value for exam in EXAM_ORDER])}
    return [price_configuration_response(prices[exam.value]) for exam in EXAM_ORDER if exam.value in prices]


@self_service_router.post("/exam/initiate", response_model=InitiateExamPaymentResponse)
async def initiate_exam_payment(
    request: ExamPaymentRequest,
    use_case=Depends(get_initiate_exam_payment_use_case),
    member_repository=Depends(get_member_repository),
    ctx: AuthContext = Depends(get_auth_context),
):
    """Start a card payment for an exam: a manager for a member of their club, or a member for themselves."""
    app_settings = get_app_settings()
    if ctx.is_super_admin or ctx.is_club_admin:
        await require_member_access(ctx, request.member_id, member_repository)
        success_url = f"{app_settings.frontend_base_url}/payment/success?concept=exam"
        failure_url = f"{app_settings.frontend_base_url}/payment/failure?concept=exam"
    elif request.member_id == ctx.user.member_id:
        success_url = f"{app_settings.backend_base_url}/api/v1/payments/exam/return?result=ok"
        failure_url = f"{app_settings.backend_base_url}/api/v1/payments/exam/return?result=ko"
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Solo puedes pagar tu propio examen")
    try:
        result = await use_case.execute(
            member_id=request.member_id,
            exam=request.exam,
            exam_date=request.exam_date,
            venue=request.venue,
            payer_name=request.payer_name,
            success_url=success_url,
            failure_url=failure_url,
            webhook_url=f"{app_settings.backend_base_url}/api/v1/payments/webhook",
        )
    except PaymentAlreadyExistsError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    except InvalidPaymentDataError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    form = asdict(result.form_data)
    token = make_redirect_token(result.payment_id, form)
    return InitiateExamPaymentResponse(
        payment_id=result.payment_id,
        order_id=result.order_id,
        redirect_url=f"{app_settings.backend_base_url}/api/v1/payments/{result.payment_id}/redsys-redirect?token={token}",
        **form,
    )


@router.post("/exam", response_model=ManualExamPaymentResponse, status_code=status.HTTP_201_CREATED)
async def register_manual_exam_payment(
    request: ManualExamPaymentRequest,
    use_case=Depends(get_register_manual_exam_payment_use_case),
    member_repository=Depends(get_member_repository),
    ctx: AuthContext = Depends(get_auth_context),
):
    """Register an exam fee paid by transfer, cash or other. Super admin, or the admin of the member's club."""
    await require_member_access(ctx, request.member_id, member_repository)
    try:
        result = await use_case.execute(
            member_id=request.member_id,
            exam=request.exam,
            exam_date=request.exam_date,
            venue=request.venue,
            payer_name=request.payer_name,
            payment_method=request.payment_method,
        )
    except PaymentAlreadyExistsError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    except InvalidPaymentDataError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return ManualExamPaymentResponse(
        payment=PaymentMapper.to_response_dto(result.payment),
        invoice_number=result.invoice.invoice_number if result.invoice else None,
    )


@router.post("/{payment_id}/confirm", response_model=PaymentResponse)
async def confirm_payment_received(
    payment_id: str,
    request: ConfirmPaymentRequest,
    use_case=Depends(get_confirm_payment_received_use_case),
    ctx: AuthContext = Depends(get_auth_context),
):
    """Confirm an unfinished payment received offline and fulfil it. Super admin only."""
    require_super_admin(ctx)
    try:
        completed = await use_case.execute(payment_id=payment_id, payment_method=request.payment_method)
    except (DuplicatePaymentForYearError, PaymentAlreadyCompletedError) as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    except PaymentNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except InvalidPaymentStatusError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    except InvalidPaymentDataError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return PaymentMapper.to_response_dto(completed.payment)


@router.delete("/{payment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_payment(
    payment_id: str,
    force: bool = False,
    get_delete_use_case=Depends(get_delete_payment_use_case),
    payment_repository=Depends(get_payment_repository),
    member_repository=Depends(get_member_repository),
    ctx: AuthContext = Depends(get_auth_context),
):
    """Delete payment with cascade (MemberPayments -> Invoice -> Payment).
    force=true required for Redsys COMPLETED payments. Super admin, or the admin of the payment's club."""
    await _require_stored_payment_access(ctx, payment_id, payment_repository, member_repository)
    try:
        await get_delete_use_case.execute(payment_id, force=force)
    except PaymentNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except InvalidPaymentStatusError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    return None
