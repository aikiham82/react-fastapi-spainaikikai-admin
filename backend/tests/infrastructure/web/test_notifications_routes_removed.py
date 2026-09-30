"""The licence expiration mass email has no manual HTTP trigger."""

import pytest
from fastapi import status
from fastapi.testclient import TestClient

from src.app import create_app

pytestmark = pytest.mark.unit

REMINDERS_PATH = "/api/v1/notifications/send-expiration-reminders"
SCHEDULER_STATUS_PATH = "/api/v1/notifications/scheduler-status"


@pytest.fixture
def app():
    return create_app()


def test_notification_paths_are_not_in_the_openapi_schema(app):
    paths = app.openapi()["paths"]

    assert REMINDERS_PATH not in paths
    assert SCHEDULER_STATUS_PATH not in paths


def test_triggering_reminders_answers_not_found(app):
    response = TestClient(app).post(REMINDERS_PATH)

    assert response.status_code == status.HTTP_404_NOT_FOUND
