"""The repositories behind the charge-once rule: a repeated line never fails a completion."""

import logging
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from bson import ObjectId
from pymongo.errors import BulkWriteError, DuplicateKeyError

from src.domain.entities.member_payment import MemberPayment, MemberPaymentStatus, MemberPaymentType
from src.domain.exceptions.base import BusinessRuleViolationError
from src.infrastructure.adapters.repositories import mongodb_member_payment_repository as lines_module
from src.infrastructure.adapters.repositories import mongodb_payment_repository as payments_module

pytestmark = [pytest.mark.unit, pytest.mark.asyncio]


def line(payment_type, line_id=None):
    return MemberPayment(
        id=line_id, payment_id="payment-1", member_id="member-1", payment_year=2027, payment_type=payment_type,
        concept="line", amount=15, status=MemberPaymentStatus.COMPLETED,
    )


def lines_repository(collection):
    with patch.object(lines_module, "get_database", return_value={"member_payments": collection}):
        return lines_module.MongoDBMemberPaymentRepository()


def collection_refusing(indexes, code=11000):
    stored = []

    async def insert_many(docs, ordered=True):
        assert ordered is False
        for doc in docs:
            doc["_id"] = ObjectId()
        stored.extend(doc for index, doc in enumerate(docs) if index not in indexes)
        raise BulkWriteError({"writeErrors": [{"index": index, "code": code} for index in indexes]})

    collection = MagicMock()
    collection.insert_many = insert_many
    collection.find.side_effect = lambda query: MagicMock(
        to_list=AsyncMock(return_value=[doc for doc in stored if doc["_id"] in query["_id"]["$in"]])
    )
    return collection


async def test_a_repeated_line_is_left_out_the_others_are_kept_and_it_is_reported(caplog):
    repository = lines_repository(collection_refusing({0}))

    with caplog.at_level(logging.ERROR):
        created = await repository.create_bulk(
            [line(MemberPaymentType.LICENCIA_KYU), line(MemberPaymentType.LICENCIA_DAN)]
        )

    assert [created_line.payment_type for created_line in created] == [MemberPaymentType.LICENCIA_DAN]
    report = caplog.records[-1].getMessage()
    assert "payment-1" in report and "member-1" in report and "licencia_kyu" in report


async def test_any_other_write_error_still_raises():
    repository = lines_repository(collection_refusing({0}, code=121))

    with pytest.raises(BulkWriteError):
        await repository.create_bulk([line(MemberPaymentType.LICENCIA_KYU)])


async def test_an_update_onto_a_completed_line_answers_a_business_error():
    collection = MagicMock()
    collection.update_one = AsyncMock(side_effect=DuplicateKeyError("repeated"))
    repository = lines_repository(collection)

    with pytest.raises(BusinessRuleViolationError):
        await repository.update(line(MemberPaymentType.LICENCIA_KYU, str(ObjectId())))


async def test_unfinished_annual_payments_are_looked_up_by_club_type_status_and_date():
    captured = {}

    def find(query):
        captured.update(query)
        cursor = MagicMock()
        cursor.__aiter__.return_value = iter(())
        return cursor

    collection = MagicMock()
    collection.find.side_effect = find
    with patch.object(payments_module, "get_database", return_value={"transactions": collection}):
        repository = payments_module.MongoDBPaymentRepository()
    since = datetime(2026, 11, 4, 12, 0)

    assert await repository.find_unfinished_annual("club-1", since) == []

    assert captured == {
        "club_id": "club-1",
        "payment_type": "annual_quota",
        "status": {"$in": ["pending", "processing"]},
        "created_at": {"$gte": since},
    }


async def test_unfinished_exam_payments_are_looked_up_by_member_type_status_and_date():
    captured = {}

    def find(query):
        captured.update(query)
        cursor = MagicMock()
        cursor.__aiter__.return_value = iter(())
        return cursor

    collection = MagicMock()
    collection.find.side_effect = find
    with patch.object(payments_module, "get_database", return_value={"transactions": collection}):
        repository = payments_module.MongoDBPaymentRepository()
    since = datetime(2026, 11, 6, 11, 40)

    assert await repository.find_unfinished_exams("member-1", since) == []

    assert captured == {
        "member_id": "member-1",
        "payment_type": "exam_fee",
        "status": {"$in": ["pending", "processing"]},
        "created_at": {"$gte": since},
    }
