"""CUE IQ — Database Models"""
from __future__ import annotations
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Text, DateTime, Boolean, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.database import Base


def gen_id() -> str:
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, default=gen_id)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    display_name = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    matches = relationship("Match", back_populates="user", cascade="all, delete-orphan")


class Match(Base):
    __tablename__ = "matches"
    id = Column(String, primary_key=True, default=gen_id)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    video_filename = Column(String, nullable=False)
    video_path = Column(String, nullable=False)
    duration_seconds = Column(Float, nullable=True)
    status = Column(String, default="uploaded")  # uploaded, processing, analyzed, unsupported, error
    processing_progress = Column(Integer, default=0)
    processing_stage = Column(String, default="Queued for optical analysis")
    detection_mode = Column(String, default="cv_tracked")  # cv_tracked, cv_motion_only, sample_demo
    table_coverage = Column(Float, nullable=True)
    video_resolution = Column(String, nullable=True)
    video_fps = Column(Float, nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_sample = Column(Boolean, default=False)

    user = relationship("User", back_populates="matches")
    shots = relationship("Shot", back_populates="match", cascade="all, delete-orphan")
    report = relationship("MatchReport", back_populates="match", uselist=False, cascade="all, delete-orphan")


class Shot(Base):
    __tablename__ = "shots"
    id = Column(String, primary_key=True, default=gen_id)
    match_id = Column(String, ForeignKey("matches.id"), nullable=False)
    shot_number = Column(Integer, nullable=False)
    timestamp_start = Column(Float, nullable=False)
    timestamp_end = Column(Float, nullable=True)
    player = Column(String, nullable=True)
    shot_type = Column(String, nullable=True)  # pot, safety, miss, foul, break_building
    object_ball = Column(String, nullable=True)  # red, yellow, green, brown, blue, pink, black
    outcome = Column(String, nullable=True)  # successful, missed, foul
    difficulty = Column(Float, nullable=True)  # 0.0 - 1.0
    cue_ball_position = Column(JSON, nullable=True)  # {x, y}
    object_ball_position = Column(JSON, nullable=True)  # {x, y}
    target_pocket = Column(String, nullable=True)
    trajectory = Column(JSON, nullable=True)  # [{x, y}, ...]
    cue_ball_trajectory = Column(JSON, nullable=True)  # [{x, y}, ...]
    tactical_assessment = Column(Text, nullable=True)
    alternative_suggestion = Column(Text, nullable=True)
    position_score = Column(Float, nullable=True)
    ai_explanation = Column(Text, nullable=True)

    match = relationship("Match", back_populates="shots")


class MatchReport(Base):
    __tablename__ = "match_reports"
    id = Column(String, primary_key=True, default=gen_id)
    match_id = Column(String, ForeignKey("matches.id"), nullable=False)
    total_shots = Column(Integer, default=0)
    pots_attempted = Column(Integer, default=0)
    pots_successful = Column(Integer, default=0)
    pot_success_rate = Column(Float, default=0.0)
    safety_shots = Column(Integer, default=0)
    safety_success_rate = Column(Float, default=0.0)
    fouls = Column(Integer, default=0)
    highest_break = Column(Integer, default=0)
    average_shot_difficulty = Column(Float, default=0.0)
    positional_accuracy = Column(Float, default=0.0)
    missed_opportunities = Column(Integer, default=0)
    key_strengths = Column(JSON, nullable=True)
    key_weaknesses = Column(JSON, nullable=True)
    tactical_patterns = Column(JSON, nullable=True)
    improvement_areas = Column(JSON, nullable=True)
    overall_rating = Column(Float, nullable=True)
    ai_summary = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    match = relationship("Match", back_populates="report")


class ChatMessage(Base):
    __tablename__ = "chat_messages"
    id = Column(String, primary_key=True, default=gen_id)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    match_id = Column(String, ForeignKey("matches.id"), nullable=True)
    role = Column(String, nullable=False)  # user, assistant
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
