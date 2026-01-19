"""Redsys Payment Gateway Service Implementation."""

import base64
import hashlib
import hmac
import json
import re
from typing import Optional
from Crypto.Cipher import DES3

from src.application.ports.redsys_service import (
    RedsysServicePort,
    RedsysPaymentRequest,
    RedsysPaymentFormData,
    RedsysNotificationData,
    RedsysTransactionType
)
from src.config.settings import get_redsys_settings
from src.domain.exceptions.payment import (
    RedsysEncryptionError,
    RedsysSignatureError,
    RedsysPaymentError
)


# Redsys response codes mapping
REDSYS_RESPONSE_CODES = {
    "0000": "Transaccion aprobada",
    "0001": "Transaccion aprobada previa identificacion del titular",
    "0002": "Transaccion aprobada con autenticacion reforzada",
    "0099": "Sesion interrumpida",
    "0101": "Tarjeta caducada",
    "0102": "Tarjeta bloqueada temporalmente",
    "0104": "Operacion no permitida",
    "0106": "Intentos de PIN excedidos",
    "0107": "Contactar con el emisor",
    "0109": "Identificacion invalida del comercio o terminal",
    "0110": "Importe invalido",
    "0114": "Tarjeta no soporta el tipo de operacion",
    "0116": "Saldo insuficiente",
    "0117": "PIN incorrecto",
    "0118": "Tarjeta no registrada",
    "0125": "Tarjeta no efectiva",
    "0129": "Codigo de seguridad (CVV2/CVC2) incorrecto",
    "0167": "Contactar con el emisor: sospecha de fraude",
    "0180": "Tarjeta fuera de servicio",
    "0184": "Error en autenticacion del titular",
    "0190": "Denegacion sin especificar motivo",
    "0191": "Fecha de caducidad erronea",
    "0195": "Requiere autenticacion SCA",
    "0202": "Tarjeta bloqueada por posible fraude",
    "0904": "Error en formato del mensaje",
    "0909": "Error de sistema",
    "0912": "Emisor no disponible",
    "0913": "Transaccion duplicada",
    "0944": "Sesion incorrecta",
    "0950": "Operacion de devolucion no permitida",
    "9064": "Numero de posiciones de la tarjeta incorrecto",
    "9078": "No existe metodo de pago valido",
    "9093": "Tarjeta no existente",
    "9094": "Rechazo de servidores internacionales",
    "9104": "Comercio con propietario de la tarjeta en base de datos de fraude",
    "9218": "El comercio no permite operaciones seguras por entrada /LVP",
    "9253": "Tarjeta no cumple check-digit",
    "9256": "El comercio no puede realizar preautorizaciones",
    "9257": "La tarjeta no permite preautorizaciones",
    "9261": "Supera el limite de operaciones diarias",
    "9912": "Emisor no disponible",
    "9913": "Error en confirmacion del envio del mensaje",
    "9914": "Confirmacion KO",
    "9915": "Usuario cancelado",
    "9928": "Autorizacion en diferido anulada por el usuario",
    "9997": "En proceso de otra transaccion en el SIS",
    "9998": "En proceso de solicitar autenticacion",
    "9999": "En proceso de autenticacion biometrica",
}


class RedsysService(RedsysServicePort):
    """Implementation of Redsys payment gateway service."""

    def __init__(self):
        self.settings = get_redsys_settings()
        self._signature_version = "HMAC_SHA256_V1"

    def _base64_url_decode(self, data: str) -> bytes:
        """Decode URL-safe base64."""
        # Add padding if needed
        padding = 4 - len(data) % 4
        if padding != 4:
            data += "=" * padding
        # Replace URL-safe chars with standard base64
        data = data.replace("-", "+").replace("_", "/")
        return base64.b64decode(data)

    def _base64_url_encode(self, data: bytes) -> str:
        """Encode to URL-safe base64."""
        encoded = base64.b64encode(data).decode("utf-8")
        # Remove padding and replace standard base64 chars with URL-safe
        return encoded.rstrip("=").replace("+", "-").replace("/", "_")

    def _encrypt_3des(self, data: bytes, key: bytes) -> bytes:
        """Encrypt data using 3DES CBC mode."""
        try:
            # Pad data to 8-byte boundary
            padding_length = 8 - (len(data) % 8)
            if padding_length != 8:
                data += bytes([0] * padding_length)

            # Create cipher with zero IV
            iv = bytes([0] * 8)
            cipher = DES3.new(key, DES3.MODE_CBC, iv)
            return cipher.encrypt(data)
        except Exception as e:
            raise RedsysEncryptionError(f"3DES encryption failed: {str(e)}")

    def _decrypt_3des(self, data: bytes, key: bytes) -> bytes:
        """Decrypt data using 3DES CBC mode."""
        try:
            iv = bytes([0] * 8)
            cipher = DES3.new(key, DES3.MODE_CBC, iv)
            return cipher.decrypt(data)
        except Exception as e:
            raise RedsysEncryptionError(f"3DES decryption failed: {str(e)}")

    def _get_diversified_key(self, order_id: str) -> bytes:
        """Get diversified key for a specific order."""
        key = base64.b64decode(self.settings.secret_key)
        order_bytes = order_id.encode("utf-8")
        return self._encrypt_3des(order_bytes, key)

    def _calculate_signature(self, params_b64: str, order_id: str) -> str:
        """Calculate HMAC-SHA256 signature."""
        try:
            diversified_key = self._get_diversified_key(order_id)
            signature = hmac.new(
                diversified_key,
                params_b64.encode("utf-8"),
                hashlib.sha256
            ).digest()
            return base64.b64encode(signature).decode("utf-8")
        except Exception as e:
            raise RedsysEncryptionError(f"Signature calculation failed: {str(e)}")

    def generate_order_id(self, payment_id: str) -> str:
        """
        Generate a Redsys-compatible order ID.
        Format: 4 numeric chars + alphanumeric (4-12 total length).
        """
        # Use timestamp-based prefix (last 4 digits of timestamp)
        import time
        timestamp = str(int(time.time()))[-4:]

        # Clean payment_id to alphanumeric only, take first 8 chars
        clean_id = re.sub(r"[^a-zA-Z0-9]", "", payment_id)[:8]

        return f"{timestamp}{clean_id}"

    def get_response_message(self, response_code: str) -> str:
        """Get human-readable message for a response code."""
        # Normalize response code
        code = response_code.zfill(4) if response_code else "9999"
        return REDSYS_RESPONSE_CODES.get(code, f"Codigo de respuesta desconocido: {code}")

    async def create_payment_form_data(
        self,
        request: RedsysPaymentRequest
    ) -> RedsysPaymentFormData:
        """Create the form data for submitting a payment to Redsys."""
        try:
            # Build merchant parameters
            params = {
                "DS_MERCHANT_AMOUNT": str(request.amount_cents),
                "DS_MERCHANT_ORDER": request.order_id,
                "DS_MERCHANT_MERCHANTCODE": self.settings.merchant_code,
                "DS_MERCHANT_CURRENCY": self.settings.currency,
                "DS_MERCHANT_TRANSACTIONTYPE": request.transaction_type.value,
                "DS_MERCHANT_TERMINAL": self.settings.terminal,
                "DS_MERCHANT_MERCHANTURL": request.merchant_url,
                "DS_MERCHANT_URLOK": request.ok_url,
                "DS_MERCHANT_URLKO": request.ko_url,
                "DS_MERCHANT_CONSUMERLANGUAGE": request.consumer_language,
            }

            if request.product_description:
                params["DS_MERCHANT_PRODUCTDESCRIPTION"] = request.product_description[:125]

            # Encode parameters
            params_json = json.dumps(params)
            params_b64 = base64.b64encode(params_json.encode("utf-8")).decode("utf-8")

            # Calculate signature
            signature = self._calculate_signature(params_b64, request.order_id)

            return RedsysPaymentFormData(
                payment_url=self.settings.payment_url,
                ds_signature_version=self._signature_version,
                ds_merchant_parameters=params_b64,
                ds_signature=signature
            )
        except RedsysEncryptionError:
            raise
        except Exception as e:
            raise RedsysPaymentError(f"Failed to create payment form data: {str(e)}")

    async def verify_notification_signature(
        self,
        ds_signature: str,
        ds_merchant_parameters: str
    ) -> bool:
        """Verify the signature of a Redsys notification."""
        try:
            # Decode parameters to get order ID
            params_json = base64.b64decode(ds_merchant_parameters).decode("utf-8")
            params = json.loads(params_json)
            order_id = params.get("Ds_Order", "")

            # Calculate expected signature
            expected_signature = self._calculate_signature(ds_merchant_parameters, order_id)

            # Normalize signatures for comparison (handle URL-safe base64)
            def normalize_signature(sig: str) -> str:
                sig = sig.replace("-", "+").replace("_", "/")
                # Add padding if needed
                padding = 4 - len(sig) % 4
                if padding != 4:
                    sig += "=" * padding
                return sig

            normalized_received = normalize_signature(ds_signature)
            normalized_expected = normalize_signature(expected_signature)

            return hmac.compare_digest(normalized_received, normalized_expected)
        except Exception as e:
            raise RedsysSignatureError(f"Signature verification failed: {str(e)}")

    async def parse_notification(
        self,
        ds_merchant_parameters: str
    ) -> RedsysNotificationData:
        """Parse the merchant parameters from a Redsys notification."""
        try:
            params_json = base64.b64decode(ds_merchant_parameters).decode("utf-8")
            params = json.loads(params_json)

            # Extract required fields
            order_id = params.get("Ds_Order", "")
            response_code = params.get("Ds_Response", "9999")
            amount = int(params.get("Ds_Amount", 0))
            currency = params.get("Ds_Currency", "978")
            transaction_type = params.get("Ds_TransactionType", "0")
            merchant_code = params.get("Ds_MerchantCode", "")
            terminal = params.get("Ds_Terminal", "")
            authorization_code = params.get("Ds_AuthorisationCode")
            secure_payment = params.get("Ds_SecurePayment", "0") == "1"
            card_country = params.get("Ds_Card_Country")
            card_brand = params.get("Ds_Card_Brand")
            error_code = params.get("Ds_ErrorCode")

            return RedsysNotificationData(
                order_id=order_id,
                authorization_code=authorization_code,
                response_code=response_code,
                amount_cents=amount,
                currency=currency,
                transaction_type=transaction_type,
                merchant_code=merchant_code,
                terminal=terminal,
                secure_payment=secure_payment,
                card_country=card_country,
                card_brand=card_brand,
                error_code=error_code
            )
        except json.JSONDecodeError as e:
            raise RedsysPaymentError(f"Invalid notification format: {str(e)}")
        except Exception as e:
            raise RedsysPaymentError(f"Failed to parse notification: {str(e)}")

    async def process_refund(
        self,
        original_order_id: str,
        refund_amount_cents: int,
        refund_order_id: str
    ) -> RedsysPaymentFormData:
        """Create form data for processing a refund."""
        try:
            params = {
                "DS_MERCHANT_AMOUNT": str(refund_amount_cents),
                "DS_MERCHANT_ORDER": refund_order_id,
                "DS_MERCHANT_MERCHANTCODE": self.settings.merchant_code,
                "DS_MERCHANT_CURRENCY": self.settings.currency,
                "DS_MERCHANT_TRANSACTIONTYPE": RedsysTransactionType.REFUND.value,
                "DS_MERCHANT_TERMINAL": self.settings.terminal,
                "DS_MERCHANT_ORIGINALORDER": original_order_id,
            }

            params_json = json.dumps(params)
            params_b64 = base64.b64encode(params_json.encode("utf-8")).decode("utf-8")
            signature = self._calculate_signature(params_b64, refund_order_id)

            return RedsysPaymentFormData(
                payment_url=self.settings.payment_url,
                ds_signature_version=self._signature_version,
                ds_merchant_parameters=params_b64,
                ds_signature=signature
            )
        except Exception as e:
            raise RedsysPaymentError(f"Failed to create refund form data: {str(e)}")
