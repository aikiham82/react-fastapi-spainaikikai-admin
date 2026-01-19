"""Use case for sending license expiration notifications."""
from datetime import datetime, timedelta
from typing import List
import logging

from src.application.ports.license_repository import LicenseRepositoryPort
from src.application.ports.member_repository import MemberRepositoryPort
from src.application.ports.email_service import EmailServicePort, EmailMessage
from src.domain.entities.license import License

logger = logging.getLogger(__name__)


class SendLicenseExpirationNotificationsUseCase:
    """
    Use case to send email notifications for expiring licenses.

    Sends notifications at 30, 15, and 7 days before license expiration.
    """

    def __init__(
        self,
        license_repository: LicenseRepositoryPort,
        member_repository: MemberRepositoryPort,
        email_service: EmailServicePort,
    ):
        self.license_repository = license_repository
        self.member_repository = member_repository
        self.email_service = email_service
        self.notification_days = [30, 15, 7]

    async def execute(self) -> dict:
        """
        Execute the notification sending process.

        Returns a summary of notifications sent.
        """
        results = {
            "checked_at": datetime.utcnow().isoformat(),
            "notifications_sent": 0,
            "errors": [],
            "details": [],
        }

        today = datetime.utcnow().date()

        for days_before in self.notification_days:
            target_date = today + timedelta(days=days_before)

            try:
                expiring_licenses = await self._get_licenses_expiring_on(target_date)

                for license in expiring_licenses:
                    try:
                        await self._send_notification(license, days_before)
                        results["notifications_sent"] += 1
                        results["details"].append({
                            "license_id": license.id,
                            "member_id": license.member_id,
                            "days_until_expiry": days_before,
                            "status": "sent",
                        })
                    except Exception as e:
                        error_msg = f"Failed to send notification for license {license.id}: {str(e)}"
                        logger.error(error_msg)
                        results["errors"].append(error_msg)
                        results["details"].append({
                            "license_id": license.id,
                            "member_id": license.member_id,
                            "days_until_expiry": days_before,
                            "status": "failed",
                            "error": str(e),
                        })

            except Exception as e:
                error_msg = f"Failed to fetch licenses expiring in {days_before} days: {str(e)}"
                logger.error(error_msg)
                results["errors"].append(error_msg)

        logger.info(
            f"License expiration notification job completed. "
            f"Sent: {results['notifications_sent']}, Errors: {len(results['errors'])}"
        )

        return results

    async def _get_licenses_expiring_on(self, target_date) -> List[License]:
        """Get all active licenses expiring on the target date."""
        all_licenses = await self.license_repository.find_all()

        expiring = []
        for license in all_licenses:
            if license.end_date and license.status == "active":
                if license.end_date.date() == target_date:
                    expiring.append(license)

        return expiring

    async def _send_notification(self, license: License, days_before: int) -> None:
        """Send expiration notification email to the member."""
        member = await self.member_repository.find_by_id(license.member_id)
        if not member:
            logger.warning(f"Member not found for license {license.id}")
            return

        if not member.email:
            logger.warning(f"Member {member.id} has no email address")
            return

        subject = self._get_email_subject(days_before)
        body_html = self._get_email_body(member, license, days_before)

        email = EmailMessage(
            to=[member.email],
            subject=subject,
            body_html=body_html,
        )

        await self.email_service.send_email(email)
        logger.info(f"Sent {days_before}-day expiration notice to {member.email} for license {license.license_number}")

    def _get_email_subject(self, days_before: int) -> str:
        """Generate email subject based on days until expiration."""
        if days_before <= 7:
            urgency = "URGENTE: "
        elif days_before <= 15:
            urgency = "AVISO: "
        else:
            urgency = ""

        return f"{urgency}Tu licencia federativa caduca en {days_before} dias"

    def _get_email_body(self, member, license: License, days_before: int) -> str:
        """Generate email body HTML."""
        expiry_date = license.end_date.strftime("%d/%m/%Y") if license.end_date else "N/A"

        urgency_class = "urgent" if days_before <= 7 else "warning" if days_before <= 15 else "info"

        return f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: #1e3a5f; color: white; padding: 20px; text-align: center; }}
        .content {{ padding: 30px; background: #f9f9f9; }}
        .urgent {{ background: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; }}
        .warning {{ background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }}
        .info {{ background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; }}
        .details {{ background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }}
        .details p {{ margin: 8px 0; }}
        .btn {{ display: inline-block; background: #1e3a5f; color: white; padding: 12px 24px;
                text-decoration: none; border-radius: 6px; margin-top: 20px; }}
        .footer {{ text-align: center; padding: 20px; color: #666; font-size: 12px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Spain Aikikai</h1>
        </div>
        <div class="content">
            <p>Estimado/a {member.first_name} {member.last_name},</p>

            <div class="{urgency_class}">
                <strong>Tu licencia federativa caducara en {days_before} dias.</strong>
            </div>

            <div class="details">
                <p><strong>Numero de licencia:</strong> {license.license_number or 'N/A'}</p>
                <p><strong>Fecha de caducidad:</strong> {expiry_date}</p>
                <p><strong>Tipo:</strong> {license.license_type or 'Estandar'}</p>
            </div>

            <p>Para renovar tu licencia, por favor contacta con tu club o accede a la plataforma de gestion.</p>

            <p>Si ya has renovado tu licencia, puedes ignorar este mensaje.</p>

            <p>Saludos cordiales,<br>
            Equipo de Spain Aikikai</p>
        </div>
        <div class="footer">
            <p>Este es un mensaje automatico. Por favor, no responda a este correo.</p>
            <p>&copy; {datetime.utcnow().year} Spain Aikikai. Todos los derechos reservados.</p>
        </div>
    </div>
</body>
</html>
"""
