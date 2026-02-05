"""Member Payment routes."""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query

from src.infrastructure.web.dto.member_payment_dto import (
    MemberPaymentStatusResponse,
    MemberPaymentHistoryResponse,
    MemberPaymentResponse,
    PaymentTypeStatusResponse,
    ClubPaymentSummaryResponse,
    PaymentTypeSummaryResponse,
    MemberPaymentSummaryResponse,
    UnpaidMembersResponse,
    UnpaidMemberResponse
)
from src.infrastructure.web.dependencies import (
    get_member_payment_status_use_case,
    get_member_payment_history_use_case,
    get_club_payment_summary_use_case,
    get_unpaid_members_use_case,
    get_current_active_user
)
from src.domain.entities.user import User

router = APIRouter(prefix="/member-payments", tags=["member-payments"])


@router.get("/member/{member_id}", response_model=MemberPaymentStatusResponse)
async def get_member_payment_status(
    member_id: str,
    payment_year: Optional[int] = None,
    use_case=Depends(get_member_payment_status_use_case),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get payment status for a member for the current or specified year.

    Returns all payment types with paid/pending status.
    """
    try:
        result = await use_case.execute(
            member_id=member_id,
            payment_year=payment_year
        )

        return MemberPaymentStatusResponse(
            member_id=result.member_id,
            member_name=result.member_name,
            payment_year=result.payment_year,
            payment_statuses=[
                PaymentTypeStatusResponse(
                    payment_type=s.payment_type,
                    is_paid=s.is_paid,
                    amount=s.amount,
                    payment_date=s.payment_date
                ) for s in result.payment_statuses
            ],
            total_paid=result.total_paid,
            has_all_licenses=result.has_all_licenses,
            has_all_insurances=result.has_all_insurances
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.get("/member/{member_id}/history", response_model=MemberPaymentHistoryResponse)
async def get_member_payment_history(
    member_id: str,
    limit: int = Query(default=100, le=500),
    use_case=Depends(get_member_payment_history_use_case),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get complete payment history for a member.

    Returns all historical payments sorted by year (newest first).
    """
    try:
        result = await use_case.execute(
            member_id=member_id,
            limit=limit
        )

        return MemberPaymentHistoryResponse(
            member_id=result.member_id,
            member_name=result.member_name,
            payments=[
                MemberPaymentResponse(
                    id=p.id,
                    payment_id=p.payment_id,
                    member_id=p.member_id,
                    payment_year=p.payment_year,
                    payment_type=p.payment_type.value,
                    concept=p.concept,
                    amount=p.amount,
                    status=p.status.value,
                    created_at=p.created_at,
                    updated_at=p.updated_at
                ) for p in result.payments
            ],
            total_count=result.total_count
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.get("/club/{club_id}/summary", response_model=ClubPaymentSummaryResponse)
async def get_club_payment_summary(
    club_id: str,
    payment_year: Optional[int] = None,
    use_case=Depends(get_club_payment_summary_use_case),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get payment summary for a club for the current or specified year.

    Returns aggregated stats and member-level payment status.
    """
    try:
        result = await use_case.execute(
            club_id=club_id,
            payment_year=payment_year
        )

        return ClubPaymentSummaryResponse(
            club_id=result.club_id,
            club_name=result.club_name,
            payment_year=result.payment_year,
            total_members=result.total_members,
            members_with_license=result.members_with_license,
            members_with_insurance=result.members_with_insurance,
            total_collected=result.total_collected,
            by_payment_type=[
                PaymentTypeSummaryResponse(
                    payment_type=pt.payment_type,
                    paid_count=pt.paid_count,
                    total_amount=pt.total_amount
                ) for pt in result.by_payment_type
            ],
            members=[
                MemberPaymentSummaryResponse(
                    member_id=m.member_id,
                    member_name=m.member_name,
                    license_paid=m.license_paid,
                    insurance_paid=m.insurance_paid,
                    total_paid=m.total_paid
                ) for m in result.members
            ]
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.get("/club/{club_id}/unpaid", response_model=UnpaidMembersResponse)
async def get_unpaid_members(
    club_id: str,
    payment_year: Optional[int] = None,
    payment_type: Optional[str] = None,
    use_case=Depends(get_unpaid_members_use_case),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get list of members who haven't paid for a specific item type.

    If payment_type is not specified, returns all members without any payment.
    """
    try:
        result = await use_case.execute(
            club_id=club_id,
            payment_year=payment_year,
            payment_type=payment_type
        )

        return UnpaidMembersResponse(
            club_id=result.club_id,
            payment_year=result.payment_year,
            payment_type=result.payment_type,
            unpaid_members=[
                UnpaidMemberResponse(
                    member_id=m.member_id,
                    member_name=m.member_name,
                    email=m.email,
                    dni=m.dni
                ) for m in result.unpaid_members
            ],
            total_count=result.total_count
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
