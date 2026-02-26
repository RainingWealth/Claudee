"""Fund Tracker & Presenter — FastAPI application."""
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .database import Base, engine
from .routers import funds, returns, news, scenarios, upload, refresh, demo, config

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="Fund Tracker & Presenter",
        description=(
            "Client-facing fund performance tracking tool. "
            "Not financial advice — educational purposes only."
        ),
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.FRONTEND_URL, "http://localhost:3000", "http://localhost:3001"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Register all routers under /api/v1
    prefix = "/api/v1"
    app.include_router(funds.router, prefix=prefix)
    app.include_router(returns.router, prefix=prefix)
    app.include_router(news.router, prefix=prefix)
    app.include_router(scenarios.router, prefix=prefix)
    app.include_router(upload.router, prefix=prefix)
    app.include_router(refresh.router, prefix=prefix)
    app.include_router(demo.router, prefix=prefix)
    app.include_router(config.router, prefix=prefix)

    @app.on_event("startup")
    def on_startup():
        # Create all tables (Alembic handles migrations in production)
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables ready.")

        if settings.DEMO_MODE:
            from .database import SessionLocal
            from .services import demo_service
            db = SessionLocal()
            try:
                seeded = demo_service.seed(db)
                logger.info("Demo mode: seeded %d funds.", seeded)
            finally:
                db.close()

    @app.get("/health")
    def health_check():
        return {"status": "ok", "version": "1.0.0"}

    return app


app = create_app()
