"""Background scheduler for sending notifications."""
import asyncio
import logging
from datetime import datetime, time
from typing import Optional
import os

logger = logging.getLogger(__name__)


class NotificationScheduler:
    """
    Background scheduler for license expiration notifications.

    Runs daily at a configured time (default: 08:00 UTC) to check for
    expiring licenses and send notifications.
    """

    def __init__(
        self,
        notification_use_case,
        run_hour: int = 8,
        run_minute: int = 0,
    ):
        self.notification_use_case = notification_use_case
        self.run_hour = run_hour
        self.run_minute = run_minute
        self._task: Optional[asyncio.Task] = None
        self._running = False

    async def start(self) -> None:
        """Start the background scheduler."""
        if self._running:
            logger.warning("Notification scheduler is already running")
            return

        self._running = True
        self._task = asyncio.create_task(self._scheduler_loop())
        logger.info(
            f"Notification scheduler started. Will run daily at {self.run_hour:02d}:{self.run_minute:02d} UTC"
        )

    async def stop(self) -> None:
        """Stop the background scheduler."""
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("Notification scheduler stopped")

    async def run_now(self) -> dict:
        """Run the notification job immediately (for testing/manual trigger)."""
        logger.info("Running notification job manually")
        return await self.notification_use_case.execute()

    async def _scheduler_loop(self) -> None:
        """Main scheduler loop that runs the job at the configured time."""
        while self._running:
            try:
                now = datetime.utcnow()
                target_time = now.replace(
                    hour=self.run_hour,
                    minute=self.run_minute,
                    second=0,
                    microsecond=0,
                )

                # If we've passed today's run time, schedule for tomorrow
                if now >= target_time:
                    target_time = target_time.replace(day=target_time.day + 1)

                wait_seconds = (target_time - now).total_seconds()
                logger.debug(f"Next notification run scheduled in {wait_seconds:.0f} seconds")

                # Wait until the scheduled time
                await asyncio.sleep(wait_seconds)

                if self._running:
                    try:
                        result = await self.notification_use_case.execute()
                        logger.info(
                            f"Notification job completed: {result['notifications_sent']} sent, "
                            f"{len(result['errors'])} errors"
                        )
                    except Exception as e:
                        logger.error(f"Error running notification job: {e}")

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in scheduler loop: {e}")
                # Wait a bit before retrying to avoid tight loops on errors
                await asyncio.sleep(60)


def create_notification_scheduler():
    """
    Factory function to create the notification scheduler with dependencies.

    Returns None if scheduler is disabled via environment variable.
    """
    if os.getenv("DISABLE_SCHEDULER", "").lower() in ("true", "1", "yes"):
        logger.info("Notification scheduler disabled via environment variable")
        return None

    # Import here to avoid circular imports
    from src.infrastructure.web.dependencies import (
        get_license_repository,
        get_member_repository,
        get_email_service,
    )
    from src.application.use_cases.notification import SendLicenseExpirationNotificationsUseCase

    license_repo = get_license_repository()
    member_repo = get_member_repository()
    email_service = get_email_service()

    notification_use_case = SendLicenseExpirationNotificationsUseCase(
        license_repository=license_repo,
        member_repository=member_repo,
        email_service=email_service,
    )

    run_hour = int(os.getenv("NOTIFICATION_HOUR", "8"))
    run_minute = int(os.getenv("NOTIFICATION_MINUTE", "0"))

    return NotificationScheduler(
        notification_use_case=notification_use_case,
        run_hour=run_hour,
        run_minute=run_minute,
    )
