"""FastAPI application using hexagonal architecture."""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

logger = logging.getLogger(__name__)
from src.infrastructure.web.routers.users import router as users_router
from src.infrastructure.web.routers.news import router as news_router
from src.infrastructure.web.routers.associations import router as associations_router
from src.infrastructure.web.routers.clubs import router as clubs_router
from src.infrastructure.web.routers.members import router as members_router
from src.infrastructure.web.routers.licenses import router as licenses_router
from src.infrastructure.web.routers.seminars import router as seminars_router
from src.infrastructure.web.routers.payments import router as payments_router
from src.infrastructure.web.routers.insurances import router as insurances_router
from src.infrastructure.web.routers.dashboard import router as dashboard_router
from src.infrastructure.web.routers.import_export import router as import_export_router
from src.infrastructure.web.routers.price_configurations import router as price_configurations_router
from src.infrastructure.web.routers.invoices import router as invoices_router
from src.infrastructure.web.routers.notifications import router as notifications_router
from src.infrastructure.web.routers.password_reset import router as password_reset_router
from src.config.logfire import configure_logfire
from dotenv import load_dotenv
load_dotenv()

# Global scheduler instance
_scheduler = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events."""
    global _scheduler

    # Startup
    try:
        from src.infrastructure.scheduler import create_notification_scheduler
        _scheduler = create_notification_scheduler()
        if _scheduler:
            await _scheduler.start()
            logger.info("Notification scheduler started successfully")
    except Exception as e:
        logger.error(f"Failed to start notification scheduler: {e}")

    yield

    # Shutdown
    if _scheduler:
        await _scheduler.stop()
        logger.info("Notification scheduler stopped")


def get_scheduler():
    """Get the global scheduler instance."""
    return _scheduler


def create_app() -> FastAPI:
    """Create FastAPI application with hexagonal architecture."""
    app = FastAPI(
        title="Aikido Association Management API",
        description="A FastAPI application implementing hexagonal architecture for Aikido association management",
        version="1.0.0",
        lifespan=lifespan,
    )

    configure_logfire(app)

    # Configure CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:5174",  # frontend-mobile dev
            "http://127.0.0.1:5174",
            "capacitor://localhost",  # iOS Capacitor
            "http://localhost",       # Android WebView
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Include routers
    app.include_router(users_router, prefix="/api/v1")
    app.include_router(news_router)  # News router already has /api/news prefix
    app.include_router(associations_router, prefix="/api/v1")
    app.include_router(clubs_router, prefix="/api/v1")
    app.include_router(members_router, prefix="/api/v1")
    app.include_router(licenses_router, prefix="/api/v1")
    app.include_router(seminars_router, prefix="/api/v1")
    app.include_router(payments_router, prefix="/api/v1")
    app.include_router(insurances_router, prefix="/api/v1")
    app.include_router(dashboard_router, prefix="/api")
    app.include_router(import_export_router, prefix="/api/v1")
    app.include_router(price_configurations_router, prefix="/api/v1")
    app.include_router(invoices_router, prefix="/api/v1")
    app.include_router(notifications_router, prefix="/api/v1")
    app.include_router(password_reset_router, prefix="/api/v1")

    @app.get("/")
    async def root():
        return {"message": "Aikido Association Management API", "version": "1.0.0"}

    @app.get("/api/v1/health")
    async def health_check():
        return {"status": "healthy", "architecture": "hexagonal"}
    
    return app