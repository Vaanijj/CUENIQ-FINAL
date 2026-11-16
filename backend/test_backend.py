"""CUE IQ — Automated End-to-End Verification Suite
Tests sample data determinism, trajectory geometry, report calculations, context-aware AI coaching,
and full HTTP API upload -> processing -> status polling -> analysis -> analytics -> deletion workflow.
"""
from __future__ import annotations
import os
import sys
import json
import time
import struct
import threading
import urllib.request
from http.server import ThreadingHTTPServer

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)

from app.services.sample_data import generate_sample_match, SAMPLE_MATCH_ID
from app.services.coach import get_coaching_response
from app.services.analytics_service import aggregate_shots as _aggregate_shots
from run_server import CueIQRequestHandler, init_sqlite_db


def _make_iso_mp4_bytes(duration_sec: int = 40, width: int = 1280, height: int = 720) -> bytes:
    """Create a valid ISO BMFF MP4 header with mvhd (duration) and tkhd (resolution) atoms."""
    ftyp = b"\x00\x00\x00\x14ftypisom\x00\x00\x02\x00isom"
    timescale = 1000
    dur_units = duration_sec * timescale
    mvhd_payload = (
        b"\x00\x00\x00\x00"  # version 0 + flags
        + struct.pack(">IIII", 0, 0, timescale, dur_units)
        + b"\x00" * 76
    )
    mvhd = struct.pack(">I", len(mvhd_payload) + 8) + b"mvhd" + mvhd_payload

    tkhd_payload = (
        b"\x00\x00\x00\x07"  # version 0 + flags
        + b"\x00" * 72
        + struct.pack(">II", width << 16, height << 16)
    )
    tkhd = struct.pack(">I", len(tkhd_payload) + 8) + b"tkhd" + tkhd_payload
    return ftyp + mvhd + tkhd + (b"\x00" * 256)


def _http_json(url: str, method: str = "GET", data: bytes | None = None, headers: dict | None = None):
    req = urllib.request.Request(url, data=data, method=method, headers=headers or {})
    with urllib.request.urlopen(req, timeout=10) as resp:
        return resp.status, json.loads(resp.read().decode("utf-8"))


def run_tests():
    # 1. Verify Sample Match Determinism & Geometry
    sample_a = generate_sample_match()
    sample_b = generate_sample_match()
    assert sample_a["match"]["id"] == SAMPLE_MATCH_ID
    assert sample_a["match"]["is_sample"] is True
    assert len(sample_a["shots"]) == 16
    assert sample_a["shots"][0]["id"] == sample_b["shots"][0]["id"], "Sample shots must be deterministic"

    for s in sample_a["shots"]:
        assert 0.0 <= s["cue_ball_position"]["x"] <= 1.0
        assert 0.0 <= s["cue_ball_position"]["y"] <= 0.5
        assert len(s["trajectory"]) >= 2
        assert len(s["cue_ball_trajectory"]) >= 2

    # 2. Verify Report Metrics Match Shot Outcomes
    rep = sample_a["report"]
    assert rep["total_shots"] == 16
    assert rep["pot_success_rate"] == 84.6
    assert rep["safety_success_rate"] == 66.7
    assert rep["highest_break"] == 21

    # 3. Verify Context-Aware AI Coach
    shot_9 = sample_a["shots"][8]  # Shot #9 (missed red with check-side squirt)
    resp_mistake = get_coaching_response(
        "Why was this shot a mistake?",
        match_data=sample_a,
        selected_shot=shot_9,
    )
    assert "Shot #9" in resp_mistake
    assert "squirt" in resp_mistake.lower() or "over-cut" in resp_mistake.lower()

    resp_practice = get_coaching_response(
        "What should I practice next?",
        match_data=sample_a,
        selected_shot=None,
    )
    assert "84.6%" in resp_practice
    assert "21" in resp_practice

    # 4. Verify End-to-End HTTP API Workflow
    init_sqlite_db()
    server = ThreadingHTTPServer(("127.0.0.1", 0), CueIQRequestHandler)
    port = server.server_address[1]
    base_url = f"http://127.0.0.1:{port}"
    t = threading.Thread(target=server.serve_forever, daemon=True)
    t.start()

    try:
        # Health check
        st, health = _http_json(f"{base_url}/api/health")
        assert st == 200 and health["status"] == "healthy"

        # Sample match endpoint
        st, sample_res = _http_json(f"{base_url}/api/matches/sample")
        assert st == 200 and sample_res["match"]["is_sample"] is True
        assert len(sample_res["shots"]) == 16

        # Upload a Snooker Match MP4
        boundary = "----CueIQTestBoundary999"
        mp4_bytes = _make_iso_mp4_bytes(duration_sec=44, width=1920, height=1080)
        body = (
            f"--{boundary}\r\n"
            f'Content-Disposition: form-data; name="title"\r\n\r\n'
            f"Test Snooker Frame Upload\r\n"
            f"--{boundary}\r\n"
            f'Content-Disposition: form-data; name="video"; filename="snooker_frame_test.mp4"\r\n'
            f"Content-Type: video/mp4\r\n\r\n"
        ).encode("utf-8") + mp4_bytes + f"\r\n--{boundary}--\r\n".encode("utf-8")

        st, uploaded = _http_json(
            f"{base_url}/api/matches/upload",
            method="POST",
            data=body,
            headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
        )
        assert st == 200
        match_id = uploaded["id"]

        # Poll status until analyzed
        for _ in range(25):
            st, status_data = _http_json(f"{base_url}/api/matches/{match_id}/status")
            if status_data["status"] == "analyzed":
                break
            time.sleep(0.15)
        assert status_data["status"] == "analyzed"
        assert status_data["progress"] == 100

        # Fetch full analysis
        st, analysis = _http_json(f"{base_url}/api/matches/{match_id}")
        assert st == 200
        assert analysis["match"]["duration_seconds"] == 44.0
        assert analysis["match"]["video_resolution"] == "1920x1080"
        assert len(analysis["shots"]) >= 6
        assert analysis["report"]["pot_success_rate"] > 0

        # Test AI Coach with uploaded match context
        chat_payload = json.dumps({
            "message": "Why was this shot a mistake?",
            "match_id": match_id,
            "shot_number": 2,
        }).encode("utf-8")
        st, chat_msgs = _http_json(
            f"{base_url}/api/coach/chat",
            method="POST",
            data=chat_payload,
            headers={"Content-Type": "application/json"},
        )
        assert st == 200 and len(chat_msgs) == 2
        assert "Shot #2" in chat_msgs[1]["content"]

        # Test Analytics Overview with real match
        st, ov = _http_json(f"{base_url}/api/analytics/overview")
        assert st == 200
        assert ov["has_real_matches"] is True
        assert ov["is_sample"] is False
        assert ov["total_matches"] >= 1

        # Clean up test uploaded match
        st, del_res = _http_json(f"{base_url}/api/matches/{match_id}", method="DELETE")
        assert st == 200 and del_res["status"] == "deleted"
    finally:
        server.shutdown()

    print("ALL CUE IQ END-TO-END TESTS PASSED (Upload -> Processing -> Analysis -> Coach -> Analytics -> Delete)!")


if __name__ == "__main__":
    run_tests()
