"""News DTOs for request/response validation."""

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, HttpUrl


class NewsStatusDTO(str, Enum):
    """News status enumeration for DTOs."""
    PENDING = "pending"
    READING = "reading"
    READ = "read"


class NewsCategoryDTO(str, Enum):
    """News category enumeration for DTOs."""
    GENERAL = "general"
    RESEARCH = "research"
    PRODUCT = "product"
    COMPANY = "company"
    TUTORIAL = "tutorial"
    OPINION = "opinion"


class CreateNewsRequestDTO(BaseModel):
    """DTO for creating a news item."""
    source: str = Field(..., min_length=1, max_length=200)
    title: str = Field(..., min_length=1, max_length=500)
    summary: str = Field(..., min_length=1, max_length=2000)
    link: HttpUrl
    image_url: Optional[HttpUrl] = None
    category: NewsCategoryDTO = NewsCategoryDTO.GENERAL
    is_public: bool = False

    class Config:
        json_schema_extra = {
            "example": {
                "source": "TechCrunch",
                "title": "New AI Breakthrough Announced",
                "summary": "Researchers have made a significant breakthrough in AI technology...",
                "link": "https://example.com/article",
                "image_url": "https://example.com/image.jpg",
                "category": "research",
                "is_public": False
            }
        }


class UpdateNewsStatusRequestDTO(BaseModel):
    """DTO for updating news status."""
    status: NewsStatusDTO

    class Config:
        json_schema_extra = {
            "example": {
                "status": "reading"
            }
        }


class NewsFilterRequestDTO(BaseModel):
    """DTO for filtering news items."""
    status: Optional[NewsStatusDTO] = None
    category: Optional[NewsCategoryDTO] = None
    is_favorite: Optional[bool] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    limit: int = Field(default=100, ge=1, le=500)
    offset: int = Field(default=0, ge=0)


class NewsResponseDTO(BaseModel):
    """DTO for news item response."""
    id: str
    source: str
    title: str
    summary: str
    link: str
    image_url: str
    status: NewsStatusDTO
    category: NewsCategoryDTO
    is_favorite: bool
    user_id: str
    is_public: bool
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        json_schema_extra = {
            "example": {
                "id": "507f1f77bcf86cd799439011",
                "source": "TechCrunch",
                "title": "New AI Breakthrough Announced",
                "summary": "Researchers have made a significant breakthrough...",
                "link": "https://example.com/article",
                "image_url": "https://example.com/image.jpg",
                "status": "pending",
                "category": "research",
                "is_favorite": False,
                "user_id": "507f1f77bcf86cd799439012",
                "is_public": False,
                "created_at": "2024-01-01T00:00:00Z",
                "updated_at": "2024-01-01T00:00:00Z"
            }
        }


class NewsListResponseDTO(BaseModel):
    """DTO for news list response."""
    items: list[NewsResponseDTO]
    total: int
    offset: int
    limit: int


class NewsStatsResponseDTO(BaseModel):
    """DTO for news statistics response."""
    pending_count: int
    reading_count: int
    read_count: int
    favorite_count: int
    total_count: int