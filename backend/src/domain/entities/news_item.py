from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import Optional


class NewsStatus(Enum):
    """News item status enumeration."""
    PENDING = "pending"
    READING = "reading"
    READ = "read"


class NewsCategory(Enum):
    """News item category enumeration."""
    GENERAL = "general"
    RESEARCH = "research"
    PRODUCT = "product"
    COMPANY = "company"
    TUTORIAL = "tutorial"
    OPINION = "opinion"


@dataclass
class NewsItem:
    """News item domain entity."""
    source: str = ""
    title: str = ""
    summary: str = ""
    link: str = ""
    image_url: str = ""
    category: NewsCategory = NewsCategory.GENERAL
    user_id: str = ""
    is_public: bool = True
    id: Optional[str] = None
    status: NewsStatus = NewsStatus.PENDING
    is_favorite: bool = False
    created_at: Optional[datetime] = datetime.utcnow()
    updated_at: Optional[datetime] = datetime.utcnow()

    def __post_init__(self):
        self.created_at = self.created_at or datetime.now()
        self.updated_at = self.updated_at or datetime.now()
        """Validate the news item entity."""
        if not self.source or not self.source.strip():
            raise ValueError("News source cannot be empty")
        if not self.title or not self.title.strip():
            raise ValueError("News title cannot be empty")
        if not self.summary or not self.summary.strip():
            raise ValueError("News summary cannot be empty")
        if not self.link or not self.link.strip():
            raise ValueError("News link cannot be empty")
        if not self.user_id or not self.user_id.strip():
            raise ValueError("User ID cannot be empty")
        if not isinstance(self.category, NewsCategory):
            raise ValueError("Invalid news category")
        if not isinstance(self.status, NewsStatus):
            raise ValueError("Invalid news status")

    def mark_as_reading(self) -> None:
        """Mark the news item as reading."""
        if self.status == NewsStatus.READ:
            raise ValueError("Cannot mark a read item as reading")
        self.status = NewsStatus.READING
        self.updated_at = datetime.utcnow()

    def mark_as_read(self) -> None:
        """Mark the news item as read."""
        self.status = NewsStatus.READ
        self.updated_at = datetime.utcnow()

    def mark_as_pending(self) -> None:
        """Mark the news item as pending."""
        self.status = NewsStatus.PENDING
        self.updated_at = datetime.utcnow()

    def toggle_favorite(self) -> None:
        """Toggle the favorite status."""
        self.is_favorite = not self.is_favorite
        self.updated_at = datetime.utcnow()

    def set_public(self, is_public: bool) -> None:
        """Set the public visibility."""
        self.is_public = is_public
        self.updated_at = datetime.utcnow()

    def update_category(self, category: NewsCategory) -> None:
        """Update the news category."""
        if not isinstance(category, NewsCategory):
            raise ValueError("Invalid news category")
        self.category = category
        self.updated_at = datetime.utcnow()

    def update_status(self, status: NewsStatus) -> None:
        """Update the news status - used for drag and drop operations."""
        if not isinstance(status, NewsStatus):
            raise ValueError("Invalid news status")
        self.status = status
        self.updated_at = datetime.utcnow()

    def can_be_accessed_by(self, user_id: str) -> bool:
        """Check if the news item can be accessed by a user."""
        return self.is_public or self.user_id == user_id