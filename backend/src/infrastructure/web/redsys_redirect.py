"""A short-lived signed link that opens the bank's payment form from the card app."""
from datetime import datetime, timedelta
from html import escape
from typing import Optional

from jose import JWTError, jwt

from src.application.use_cases.payment.initiate_annual_payment_use_case import IN_FLIGHT_MINUTES
from src.infrastructure.web.security import ALGORITHM, SECRET_KEY

REDIRECT_KEY = f"{SECRET_KEY}:redsys-redirect"
FORM_FIELDS = ("payment_url", "ds_signature_version", "ds_merchant_parameters", "ds_signature")


def make_redirect_token(payment_id: str, form: dict, minutes: int = IN_FLIGHT_MINUTES) -> str:
    claims = {field: form[field] for field in FORM_FIELDS}
    claims.update({"payment_id": payment_id, "exp": datetime.utcnow() + timedelta(minutes=minutes)})
    return jwt.encode(claims, REDIRECT_KEY, algorithm=ALGORITHM)


def read_redirect_token(token: str, payment_id: str) -> Optional[dict]:
    try:
        claims = jwt.decode(token, REDIRECT_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None
    if claims.get("payment_id") != payment_id:
        return None
    return claims


def redirect_page(form: dict) -> str:
    fields = {
        "Ds_SignatureVersion": form["ds_signature_version"],
        "Ds_MerchantParameters": form["ds_merchant_parameters"],
        "Ds_Signature": form["ds_signature"],
    }
    inputs = "".join(
        f'<input type="hidden" name="{name}" value="{escape(value, quote=True)}">' for name, value in fields.items()
    )
    return (
        '<!doctype html><html lang="es"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width, initial-scale=1"><title>Pago con tarjeta</title></head>'
        '<body style="font-family:system-ui,sans-serif;text-align:center;padding:48px 16px">'
        f'<form id="redsys" method="POST" action="{escape(form["payment_url"], quote=True)}">{inputs}'
        '<p>Abriendo el banco...</p><button type="submit">Continuar al pago</button></form>'
        "<script>document.getElementById('redsys').submit()</script></body></html>"
    )


def message_page(message: str) -> str:
    return (
        '<!doctype html><html lang="es"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width, initial-scale=1"><title>Pago con tarjeta</title></head>'
        f'<body style="font-family:system-ui,sans-serif;text-align:center;padding:48px 16px"><p>{escape(message)}</p></body></html>'
    )
