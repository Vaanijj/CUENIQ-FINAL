"""CUE IQ — Pydantic Schemas"""
from __future__ import annotations
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List, Dict, Any


# --- Auth ---
class UserCreate(BaseModel):
    email: str
    password: str
    display_name: Optional[str] = None


class UserLogin(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: str
    email: str
    display_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# --- Match ---
class MatchResponse(BaseModel):
    id: str
    title: Optional[str] = None
    description: Optional[str] = None
    video_filename: str
    video_url: Optional[str] = None
    duration_seconds: Optional[float] = None
    status: str
    processing_progress: int
    processing_stage: Optional[str] = None
    detection_mode: Optional[str] = "cv_tracked"
    table_coverage: Optional[float] = None
    video_resolution: Optional[str] = None
    video_fps: Optional[float] = None
    error_message: Optional[str] = None
    is_sample: bool = False
    pot_success_rate: Optional[float] = None
    safety_success_rate: Optional[float] = None
    total_shots: Optional[int] = None
    highest_break: Optional[int] = None
    overall_rating: Optional[float] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MatchListResponse(BaseModel):
    matches: List[MatchResponse]
    total: int


# --- Shot ---
class Position(BaseModel):
    x: float
    y: float


class ShotResponse(BaseModel):
    id: str
    shot_number: int
    timestamp_start: float
    timestamp_end: Optional[float] = None
    player: Optional[str] = None
    shot_type: Optional[str] = None
    object_ball: Optional[str] = None
    outcome: Optional[str] = None
    difficulty: Optional[float] = None
    cue_ball_position: Optional[Dict[str, float]] = None
    object_ball_position: Optional[Dict[str, float]] = None
    target_pocket: Optional[str] = None
    trajectory: Optional[List[Dict[str, float]]] = None
    cue_ball_trajectory: Optional[List[Dict[str, float]]] = None
    tactical_assessment: Optional[str] = None
    alternative_suggestion: Optional[str] = None
    position_score: Optional[float] = None
    ai_explanation: Optional[str] = None

    class Config:
        from_attributes = True


# --- Report ---
class MatchReportResponse(BaseModel):
    id: str
    total_shots: int
    pots_attempted: int
    pots_successful: int
    pot_success_rate: float
    safety_shots: int
    safety_success_rate: float
    fouls: int
    highest_break: int
    average_shot_difficulty: float
    positional_accuracy: float
    missed_opportunities: int
    key_strengths: Optional[List[str]] = None
    key_weaknesses: Optional[List[str]] = None
    tactical_patterns: Optional[List[str]] = None
    improvement_areas: Optional[List[str]] = None
    overall_rating: Optional[float] = None
    ai_summary: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# --- Chat ---
class ChatRequest(BaseModel):
    message: str
    match_id: Optional[str] = None
    shot_id: Optional[str] = None
    shot_number: Optional[int] = None


class ChatMessageResponse(BaseModel):
    id: str
    role: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


class AnalysisResponse(BaseModel):
    match: MatchResponse
    shots: List[ShotResponse]
    report: Optional[MatchReportResponse] = None
