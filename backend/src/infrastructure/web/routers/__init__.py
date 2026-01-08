"""API routers."""

from .users import router as users_router
from .news import router as news_router
from .associations import router as associations_router
from .clubs import router as clubs_router
from .members import router as members_router
from .licenses import router as licenses_router
from .seminars import router as seminars_router
from .payments import router as payments_router
from .insurances import router as insurances_router

__all__ = [
    "users_router",
    "news_router",
    "associations_router",
    "clubs_router",
    "members_router",
    "licenses_router",
    "seminars_router",
    "payments_router",
    "insurances_router"
]
