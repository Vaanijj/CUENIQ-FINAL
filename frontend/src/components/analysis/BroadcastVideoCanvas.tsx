'use client';

import React, { useEffect, useRef } from 'react';
import { BALL_COLORS, TABLE_DIMENSIONS } from '@/lib/constants';
import type { ShotItem, Point2D } from '@/lib/api';

interface BroadcastVideoCanvasProps {
  shots: ShotItem[];
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  playbackRate: number;
  onTimeUpdate: (newTime: number) => void;
  onEnded?: () => void;
  matchTitle?: string;
  isSample?: boolean;
}

function interpolateTrack(pts: Point2D[] | null | undefined, tNorm: number): Point2D | null {
  if (!pts || pts.length === 0) return null;
  if (pts.length === 1) return pts[0];
  const clamped = Math.max(0, Math.min(1, tNorm));
  const scaled = clamped * (pts.length - 1);
  const idx = Math.floor(scaled);
  const frac = scaled - idx;
  if (idx >= pts.length - 1) return pts[pts.length - 1];
  const a = pts[idx];
  const b = pts[idx + 1];
  return {
    x: a.x + (b.x - a.x) * frac,
    y: a.y + (b.y - a.y) * frac,
  };
}

export default function BroadcastVideoCanvas({
  shots,
  currentTime,
  duration,
  isPlaying,
  playbackRate,
  onTimeUpdate,
  onEnded,
  matchTitle = 'Championship Match Feed',
}: BroadcastVideoCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timeRef = useRef(currentTime);
  timeRef.current = currentTime;

  // Advance playback clock at 60fps when playing
  useEffect(() => {
    if (!isPlaying) return;
    let rafId: number;
    let lastTs = performance.now();

    const tick = (now: number) => {
      const dt = (now - lastTs) / 1000;
      lastTs = now;
      const nextTime = timeRef.current + dt * playbackRate;
      if (nextTime >= duration) {
        onTimeUpdate(0);
        if (onEnded) onEnded();
      } else {
        onTimeUpdate(nextTime);
        rafId = requestAnimationFrame(tick);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, playbackRate, duration, onTimeUpdate, onEnded]);

  // Render broadcast frame whenever currentTime or shots change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;

    // 1. Arena Dark Studio Background
    const bgGrad = ctx.createRadialGradient(W / 2, H / 2, 60, W / 2, H / 2, W * 0.65);
    bgGrad.addColorStop(0, '#0c1612');
    bgGrad.addColorStop(1, '#03050A');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Table geometry (centered 760 x 380 inside 960 x 540)
    const tx = 100;
    const ty = 72;
    const tw = 760;
    const th = 380;

    // 2. Outer Brushed Titanium Cabinet & Shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = 35;
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.roundRect(tx - 24, ty - 24, tw + 48, th + 48, 16);
    ctx.fill();
    ctx.restore();

    // Cushion Rail Border
    ctx.fillStyle = '#062E2B';
    ctx.beginPath();
    ctx.roundRect(tx - 8, ty - 8, tw + 16, th + 16, 8);
    ctx.fill();

    // 3. Futuristic Dark Slate-Teal Tournament Baize Surface
    const baizeGrad = ctx.createRadialGradient(
      tx + tw / 2,
      ty + th / 2,
      40,
      tx + tw / 2,
      ty + th / 2,
      tw * 0.6
    );
    baizeGrad.addColorStop(0, '#0B3B36');
    baizeGrad.addColorStop(0.7, '#062925');
    baizeGrad.addColorStop(1, '#031816');
    ctx.fillStyle = baizeGrad;
    ctx.fillRect(tx, ty, tw, th);

    // 4. Baulk Line & D Semicircle
    const baulkX = tx + tw * TABLE_DIMENSIONS.baulkLineRatio;
    const dRadius = th * (292 / 1778);
    const centerY = ty + th / 2;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(baulkX, ty);
    ctx.lineTo(baulkX, ty + th);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(baulkX, centerY, dRadius, Math.PI * 0.5, Math.PI * 1.5);
    ctx.stroke();

    // 5. Six Pockets
    const pockets = [
      { id: 'top_left', x: tx, y: ty },
      { id: 'top_center', x: tx + tw / 2, y: ty - 2 },
      { id: 'top_right', x: tx + tw, y: ty },
      { id: 'bottom_left', x: tx, y: ty + th },
      { id: 'bottom_center', x: tx + tw / 2, y: ty + th + 2 },
      { id: 'bottom_right', x: tx + tw, y: ty + th },
    ];
    for (const p of pockets) {
      ctx.fillStyle = '#040605';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#3d2817';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Find active or nearest shot at currentTime
    let activeShot: ShotItem | null = null;
    for (const s of shots) {
      const endT = s.timestamp_end || s.timestamp_start + 3.2;
      if (currentTime >= s.timestamp_start - 0.6 && currentTime <= endT + 0.6) {
        activeShot = s;
        break;
      }
    }
    if (!activeShot && shots.length > 0) {
      // Pick the most recent shot before currentTime or first shot
      activeShot =
        [...shots].reverse().find((s) => currentTime >= s.timestamp_start) || shots[0];
    }

    // Helper to convert normalized (0..1, 0..0.5) to canvas pixel coords
    const toPx = (pt: Point2D) => ({
      x: tx + Math.max(0.02, Math.min(0.98, pt.x)) * tw,
      y: ty + Math.max(0.02, Math.min(0.98, pt.y <= 0.55 ? pt.y / 0.5 : pt.y)) * th,
    });

    // Draw static ambient balls (colors on spots + red pack)
    const staticSpots: Array<{ color: string; x: number; y: number }> = [
      { color: 'yellow', x: 0.206, y: 0.33 },
      { color: 'green', x: 0.206, y: 0.17 },
      { color: 'brown', x: 0.206, y: 0.25 },
      { color: 'blue', x: 0.5, y: 0.25 },
      { color: 'pink', x: 0.75, y: 0.25 },
      { color: 'black', x: 0.909, y: 0.25 },
      { color: 'red', x: 0.79, y: 0.23 },
      { color: 'red', x: 0.81, y: 0.27 },
      { color: 'red', x: 0.83, y: 0.25 },
      { color: 'red', x: 0.85, y: 0.22 },
    ];

    const drawBall = (x: number, y: number, colorName: string, highlightRing = false) => {
      const meta = BALL_COLORS[colorName] || BALL_COLORS.red;
      // Drop shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.beginPath();
      ctx.arc(x + 2, y + 3, 8.5, 0, Math.PI * 2);
      ctx.fill();

      // Ball body
      const bGrad = ctx.createRadialGradient(x - 2.5, y - 2.5, 1, x, y, 8.5);
      bGrad.addColorStop(0, '#ffffff');
      bGrad.addColorStop(0.28, meta.hex);
      bGrad.addColorStop(1, meta.rim);
      ctx.fillStyle = bGrad;
      ctx.beginPath();
      ctx.arc(x, y, 8.5, 0, Math.PI * 2);
      ctx.fill();

      if (highlightRing) {
        ctx.strokeStyle = '#00F0FF';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(x, y, 13, 0, Math.PI * 2);
        ctx.stroke();
      }
    };

    for (const sb of staticSpots) {
      if (activeShot && sb.color === activeShot.object_ball) continue;
      const p = toPx({ x: sb.x, y: sb.y });
      drawBall(p.x, p.y, sb.color, false);
    }

    // 6. Animate Active Shot Trajectory & Cue Stick
    if (activeShot && activeShot.cue_ball_position && activeShot.object_ball_position) {
      const startT = activeShot.timestamp_start;
      const endT = activeShot.timestamp_end || startT + 3.2;
      const dur = Math.max(0.8, endT - startT);
      const rawProg = (currentTime - startT) / dur;
      const prog = Math.max(0, Math.min(1, rawProg));

      // Draw optical trajectory guide line
      if (activeShot.trajectory && activeShot.trajectory.length >= 2) {
        ctx.save();
        ctx.setLineDash([6, 5]);
        ctx.strokeStyle =
          activeShot.outcome === 'successful'
            ? 'rgba(0, 240, 255, 0.55)'
            : 'rgba(248, 113, 113, 0.55)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        activeShot.trajectory.forEach((pt, i) => {
          const p = toPx(pt);
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();
        ctx.restore();
      }

      // First 42% of shot window: cue ball travels to contact; remaining 58%: object ball travels to pocket/end & cue ball deflects
      const cuePosNorm =
        interpolateTrack(activeShot.cue_ball_trajectory, prog) ||
        activeShot.cue_ball_position;
      const objProg = prog < 0.35 ? 0 : (prog - 0.35) / 0.65;
      const objPosNorm =
        interpolateTrack(activeShot.trajectory, objProg) ||
        activeShot.object_ball_position;

      const cuePx = toPx(cuePosNorm);
      const objPx = toPx(objPosNorm);

      // Draw cue stick during pre-shot / initial strike (prog <= 0.12)
      if (rawProg <= 0.12) {
        const initCue = toPx(activeShot.cue_ball_position);
        const initObj = toPx(activeShot.object_ball_position);
        const angle = Math.atan2(initObj.y - initCue.y, initObj.x - initCue.x);
        const pullBack = 16 + Math.sin(currentTime * 6) * 6;
        const stickStart = {
          x: initCue.x - Math.cos(angle) * pullBack,
          y: initCue.y - Math.sin(angle) * pullBack,
        };
        const stickEnd = {
          x: initCue.x - Math.cos(angle) * (pullBack + 115),
          y: initCue.y - Math.sin(angle) * (pullBack + 115),
        };
        ctx.strokeStyle = '#d9b382';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(stickStart.x, stickStart.y);
        ctx.lineTo(stickEnd.x, stickEnd.y);
        ctx.stroke();
      }

      // Hide object ball if potted at end of animation
      if (!(activeShot.outcome === 'successful' && objProg > 0.94)) {
        drawBall(objPx.x, objPx.y, activeShot.object_ball || 'red', true);
      }
      drawBall(cuePx.x, cuePx.y, 'white', false);
    }

    // 7. Broadcast Lower-Third Scoreboard Bar
    ctx.fillStyle = 'rgba(6, 10, 8, 0.88)';
    ctx.beginPath();
    ctx.roundRect(100, H - 52, W - 200, 36, 10);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.35)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#00F0FF';
    ctx.font = '600 11px monospace';
    ctx.fillText('CUE IQ OPTICAL BROADCAST', 118, H - 30);

    ctx.fillStyle = '#F8FAFC';
    ctx.font = '500 12px sans-serif';
    ctx.fillText(
      activeShot
        ? `${activeShot.player || 'Player'} · Shot #${activeShot.shot_number} (${(
            activeShot.shot_type || 'shot'
          )
            .replace('_', ' ')
            .toUpperCase()})`
        : matchTitle,
      315,
      H - 30
    );

    ctx.fillStyle = '#94A3B8';
    ctx.font = '500 11px monospace';
    ctx.fillText(`T+${currentTime.toFixed(1)}s / ${duration.toFixed(1)}s`, W - 235, H - 30);
  }, [currentTime, duration, shots, matchTitle]);

  return (
    <canvas
      ref={canvasRef}
      width={960}
      height={540}
      className="w-full h-full object-contain block"
    />
  );
}
