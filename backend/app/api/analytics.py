"""CUE IQ — Analytics API
Computes genuine performance metrics across persisted matches and provides a clearly-labelled
sample benchmark dataset when no user matches have been uploaded yet.
"""
from __future__ import annotations
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.models import Match, Shot, MatchReport
from app.api.auth import get_optional_user, User
from app.services.sample_data import generate_sample_match
from app.services.analytics_service import aggregate_shots as _aggregate_shots

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

BALL_ORDER = ["red", "yellow", "green", "brown", "blue", "pink", "black"]


def _aggregate_shots(shots: List[Dict[str, Any]], reports: List[Dict[str, Any]], matches_meta: List[Dict[str, Any]], is_sample: bool) -> Dict[str, Any]:
    total_shots = len(shots)
    pots = [s for s in shots if s.get("shot_type") in ("pot", "break_building", "miss")]
    successful_pots = [s for s in pots if s.get("outcome") == "successful"]
    safeties = [s for s in shots if s.get("shot_type") == "safety"]
    successful_safeties = [s for s in safeties if s.get("outcome") == "successful"]
    misses = [s for s in shots if s.get("outcome") == "missed"]
    fouls = [s for s in shots if s.get("outcome") == "foul"]

    pot_rate = round(len(successful_pots) / len(pots) * 100, 1) if pots else 0.0
    safety_rate = round(len(successful_safeties) / len(safeties) * 100, 1) if safeties else 0.0

    pos_scores = [s.get("position_score") for s in shots if s.get("position_score") is not None]
    positional_accuracy = round((sum(pos_scores) / len(pos_scores)) * 100, 1) if pos_scores else 0.0

    diffs = [s.get("difficulty") for s in shots if s.get("difficulty") is not None]
    avg_diff = round((sum(diffs) / len(diffs)) * 100, 1) if diffs else 0.0

    highest_break = max([r.get("highest_break", 0) for r in reports], default=0)

    # Pot success by ball color
    pot_by_ball = []
    for color in BALL_ORDER:
        c_shots = [s for s in pots if s.get("object_ball") == color]
        c_ok = [s for s in c_shots if s.get("outcome") == "successful"]
        pot_by_ball.append({
            "ball": color,
            "attempted": len(c_shots),
            "successful": len(c_ok),
            "rate": round(len(c_ok) / len(c_shots) * 100, 1) if c_shots else 0.0,
        })

    # Shot type distribution
    type_counts = {
        "pot": len([s for s in shots if s.get("shot_type") == "pot" and s.get("outcome") == "successful"]),
        "break_building": len([s for s in shots if s.get("shot_type") == "break_building" and s.get("outcome") == "successful"]),
        "safety": len(safeties),
        "missed": len(misses),
        "foul": len(fouls),
    }

    # Table zone performance (baulk x < 0.3, center 0.3..0.68, top > 0.68)
    zones = {"baulk": [], "center": [], "scoring_top": []}
    for s in shots:
        obj = s.get("object_ball_position")
        if not obj or not isinstance(obj, dict):
            continue
        x = obj.get("x", 0.5)
        ok = 1.0 if s.get("outcome") == "successful" else 0.0
        if x < 0.30:
            zones["baulk"].append(ok)
        elif x <= 0.68:
            zones["center"].append(ok)
        else:
            zones["scoring_top"].append(ok)

    zone_stats = {
        k: {
            "shots": len(v),
            "success_rate": round(sum(v) / len(v) * 100, 1) if v else 0.0,
        }
        for k, v in zones.items()
    }

    return {
        "is_sample": is_sample,
        "total_matches": len(matches_meta),
        "total_shots": total_shots,
        "pot_success_rate": pot_rate,
        "safety_success_rate": safety_rate,
        "positional_accuracy": positional_accuracy,
        "average_difficulty": avg_diff,
        "highest_break": highest_break,
        "missed_opportunities": len(misses),
        "fouls": len(fouls),
        "pot_by_ball": pot_by_ball,
        "shot_distribution": type_counts,
        "zone_performance": zone_stats,
        "match_progression": matches_meta,
    }


@router.get("/overview")
async def get_overview(
    include_sample: bool = Query(False, description="Include sample benchmark when no user matches exist"),
    db: AsyncSession = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user),
):
    """Get measurable performance analytics computed from persisted match records."""
    query = select(Match).where(Match.status == "analyzed").order_by(Match.created_at)
    if user:
        query = query.where(Match.user_id == user.id)
    matches = (await db.execute(query)).scalars().all()

    if matches and not include_sample:
        all_shots: List[Dict[str, Any]] = []
        all_reports: List[Dict[str, Any]] = []
        progression: List[Dict[str, Any]] = []

        for m in matches:
            m_shots = (await db.execute(select(Shot).where(Shot.match_id == m.id))).scalars().all()
            m_rep = (
                await db.execute(select(MatchReport).where(MatchReport.match_id == m.id))
            ).scalar_one_or_none()

            for s in m_shots:
                all_shots.append({
                    "shot_type": s.shot_type,
                    "object_ball": s.object_ball,
                    "outcome": s.outcome,
                    "difficulty": s.difficulty,
                    "position_score": s.position_score,
                    "object_ball_position": s.object_ball_position,
                })
            if m_rep:
                rep_d = {
                    "pot_success_rate": m_rep.pot_success_rate,
                    "safety_success_rate": m_rep.safety_success_rate,
                    "positional_accuracy": m_rep.positional_accuracy,
                    "highest_break": m_rep.highest_break,
                    "overall_rating": m_rep.overall_rating,
                }
                all_reports.append(rep_d)
                progression.append({
                    "id": m.id,
                    "title": m.title or m.video_filename,
                    "date": m.created_at.strftime("%b %d"),
                    "pot_success_rate": m_rep.pot_success_rate,
                    "safety_success_rate": m_rep.safety_success_rate,
                    "positional_accuracy": m_rep.positional_accuracy,
                    "highest_break": m_rep.highest_break,
                    "overall_rating": m_rep.overall_rating or 0.0,
                    "total_shots": m_rep.total_shots,
                    "is_sample": False,
                })

        data = _aggregate_shots(all_shots, all_reports, progression, is_sample=False)
        data["has_real_matches"] = True
        return data

    # When no uploaded matches exist yet (or sample benchmark is explicitly requested),
    # return the clearly labelled sample dataset computed from the 16-shot sample match.
    sample = generate_sample_match()
    s_match = sample["match"]
    s_rep = sample["report"]
    progression = [
        {
            "id": s_match["id"],
            "title": s_match["title"],
            "date": "Sample Benchmark",
            "pot_success_rate": s_rep["pot_success_rate"],
            "safety_success_rate": s_rep["safety_success_rate"],
            "positional_accuracy": s_rep["positional_accuracy"],
            "highest_break": s_rep["highest_break"],
            "overall_rating": s_rep["overall_rating"],
            "total_shots": s_rep["total_shots"],
            "is_sample": True,
        }
    ]
    data = _aggregate_shots(sample["shots"], [s_rep], progression, is_sample=True)
    data["has_real_matches"] = len(matches) > 0
    return data
