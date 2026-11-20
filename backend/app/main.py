from contextlib import asynccontextmanager
import time
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from backend.app.core.config import settings
from backend.app.core.logging import logger
from backend.app.api.router import api_router
from backend.app.db.session import check_db_health


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting %s in %s mode...", settings.PROJECT_NAME, settings.ENVIRONMENT)
    db_ok = check_db_health()
    if db_ok:
        logger.info("Database connectivity verified successfully.")
        try:
            import os
            from alembic.config import Config
            from alembic import command
            ini_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "alembic.ini"))
            if os.path.exists(ini_path):
                alembic_cfg = Config(ini_path)
                command.upgrade(alembic_cfg, "head")
                logger.info("Database schema migrated to latest head successfully.")
        except Exception as e:
            logger.info("Database migration check completed: %s", str(e))

        # Auto-provision initial administrator if configured via environment variables
        admin_u = os.getenv("INITIAL_ADMIN_USERNAME")
        admin_p = os.getenv("INITIAL_ADMIN_PASSWORD")
        if admin_u and admin_p:
            try:
                from backend.scripts.bootstrap_admin import bootstrap_admin
                admin_n = os.getenv("INITIAL_ADMIN_FULL_NAME", "Administrator")
                bootstrap_admin(admin_u, admin_n, admin_p)
            except Exception as admin_err:
                logger.info("Admin bootstrap notice: %s", str(admin_err))
    else:
        logger.warning(
            "Initial database connection could not be established. "
            "Please ensure PostgreSQL is running and credentials are valid."
        )
    yield
    logger.info("Shutting down %s...", settings.PROJECT_NAME)


app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="Backend API engine for Delgone Digital Sales Ledger (Delgone Trading PLC)",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# CORS Middleware Configuration
cors_kwargs = {
    "allow_credentials": True,
    "allow_methods": ["*"],
    "allow_headers": ["*"],
}

if settings.ENVIRONMENT == "production":
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.CORS_ORIGINS],
        **cors_kwargs,
    )
else:
    # In development / preview tunnels: support localhost, LAN IPs, and trycloudflare.com
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.CORS_ORIGINS],
        allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|172\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|.*\.trycloudflare\.com)(:\d+)?$",
        **cors_kwargs,
    )


# Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    if settings.ENVIRONMENT == "production":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


# Request timing and logging middleware
@app.middleware("http")
async def add_process_time_and_log(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = (time.time() - start_time) * 1000
    response.headers["X-Process-Time-Ms"] = f"{process_time:.2f}"
    logger.info(
        "%s %s -> Status %d (%.2f ms)",
        request.method,
        request.url.path,
        response.status_code,
        process_time,
    )
    return response


# Root endpoint redirecting or displaying high-level system info
@app.get("/", tags=["Root"])
def root():
    return {
        "project": settings.PROJECT_NAME,
        "version": "1.0.0",
        "status": "online",
        "docs": "/docs",
        "health": f"{settings.API_V1_STR}/health",
    }


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    tb = traceback.format_exc()
    logger.error("Unhandled Exception: %s\n%s", str(exc), tb)
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal Server Error",
            "error_type": type(exc).__name__,
            "error": str(exc),
            "traceback": tb[-1000:],
        },
    )


# Include API routes (/api/health, etc.)
app.include_router(api_router, prefix=settings.API_V1_STR)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
