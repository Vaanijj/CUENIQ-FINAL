"""CUE IQ — Main FastAPI Application"""
from __future__ import annotations
import os
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.database import init_db
from app.api import auth, matches, coach, analytics
from app.services.sample_data import ensure_sample_video

settings = get_settings()
os.makedirs(settings.upload_dir, exist_ok=True)
os.makedirs(settings.processed_dir, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    # Generate playable sample match MP4 in background thread if not yet created
    asyncio.create_task(asyncio.to_thread(ensure_sample_video, settings.upload_dir))
    yield


app = FastAPI(
    title="CUE IQ",
    description="AI-Powered Snooker Intelligence Platform",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount upload directory for video serving
app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")

# Include routers
app.include_router(auth.router)
app.include_router(matches.router)
app.include_router(coach.router)
app.include_router(analytics.router)


@app.get("/api/health")
async def health():
    return {"status": "healthy", "service": "cue-iq", "version": "1.0.0"}
