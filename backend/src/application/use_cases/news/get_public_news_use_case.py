"""Get public news use case."""
from typing import Optional


from datetime import datetime
from typing import List, Optional

from src.application.ports.news_repository import NewsRepository
from src.domain.entities.news_item import NewsItem, NewsCategory


class GetPublicNewsUseCase:
    """Use case for getting public news items."""

    def __init__(self, news_repository: NewsRepository):
        """Initialize the use case with repository.
        
        Args:
            news_repository: The news repository
        """
        self.news_repository = news_repository

    async def execute(
        self,
        category: Optional[NewsCategory] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[NewsItem]:
        """Get public news items with optional filters.
        
        Args:
            category: Optional category filter
            date_from: Optional start date filter
            date_to: Optional end date filter
            limit: Maximum number of items to return
            offset: Number of items to skip
            
        Returns:
            List of public news items matching the criteria
        """
        return await self.news_repository.get_public_news(
            category=category,
            date_from=date_from,
            date_to=date_to,
            limit=limit,
            offset=offset
        )