"""Seminar entity tests."""

import pytest
from datetime import datetime, timedelta

from src.domain.entities.seminar import Seminar, SeminarStatus
from src.domain.exceptions.seminar import (
    SeminarNotFoundError,
    InvalidSeminarDatesError,
    SeminarIsFullError
)


class TestSeminarEntity:
    """Test cases for Seminar domain entity."""

    def test_seminar_creation_valid(self):
        """Test valid seminar creation."""
        start_date = datetime.now() + timedelta(days=7)
        end_date = start_date + timedelta(days=2)
        
        seminar = Seminar(
            title="Test Seminar",
            description="Test description",
            instructor_name="Sensei Smith",
            venue="Sports Center",
            address="123 Street",
            city="Madrid",
            province="Madrid",
            start_date=start_date,
            end_date=end_date,
            price=50.0,
            max_participants=50,
            current_participants=25,
            club_id="club-id",
            association_id="association-id"
        )
        
        assert seminar.title == "Test Seminar"
        assert seminar.instructor_name == "Sensei Smith"
        assert seminar.venue == "Sports Center"
        assert seminar.price == 50.0
        assert seminar.max_participants == 50
        assert seminar.current_participants == 25
        assert seminar.status == SeminarStatus.UPCOMING
        assert seminar.created_at is None

    def test_seminar_creation_empty_title(self):
        """Test seminar creation with empty title raises error."""
        with pytest.raises(ValueError, match="Seminar title cannot be empty"):
            Seminar(
                title="",
                description="Test description",
                instructor_name="Sensei Smith",
                venue="Sports Center",
                address="123 Street",
                city="Madrid",
                province="Madrid",
                start_date=datetime.now() + timedelta(days=7),
                end_date=datetime.now() + timedelta(days=9),
                price=50.0,
                max_participants=50
            )

    def test_seminar_creation_empty_instructor(self):
        """Test seminar creation with empty instructor name raises error."""
        with pytest.raises(ValueError, match="Instructor name cannot be empty"):
            Seminar(
                title="Test Seminar",
                description="Test description",
                instructor_name="",
                venue="Sports Center",
                address="123 Street",
                city="Madrid",
                province="Madrid",
                start_date=datetime.now() + timedelta(days=7),
                end_date=datetime.now() + timedelta(days=9),
                price=50.0,
                max_participants=50
            )

    def test_seminar_creation_empty_venue(self):
        """Test seminar creation with empty venue raises error."""
        with pytest.raises(ValueError, match="Venue cannot be empty"):
            Seminar(
                title="Test Seminar",
                description="Test description",
                instructor_name="Sensei Smith",
                venue="",
                address="123 Street",
                city="Madrid",
                province="Madrid",
                start_date=datetime.now() + timedelta(days=7),
                end_date=datetime.now() + timedelta(days=9),
                price=50.0,
                max_participants=50
            )

    def test_seminar_creation_invalid_dates_start_after_end(self):
        """Test seminar creation with invalid dates raises error."""
        start_date = datetime.now() + timedelta(days=7)
        end_date = datetime.now() + timedelta(days=5)
        
        with pytest.raises(ValueError, match="Start date must be before end date"):
            Seminar(
                title="Test Seminar",
                description="Test description",
                instructor_name="Sensei Smith",
                venue="Sports Center",
                address="123 Street",
                city="Madrid",
                province="Madrid",
                start_date=start_date,
                end_date=end_date,
                price=50.0,
                max_participants=50
            )

    def test_seminar_creation_negative_price(self):
        """Test seminar creation with negative price raises error."""
        with pytest.raises(ValueError, match="Price cannot be negative"):
            Seminar(
                title="Test Seminar",
                description="Test description",
                instructor_name="Sensei Smith",
                venue="Sports Center",
                address="123 Street",
                city="Madrid",
                province="Madrid",
                start_date=datetime.now() + timedelta(days=7),
                end_date=datetime.now() + timedelta(days=9),
                price=-50.0,
                max_participants=50
            )

    def test_seminar_creation_negative_max_participants(self):
        """Test seminar creation with negative max participants raises error."""
        with pytest.raises(ValueError, match="Max participants cannot be negative"):
            Seminar(
                title="Test Seminar",
                description="Test description",
                instructor_name="Sensei Smith",
                venue="Sports Center",
                address="123 Street",
                city="Madrid",
                province="Madrid",
                start_date=datetime.now() + timedelta(days=7),
                end_date=datetime.now() + timedelta(days=9),
                price=50.0,
                max_participants=-50
            )

    def test_seminar_activation(self):
        """Test seminar activation."""
        start_date = datetime.now() + timedelta(days=7)
        end_date = start_date + timedelta(days=2)
        
        seminar = Seminar(
            title="Test Seminar",
            description="Test description",
            instructor_name="Sensei Smith",
            venue="Sports Center",
            address="123 Street",
            city="Madrid",
            province="Madrid",
            start_date=start_date,
            end_date=end_date,
            price=50.0,
            max_participants=50,
            current_participants=25,
            status=SeminarStatus.ONGOING,
            club_id="club-id",
            association_id="association-id"
        )
        
        seminar.mark_as_ongoing()
        assert seminar.status == SeminarStatus.ONGOING

    def test_seminar_cancellation(self):
        """Test seminar cancellation."""
        seminar = Seminar(
            title="Test Seminar",
            description="Test description",
            instructor_name="Sensei Smith",
            venue="Sports Center",
            address="123 Street",
            city="Madrid",
            province="Madrid",
            start_date=datetime.now() + timedelta(days=7),
            end_date=datetime.now() + timedelta(days=9),
            price=50.0,
            max_participants=50,
            current_participants=25,
            club_id="club-id",
            association_id="association-id"
        )
        
        seminar.cancel()
        assert seminar.status == SeminarStatus.CANCELLED

    def test_seminar_completion(self):
        """Test seminar completion."""
        seminar = Seminar(
            title="Test Seminar",
            description="Test description",
            instructor_name="Sensei Smith",
            venue="Sports Center",
            address="123 Street",
            city="Madrid",
            province="Madrid",
            start_date=datetime.now() - timedelta(days=7),
            end_date=datetime.now() - timedelta(days=2),
            price=50.0,
            max_participants=50,
            current_participants=25,
            status=SeminarStatus.ONGOING,
            club_id="club-id",
            association_id="association-id"
        )
        
        seminar.mark_as_ongoing()
        seminar.mark_as_completed()
        assert seminar.status == SeminarStatus.COMPLETED

    def test_seminar_add_participant(self):
        """Test adding participant."""
        start_date = datetime.now() + timedelta(days=7)
        end_date = start_date + timedelta(days=2)
        
        seminar = Seminar(
            title="Test Seminar",
            description="Test description",
            instructor_name="Sensei Smith",
            venue="Sports Center",
            address="123 Street",
            city="Madrid",
            province="Madrid",
            start_date=start_date,
            end_date=end_date,
            price=50.0,
            max_participants=50,
            current_participants=24,
            club_id="club-id",
            association_id="association-id"
        )
        
        seminar.add_participant()
        assert seminar.current_participants == 25

    def test_seminar_add_participant_full(self):
        """Test adding participant to full seminar."""
        start_date = datetime.now() + timedelta(days=7)
        end_date = start_date + timedelta(days=2)
        
        seminar = Seminar(
            title="Test Seminar",
            description="Test description",
            instructor_name="Sensei Smith",
            venue="Sports Center",
            address="123 Street",
            city="Madrid",
            province="Madrid",
            start_date=start_date,
            end_date=end_date,
            price=50.0,
            max_participants=50,
            current_participants=49,
            club_id="club-id",
            association_id="association-id"
        )
        
        with pytest.raises(ValueError, match="Seminar is full"):
            seminar.add_participant()

    def test_seminar_remove_participant(self):
        """Test removing participant."""
        start_date = datetime.now() + timedelta(days=7)
        end_date = start_date + timedelta(days=2)
        
        seminar = Seminar(
            title="Test Seminar",
            description="Test description",
            instructor_name="Sensei Smith",
            venue="Sports Center",
            address="123 Street",
            city="Madid",
            province="Madrid",
            start_date=start_date,
            end_date=end_date,
            price=50.0,
            max_participants=50,
            current_participants=26,
            club_id="club-id",
            association_id="association-id"
        )
        
        seminar.remove_participant()
        assert seminar.current_participants == 25

    def test_seminar_remove_participant_empty(self):
        """Test removing participant from empty seminar."""
        start_date = datetime.now() + timedelta(days=7)
        end_date = start_date + timedelta(days=2)
        
        seminar = Seminar(
            title="Test Seminar",
            description="Test description",
            instructor_name="Sensei Smith",
            venue="Sports Center",
            address="123 Street",
            city="Madid",
            province="Madrid",
            start_date=start_date,
            end_date=end_date,
            price=50.0,
            max_participants=50,
            current_participants=1,
            club_id="club-id",
            association_id="association-id"
        )
        
        seminar.remove_participant()
        assert seminar.current_participants == 0

    def test_seminar_update_price(self):
        """Test price update."""
        seminar = Seminar(
            title="Test Seminar",
            description="Test description",
            instructor_name="Sensei Smith",
            venue="Sports Center",
            address="123 Street",
            city="Madrid",
            province="Madrid",
            start_date=datetime.now() + timedelta(days=7),
            end_date=datetime.now() + timedelta(days=9),
            price=50.0,
            max_participants=50,
            current_participants=25,
            club_id="club-id",
            association_id="association-id"
        )
        
        seminar.update_price(75.0)
        assert seminar.price == 75.0

    def test_seminar_update_price_negative(self):
        """Test price update with negative value raises error."""
        seminar = Seminar(
            title="Test Seminar",
            description="Test description",
            instructor_name="Sensei Smith",
            venue="Sports Center",
            address="123 Street",
            city="Madrid",
            province="Madrid",
            start_date=datetime.now() + timedelta(days=7),
            end_date=datetime.now() + timedelta(days=9),
            price=50.0,
            max_participants=50,
            current_participants=25,
            club_id="club-id",
            association_id="association-id"
        )
        
        with pytest.raises(ValueError, match="Price cannot be negative"):
            seminar.update_price(-10.0)

    def test_seminar_update_max_participants(self):
        """Test max participants update."""
        seminar = Seminar(
            title="Test Seminar",
            description="Test description",
            instructor_name="Sensei Smith",
            venue="Sports Center",
            address="123 Street",
            city="Madrid",
            province="Madrid",
            start_date=datetime.now() + timedelta(days=7),
            end_date=datetime.now() + timedelta(days=9),
            price=50.0,
            max_participants=50,
            current_participants=25,
            club_id="club-id",
            association_id="association-id"
        )
        
        seminar.max_participants = 75
        assert seminar.max_participants == 75

    def test_seminar_update_max_participants_negative(self):
        """Test max participants update with negative value raises error."""
        seminar = Seminar(
            title="Test Seminar",
            description="Test description",
            instructor_name="Sensei Smith",
            venue="Sports Center",
            address="123 Street",
            city="Madrid",
            province="Madrid",
            start_date=datetime.now() + timedelta(days=7),
            end_date=datetime.now() + timedelta(days=9),
            price=50.0,
            max_participants=50,
            current_participants=25,
            club_id="club-id",
            association_id="association-id"
        )
        
        with pytest.raises(ValueError, match="Max participants cannot be negative"):
            seminar.max_participants = -10

    def test_seminar_update_dates(self):
        """Test dates update."""
        start_date = datetime.now() + timedelta(days=7)
        end_date = start_date + timedelta(days=2)
        
        seminar = Seminar(
            title="Test Seminar",
            description="Test description",
            instructor_name="Sensei Smith",
            venue="Sports Center",
            address="123 Street",
            city="Madrid",
            province="Madrid",
            start_date=datetime.now() + timedelta(days=7),
            end_date=datetime.now() + timedelta(days=9),
            price=50.0,
            max_participants=50,
            current_participants=25,
            club_id="club-id",
            association_id="association-id"
        )
        
        new_start_date = start_date + timedelta(days=1)
        new_end_date = end_date + timedelta(days=1)
        seminar.update_dates(new_start_date, new_end_date)
        
        assert seminar.start_date == new_start_date
        assert seminar.end_date == new_end_date

    def test_seminar_update_invalid_dates(self):
        """Test dates update with invalid dates raises error."""
        seminar = Seminar(
            title="Test Seminar",
            description="Test description",
            instructor_name="Sensei Smith",
            venue="Sports Center",
            address="123 Street",
            city="Madrid",
            province="Madrid",
            start_date=datetime.now() + timedelta(days=7),
            end_date=datetime.now() + timedelta(days=9),
            price=50.0,
            max_participants=50,
            current_participants=25,
            club_id="club-id",
            association_id="association-id"
        )
        
        with pytest.raises(ValueError, match="Start date must be before end date"):
            seminar.update_dates(
                datetime.now() + timedelta(days=14),
                datetime.now() + timedelta(days=7)
            )

    def test_seminar_is_full(self):
        """Test is_full method."""
        seminar = Seminar(
            title="Test Seminar",
            description="Test description",
            instructor_name="Sensei Smith",
            venue="Sports Center",
            address="123 Street",
            city="Madrid",
            province="Madrid",
            start_date=datetime.now() + timedelta(days=7),
            end_date=datetime.now() + timedelta(days=9),
            max_participants=50,
            current_participants=50,
            club_id="club-id",
            association_id="association-id"
        )
        
        assert seminar.is_full() is True

    def test_seminar_is_not_full(self):
        """Test is_full method when not full."""
        seminar = Seminar(
            title="Test Seminar",
            description="Test description",
            instructor_name="Sensei Smith",
            venue="Sports Center",
            address="123 Street",
            city="Madrid",
            province="Madrid",
            start_date=datetime.now() + timedelta(days=7),
            end_date=datetime.now() + timedelta(days=9),
            price=50.0,
            max_participants=50,
            current_participants=25,
            club_id="club-id",
            association_id="association-id"
        )
        
        assert seminar.is_full() is False
    def test_seminar_cancel_from_upcoming(self):
        """Test canceling from upcoming state."""
        start_date = datetime.now() + timedelta(days=7)
        end_date = start_date + timedelta(days=2)
        
        seminar = Seminar(
            title="Test Seminar",
            description="Test description",
            instructor_name="Sensei Smith",
            venue="Sports Center",
            address="123 Street",
            city="Madrid",
            province="Madrid",
            start_date=start_date,
            end_date=end_date,
            price=50.0,
            max_participants=50,
            current_participants=25,
            status=SeminarStatus.UPCOMING,
            club_id="club-id",
            association_id="association-id"
        )
        
        seminar.cancel()
        assert seminar.status == SeminarStatus.CANCELLED

    def test_seminar_cancel_from_ongoing(self):
        """Test canceling from ongoing state."""
        start_date = datetime.now() - timedelta(days=1)
        end_date = start_date + timedelta(days=2)
        
        seminar = Seminar(
            title="Test Seminar",
            description="Test description",
            instructor_name="Sensei Smith",
            venue="Sports Center",
            address="123 Street",
            city="Madrid",
            province="Madrid",
            start_date=start_date,
            end_date=end_date,
            price=50.0,
            max_participants=50,
            current_participants=25,
            status=SeminarStatus.ONGOING,
            club_id="club-id",
            association_id="association-id"
        )
        
        seminar.cancel()
        assert seminar.status == SeminarStatus.CANCELLED

    def test_seminar_cancel_from_completed(self):
        """Test cancelling from completed state."""
        start_date = datetime.now() - timedelta(days=7)
        end_date = start_date + timedelta(days=2)
        
        seminar = Seminar(
            title="Test Seminar",
            description="Test description",
            instructor_name="Sensei Smith",
            venue='Sports "Center"',
            address="123 Street",
            city="Madrid",
            province="Madrid",
            start_date=start_date,
            end_date=end_date,
            price=50.0,
            max_participants=50,
            current_participants=25,
            status=SeminarStatus.COMPLETED,
            club_id="club-id",
            association_id="association-id"
        )
        
        with pytest.raises(ValueError, match="Cannot cancel a completed seminar"):
            seminar.cancel()

    def test_seminar_mark_completed_from_upcoming(self):
        """Test marking completed from upcoming."""
        start_date = datetime.now() + timedelta(days=7)
        end_date = start_date + timedelta(days=2)
        
        seminar = Seminar(
            title="Test Seminar",
            description="Test description",
            instructor_name="Sensei Smith",
            venue="Sports Center",
            address="123 Street",
            city="Madrid",
            province="Madrid",
            start_date=start_date,
            end_date=end_date,
            price=50.0,
            max_participants=50,
            current_participants=25,
            status=SeminarStatus.UPCOMING,
            club_id="club-id",
            association_id="association-id"
        )
        
        seminar.mark_as_completed()
        assert seminar.status == SeminarStatus.COMPLETED

    def test_seminar_mark_ongoing_from_completed(self):
        """Test marking ongoing from completed raises error."""
        start_date = datetime.now() - timedelta(days=7)
        end_date = start_date + timedelta(days=2)
        
        seminar = Seminar(
            title="Test Seminar",
            description="Test description",
            instructor_name="Sensei Smith",
            venue="Sports Center",
            address="123 Street",
            city="Madrid",
            province="Madrid",
            start_date=start_date,
            end_date=end_date,
            price=50.0,
            max_participants=50,
            current_participants=25,
            status=SeminarStatus.COMPLETED,
            club_id="club-id",
            association_id="association-id"
        )
        
        with pytest.raises(ValueError, match="Cannot mark completed seminar as ongoing"):
            seminar.mark_as_ongoing()
