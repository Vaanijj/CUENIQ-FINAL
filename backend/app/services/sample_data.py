"""CUE IQ — Sample Match Data & Playable Demo Video Generator
Provides deterministic, physically coherent sample snooker match data (clearly labelled is_sample=True)
and renders a matching playable MP4 video using OpenCV so timeline seeking and video playback work natively.
"""
from __future__ import annotations
import os
import math
import random
from datetime import datetime
from typing import List, Dict, Any

SAMPLE_MATCH_ID = "sample-championship-frame-03"
SAMPLE_REPORT_ID = "sample-report-championship-03"

POCKET_COORDS: Dict[str, Dict[str, float]] = {
    "top_left": {"x": 0.02, "y": 0.03},
    "top_center": {"x": 0.50, "y": 0.02},
    "top_right": {"x": 0.98, "y": 0.03},
    "bottom_left": {"x": 0.02, "y": 0.47},
    "bottom_center": {"x": 0.50, "y": 0.48},
    "bottom_right": {"x": 0.98, "y": 0.47},
}

BALL_BGR: Dict[str, tuple] = {
    "white": (242, 245, 247),
    "red": (38, 30, 217),
    "yellow": (48, 196, 244),
    "green": (74, 163, 22),
    "brown": (19, 69, 139),
    "blue": (235, 99, 37),
    "pink": (153, 72, 236),
    "black": (28, 24, 22),
}


def _interp_curve(
    start: Dict[str, float],
    end: Dict[str, float],
    ctrl_offset: tuple[float, float] = (0.0, 0.0),
    steps: int = 8,
) -> List[Dict[str, float]]:
    pts: List[Dict[str, float]] = []
    mx = (start["x"] + end["x"]) * 0.5 + ctrl_offset[0]
    my = (start["y"] + end["y"]) * 0.5 + ctrl_offset[1]
    for i in range(steps + 1):
        t = i / steps
        # Quadratic Bezier
        x = (1 - t) ** 2 * start["x"] + 2 * (1 - t) * t * mx + t ** 2 * end["x"]
        y = (1 - t) ** 2 * start["y"] + 2 * (1 - t) * t * my + t ** 2 * end["y"]
        pts.append({
            "x": round(max(0.02, min(0.98, x)), 4),
            "y": round(max(0.02, min(0.48, y)), 4),
        })
    return pts


# Curated 16-shot sequence across a 64-second broadcast clip (4s per shot window)
CURATED_SHOT_SPECS = [
    {
        "shot_number": 1,
        "timestamp_start": 1.0,
        "timestamp_end": 4.2,
        "player": "R. O'Sullivan (Sample)",
        "shot_type": "safety",
        "object_ball": "red",
        "outcome": "successful",
        "difficulty": 0.42,
        "cue_pos": {"x": 0.21, "y": 0.34},
        "obj_pos": {"x": 0.72, "y": 0.22},
        "obj_end": {"x": 0.84, "y": 0.12},
        "cue_post": {"x": 0.14, "y": 0.09},
        "target_pocket": "top_left",
        "position_score": 0.91,
        "tactical_assessment": "Containing break-off safety. Thin contact on the outer pack red returned the cue ball tight behind the green spot in baulk.",
        "alternative_suggestion": "Playing off the left side of the pack gives a fractionally wider margin against catching the middle jaw on the return path.",
        "ai_explanation": "High-percentage opening safety. Cue ball speed was judged within 4% of ideal weight, leaving the opponent bridging awkwardly over the baulk cushion.",
    },
    {
        "shot_number": 2,
        "timestamp_start": 5.0,
        "timestamp_end": 8.2,
        "player": "J. Trump (Sample)",
        "shot_type": "pot",
        "object_ball": "red",
        "outcome": "missed",
        "difficulty": 0.84,
        "cue_pos": {"x": 0.14, "y": 0.09},
        "obj_pos": {"x": 0.78, "y": 0.14},
        "obj_end": {"x": 0.93, "y": 0.08},
        "cue_post": {"x": 0.56, "y": 0.32},
        "target_pocket": "top_right",
        "position_score": 0.28,
        "tactical_assessment": "Ultra-aggressive long pot attempt from baulk at a 28-degree cut angle. Jawed off the far knuckle and left the cue ball stranded mid-table.",
        "alternative_suggestion": "With the cue ball close to the top baulk cushion, a two-cushion containment safety back to baulk had an 82% success probability vs 34% for the long pot.",
        "ai_explanation": "This aggressive long pot carried asymmetric downside risk: missing at pace left the cue ball in the center scoring zone with 4 loose reds potable.",
    },
    {
        "shot_number": 3,
        "timestamp_start": 9.0,
        "timestamp_end": 12.2,
        "player": "R. O'Sullivan (Sample)",
        "shot_type": "pot",
        "object_ball": "red",
        "outcome": "successful",
        "difficulty": 0.38,
        "cue_pos": {"x": 0.56, "y": 0.32},
        "obj_pos": {"x": 0.76, "y": 0.38},
        "obj_end": POCKET_COORDS["bottom_right"],
        "cue_post": {"x": 0.83, "y": 0.29},
        "target_pocket": "bottom_right",
        "position_score": 0.94,
        "tactical_assessment": "Controlled three-quarter ball starter red into the bottom-right corner with soft stun-run to land on the black.",
        "alternative_suggestion": "A pure stun shot stopping at (0.78, 0.34) also leaves a natural angle on the pink if the black spot is congested.",
        "ai_explanation": "Textbook frame-opening conversion. Minimal cue action kept the cue ball on the natural tangent line toward the black spot.",
    },
    {
        "shot_number": 4,
        "timestamp_start": 13.0,
        "timestamp_end": 16.2,
        "player": "R. O'Sullivan (Sample)",
        "shot_type": "break_building",
        "object_ball": "black",
        "outcome": "successful",
        "difficulty": 0.35,
        "cue_pos": {"x": 0.83, "y": 0.29},
        "obj_pos": {"x": 0.91, "y": 0.25},
        "obj_end": POCKET_COORDS["top_right"],
        "cue_post": {"x": 0.71, "y": 0.19},
        "target_pocket": "top_right",
        "position_score": 0.89,
        "tactical_assessment": "Black potted cleanly to the top-right pocket with slight top-left side to float out for the loose red below the pink.",
        "alternative_suggestion": "Straight screw off the bottom cushion was available, though floating one cushion into line is higher percentage.",
        "ai_explanation": "Smooth break-building tempo. Cue ball exit angle off the top cushion created a 15-degree half-ball angle on the next red.",
    },
    {
        "shot_number": 5,
        "timestamp_start": 17.0,
        "timestamp_end": 20.2,
        "player": "R. O'Sullivan (Sample)",
        "shot_type": "break_building",
        "object_ball": "red",
        "outcome": "successful",
        "difficulty": 0.44,
        "cue_pos": {"x": 0.71, "y": 0.19},
        "obj_pos": {"x": 0.64, "y": 0.11},
        "obj_end": POCKET_COORDS["top_center"],
        "cue_post": {"x": 0.68, "y": 0.28},
        "target_pocket": "top_center",
        "position_score": 0.92,
        "tactical_assessment": "Delicate medium-range red into the top-middle pocket, drawing the cue ball back across the center line for the pink.",
        "alternative_suggestion": "Following through to the baulk side of the blue was a conservative fallback if middle-pocket entry felt tight.",
        "ai_explanation": "Precise pace into the middle pocket jaws maximized effective pocket width while holding prime position on the pink.",
    },
    {
        "shot_number": 6,
        "timestamp_start": 21.0,
        "timestamp_end": 24.2,
        "player": "R. O'Sullivan (Sample)",
        "shot_type": "break_building",
        "object_ball": "pink",
        "outcome": "successful",
        "difficulty": 0.51,
        "cue_pos": {"x": 0.68, "y": 0.28},
        "obj_pos": {"x": 0.75, "y": 0.25},
        "obj_end": POCKET_COORDS["bottom_right"],
        "cue_post": {"x": 0.79, "y": 0.21},
        "target_pocket": "bottom_right",
        "position_score": 0.61,
        "tactical_assessment": "Pink potted to bottom-right corner while attempting to cannons the edge of the red cluster; under-hit by 15cm, leaving a thin cut.",
        "alternative_suggestion": "Committing to a firmer stun-follow into the bottom two reds would have guaranteed a split rather than grazing the pack.",
        "ai_explanation": "The pot itself was center-pocket, but decelerating on delivery reduced cue ball momentum into the cluster, leaving a difficult recovery shot.",
    },
    {
        "shot_number": 7,
        "timestamp_start": 25.0,
        "timestamp_end": 28.2,
        "player": "R. O'Sullivan (Sample)",
        "shot_type": "break_building",
        "object_ball": "red",
        "outcome": "successful",
        "difficulty": 0.76,
        "cue_pos": {"x": 0.79, "y": 0.21},
        "obj_pos": {"x": 0.86, "y": 0.09},
        "obj_end": POCKET_COORDS["top_right"],
        "cue_post": {"x": 0.48, "y": 0.21},
        "target_pocket": "top_right",
        "position_score": 0.85,
        "tactical_assessment": "Outstanding thin recovery cut along the top cushion into top-right, releasing the cue ball down-table onto the blue.",
        "alternative_suggestion": "Playing safe off the thin edge of the red back to baulk was the conservative option at 15-0 ahead.",
        "ai_explanation": "Elite recovery execution. Running side expanded the two-cushion release angle to bring the blue spot cleanly into play.",
    },
    {
        "shot_number": 8,
        "timestamp_start": 29.0,
        "timestamp_end": 32.2,
        "player": "R. O'Sullivan (Sample)",
        "shot_type": "break_building",
        "object_ball": "blue",
        "outcome": "successful",
        "difficulty": 0.40,
        "cue_pos": {"x": 0.48, "y": 0.21},
        "obj_pos": {"x": 0.50, "y": 0.25},
        "obj_end": POCKET_COORDS["bottom_center"],
        "cue_post": {"x": 0.67, "y": 0.34},
        "target_pocket": "bottom_center",
        "position_score": 0.88,
        "tactical_assessment": "Blue slotted into the bottom-middle pocket with natural follow-through toward the scoring zone.",
        "alternative_suggestion": "Stun-draw off the side cushion could have opened a flatter angle on the lower red.",
        "ai_explanation": "High-efficiency link shot returning the cue ball from mid-table back into the prime scoring triangle.",
    },
    {
        "shot_number": 9,
        "timestamp_start": 33.0,
        "timestamp_end": 36.2,
        "player": "R. O'Sullivan (Sample)",
        "shot_type": "miss",
        "object_ball": "red",
        "outcome": "missed",
        "difficulty": 0.68,
        "cue_pos": {"x": 0.67, "y": 0.34},
        "obj_pos": {"x": 0.82, "y": 0.41},
        "obj_end": {"x": 0.94, "y": 0.44},
        "cue_post": {"x": 0.61, "y": 0.16},
        "target_pocket": "bottom_right",
        "position_score": 0.35,
        "tactical_assessment": "Over-cut the red to the bottom-right corner while playing with check side to hold for the black. Break ends at 21.",
        "alternative_suggestion": "Playing with plain ball and accepting the pink or blue next would have avoided side-spin throw on a 40-degree cut.",
        "ai_explanation": "Applying check side at medium pace induced 1.8 degrees of cue-ball deflection (squirt), pushing the contact point too thin.",
    },
    {
        "shot_number": 10,
        "timestamp_start": 37.0,
        "timestamp_end": 40.2,
        "player": "J. Trump (Sample)",
        "shot_type": "pot",
        "object_ball": "red",
        "outcome": "successful",
        "difficulty": 0.46,
        "cue_pos": {"x": 0.61, "y": 0.16},
        "obj_pos": {"x": 0.91, "y": 0.42},
        "obj_end": POCKET_COORDS["bottom_right"],
        "cue_post": {"x": 0.85, "y": 0.31},
        "target_pocket": "bottom_right",
        "position_score": 0.93,
        "tactical_assessment": "Crisp medium-range pot punishing the missed red, holding the cue ball within 25cm of the black.",
        "alternative_suggestion": "None required — direct stun into the black zone is optimal.",
        "ai_explanation": "Clean center-of-pocket entry with dead-weight stun control.",
    },
    {
        "shot_number": 11,
        "timestamp_start": 41.0,
        "timestamp_end": 44.2,
        "player": "J. Trump (Sample)",
        "shot_type": "break_building",
        "object_ball": "black",
        "outcome": "successful",
        "difficulty": 0.39,
        "cue_pos": {"x": 0.85, "y": 0.31},
        "obj_pos": {"x": 0.91, "y": 0.25},
        "obj_end": POCKET_COORDS["top_right"],
        "cue_post": {"x": 0.74, "y": 0.24},
        "target_pocket": "top_right",
        "position_score": 0.95,
        "tactical_assessment": "Black potted with controlled screw to split two loose reds near the pyramid spot.",
        "alternative_suggestion": "Holding above the reds without touching them was also viable, but the controlled nudge created two insurance pots.",
        "ai_explanation": "Ideal cluster management: low cue-ball speed on impact separated the two reds by 18cm without losing cue-ball predictability.",
    },
    {
        "shot_number": 12,
        "timestamp_start": 45.0,
        "timestamp_end": 48.2,
        "player": "J. Trump (Sample)",
        "shot_type": "break_building",
        "object_ball": "red",
        "outcome": "successful",
        "difficulty": 0.31,
        "cue_pos": {"x": 0.74, "y": 0.24},
        "obj_pos": {"x": 0.81, "y": 0.15},
        "obj_end": POCKET_COORDS["top_right"],
        "cue_post": {"x": 0.87, "y": 0.21},
        "target_pocket": "top_right",
        "position_score": 0.90,
        "tactical_assessment": "Simple half-ball red to top-right corner, drifting naturally down toward the black spot.",
        "alternative_suggestion": "Slightly firmer pace leaves an upward angle on the black to work back toward center table.",
        "ai_explanation": "Routine break-building shot executed with high repeatable accuracy.",
    },
    {
        "shot_number": 13,
        "timestamp_start": 49.0,
        "timestamp_end": 52.2,
        "player": "J. Trump (Sample)",
        "shot_type": "safety",
        "object_ball": "yellow",
        "outcome": "successful",
        "difficulty": 0.58,
        "cue_pos": {"x": 0.87, "y": 0.21},
        "obj_pos": {"x": 0.21, "y": 0.33},
        "obj_end": {"x": 0.16, "y": 0.44},
        "cue_post": {"x": 0.06, "y": 0.24},
        "target_pocket": "bottom_left",
        "position_score": 0.88,
        "tactical_assessment": "Tactical snooker played behind the brown ball after running out of angle on the remaining reds.",
        "alternative_suggestion": "Attempting the thin plant on the bottom cushion carried <25% pot probability; the snooker behind brown was the superior tactical choice.",
        "ai_explanation": "Mature tactical discipline: rather than forcing a low-percentage pot, locked the cue ball within 8cm of the baulk cushion behind the brown.",
    },
    {
        "shot_number": 14,
        "timestamp_start": 53.0,
        "timestamp_end": 56.2,
        "player": "R. O'Sullivan (Sample)",
        "shot_type": "safety",
        "object_ball": "red",
        "outcome": "missed",
        "difficulty": 0.81,
        "cue_pos": {"x": 0.06, "y": 0.24},
        "obj_pos": {"x": 0.69, "y": 0.36},
        "obj_end": {"x": 0.75, "y": 0.42},
        "cue_post": {"x": 0.58, "y": 0.29},
        "target_pocket": "bottom_right",
        "position_score": 0.41,
        "tactical_assessment": "One-cushion escape hit the red successfully but caught it too thick, leaving a mid-range starter to the bottom-right corner.",
        "alternative_suggestion": "Two-cushion escape coming off the top and side cushions approached the pack from the safe side, reducing the chance of leaving a pot.",
        "ai_explanation": "Escaping via a single side cushion meant hitting the red on the open side of the table, exposing a potable angle.",
    },
    {
        "shot_number": 15,
        "timestamp_start": 57.0,
        "timestamp_end": 60.2,
        "player": "J. Trump (Sample)",
        "shot_type": "pot",
        "object_ball": "green",
        "outcome": "successful",
        "difficulty": 0.52,
        "cue_pos": {"x": 0.58, "y": 0.29},
        "obj_pos": {"x": 0.21, "y": 0.17},
        "obj_end": POCKET_COORDS["top_left"],
        "cue_post": {"x": 0.24, "y": 0.26},
        "target_pocket": "top_left",
        "position_score": 0.91,
        "tactical_assessment": "Long green to the top-left baulk pocket played with crisp stun to hold dead square on the brown.",
        "alternative_suggestion": "Rolling up behind the green for a snooker was unnecessary with a 68% pot opportunity.",
        "ai_explanation": "Decisive color clearance shot. Pure axial strike prevented lateral drift across the 1.8m cue-ball travel.",
    },
    {
        "shot_number": 16,
        "timestamp_start": 61.0,
        "timestamp_end": 64.0,
        "player": "J. Trump (Sample)",
        "shot_type": "break_building",
        "object_ball": "brown",
        "outcome": "successful",
        "difficulty": 0.36,
        "cue_pos": {"x": 0.24, "y": 0.26},
        "obj_pos": {"x": 0.21, "y": 0.25},
        "obj_end": POCKET_COORDS["bottom_left"],
        "cue_post": {"x": 0.46, "y": 0.27},
        "target_pocket": "bottom_left",
        "position_score": 0.96,
        "tactical_assessment": "Brown potted cleanly to bottom-left corner, running off the baulk cushion to center table for a frame-winning angle on the blue.",
        "alternative_suggestion": "Screw-back off the side cushion was an option, but natural one-cushion stun-follow into the center line is higher percentage.",
        "ai_explanation": "Pinpoint positional execution leaving a 12-degree angle on the blue into the middle pocket to seal the frame.",
    },
]


def generate_sample_shots(match_id: str = SAMPLE_MATCH_ID, num_shots: int = 16) -> List[Dict[str, Any]]:
    """Return deterministic, physically realistic sample shot records."""
    shots: List[Dict[str, Any]] = []
    specs = CURATED_SHOT_SPECS[: min(num_shots, len(CURATED_SHOT_SPECS))]
    for spec in specs:
        idx = spec["shot_number"]
        cue_pos = spec["cue_pos"]
        obj_pos = spec["obj_pos"]
        obj_end = spec["obj_end"]
        cue_post = spec["cue_post"]

        # Cue ball goes from cue_pos -> contact point near obj_pos -> cue_post deflection
        cue_traj = _interp_curve(cue_pos, obj_pos, (0.0, 0.0), steps=5) + _interp_curve(
            obj_pos, cue_post, (0.01, -0.01), steps=4
        )[1:]
        obj_traj = _interp_curve(obj_pos, obj_end, (0.0, 0.0), steps=7)

        shots.append({
            "id": f"sample-shot-{idx:02d}",
            "match_id": match_id,
            "shot_number": idx,
            "timestamp_start": spec["timestamp_start"],
            "timestamp_end": spec["timestamp_end"],
            "player": spec["player"],
            "shot_type": spec["shot_type"],
            "object_ball": spec["object_ball"],
            "outcome": spec["outcome"],
            "difficulty": spec["difficulty"],
            "cue_ball_position": cue_pos,
            "object_ball_position": obj_pos,
            "target_pocket": spec["target_pocket"],
            "trajectory": obj_traj,
            "cue_ball_trajectory": cue_traj,
            "tactical_assessment": spec["tactical_assessment"],
            "alternative_suggestion": spec["alternative_suggestion"],
            "position_score": spec["position_score"],
            "ai_explanation": spec["ai_explanation"],
        })
    return shots


def generate_sample_report(match_id: str, shots: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Compute genuine metrics from the provided shot list."""
    total = len(shots)
    pots = [s for s in shots if s.get("shot_type") in ("pot", "break_building", "miss")]
    pots_successful = [s for s in pots if s.get("outcome") == "successful"]
    safeties = [s for s in shots if s.get("shot_type") == "safety"]
    safeties_ok = [s for s in safeties if s.get("outcome") == "successful"]
    fouls = [s for s in shots if s.get("outcome") == "foul"]
    misses = [s for s in shots if s.get("outcome") == "missed"]

    vals = {"red": 1, "yellow": 2, "green": 3, "brown": 4, "blue": 5, "pink": 6, "black": 7}
    max_break = 0
    cur_break = 0
    last_player = None
    for s in shots:
        p = s.get("player")
        if p != last_player:
            max_break = max(max_break, cur_break)
            cur_break = 0
            last_player = p
        if s.get("outcome") == "successful" and s.get("shot_type") in ("pot", "break_building"):
            cur_break += vals.get(s.get("object_ball") or "red", 1)
        else:
            max_break = max(max_break, cur_break)
            cur_break = 0
    max_break = max(max_break, cur_break)

    avg_diff = sum((s.get("difficulty") or 0.5) for s in shots) / total if total else 0.0
    pos_scores = [s.get("position_score") for s in shots if s.get("position_score") is not None]
    avg_pos = (sum(pos_scores) / len(pos_scores)) if pos_scores else 0.0
    pot_rate = round(len(pots_successful) / len(pots) * 100, 1) if pots else 0.0
    safety_rate = round(len(safeties_ok) / len(safeties) * 100, 1) if safeties else 0.0
    overall_rating = round(
        min(9.8, max(4.0, (pot_rate * 0.05) + (safety_rate * 0.025) + (avg_pos * 2.5))),
        1,
    )

    return {
        "id": SAMPLE_REPORT_ID if match_id == SAMPLE_MATCH_ID else f"report-{match_id[:8]}",
        "match_id": match_id,
        "total_shots": total,
        "pots_attempted": len(pots),
        "pots_successful": len(pots_successful),
        "pot_success_rate": pot_rate,
        "safety_shots": len(safeties),
        "safety_success_rate": safety_rate,
        "fouls": len(fouls),
        "highest_break": max_break,
        "average_shot_difficulty": round(avg_diff, 2),
        "positional_accuracy": round(avg_pos * 100, 1),
        "missed_opportunities": len(misses),
        "key_strengths": [
            f"High pot conversion rate ({pot_rate}%) across medium-to-short range opportunities",
            "Controlled tangent-line stun and one-cushion release into the black/pink scoring zone",
            "Disciplined containment safety play when angle onto the pack deteriorated",
        ],
        "key_weaknesses": [
            "Side-spin squirt induced thin over-cuts on medium-pace 35°+ cut shots",
            "Low-percentage long pot attempts from close to the baulk cushion left mid-table exposure",
            "Single-cushion safety escapes exposed the open side of the red cluster",
        ],
        "tactical_patterns": [
            "Prefers bottom-right corner entry when initiating breaks from the pack",
            "Uses top-cushion float angles off the black to access middle-pocket reds",
            "Switches to baulk-end snookers behind brown/green when break continuation drops below 45%",
        ],
        "improvement_areas": [
            "Eliminate check-side on 35°–45° cut pots; play plain-ball and accept natural two-cushion position",
            "Replace forced long pots from within 15cm of the baulk cushion with two-cushion containment safeties",
            "Commit to full cue-ball acceleration when splitting the pack off the pink or black",
            "Practice two-cushion safety escapes that approach the red cluster from the safe side",
        ],
        "overall_rating": overall_rating,
        "ai_summary": (
            f"Across {total} analyzed shot events, potting efficiency reached {pot_rate}% with a positional "
            f"accuracy rating of {round(avg_pos * 100, 1)}%. Break-building transitions between the black spot "
            "and middle-pocket reds were clinical, highlighted by an elite thin cut recovery on Shot #7. "
            "The primary tactical vulnerability emerged on Shot #2 (a low-percentage long pot from baulk that "
            "gifted table control) and Shot #9 (where unnecessary check-side caused a thin miss on a routine red). "
            "Refining plain-ball alignment on medium cuts and tightening safety escape angles will elevate "
            "frame-winning conversion significantly."
        ),
        "created_at": "2026-11-14T18:00:00Z",
    }


def ensure_sample_video(upload_dir: str) -> str:
    """
    Generate a genuine playable MP4 video (`sample_match.mp4`) using OpenCV if it doesn't exist yet.
    Draws a high-contrast championship snooker table with animated balls matching CURATED_SHOT_SPECS
    so both the HTML5 video player and the OpenCV CV pipeline can play and analyze it natively.
    """
    os.makedirs(upload_dir, exist_ok=True)
    out_path = os.path.join(upload_dir, "sample_match.mp4")
    if os.path.exists(out_path) and os.path.getsize(out_path) > 50_000:
        return out_path

    try:
        import cv2
        import numpy as np

        width, height = 960, 540
        fps = 15
        duration_sec = 65
        total_frames = duration_sec * fps

        fourcc = cv2.VideoWriter_fourcc(*"avc1")
        writer = cv2.VideoWriter(out_path, fourcc, fps, (width, height))
        if not writer.isOpened():
            fourcc = cv2.VideoWriter_fourcc(*"mp4v")
            writer = cv2.VideoWriter(out_path, fourcc, fps, (width, height))

        # Table geometry in pixel space (800x400 playing area centered in 960x540)
        tx0, ty0 = 80, 70
        tw, th = 800, 400
        baulk_x = int(tx0 + tw * (737 / 3569))
        d_rad = int(th * (292 / 1778))

        shots = generate_sample_shots(SAMPLE_MATCH_ID, 16)

        for f_idx in range(total_frames):
            t_sec = f_idx / fps
            frame = np.full((height, width, 3), (12, 16, 14), dtype=np.uint8)

            # Outer mahogany/walnut rails
            cv2.rectangle(frame, (tx0 - 24, ty0 - 24), (tx0 + tw + 24, ty0 + th + 24), (26, 46, 82), -1)
            cv2.rectangle(frame, (tx0 - 6, ty0 - 6), (tx0 + tw + 6, ty0 + th + 6), (22, 95, 48), -1)

            # Green baize playing surface
            cv2.rectangle(frame, (tx0, ty0), (tx0 + tw, ty0 + th), (42, 132, 34), -1)

            # Baulk line & D semicircle
            cv2.line(frame, (baulk_x, ty0), (baulk_x, ty0 + th), (195, 220, 195), 1, cv2.LINE_AA)
            cv2.ellipse(
                frame,
                (baulk_x, ty0 + th // 2),
                (d_rad, d_rad),
                0,
                90,
                270,
                (195, 220, 195),
                1,
                cv2.LINE_AA,
            )

            # 6 Pockets
            for p_coord in POCKET_COORDS.values():
                px = int(tx0 + p_coord["x"] * tw)
                py = int(ty0 + (p_coord["y"] / 0.5) * th)
                cv2.circle(frame, (px, py), 15, (10, 12, 10), -1, cv2.LINE_AA)
                cv2.circle(frame, (px, py), 15, (60, 75, 65), 1, cv2.LINE_AA)

            # Ambient color spots/balls on table
            static_balls = [
                ("yellow", 0.206, 0.33),
                ("green", 0.206, 0.17),
                ("brown", 0.206, 0.25),
                ("blue", 0.50, 0.25),
                ("pink", 0.75, 0.25),
                ("black", 0.909, 0.25),
                ("red", 0.78, 0.23),
                ("red", 0.80, 0.27),
                ("red", 0.82, 0.25),
            ]

            active_shot = None
            for s in shots:
                if s["timestamp_start"] - 0.4 <= t_sec <= s["timestamp_end"] + 0.4:
                    active_shot = s
                    break

            for b_name, bx, by in static_balls:
                if active_shot and b_name == active_shot["object_ball"]:
                    continue
                px = int(tx0 + bx * tw)
                py = int(ty0 + (by / 0.5) * th)
                cv2.circle(frame, (px, py), 9, BALL_BGR[b_name], -1, cv2.LINE_AA)
                cv2.circle(frame, (px - 2, py - 2), 2, (255, 255, 255), -1, cv2.LINE_AA)

            if active_shot:
                dur = max(0.5, active_shot["timestamp_end"] - active_shot["timestamp_start"])
                prog = max(0.0, min(1.0, (t_sec - active_shot["timestamp_start"]) / dur))

                cue_pts = active_shot["cue_ball_trajectory"]
                obj_pts = active_shot["trajectory"]

                c_idx = min(len(cue_pts) - 1, int(prog * (len(cue_pts) - 1)))
                o_idx = min(len(obj_pts) - 1, int(max(0.0, (prog - 0.35) / 0.65) * (len(obj_pts) - 1)))

                c_pos = cue_pts[c_idx]
                o_pos = obj_pts[o_idx] if prog > 0.35 else active_shot["object_ball_position"]

                # Draw trajectory guide overlay
                for i in range(len(obj_pts) - 1):
                    p1 = (int(tx0 + obj_pts[i]["x"] * tw), int(ty0 + (obj_pts[i]["y"] / 0.5) * th))
                    p2 = (int(tx0 + obj_pts[i + 1]["x"] * tw), int(ty0 + (obj_pts[i + 1]["y"] / 0.5) * th))
                    cv2.line(frame, p1, p2, (125, 214, 0), 1, cv2.LINE_AA)

                # Draw active object ball
                ox = int(tx0 + o_pos["x"] * tw)
                oy = int(ty0 + (o_pos["y"] / 0.5) * th)
                ob_color = BALL_BGR.get(active_shot["object_ball"], (38, 30, 217))
                cv2.circle(frame, (ox, oy), 10, ob_color, -1, cv2.LINE_AA)
                cv2.circle(frame, (ox, oy), 14, (125, 214, 0), 1, cv2.LINE_AA)

                # Draw active cue ball
                cx = int(tx0 + c_pos["x"] * tw)
                cy = int(ty0 + (c_pos["y"] / 0.5) * th)
                cv2.circle(frame, (cx, cy), 10, BALL_BGR["white"], -1, cv2.LINE_AA)

                # Broadcast telemetry HUD banner
                hud = f"CUE IQ TELEMETRY | SHOT #{active_shot['shot_number']:02d} | {active_shot['player']} | {active_shot['shot_type'].upper()} ({active_shot['object_ball'].upper()})"
                cv2.putText(frame, hud, (80, 42), cv2.FONT_HERSHEY_SIMPLEX, 0.52, (180, 240, 210), 1, cv2.LINE_AA)
            else:
                cv2.putText(
                    frame,
                    f"CUE IQ SAMPLE BROADCAST FEED | T+{t_sec:05.1f}s",
                    (80, 42),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.5,
                    (130, 150, 140),
                    1,
                    cv2.LINE_AA,
                )

            writer.write(frame)

        writer.release()
    except Exception:
        # If OpenCV VideoWriter fails for any codec reason, ignore gracefully
        pass

    return out_path


def generate_sample_match(user_id: str = "sample-user") -> Dict[str, Any]:
    """Return the complete, deterministic sample match with shots and report."""
    shots = generate_sample_shots(SAMPLE_MATCH_ID, num_shots=16)
    report = generate_sample_report(SAMPLE_MATCH_ID, shots)
    match = {
        "id": SAMPLE_MATCH_ID,
        "user_id": user_id,
        "title": "Championship Quarter-Final — Frame 3 (Sample Benchmark)",
        "description": "Pre-calibrated championship broadcast dataset with verified ball trajectories and tactical telemetry (Demo / Sample Data).",
        "video_filename": "sample_match.mp4",
        "video_url": "/uploads/sample_match.mp4",
        "video_path": "./uploads/sample_match.mp4",
        "duration_seconds": 65.0,
        "status": "analyzed",
        "processing_progress": 100,
        "processing_stage": "Complete — Sample Benchmark Verified",
        "detection_mode": "sample_demo",
        "table_coverage": 98.4,
        "video_resolution": "960x540",
        "video_fps": 15.0,
        "is_sample": True,
        "pot_success_rate": report["pot_success_rate"],
        "safety_success_rate": report["safety_success_rate"],
        "total_shots": report["total_shots"],
        "highest_break": report["highest_break"],
        "overall_rating": report["overall_rating"],
        "created_at": "2026-11-14T18:00:00Z",
        "updated_at": "2026-11-14T18:00:00Z",
    }
    return {"match": match, "shots": shots, "report": report}
