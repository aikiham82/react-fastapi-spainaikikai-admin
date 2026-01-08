"""Payment routes."""

from typing import List, Optional

from fastapi import APIRouter, HTTPException, status

from src.infrastructure.web.dto.payment_dto import (
    PaymentCreate,
    PaymentResponse,
    PaymentRefundRequest,
    RedsysPaymentRequest
)
from src.infrastructure.web.mappers_payment import PaymentMapper
from src.infrastructure.web.dependencies import (
    get_all_payments_use_case,
    get_payment_use_case,
    get_create_payment_use_case,
    get_initiate_redsys_payment_use_case,
    get_refund_payment_use_case,
    get_delete_payment_use_case
)
from src.infrastructure.web.dependencies import get_current_active_user
from src.domain.entities.user import User

router = APIRouter(prefix="/payments", tags=["payments"])


@router.get("", response_model=List[PaymentResponse])
async def get_payments(
    limit: int = 100,
    club_id: Optional[str] = None,
    member_id: Optional[str] = None,
    get_all_use_case = Depends(get_all_payments_use_case),
    current_user: User = Depends(get_current_active_user)
):
    """Get all payments, optionally filtered by club or member."""
    payments = await get_all_use_case.execute(limit, club_id, member_id)
    return PaymentMapper.to_response_list(payments)


@router.get("/{payment_id}", response_model=PaymentResponse)
async def get_payment(
    payment_id: str,
    get_payment_use_case = Depends(get_payment_use_case),
    current_user: User = Depends(get_current_active_user)
):
    """Get payment by ID."""
    payment = await get_payment_use_case.execute(payment_id)
    return PaymentMapper.to_response_dto(payment)


@router.post("/initiate")
async def initiate_payment(
    payment_request: RedsysPaymentRequest,
    get_initiate_use_case = Depends(get_initiate_redsys_payment_use_case),
    current_user: User = Depends(get_current_active_user)
):
    """Initiate payment through Redsys."""
    result = await get_initiate_use_case.execute(
        member_id=payment_request.member_id,
        club_id=payment_request.club_id,
        payment_type=payment_request.payment_type,
        amount=payment_request.amount,
        return_url=str(payment_request.return_url),
        related_entity_id=payment_request.related_entity_id
    )
    return result


@router.post("/webhook")
async def redsys_webhook(
    webhook_data: dict,
    get_process_webhook_use_case = Depends(get_process_redsys_webhook_use_case)
):
    """Handle Redsys webhook callback."""
    transaction_id = webhook_data.get("Ds_MerchantParameters", "")
    status = webhook_data.get("Ds_Response", "0000")
    
    if status == "0000" or status == "0001":
        status = "success"
    elif status.startswith("0" + status[1:]):
        status = "success"
    else:
        status = "failed"
    
    payment = await get_process_webhook_use_case.execute(transaction_id, status)
    return PaymentMapper.to_response_dto(payment)


@router.put("/{payment_id}/refund", response_model=PaymentResponse)
async def refund_payment(
    payment_id: str,
    refund_data: PaymentRefundRequest,
    get_refund_use_case = Depends(get_refund_payment_use_case),
    current_user: User = Depends(get_current_active_user)
):
    """Refund payment."""
    payment = await get_refund_use_case.execute(payment_id, refund_data.refund_amount)
    return PaymentMapper.to_response_dto(payment)


@router.get("/{payment_id}/status", response_model=PaymentResponse)
async def get_payment_status(
    payment_id: str,
    get_payment_use_case = Depends(get_payment_use_case),
    current_user: User = Depends(get_current_active_user)
):
    """Check payment status."""
    payment = await get_payment_use_case.execute(payment_id)
    return PaymentMapper.to_response_dto(payment)


@router.delete("/{payment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_payment(
    payment_id: str,
    get_delete_use_case = Depends(get_delete_payment_use_case),
    current_user: User = Depends(get_current_active_user)
):
    """Delete payment."""
    await get_delete_use_case.execute(payment_id)
    return None
