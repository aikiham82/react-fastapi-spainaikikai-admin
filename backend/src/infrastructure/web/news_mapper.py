"""Mapper for converting between News DTOs and domain entities."""

from src.domain.entities.news_item import NewsItem, NewsCategory, NewsStatus
from src.infrastructure.web.dto.news_dto import (
    NewsResponseDTO,
    NewsStatusDTO,
    NewsCategoryDTO
)


class NewsMapper:
    """Mapper for News DTOs and domain entities."""

    @staticmethod
    def to_response_dto(news_item: NewsItem) -> NewsResponseDTO:
        """Convert domain entity to response DTO.
        
        Args:
            news_item: The news domain entity
            
        Returns:
            The news response DTO
        """
        return NewsResponseDTO(
            id=news_item.id,
            source=news_item.source,
            title=news_item.title,
            summary=news_item.summary,
            link=news_item.link,
            image_url=news_item.image_url,
            status=NewsStatusDTO(news_item.status.value),
            category=NewsCategoryDTO(news_item.category.value),
            is_favorite=news_item.is_favorite,
            user_id=news_item.user_id,
            is_public=news_item.is_public,
            created_at=news_item.created_at,
            updated_at=news_item.updated_at
        )

    @staticmethod
    def status_dto_to_domain(status_dto: NewsStatusDTO) -> NewsStatus:
        """Convert status DTO to domain enum.
        
        Args:
            status_dto: The status DTO
            
        Returns:
            The domain status enum
        """
        return NewsStatus(status_dto.value)

    @staticmethod
    def category_dto_to_domain(category_dto: NewsCategoryDTO) -> NewsCategory:
        """Convert category DTO to domain enum.
        
        Args:
            category_dto: The category DTO
            
        Returns:
            The domain category enum
        """
        return NewsCategory(category_dto.value)