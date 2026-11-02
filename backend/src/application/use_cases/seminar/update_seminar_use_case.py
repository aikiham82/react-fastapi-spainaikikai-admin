"""Update Seminar use case."""

from typing import Optional
from datetime import datetime

from src.domain.entities.seminar import Seminar
from src.domain.exceptions.seminar import SeminarNotFoundError
from src.application.ports.seminar_repository import SeminarRepositoryPort
from src.application.use_cases.apply_changes import apply_changes


class UpdateSeminarUseCase:
    """Use case for updating a seminar."""

    def __init__(self, seminar_repository: SeminarRepositoryPort):
        self.seminar_repository = seminar_repository

    async def execute(
        self,
        seminar_id: str,
        title: Optional[str] = None,
        description: Optional[str] = None,
        instructor_name: Optional[str] = None,
        venue: Optional[str] = None,
        address: Optional[str] = None,
        city: Optional[str] = None,
        province: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        price: Optional[float] = None,
        max_participants: Optional[int] = None,
    ) -> Seminar:
        """Execute to use case."""
        seminar = await self.seminar_repository.find_by_id(seminar_id)
        if seminar is None:
            raise SeminarNotFoundError(seminar_id)

        return await self.seminar_repository.update(
            apply_changes(
                seminar,
                title=title,
                description=description,
                instructor_name=instructor_name,
                venue=venue,
                address=address,
                city=city,
                province=province,
                start_date=start_date,
                end_date=end_date,
                price=price,
                max_participants=max_participants,
            )
        )
