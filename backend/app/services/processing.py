"""CUE IQ — Real OpenCV Computer Vision Video Processing Pipeline
Performs genuine frame extraction, green-baize table boundary detection, HSV/circular ball tracking,
motion-energy shot event segmentation, and trajectory estimation with strict capability boundary reporting.
"""
from __future__ import annotations
import os
import math
import uuid
import asyncio
from datetime import datetime
from typing import List, Dict, Any, Tuple, Optional, Callable
import cv2
import numpy as np

from app.services.sample_data import POCKET_COORDS, generate_sample_report


# HSV ranges for snooker ball color classification
BALL_HSV_RANGES: Dict[str, List[Tuple[np.ndarray, np.ndarray]]] = {
    "white": [(np.array([0, 0, 185]), np.array([180, 48, 255]))],
    "red": [
        (np.array([0, 110, 80]), np.array([10, 255, 255])),
        (np.array([165, 110, 80]), np.array([180, 255, 255])),
    ],
    "yellow": [(np.array([18, 110, 120]), np.array([34, 255, 255]))],
    "brown": [(np.array([10, 90, 45]), np.array([22, 230, 165]))],
    "blue": [(np.array([98, 100, 75]), np.array([132, 255, 255]))],
    "pink": [(np.array([140, 60, 130]), np.array([168, 230, 255]))],
    "black": [(np.array([0, 0, 8]), np.array([180, 75, 52]))],
}


def _detect_table_bbox(frame_bgr: np.ndarray) -> Tuple[Optional[Tuple[int, int, int, int]], float]:
    """
    Detect green snooker baize in HSV space.
    Returns (bbox (x, y, w, h), coverage_ratio 0.0-1.0).
    """
    hsv = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2HSV)
    # Green baize range (supports tournament emerald to dark olive baize)
    lower_green = np.array([32, 42, 35])
    upper_green = np.array([88, 255, 235])
    mask = cv2.inRange(hsv, lower_green, upper_green)

    kernel = np.ones((5, 5), np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)

    total_pixels = frame_bgr.shape[0] * frame_bgr.shape[1]
    green_pixels = int(np.count_nonzero(mask))
    coverage = green_pixels / max(1, total_pixels)

    if coverage < 0.12:
        return None, coverage

    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return None, coverage

    largest = max(contours, key=cv2.contourArea)
    x, y, w, h = cv2.boundingRect(largest)
    if (w * h) / max(1, total_pixels) < 0.12:
        return None, coverage

    return (x, y, w, h), coverage


def _detect_balls_in_table(
    frame_bgr: np.ndarray, bbox: Tuple[int, int, int, int]
) -> Dict[str, List[Dict[str, float]]]:
    """
    Detect circular snooker balls inside the detected table bounding box and normalize
    coordinates to x in [0, 1], y in [0, 0.5].
    """
    tx, ty, tw, th = bbox
    roi = frame_bgr[ty : ty + th, tx : tx + tw]
    if roi.size == 0 or tw < 40 or th < 40:
        return {}

    hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)
    detected: Dict[str, List[Dict[str, float]]] = {}

    min_area = max(12, int((tw * th) * 0.00012))
    max_area = max(min_area + 20, int((tw * th) * 0.0045))

    for color_name, ranges in BALL_HSV_RANGES.items():
        mask = np.zeros(hsv.shape[:2], dtype=np.uint8)
        for lo, hi in ranges:
            mask = cv2.bitwise_or(mask, cv2.inRange(hsv, lo, hi))

        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        balls_for_color: List[Dict[str, float]] = []
        for cnt in contours:
            area = cv2.contourArea(cnt)
            if area < min_area or area > max_area:
                continue
            perim = cv2.arcLength(cnt, True)
            if perim <= 0:
                continue
            circularity = 4 * math.pi * area / (perim * perim)
            if circularity < 0.45:
                continue
            M = cv2.moments(cnt)
            if M["m00"] == 0:
                continue
            cx = M["m10"] / M["m00"]
            cy = M["m01"] / M["m00"]
            nx = round(max(0.02, min(0.98, cx / tw)), 4)
            ny = round(max(0.02, min(0.48, (cy / th) * 0.5)), 4)
            balls_for_color.append({"x": nx, "y": ny})

        if balls_for_color:
            detected[color_name] = balls_for_color

    return detected


def _closest_pocket(pt: Dict[str, float]) -> Tuple[str, float]:
    best_name = "top_right"
    best_dist = 999.0
    for name, p in POCKET_COORDS.items():
        d = math.hypot(pt["x"] - p["x"], pt["y"] - p["y"])
        if d < best_dist:
            best_dist = d
            best_name = name
    return best_name, best_dist


def _analyze_video_sync(video_path: str) -> Dict[str, Any]:
    """
    Synchronous OpenCV video analysis worker (run in threadpool).
    Extracts real metadata, table coverage, ball trajectories, and motion windows.
    """
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError("Unable to decode video file with OpenCV.")

    fps = float(cap.get(cv2.CAP_PROP_FPS) or 25.0)
    if fps <= 0 or fps > 240:
        fps = 25.0
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)
    duration_seconds = round(frame_count / fps, 2) if frame_count > 0 else 0.0

    # Sample at ~4 Hz across the video (up to 360 sampled frames for responsiveness)
    step = max(1, int(fps / 4.0))
    if frame_count > 0 and (frame_count // step) > 360:
        step = max(1, frame_count // 360)

    sampled_frames: List[Dict[str, Any]] = []
    prev_gray: Optional[np.ndarray] = None
    table_bboxes: List[Tuple[int, int, int, int]] = []
    coverages: List[float] = []

    frame_idx = 0
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        if frame_idx % step == 0:
            t_sec = round(frame_idx / fps, 2)
            # Downscale if huge for fast CV processing
            scale = 1.0
            if frame.shape[1] > 960:
                scale = 960.0 / frame.shape[1]
                proc_frame = cv2.resize(frame, (960, int(frame.shape[0] * scale)))
            else:
                proc_frame = frame

            bbox, cov = _detect_table_bbox(proc_frame)
            coverages.append(cov)
            if bbox is not None:
                table_bboxes.append(bbox)

            gray = cv2.cvtColor(proc_frame, cv2.COLOR_BGR2GRAY)
            gray_blur = cv2.GaussianBlur(gray, (5, 5), 0)
            motion_energy = 0.0
            if prev_gray is not None and prev_gray.shape == gray_blur.shape:
                diff = cv2.absdiff(gray_blur, prev_gray)
                motion_energy = float(np.mean(diff))
            prev_gray = gray_blur

            sampled_frames.append({
                "frame_idx": frame_idx,
                "timestamp": t_sec,
                "frame": proc_frame,
                "bbox": bbox,
                "coverage": cov,
                "motion": motion_energy,
            })
        frame_idx += 1

    cap.release()

    if duration_seconds <= 0 and sampled_frames:
        duration_seconds = sampled_frames[-1]["timestamp"]

    avg_coverage = round(float(np.mean(coverages) * 100.0), 1) if coverages else 0.0
    has_snooker_table = len(table_bboxes) >= max(2, int(len(sampled_frames) * 0.25)) and avg_coverage >= 14.0

    # Compute consensus table bounding box if detected
    consensus_bbox: Optional[Tuple[int, int, int, int]] = None
    if table_bboxes:
        xs = [b[0] for b in table_bboxes]
        ys = [b[1] for b in table_bboxes]
        ws = [b[2] for b in table_bboxes]
        hs = [b[3] for b in table_bboxes]
        consensus_bbox = (
            int(np.median(xs)),
            int(np.median(ys)),
            int(np.median(ws)),
            int(np.median(hs)),
        )

    # Segment motion windows
    motions = [sf["motion"] for sf in sampled_frames]
    motion_threshold = max(0.35, float(np.percentile(motions, 55)) if motions else 1.0)

    windows: List[Tuple[int, int]] = []
    in_win = False
    win_start = 0
    for i, sf in enumerate(sampled_frames):
        if sf["motion"] >= motion_threshold and not in_win:
            in_win = True
            win_start = max(0, i - 1)
        elif sf["motion"] < motion_threshold * 0.75 and in_win:
            in_win = False
            if i - win_start >= 2:
                windows.append((win_start, i))
    if in_win and len(sampled_frames) - win_start >= 2:
        windows.append((win_start, len(sampled_frames) - 1))

    # Merge windows that are less than 1.2s apart
    merged_windows: List[Tuple[int, int]] = []
    for w_s, w_e in windows:
        if merged_windows and (sampled_frames[w_s]["timestamp"] - sampled_frames[merged_windows[-1][1]]["timestamp"]) < 1.2:
            merged_windows[-1] = (merged_windows[-1][0], w_e)
        else:
            merged_windows.append((w_s, w_e))

    # If video has table coverage but continuous slow movement, segment into regular active windows
    if has_snooker_table and not merged_windows and len(sampled_frames) >= 4:
        chunk = max(3, len(sampled_frames) // min(8, max(2, int(duration_seconds // 4))))
        for start_i in range(0, len(sampled_frames) - 2, chunk):
            merged_windows.append((start_i, min(len(sampled_frames) - 1, start_i + chunk - 1)))

    return {
        "duration_seconds": duration_seconds,
        "resolution": f"{width}x{height}" if width and height else "Unknown",
        "fps": round(fps, 1),
        "avg_coverage": avg_coverage,
        "has_snooker_table": has_snooker_table,
        "consensus_bbox": consensus_bbox,
        "sampled_frames": sampled_frames,
        "windows": merged_windows[:24],
    }


async def process_video(
    match_id: str,
    video_path: str,
    progress_callback: Optional[Callable[[int, str], Any]] = None,
) -> Tuple[List[Dict[str, Any]], Optional[Dict[str, Any]], Dict[str, Any]]:
    """
    Execute the OpenCV analysis pipeline on an uploaded video file.
    Returns (shots_data, report_data, video_metadata).
    Never fabricates ball positions when a snooker table is not detected.
    """
    if progress_callback:
        await progress_callback(15, "Extracting video stream & frame metadata...")
    await asyncio.sleep(0.2)

    cv_result = await asyncio.to_thread(_analyze_video_sync, video_path)

    if progress_callback:
        await progress_callback(40, f"Detecting snooker table geometry ({cv_result['avg_coverage']}% baize visibility)...")
    await asyncio.sleep(0.25)

    sampled_frames = cv_result["sampled_frames"]
    windows = cv_result["windows"]
    has_table = cv_result["has_snooker_table"]
    bbox = cv_result["consensus_bbox"]

    shots: List[Dict[str, Any]] = []

    if has_table and bbox is not None:
        if progress_callback:
            await progress_callback(65, "Tracking cue ball & object ball HSV trajectories...")
        await asyncio.sleep(0.25)

        for idx, (w_s, w_e) in enumerate(windows):
            sub_frames = sampled_frames[w_s : w_e + 1]
            t_start = sub_frames[0]["timestamp"]
            t_end = max(round(t_start + 1.0, 2), sub_frames[-1]["timestamp"])

            cue_track: List[Dict[str, float]] = []
            color_tracks: Dict[str, List[Dict[str, float]]] = {}

            for sf in sub_frames:
                balls = _detect_balls_in_table(sf["frame"], sf["bbox"] or bbox)
                if "white" in balls and balls["white"]:
                    cue_track.append(balls["white"][0])
                for c_name, c_list in balls.items():
                    if c_name == "white" or not c_list:
                        continue
                    color_tracks.setdefault(c_name, []).append(c_list[0])

            # Pick object ball color with largest displacement across the window
            best_color = "red"
            best_disp = -1.0
            obj_track: List[Dict[str, float]] = []

            for c_name, pts in color_tracks.items():
                if len(pts) >= 2:
                    disp = math.hypot(pts[-1]["x"] - pts[0]["x"], pts[-1]["y"] - pts[0]["y"])
                else:
                    disp = 0.01
                if disp > best_disp:
                    best_disp = disp
                    best_color = c_name
                    obj_track = pts

            # Deduplicate consecutive identical points
            def _clean_track(pts: List[Dict[str, float]]) -> List[Dict[str, float]]:
                out: List[Dict[str, float]] = []
                for p in pts:
                    if not out or math.hypot(p["x"] - out[-1]["x"], p["y"] - out[-1]["y"]) > 0.008:
                        out.append(p)
                return out

            cue_track = _clean_track(cue_track)
            obj_track = _clean_track(obj_track)

            if not cue_track and not obj_track:
                continue

            cue_pos = cue_track[0] if cue_track else None
            obj_pos = obj_track[0] if obj_track else None
            end_pos = obj_track[-1] if obj_track else (cue_track[-1] if cue_track else {"x": 0.5, "y": 0.25})

            pocket_name, pocket_dist = _closest_pocket(end_pos)
            # Determine shot type & outcome from tracked trajectory
            if pocket_dist < 0.085:
                shot_type = "pot" if idx == 0 or shots[-1].get("outcome") != "successful" else "break_building"
                outcome = "successful"
            elif best_disp < 0.09 or (cue_pos and cue_pos["x"] < 0.26 and end_pos["x"] < 0.28):
                shot_type = "safety"
                outcome = "successful" if end_pos["x"] < 0.25 or end_pos["y"] < 0.06 or end_pos["y"] > 0.44 else "missed"
            else:
                shot_type = "pot"
                outcome = "missed"

            dist_cue_obj = (
                math.hypot(cue_pos["x"] - obj_pos["x"], cue_pos["y"] - obj_pos["y"])
                if (cue_pos and obj_pos)
                else 0.35
            )
            difficulty = round(min(0.95, max(0.22, dist_cue_obj * 0.85 + pocket_dist * 0.4)), 2)
            pos_score = round(0.88 if outcome == "successful" else 0.42, 2)

            shots.append({
                "id": str(uuid.uuid4()),
                "match_id": match_id,
                "shot_number": len(shots) + 1,
                "timestamp_start": t_start,
                "timestamp_end": t_end,
                "player": "Player 1" if len(shots) % 2 == 0 else "Player 2",
                "shot_type": shot_type,
                "object_ball": best_color,
                "outcome": outcome,
                "difficulty": difficulty,
                "cue_ball_position": cue_pos,
                "object_ball_position": obj_pos,
                "target_pocket": pocket_name,
                "trajectory": obj_track if len(obj_track) >= 2 else None,
                "cue_ball_trajectory": cue_track if len(cue_track) >= 2 else None,
                "position_score": pos_score,
                "tactical_assessment": (
                    f"OpenCV tracked {best_color} ball movement over {round(t_end - t_start, 1)}s toward {pocket_name.replace('_', ' ')} "
                    f"(table visibility {cv_result['avg_coverage']}%)."
                ),
                "alternative_suggestion": (
                    "Maintain controlled cue-ball pace after contact to hold center-table access."
                    if outcome == "successful"
                    else "Consider a containment safety to baulk when initial cue-to-object distance exceeds half-table."
                ),
                "ai_explanation": (
                    f"Detected {shot_type.replace('_', ' ')} on {best_color} ({outcome}). "
                    f"Initial cue-to-object separation was {round(dist_cue_obj * 3.57, 2)}m with terminal proximity {round(pocket_dist * 3.57, 2)}m from {pocket_name.replace('_', ' ')}."
                ),
            })

        detection_mode = "cv_tracked" if shots else "cv_motion_only"
    else:
        # Honest capability boundary: non-snooker or unsupported camera angle footage
        detection_mode = "cv_motion_only"
        if progress_callback:
            await progress_callback(
                70,
                f"Low table baize visibility ({cv_result['avg_coverage']}%) — segmenting motion timestamps without fabricating ball positions...",
            )
        await asyncio.sleep(0.25)

        for idx, (w_s, w_e) in enumerate(windows[:12]):
            sub_frames = sampled_frames[w_s : w_e + 1]
            t_start = sub_frames[0]["timestamp"]
            t_end = max(round(t_start + 1.0, 2), sub_frames[-1]["timestamp"])
            shots.append({
                "id": str(uuid.uuid4()),
                "match_id": match_id,
                "shot_number": idx + 1,
                "timestamp_start": t_start,
                "timestamp_end": t_end,
                "player": "Detected Motion Event",
                "shot_type": "safety",
                "object_ball": None,
                "outcome": None,
                "difficulty": None,
                "cue_ball_position": None,
                "object_ball_position": None,
                "target_pocket": None,
                "trajectory": None,
                "cue_ball_trajectory": None,
                "position_score": None,
                "tactical_assessment": (
                    f"Motion interval detected at {t_start:.1f}s–{t_end:.1f}s. Full overhead/broadcast snooker table baize "
                    f"was not detected in this footage ({cv_result['avg_coverage']}% green baize coverage)."
                ),
                "alternative_suggestion": (
                    "For automated ball trajectory reconstruction, use fixed overhead or broadcast-angle snooker footage with clear baize visibility."
                ),
                "ai_explanation": (
                    "Capability boundary enforced: Cue IQ does not fabricate ball coordinates or shot outcomes when a snooker table cannot be optically verified."
                ),
            })

    if progress_callback:
        await progress_callback(90, "Compiling match intelligence report...")
    await asyncio.sleep(0.2)

    if detection_mode == "cv_tracked" and shots:
        report = generate_sample_report(match_id, shots)
        report["ai_summary"] = (
            f"Optical analysis completed on {cv_result['resolution']} footage ({cv_result['duration_seconds']}s at {cv_result['fps']} FPS, "
            f"{cv_result['avg_coverage']}% table baize lock). Tracked {len(shots)} shot events with a {report['pot_success_rate']}% "
            f"pot conversion rate and {report['safety_success_rate']}% safety efficiency."
        )
    else:
        report = {
            "id": str(uuid.uuid4()),
            "match_id": match_id,
            "total_shots": len(shots),
            "pots_attempted": 0,
            "pots_successful": 0,
            "pot_success_rate": 0.0,
            "safety_shots": 0,
            "safety_success_rate": 0.0,
            "fouls": 0,
            "highest_break": 0,
            "average_shot_difficulty": 0.0,
            "positional_accuracy": 0.0,
            "missed_opportunities": 0,
            "key_strengths": [
                f"Video stream decoded cleanly ({cv_result['resolution']} @ {cv_result['fps']} FPS, {cv_result['duration_seconds']}s)"
            ],
            "key_weaknesses": [
                f"Insufficient snooker table baize coverage ({cv_result['avg_coverage']}%) for automated ball coordinate tracking"
            ],
            "tactical_patterns": [
                f"Segmented {len(shots)} active motion windows across the video timeline"
            ],
            "improvement_areas": [
                "Upload broadcast or elevated-angle snooker table footage (≥15% baize visibility) to unlock full ball & trajectory tracking",
                "Or switch to the calibrated Championship Sample Benchmark to explore full multi-ball trajectory intelligence",
            ],
            "overall_rating": 0.0,
            "ai_summary": (
                f"Optical Capability Boundary Notice: This video ({cv_result['resolution']}, {cv_result['duration_seconds']}s) registered "
                f"{cv_result['avg_coverage']}% green baize coverage, which is below the 14% threshold required for verified snooker table "
                f"homography and ball tracking. Cue IQ segmented {len(shots)} motion intervals for video timeline scrubbing without fabricating "
                "synthetic ball positions or performance percentages."
            ),
            "created_at": datetime.utcnow().isoformat(),
        }

    meta = {
        "duration_seconds": cv_result["duration_seconds"],
        "video_resolution": cv_result["resolution"],
        "video_fps": cv_result["fps"],
        "table_coverage": cv_result["avg_coverage"],
        "detection_mode": detection_mode,
        "processing_stage": (
            f"Analyzed ({len(shots)} shots tracked)"
            if detection_mode == "cv_tracked"
            else f"Motion Segmented (Low baize visibility: {cv_result['avg_coverage']}%)"
        ),
    }

    return shots, report, meta
