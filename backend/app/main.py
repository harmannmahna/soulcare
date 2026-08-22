from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.rate_limit import enforce_rate_limit
from app.routers import admin, auth, care, catalog, chat, journey, lifestyle
from app.routers.admin import admin_socket
from app.services.ml_classifier import load_metrics
from app.services.seed import seed_if_needed
from app.store import store


@asynccontextmanager
async def lifespan(_: FastAPI):
    await store.connect()
    await seed_if_needed()
    yield
    await store.close()


settings = get_settings()
app = FastAPI(
    title="SoulCare API",
    version="1.0.0",
    description="Safety-first holistic health platform. Risk triage runs before every AI reply.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.demo_mode or not settings.cors_origin_list else settings.cors_origin_list,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def rate_limit_middleware(request, call_next):
    if request.url.path.startswith("/api/"):
        await enforce_rate_limit(request)
    return await call_next(request)


@app.get("/health")
async def health():
    return {
        "ok": True,
        "service": "soulcare",
        "mongo_ready": store.mongo_ready,
        "demo_mode": settings.demo_mode,
        "ai": "mock" if settings.use_mock_ai else "gemini",
    }


@app.get("/")
async def root():
    return {
        "name": "SoulCare",
        "status": "ok",
        "mongo_ready": store.mongo_ready,
        "fallback": store.using_fallback,
        "docs": "/docs",
        "api": "/api/v1",
    }


@app.get("/api/v1/model_metrics")
async def model_metrics():
    return load_metrics()


@app.get("/api/v1/pages")
async def pages():
    rows = await store.collection("pages").find({})
    for row in rows:
        row.pop("_id", None)
    return {"routes": rows}


app.include_router(auth.router, prefix="/api/v1")
app.include_router(chat.router, prefix="/api/v1")
app.include_router(care.router, prefix="/api/v1")
app.include_router(journey.router, prefix="/api/v1")
app.include_router(catalog.router, prefix="/api/v1")
app.include_router(lifestyle.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")


@app.websocket("/ws/admin")
async def ws_admin(ws: WebSocket, token: str = ""):
    await admin_socket(ws, token=token)
