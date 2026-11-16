"""CUE IQ — Pure-Python Analytics Aggregation Service"""
from __future__ import annotations
from typing import List, Dict, Any

BALL_ORDER = ["red", "yellow", "green", "brown", "blue", "pink", "black"]


def aggregate_shots(
    shots: List[Dict[str, Any]],
    reports: List[Dict[str, Any]],
    matches_meta: List[Dict[str, Any]],
    is_sample: bool,
) -> Dict[str, Any]:
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

    type_counts = {
        "pot": len([s for s in shots if s.get("shot_type") == "pot" and s.get("outcome") == "successful"]),
        "break_building": len([s for s in shots if s.get("shot_type") == "break_building" and s.get("outcome") == "successful"]),
        "safety": len(safeties),
        "missed": len(misses),
        "foul": len(fouls),
    }

    zones: Dict[str, List[float]] = {"baulk": [], "center": [], "scoring_top": []}
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
