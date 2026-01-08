"""Create Seminar use case."""
from typing import Optional


from src.domain.entities.seminar import Seminar, SeminarStatus
from src.application.ports.seminar_repository import SeminarRepositoryPort


class CreateSeminarUseCase:
    """Use case for creating a new seminar."""

    def __init__(self, seminar_repository: SeminarRepositoryPort):
        self.seminar_repository = seminar_repository

    async def execute(
        self,
        title: str,
        description: str,
        instructor_name: str,
        venue: str,
        address: str,
        city: str,
        province: str,
        start_date: str,
        end_date: str,
        price: float = 0.0,
        max_participants: Optional[int] = None,
        club_id: Optional[str] = None,
        association_id: Optional[str] = None
    ) -> Seminar:
        """Execute to use case."""
        from datetime import datetime

        seminar = Seminar(
            title=title,
            description=description,
            instructor_name=instructor_name,
            venue=venue,
            address=address,
            city=city,
            province=province,
            start_date=datetime.fromisoformat(start_date) if isinstance(start_date, str) else start_date,
            end_date=datetime.fromisoformat(end_date) if isinstance(end_date, str) else end_date,
            price=price,
            max_participants=max_participants,
            club_id=club_id,
            association_id=association_id,
            status=SeminarStatus.UPCOMING,
            current_participants=0
        )

        return await self.seminar_repository.create(seminar)
