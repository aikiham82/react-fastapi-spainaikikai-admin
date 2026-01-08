"""Get user news use case."""
from typing import Optional


from datetime import datetime
from typing import List, Optional

from src.application.ports.news_repository import NewsRepository
from src.domain.entities.news_item import NewsItem, NewsCategory, NewsStatus


class GetUserNewsUseCase:
    """Use case for getting user's news items."""

    def __init__(self, news_repository: NewsRepository):
        """Initialize the use case with repository.
        
        Args:
            news_repository: The news repository
        """
        self.news_repository = news_repository

    async def execute(
        self,
        user_id: str,
        status: Optional[NewsStatus] = None,
        category: Optional[NewsCategory] = None,
        is_favorite: Optional[bool] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[NewsItem]:
        """Get news items for a specific user with optional filters.
        
        Args:
            user_id: The user ID
            status: Optional status filter
            category: Optional category filter
            is_favorite: Optional favorite filter
            date_from: Optional start date filter
            date_to: Optional end date filter
            limit: Maximum number of items to return
            offset: Number of items to skip
            
        Returns:
            List of news items matching the criteria
        """
        # Get user's own news
        user_news = await self.news_repository.get_by_user_id(
            user_id=user_id,
            status=status,
            category=category,
            is_favorite=is_favorite,
            date_from=date_from,
            date_to=date_to,
            limit=limit,
            offset=offset
        )

        # Also get public news if needed
        public_news = await self.news_repository.get_public_news(
            category=category,
            date_from=date_from,
            date_to=date_to,
            limit=limit,
            offset=offset
        )

        # Combine and filter duplicates (user's news takes precedence)
        user_news_links = {news.link for news in user_news}
        filtered_public = [news for news in public_news if news.link not in user_news_links]

        # Combine and sort by created_at descending
        all_news = user_news + filtered_public
        all_news.sort(key=lambda x: x.created_at or datetime.min, reverse=True)

        # Apply limit after combining
        return all_news[:limit]