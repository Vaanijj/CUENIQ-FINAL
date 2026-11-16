"""CUE IQ — AI Coach API Routes"""
from __future__ import annotations
import uuid
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.schemas.schemas import ChatRequest, ChatMessageResponse
from app.services.coach import get_coaching_response
from app.services.sample_data import generate_sample_match, SAMPLE_MATCH_ID
from app.models.models import ChatMessage, Match, Shot, MatchReport
from app.api.auth import get_optional_user, User

router = APIRouter(prefix="/api/coach", tags=["coach"])


@router.post("/chat", response_model=List[ChatMessageResponse])
async def chat(
    req: ChatRequest,
    db: AsyncSession = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user),
):
    user_id = user.id if user else "anonymous"

    # Load match context (either real match from DB or sample benchmark)
    match_data: Optional[Dict[str, Any]] = None
    selected_shot: Optional[Dict[str, Any]] = None

    if req.match_id and req.match_id not in ("sample", SAMPLE_MATCH_ID):
        match_obj = (
            await db.execute(select(Match).where(Match.id == req.match_id))
        ).scalar_one_or_none()
        if match_obj:
            shots_objs = (
                await db.execute(
                    select(Shot).where(Shot.match_id == req.match_id).order_by(Shot.shot_number)
                )
            ).scalars().all()
            report_obj = (
                await db.execute(select(MatchReport).where(MatchReport.match_id == req.match_id))
            ).scalar_one_or_none()

            shots_list = [
                {
                    "id": s.id,
                    "shot_number": s.shot_number,
                    "timestamp_start": s.timestamp_start,
                    "timestamp_end": s.timestamp_end,
                    "player": s.player,
                    "shot_type": s.shot_type,
                    "object_ball": s.object_ball,
                    "outcome": s.outcome,
                    "difficulty": s.difficulty,
                    "target_pocket": s.target_pocket,
                    "position_score": s.position_score,
                    "tactical_assessment": s.tactical_assessment,
                    "alternative_suggestion": s.alternative_suggestion,
                    "ai_explanation": s.ai_explanation,
                }
                for s in shots_objs
            ]
            rep_dict = (
                {
                    "total_shots": report_obj.total_shots,
                    "pot_success_rate": report_obj.pot_success_rate,
                    "safety_success_rate": report_obj.safety_success_rate,
                    "positional_accuracy": report_obj.positional_accuracy,
                    "highest_break": report_obj.highest_break,
                    "missed_opportunities": report_obj.missed_opportunities,
                    "key_strengths": report_obj.key_strengths,
                    "key_weaknesses": report_obj.key_weaknesses,
                    "improvement_areas": report_obj.improvement_areas,
                }
                if report_obj
                else {}
            )
            match_data = {
                "match": {"id": match_obj.id, "title": match_obj.title},
                "shots": shots_list,
                "report": rep_dict,
            }

    if not match_data:
        match_data = generate_sample_match()

    # Resolve selected shot if provided
    shots_pool = match_data.get("shots") or []
    if req.shot_id:
        for s in shots_pool:
            if s.get("id") == req.shot_id:
                selected_shot = s
                break
    if not selected_shot and req.shot_number is not None:
        for s in shots_pool:
            if s.get("shot_number") == req.shot_number:
                selected_shot = s
                break

    # Save user message
    user_msg = ChatMessage(
        id=str(uuid.uuid4()),
        user_id=user_id,
        match_id=req.match_id,
        role="user",
        content=req.message,
    )
    db.add(user_msg)

    # Generate context-aware response
    response_text = get_coaching_response(req.message, match_data=match_data, selected_shot=selected_shot)

    # Save assistant message
    assistant_msg = ChatMessage(
        id=str(uuid.uuid4()),
        user_id=user_id,
        match_id=req.match_id,
        role="assistant",
        content=response_text,
    )
    db.add(assistant_msg)
    await db.commit()

    return [
        ChatMessageResponse.model_validate(user_msg),
        ChatMessageResponse.model_validate(assistant_msg),
    ]
