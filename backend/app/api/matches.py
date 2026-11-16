"""CUE IQ — Match API Routes"""
from __future__ import annotations
import os
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.database import get_db
from app.config import get_settings
from app.models.models import Match, Shot, MatchReport, User
from app.schemas.schemas import (
    MatchResponse,
    MatchListResponse,
    ShotResponse,
    MatchReportResponse,
    AnalysisResponse,
)
from app.api.auth import get_optional_user
from app.services.sample_data import generate_sample_match, SAMPLE_MATCH_ID, ensure_sample_video
from app.services.processing import process_video

router = APIRouter(prefix="/api/matches", tags=["matches"])
settings = get_settings()


def _serialize_match(match: Match, report: Optional[MatchReport] = None) -> MatchResponse:
    video_basename = os.path.basename(match.video_path) if match.video_path else match.video_filename
    video_url = f"/uploads/{video_basename}" if video_basename else None
    return MatchResponse(
        id=match.id,
        title=match.title,
        description=match.description,
        video_filename=match.video_filename,
        video_url=video_url,
        duration_seconds=match.duration_seconds,
        status=match.status,
        processing_progress=match.processing_progress or 0,
        processing_stage=match.processing_stage,
        detection_mode=match.detection_mode or "cv_tracked",
        table_coverage=match.table_coverage,
        video_resolution=match.video_resolution,
        video_fps=match.video_fps,
        error_message=match.error_message,
        is_sample=bool(match.is_sample),
        pot_success_rate=report.pot_success_rate if report else None,
        safety_success_rate=report.safety_success_rate if report else None,
        total_shots=report.total_shots if report else None,
        highest_break=report.highest_break if report else None,
        overall_rating=report.overall_rating if report else None,
        created_at=match.created_at,
        updated_at=match.updated_at or match.created_at,
    )


async def _run_processing(match_id: str, video_path: str):
    """Background task for OpenCV video processing."""
    from app.database import async_session

    async with async_session() as db:
        match = (await db.execute(select(Match).where(Match.id == match_id))).scalar_one_or_none()
        if not match:
            return

        try:
            match.status = "processing"
            match.processing_progress = 5
            match.processing_stage = "Initializing OpenCV optical pipeline..."
            await db.commit()

            async def update_progress(progress: int, stage: str):
                match.processing_progress = progress
                match.processing_stage = stage
                await db.commit()

            shots_data, report_data, meta = await process_video(match_id, video_path, update_progress)

            # Save shots
            for s in shots_data:
                shot = Shot(**{k: v for k, v in s.items()})
                db.add(shot)

            # Save report
            if report_data:
                report_copy = dict(report_data)
                report_copy.pop("created_at", None)
                report = MatchReport(**report_copy)
                db.add(report)

            match.duration_seconds = meta.get("duration_seconds")
            match.video_resolution = meta.get("video_resolution")
            match.video_fps = meta.get("video_fps")
            match.table_coverage = meta.get("table_coverage")
            match.detection_mode = meta.get("detection_mode", "cv_tracked")
            match.processing_stage = meta.get("processing_stage", "Complete")
            match.status = "analyzed"
            match.processing_progress = 100
            await db.commit()

        except Exception as e:
            match.status = "error"
            match.processing_stage = "Processing failed"
            match.error_message = str(e)
            await db.commit()


@router.post("/upload", response_model=MatchResponse)
async def upload_match(
    background_tasks: BackgroundTasks,
    video: UploadFile = File(...),
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user),
):
    allowed = {".mp4", ".mov", ".avi", ".mkv", ".webm"}
    ext = os.path.splitext(video.filename or "")[1].lower()
    if ext not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{ext}'. Supported formats: MP4, MOV, WEBM, AVI, MKV.",
        )

    os.makedirs(settings.upload_dir, exist_ok=True)
    file_id = str(uuid.uuid4())
    stored_filename = f"{file_id}{ext}"
    filepath = os.path.join(settings.upload_dir, stored_filename)

    content = await video.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Uploaded video file is empty.")
    if len(content) > settings.max_upload_size_mb * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds maximum size of {settings.max_upload_size_mb}MB.",
        )

    with open(filepath, "wb") as f:
        f.write(content)

    clean_title = (title or "").strip() or os.path.splitext(video.filename or "Match Footage")[0]
    match = Match(
        user_id=user.id if user else "anonymous",
        title=clean_title,
        description=(description or "").strip() or "Uploaded match footage analyzed via Cue IQ OpenCV pipeline.",
        video_filename=video.filename or stored_filename,
        video_path=filepath,
        status="uploaded",
        processing_progress=0,
        processing_stage="Upload verified — starting optical analysis",
        detection_mode="cv_tracked",
    )
    db.add(match)
    await db.commit()
    await db.refresh(match)

    background_tasks.add_task(_run_processing, match.id, filepath)

    return _serialize_match(match)


@router.get("/", response_model=MatchListResponse)
async def list_matches(
    db: AsyncSession = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user),
):
    query = select(Match).order_by(desc(Match.created_at))
    if user:
        query = query.where(Match.user_id == user.id)
    result = await db.execute(query)
    matches = result.scalars().all()

    out = []
    for m in matches:
        rep = (
            await db.execute(select(MatchReport).where(MatchReport.match_id == m.id))
        ).scalar_one_or_none()
        out.append(_serialize_match(m, rep))

    return MatchListResponse(matches=out, total=len(out))


@router.get("/sample", response_model=AnalysisResponse)
async def get_sample_analysis():
    """Return the deterministic, clearly-labelled Sample Match benchmark."""
    ensure_sample_video(settings.upload_dir)
    data = generate_sample_match()
    return AnalysisResponse(
        match=data["match"],
        shots=data["shots"],
        report=data["report"],
    )


@router.get("/{match_id}", response_model=AnalysisResponse)
async def get_match(match_id: str, db: AsyncSession = Depends(get_db)):
    if match_id in ("sample", SAMPLE_MATCH_ID):
        ensure_sample_video(settings.upload_dir)
        data = generate_sample_match()
        return AnalysisResponse(
            match=data["match"],
            shots=data["shots"],
            report=data["report"],
        )

    match = (await db.execute(select(Match).where(Match.id == match_id))).scalar_one_or_none()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    shots = (
        await db.execute(select(Shot).where(Shot.match_id == match_id).order_by(Shot.shot_number))
    ).scalars().all()

    report = (
        await db.execute(select(MatchReport).where(MatchReport.match_id == match_id))
    ).scalar_one_or_none()

    return AnalysisResponse(
        match=_serialize_match(match, report),
        shots=[ShotResponse.model_validate(s) for s in shots],
        report=MatchReportResponse.model_validate(report) if report else None,
    )


@router.get("/{match_id}/status")
async def get_match_status(match_id: str, db: AsyncSession = Depends(get_db)):
    if match_id in ("sample", SAMPLE_MATCH_ID):
        return {
            "status": "analyzed",
            "progress": 100,
            "stage": "Complete — Sample Benchmark Verified",
            "detection_mode": "sample_demo",
            "error": None,
        }
    match = (await db.execute(select(Match).where(Match.id == match_id))).scalar_one_or_none()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    return {
        "status": match.status,
        "progress": match.processing_progress or 0,
        "stage": match.processing_stage or "Processing...",
        "detection_mode": match.detection_mode or "cv_tracked",
        "error": match.error_message,
    }


@router.delete("/{match_id}")
async def delete_match(match_id: str, db: AsyncSession = Depends(get_db)):
    match = (await db.execute(select(Match).where(Match.id == match_id))).scalar_one_or_none()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    if match.video_path and os.path.exists(match.video_path) and "sample_match.mp4" not in match.video_path:
        try:
            os.remove(match.video_path)
        except OSError:
            pass
    await db.delete(match)
    await db.commit()
    return {"status": "deleted", "id": match_id}
