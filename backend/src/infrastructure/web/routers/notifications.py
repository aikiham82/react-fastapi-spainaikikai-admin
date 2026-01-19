"""Notification management router."""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from src.infrastructure.web.dependencies import get_current_user


router = APIRouter(prefix="/notifications", tags=["notifications"])


class NotificationJobResult(BaseModel):
    """Response model for notification job execution."""

    checked_at: str
    notifications_sent: int
    errors: List[str]
    details: List[dict]


class SchedulerStatus(BaseModel):
    """Response model for scheduler status."""

    running: bool
    next_run: Optional[str] = None
    message: str


@router.post("/send-expiration-reminders", response_model=NotificationJobResult)
async def trigger_expiration_notifications(
    current_user: dict = Depends(get_current_user),
):
    """
    Manually trigger license expiration notifications.

    This endpoint is for admin use to manually trigger the notification job.
    Only association_admin users can trigger this.
    """
    if current_user.get("role") != "association_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only association admins can trigger notifications",
        )

    from src.app import get_scheduler

    scheduler = get_scheduler()
    if not scheduler:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Notification scheduler is not running",
        )

    try:
        result = await scheduler.run_now()
        return NotificationJobResult(**result)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to run notification job: {str(e)}",
        )


@router.get("/scheduler-status", response_model=SchedulerStatus)
async def get_scheduler_status(
    current_user: dict = Depends(get_current_user),
):
    """
    Get the status of the notification scheduler.

    Only association_admin users can view the scheduler status.
    """
    if current_user.get("role") != "association_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only association admins can view scheduler status",
        )

    from src.app import get_scheduler

    scheduler = get_scheduler()
    if not scheduler:
        return SchedulerStatus(
            running=False,
            message="Notification scheduler is disabled or not initialized",
        )

    return SchedulerStatus(
        running=scheduler._running,
        message=f"Scheduler running, daily execution at {scheduler.run_hour:02d}:{scheduler.run_minute:02d} UTC",
    )
