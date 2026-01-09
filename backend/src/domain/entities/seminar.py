from dataclasses import dataclass
from datetime import datetime
from typing import Optional
from enum import Enum


class SeminarStatus(str, Enum):
    """Seminar status enumeration."""
    UPCOMING = "upcoming"
    ONGOING = "ongoing"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


@dataclass
class Seminar:
    """Seminar domain entity representing an Aikido seminar."""
    id: Optional[str] = None
    title: str = ""
    description: str = ""
    instructor_name: str = ""
    venue: str = ""
    address: str = ""
    city: str = ""
    province: str = ""
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    price: float = 0.0
    max_participants: Optional[int] = None
    current_participants: int = 0
    club_id: Optional[str] = None
    association_id: Optional[str] = None
    status: SeminarStatus = SeminarStatus.UPCOMING
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    def __post_init__(self):
        self.created_at = self.created_at or datetime.now()
        self.updated_at = self.updated_at or datetime.now()
        """Validate the seminar entity."""
        if not self.title or not self.title.strip():
            raise ValueError("Seminar title cannot be empty")
        if not self.instructor_name or not self.instructor_name.strip():
            raise ValueError("Instructor name cannot be empty")
        if not self.venue or not self.venue.strip():
            raise ValueError("Venue cannot be empty")
        if self.price < 0:
            raise ValueError("Price cannot be negative")
        if self.max_participants and self.max_participants < 0:
            raise ValueError("Max participants cannot be negative")
        if self.start_date and self.end_date and self.start_date > self.end_date:
            raise ValueError("Start date must be before end date")

    def cancel(self) -> None:
        """Cancel the seminar."""
        self.status = SeminarStatus.CANCELLED

    def mark_as_ongoing(self) -> None:
        """Mark seminar as ongoing."""
        if self.status != SeminarStatus.UPCOMING:
            raise ValueError(f"Cannot mark {self.status.value} seminar as ongoing")
        self.status = SeminarStatus.ONGOING

    def mark_as_completed(self) -> None:
        """Mark seminar as completed."""
        if self.status != SeminarStatus.ONGOING:
            raise ValueError(f"Cannot mark {self.status.value} seminar as completed")
        self.status = SeminarStatus.COMPLETED

    def add_participant(self) -> None:
        """Add a participant to the seminar."""
        if self.max_participants and self.current_participants >= self.max_participants:
            raise ValueError("Seminar is full")
        self.current_participants += 1

    def remove_participant(self) -> None:
        """Remove a participant from the seminar."""
        if self.current_participants > 0:
            self.current_participants -= 1

    def is_full(self) -> bool:
        """Check if seminar is full."""
        if self.max_participants:
            return self.current_participants >= self.max_participants
        return False

    def update_price(self, new_price: float) -> None:
        """Update seminar price."""
        if new_price < 0:
            raise ValueError("Price cannot be negative")
        self.price = new_price

    def update_dates(self, start_date: datetime, end_date: datetime) -> None:
        """Update seminar dates."""
        if start_date > end_date:
            raise ValueError("Start date must be before end date")
        self.start_date = start_date
        self.end_date = end_date
