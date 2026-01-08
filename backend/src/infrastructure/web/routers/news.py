"""News routes."""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from src.application.use_cases.news import (
    CreateNewsUseCase,
    GetPublicNewsUseCase,
    GetUserNewsUseCase,
    ToggleFavoriteUseCase,
    UpdateNewsStatusUseCase,
)
from src.domain.entities.news_item import NewsCategory, NewsStatus
from src.domain.exceptions.news_exceptions import (
    DuplicateNewsException,
    NewsNotFoundException,
    UnauthorizedNewsAccessException,
)
from src.infrastructure.web.dependencies import get_current_active_user
from src.infrastructure.web.dto.news_dto import (
    CreateNewsRequestDTO,
    NewsCategoryDTO,
    NewsListResponseDTO,
    NewsResponseDTO,
    NewsStatsResponseDTO,
    NewsStatusDTO,
    UpdateNewsStatusRequestDTO,
)
from src.infrastructure.web.news_mapper import NewsMapper

router = APIRouter(prefix="/api/news", tags=["news"])


# Dependency injection functions (these will be defined in dependencies.py)
def get_create_news_use_case() -> CreateNewsUseCase:
    """Get create news use case."""
    from src.infrastructure.web.dependencies import get_news_repository
    return CreateNewsUseCase(get_news_repository())


def get_update_news_status_use_case() -> UpdateNewsStatusUseCase:
    """Get update news status use case."""
    from src.infrastructure.web.dependencies import get_news_repository
    return UpdateNewsStatusUseCase(get_news_repository())


def get_toggle_favorite_use_case() -> ToggleFavoriteUseCase:
    """Get toggle favorite use case."""
    from src.infrastructure.web.dependencies import get_news_repository
    return ToggleFavoriteUseCase(get_news_repository())


def get_user_news_use_case() -> GetUserNewsUseCase:
    """Get user news use case."""
    from src.infrastructure.web.dependencies import get_news_repository
    return GetUserNewsUseCase(get_news_repository())


def get_public_news_use_case() -> GetPublicNewsUseCase:
    """Get public news use case."""
    from src.infrastructure.web.dependencies import get_news_repository
    return GetPublicNewsUseCase(get_news_repository())


@router.post("", response_model=NewsResponseDTO, status_code=status.HTTP_201_CREATED)
async def create_news(
    news_data: CreateNewsRequestDTO,
    current_user: dict = Depends(get_current_active_user),
    use_case: CreateNewsUseCase = Depends(get_create_news_use_case),
) -> NewsResponseDTO:
    """Create a new news item."""
    try:
        news_item = await use_case.execute(
            source=news_data.source,
            title=news_data.title,
            summary=news_data.summary,
            link=str(news_data.link),
            image_url=str(news_data.image_url) if news_data.image_url else "",
            category=NewsMapper.category_dto_to_domain(news_data.category),
            user_id=current_user["id"],
            is_public=news_data.is_public,
        )
        return NewsMapper.to_response_dto(news_item)
    except DuplicateNewsException as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get("/user", response_model=NewsListResponseDTO)
async def get_user_news(
    status: Optional[NewsStatusDTO] = Query(None),
    category: Optional[NewsCategoryDTO] = Query(None),
    is_favorite: Optional[bool] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_active_user),
    use_case: GetUserNewsUseCase = Depends(get_user_news_use_case),
) -> NewsListResponseDTO:
    """Get news items for the current user."""
    domain_status = NewsMapper.status_dto_to_domain(status) if status else None
    domain_category = NewsMapper.category_dto_to_domain(category) if category else None

    news_items = await use_case.execute(
        user_id=current_user["id"],
        status=domain_status,
        category=domain_category,
        is_favorite=is_favorite,
        limit=limit,
        offset=offset,
    )

    response_items = [NewsMapper.to_response_dto(item) for item in news_items]
    
    return NewsListResponseDTO(
        items=response_items,
        total=len(response_items),
        offset=offset,
        limit=limit,
    )


@router.get("/public", response_model=NewsListResponseDTO)
async def get_public_news(
    category: Optional[NewsCategoryDTO] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    use_case: GetPublicNewsUseCase = Depends(get_public_news_use_case),
) -> NewsListResponseDTO:
    """Get public news items."""
    domain_category = NewsMapper.category_dto_to_domain(category) if category else None

    news_items = await use_case.execute(
        category=domain_category,
        limit=limit,
        offset=offset,
    )

    response_items = [NewsMapper.to_response_dto(item) for item in news_items]
    
    return NewsListResponseDTO(
        items=response_items,
        total=len(response_items),
        offset=offset,
        limit=limit,
    )


@router.patch("/{news_id}/status", response_model=NewsResponseDTO)
async def update_news_status(
    news_id: str,
    status_data: UpdateNewsStatusRequestDTO,
    current_user: dict = Depends(get_current_active_user),
    use_case: UpdateNewsStatusUseCase = Depends(get_update_news_status_use_case),
) -> NewsResponseDTO:
    """Update the status of a news item."""
    try:
        domain_status = NewsMapper.status_dto_to_domain(status_data.status)
        news_item = await use_case.execute(
            news_id=news_id,
            status=domain_status,
            user_id=current_user["id"],
        )
        return NewsMapper.to_response_dto(news_item)
    except NewsNotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except UnauthorizedNewsAccessException as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        )


@router.patch("/{news_id}/favorite", response_model=NewsResponseDTO)
async def toggle_favorite(
    news_id: str,
    current_user: dict = Depends(get_current_active_user),
    use_case: ToggleFavoriteUseCase = Depends(get_toggle_favorite_use_case),
) -> NewsResponseDTO:
    """Toggle the favorite status of a news item."""
    try:
        news_item = await use_case.execute(
            news_id=news_id,
            user_id=current_user["id"],
        )
        return NewsMapper.to_response_dto(news_item)
    except NewsNotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except UnauthorizedNewsAccessException as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        )


@router.get("/stats", response_model=NewsStatsResponseDTO)
async def get_news_stats(
    current_user: dict = Depends(get_current_active_user),
    use_case: GetUserNewsUseCase = Depends(get_user_news_use_case),
) -> NewsStatsResponseDTO:
    """Get news statistics for the current user."""
    # Get all user news
    all_news = await use_case.execute(
        user_id=current_user["id"],
        limit=1000,  # Get all items for stats
    )

    # Calculate stats
    pending_count = sum(1 for n in all_news if n.status == NewsStatus.PENDING)
    reading_count = sum(1 for n in all_news if n.status == NewsStatus.READING)
    read_count = sum(1 for n in all_news if n.status == NewsStatus.READ)
    favorite_count = sum(1 for n in all_news if n.is_favorite)

    return NewsStatsResponseDTO(
        pending_count=pending_count,
        reading_count=reading_count,
        read_count=read_count,
        favorite_count=favorite_count,
        total_count=len(all_news),
    )