"""Audit events sent to Sentry Logs: who signed in, who could not, and who changed whose access.

They carry ids and reasons only, never what a person typed: an identifier can be an email.
Attribute values avoid words like "password" or "auth": Sentry's default scrubber turns any
value containing them into [Filtered]. The event name travels as the message, which is kept.
"""

from sentry_sdk import logger


def audit(event: str, level: str = "info", **attributes) -> None:
    getattr(logger, level)(event, attributes=attributes)
