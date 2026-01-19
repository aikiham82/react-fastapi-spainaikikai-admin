"""Email Service Implementation using OVH SMTP."""

import smtplib
import ssl
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
from typing import Optional
from jinja2 import Environment, BaseLoader

from src.application.ports.email_service import (
    EmailServicePort,
    EmailMessage,
    EmailAttachment
)
from src.config.settings import get_email_settings

logger = logging.getLogger(__name__)


# Email templates
PAYMENT_CONFIRMATION_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9fafb; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        .amount { font-size: 24px; font-weight: bold; color: #059669; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Confirmacion de Pago</h1>
        </div>
        <div class="content">
            <p>Estimado/a <strong>{{ member_name }}</strong>,</p>
            <p>Le confirmamos que hemos recibido su pago correctamente.</p>
            <p><strong>Detalles del pago:</strong></p>
            <ul>
                <li>Concepto: {{ license_type }}</li>
                <li>Importe: <span class="amount">{{ payment_amount }} EUR</span></li>
            </ul>
            <p>Si tiene alguna pregunta, no dude en contactarnos.</p>
        </div>
        <div class="footer">
            <p>Este es un correo automatico, por favor no responda a este mensaje.</p>
        </div>
    </div>
</body>
</html>
"""

LICENSE_EXPIRATION_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f59e0b; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9fafb; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        .warning { color: #dc2626; font-weight: bold; }
        .btn { display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Aviso de Vencimiento de Licencia</h1>
        </div>
        <div class="content">
            <p>Estimado/a <strong>{{ member_name }}</strong>,</p>
            <p class="warning">Su licencia vencera en {{ days_remaining }} dias.</p>
            <p><strong>Detalles de la licencia:</strong></p>
            <ul>
                <li>Numero de licencia: {{ license_number }}</li>
                <li>Fecha de vencimiento: {{ expiration_date }}</li>
            </ul>
            <p>Le recomendamos renovar su licencia lo antes posible para evitar interrupciones.</p>
            <a href="{{ renewal_url }}" class="btn">Renovar Licencia</a>
        </div>
        <div class="footer">
            <p>Este es un correo automatico, por favor no responda a este mensaje.</p>
        </div>
    </div>
</body>
</html>
"""

PAYMENT_FAILED_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9fafb; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        .error { background: #fef2f2; border-left: 4px solid #dc2626; padding: 10px; margin: 10px 0; }
        .btn { display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Error en el Pago</h1>
        </div>
        <div class="content">
            <p>Estimado/a <strong>{{ member_name }}</strong>,</p>
            <p>Lamentamos informarle que su pago no ha podido ser procesado.</p>
            <div class="error">
                <strong>Motivo:</strong> {{ error_message }}
            </div>
            <p>Por favor, intente realizar el pago nuevamente o contacte con su entidad bancaria.</p>
            <a href="{{ retry_url }}" class="btn">Intentar de Nuevo</a>
        </div>
        <div class="footer">
            <p>Este es un correo automatico, por favor no responda a este mensaje.</p>
        </div>
    </div>
</body>
</html>
"""

INVOICE_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9fafb; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Factura {{ invoice_number }}</h1>
        </div>
        <div class="content">
            <p>Estimado/a <strong>{{ member_name }}</strong>,</p>
            <p>Adjunto encontrara la factura correspondiente a su pago.</p>
            <p><strong>Numero de factura:</strong> {{ invoice_number }}</p>
            <p>Guarde este documento para su contabilidad.</p>
        </div>
        <div class="footer">
            <p>Este es un correo automatico, por favor no responda a este mensaje.</p>
        </div>
    </div>
</body>
</html>
"""

PASSWORD_RESET_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9fafb; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        .btn { display: inline-block; padding: 14px 28px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
        .btn:hover { background: #1d4ed8; }
        .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 10px; margin: 15px 0; font-size: 14px; }
        .link-fallback { word-break: break-all; font-size: 12px; color: #666; margin-top: 15px; padding: 10px; background: #f3f4f6; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Restablecer Contrasena</h1>
        </div>
        <div class="content">
            <p>Hola <strong>{{ user_name }}</strong>,</p>
            <p>Hemos recibido una solicitud para restablecer la contrasena de tu cuenta.</p>
            <p>Haz clic en el siguiente boton para crear una nueva contrasena:</p>
            <p style="text-align: center;">
                <a href="{{ reset_url }}" class="btn">Restablecer Contrasena</a>
            </p>
            <div class="warning">
                <strong>Importante:</strong> Este enlace expirara en 24 horas. Si no solicitaste este cambio, puedes ignorar este correo.
            </div>
            <div class="link-fallback">
                <p>Si el boton no funciona, copia y pega el siguiente enlace en tu navegador:</p>
                <p>{{ reset_url }}</p>
            </div>
        </div>
        <div class="footer">
            <p>Este es un correo automatico, por favor no responda a este mensaje.</p>
            <p>Si no solicitaste restablecer tu contrasena, ignora este correo.</p>
        </div>
    </div>
</body>
</html>
"""


class EmailService(EmailServicePort):
    """Email service using OVH SMTP."""

    def __init__(self):
        self.settings = get_email_settings()
        self.jinja_env = Environment(loader=BaseLoader())

    def _render_template(self, template: str, **kwargs) -> str:
        """Render a Jinja2 template with the given context."""
        tmpl = self.jinja_env.from_string(template)
        return tmpl.render(**kwargs)

    def _build_mime_message(self, message: EmailMessage) -> MIMEMultipart:
        """Build a MIME message for SMTP sending."""
        msg = MIMEMultipart("mixed")
        msg["Subject"] = message.subject
        msg["From"] = f"{self.settings.from_name} <{self.settings.from_email}>"
        msg["To"] = ", ".join(message.to)

        if message.cc:
            msg["Cc"] = ", ".join(message.cc)
        if message.reply_to:
            msg["Reply-To"] = message.reply_to

        # Create alternative container for text/html
        alt_part = MIMEMultipart("alternative")

        # Add text part
        if message.body_text:
            text_part = MIMEText(message.body_text, "plain", "utf-8")
            alt_part.attach(text_part)

        # Add HTML part
        html_part = MIMEText(message.body_html, "html", "utf-8")
        alt_part.attach(html_part)

        msg.attach(alt_part)

        # Add attachments
        if message.attachments:
            for attachment in message.attachments:
                att_part = MIMEApplication(attachment.content)
                att_part.add_header(
                    "Content-Disposition",
                    "attachment",
                    filename=attachment.filename
                )
                att_part.add_header("Content-Type", attachment.content_type)
                msg.attach(att_part)

        return msg

    async def send_email(self, message: EmailMessage) -> bool:
        """Send email via OVH SMTP."""
        if not self.settings.is_configured:
            logger.error("SMTP settings not configured")
            return False

        try:
            msg = self._build_mime_message(message)

            # Get all recipients
            recipients = list(message.to)
            if message.cc:
                recipients.extend(message.cc)
            if message.bcc:
                recipients.extend(message.bcc)

            # Create SSL context for secure connection
            context = ssl.create_default_context()

            if self.settings.smtp_use_ssl:
                # Use SMTP_SSL for port 465
                with smtplib.SMTP_SSL(
                    self.settings.smtp_host,
                    self.settings.smtp_port,
                    context=context
                ) as server:
                    server.login(self.settings.smtp_user, self.settings.smtp_password)
                    server.sendmail(
                        self.settings.from_email,
                        recipients,
                        msg.as_string()
                    )
            else:
                # Use SMTP with STARTTLS for port 587
                with smtplib.SMTP(
                    self.settings.smtp_host,
                    self.settings.smtp_port
                ) as server:
                    server.starttls(context=context)
                    server.login(self.settings.smtp_user, self.settings.smtp_password)
                    server.sendmail(
                        self.settings.from_email,
                        recipients,
                        msg.as_string()
                    )

            logger.info(f"Email sent via OVH SMTP to {message.to}")
            return True

        except Exception as e:
            logger.error(f"Failed to send email: {str(e)}")
            return False

    async def send_payment_confirmation(
        self,
        to_email: str,
        member_name: str,
        payment_amount: float,
        license_type: str,
        invoice_pdf: Optional[bytes] = None
    ) -> bool:
        """Send payment confirmation email."""
        html_body = self._render_template(
            PAYMENT_CONFIRMATION_TEMPLATE,
            member_name=member_name,
            payment_amount=f"{payment_amount:.2f}",
            license_type=license_type
        )

        attachments = []
        if invoice_pdf:
            attachments.append(EmailAttachment(
                filename="factura.pdf",
                content=invoice_pdf,
                content_type="application/pdf"
            ))

        message = EmailMessage(
            to=[to_email],
            subject="Confirmacion de Pago - Licencia Federativa",
            body_html=html_body,
            attachments=attachments if attachments else None
        )

        return await self.send_email(message)

    async def send_license_expiration_reminder(
        self,
        to_email: str,
        member_name: str,
        license_number: str,
        expiration_date: str,
        days_remaining: int,
        renewal_url: str
    ) -> bool:
        """Send license expiration reminder email."""
        html_body = self._render_template(
            LICENSE_EXPIRATION_TEMPLATE,
            member_name=member_name,
            license_number=license_number,
            expiration_date=expiration_date,
            days_remaining=days_remaining,
            renewal_url=renewal_url
        )

        message = EmailMessage(
            to=[to_email],
            subject=f"Aviso: Su licencia vence en {days_remaining} dias",
            body_html=html_body
        )

        return await self.send_email(message)

    async def send_payment_failed_notification(
        self,
        to_email: str,
        member_name: str,
        error_message: str,
        retry_url: str
    ) -> bool:
        """Send payment failed notification email."""
        html_body = self._render_template(
            PAYMENT_FAILED_TEMPLATE,
            member_name=member_name,
            error_message=error_message,
            retry_url=retry_url
        )

        message = EmailMessage(
            to=[to_email],
            subject="Error en el Pago - Accion Requerida",
            body_html=html_body
        )

        return await self.send_email(message)

    async def send_invoice(
        self,
        to_email: str,
        member_name: str,
        invoice_number: str,
        invoice_pdf: bytes
    ) -> bool:
        """Send invoice email with PDF attachment."""
        html_body = self._render_template(
            INVOICE_TEMPLATE,
            member_name=member_name,
            invoice_number=invoice_number
        )

        message = EmailMessage(
            to=[to_email],
            subject=f"Factura {invoice_number}",
            body_html=html_body,
            attachments=[EmailAttachment(
                filename=f"factura_{invoice_number}.pdf",
                content=invoice_pdf,
                content_type="application/pdf"
            )]
        )

        return await self.send_email(message)

    async def send_password_reset_email(
        self,
        to_email: str,
        user_name: str,
        reset_url: str
    ) -> bool:
        """Send password reset email with reset link."""
        html_body = self._render_template(
            PASSWORD_RESET_TEMPLATE,
            user_name=user_name,
            reset_url=reset_url
        )

        message = EmailMessage(
            to=[to_email],
            subject="Restablecer Contrasena - Spain Aikikai",
            body_html=html_body,
            body_text=f"Hola {user_name},\n\nHaz clic en el siguiente enlace para restablecer tu contrasena:\n{reset_url}\n\nEste enlace expirara en 24 horas."
        )

        return await self.send_email(message)
