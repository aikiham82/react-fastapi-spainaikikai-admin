from sentry_sdk import logger


def audit(event: str, level: str = "info", **attributes) -> None:
    getattr(logger, level)(event, attributes=attributes)
