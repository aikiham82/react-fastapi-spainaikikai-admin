import os
import re

import sentry_sdk

EMAIL_PATTERN = re.compile(r"(?<![\w.+-])[\w.+-]+(?:@|%40)[\w-]+(?:\.[\w-]+)+")


def _redact_emails(value):
    if isinstance(value, str):
        return EMAIL_PATTERN.sub("[email]", value)
    if isinstance(value, dict):
        return {_redact_emails(key): _redact_emails(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [_redact_emails(item) for item in value]
    return value


def before_send(event, hint):
    return _redact_emails(event)


def before_breadcrumb(crumb, hint):
    return _redact_emails(crumb)


def configure_sentry() -> bool:
    dsn = os.getenv("SENTRY_DSN")
    if not dsn:
        return False

    sentry_sdk.init(
        dsn=dsn,
        environment=os.getenv("ENVIRONMENT") or "development",
        traces_sample_rate=float(os.getenv("SENTRY_TRACES_SAMPLE_RATE", "0")),
        send_default_pii=False,
        before_send=before_send,
        before_send_transaction=before_send,
        before_breadcrumb=before_breadcrumb,
    )
    return True
