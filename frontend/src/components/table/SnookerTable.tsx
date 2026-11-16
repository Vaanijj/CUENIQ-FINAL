'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { BALL_COLORS, TABLE_DIMENSIONS } from '@/lib/constants';
import type { ShotItem, Point2D } from '@/lib/api';
import { Eye, Layers, Sparkles } from 'lucide-react';

interface SnookerTableProps {
  shots: ShotItem[];
  selectedShotIndex: number | null;
  onShotSelect?: (index: number) => void;
  showTrajectory?: boolean;
  showAllPositions?: boolean;
  className?: string;
}

const SVG_W = 1000;
const SVG_H = 500;
const RAIL_PAD = 42;
const PLAY_W = SVG_W - RAIL_PAD * 2; // 916
const PLAY_H = SVG_H - RAIL_PAD * 2; // 416

function toSvgX(nx: number): number {
  return RAIL_PAD + Math.max(0, Math.min(1, nx)) * PLAY_W;
}

// Normalized Y in backend is 0.0 .. 0.5 (since table is 2:1 aspect ratio)
function toSvgY(ny: number): number {
  const normY = ny <= 0.55 ? ny / 0.5 : ny;
  return RAIL_PAD + Math.max(0, Math.min(1, normY)) * PLAY_H;
}

function pointsToPath(pts: Point2D[] | null | undefined): string {
  if (!pts || pts.length < 2) return '';
  return pts
    .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${toSvgX(p.x).toFixed(1)} ${toSvgY(p.y).toFixed(1)}`)
    .join(' ');
}

export default function SnookerTable({
  shots,
  selectedShotIndex,
  onShotSelect,
  showTrajectory = true,
  showAllPositions: initialShowAll = false,
  className = '',
}: SnookerTableProps) {
  const [hoveredBall, setHoveredBall] = useState<string | null>(null);
  const [showAlternativeLine, setShowAlternativeLine] = useState(true);
  const [showAllShotsMap, setShowAllShotsMap] = useState(initialShowAll);

  const activeShot =
    selectedShotIndex !== null && shots[selectedShotIndex]
      ? shots[selectedShotIndex]
      : null;

  const baulkX = toSvgX(TABLE_DIMENSIONS.baulkLineRatio);
  const dRadius = (292 / 1778) * PLAY_H;
  const centerY = RAIL_PAD + PLAY_H / 2;

  const pockets = useMemo(
    () => [
      { id: 'top_left', x: RAIL_PAD, y: RAIL_PAD, label: 'Top Left' },
      { id: 'top_center', x: RAIL_PAD + PLAY_W / 2, y: RAIL_PAD - 3, label: 'Top Middle' },
      { id: 'top_right', x: RAIL_PAD + PLAY_W, y: RAIL_PAD, label: 'Top Right' },
      { id: 'bottom_left', x: RAIL_PAD, y: RAIL_PAD + PLAY_H, label: 'Bottom Left' },
      { id: 'bottom_center', x: RAIL_PAD + PLAY_W / 2, y: RAIL_PAD + PLAY_H + 3, label: 'Bottom Middle' },
      { id: 'bottom_right', x: RAIL_PAD + PLAY_W, y: RAIL_PAD + PLAY_H, label: 'Bottom Right' },
    ],
    []
  );

  // Compute alternative tactical vector (either toward baulk safety or alternate pocket)
  const alternativePath = useMemo(() => {
    if (!activeShot || !activeShot.cue_ball_position || !activeShot.object_ball_position) {
      return '';
    }
    const cue = activeShot.cue_ball_position;
    const obj = activeShot.object_ball_position;
    // If missed pot, alternative shows controlled containment safety back to baulk cushion
    const altEnd =
      activeShot.outcome === 'missed'
        ? { x: 0.14, y: obj.y > 0.25 ? 0.08 : 0.42 }
        : { x: 0.62, y: 0.25 };
    return `M ${toSvgX(cue.x).toFixed(1)} ${toSvgY(cue.y).toFixed(1)} L ${toSvgX(obj.x).toFixed(1)} ${toSvgY(
      obj.y
    ).toFixed(1)} Q ${toSvgX((obj.x + altEnd.x) * 0.5).toFixed(1)} ${toSvgY(0.05).toFixed(1)} ${toSvgX(
      altEnd.x
    ).toFixed(1)} ${toSvgY(altEnd.y).toFixed(1)}`;
  }, [activeShot]);

  const hasValidCoordinates = Boolean(
    activeShot?.cue_ball_position && activeShot?.object_ball_position
  );

  return (
    <div className={`glass-panel rounded-2xl p-4 sm:p-5 border border-white/[0.08] ${className}`}>
      {/* Table Top Telemetry Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3.5">
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-[#00F0FF]" />
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#F8FAFC]">
            Interactive Championship Baize (3569 × 1778 mm)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAlternativeLine((v) => !v)}
            className={`px-2.5 py-1 rounded-full font-mono text-[10px] tracking-wider uppercase flex items-center gap-1.5 border transition-all ${
              showAlternativeLine
                ? 'bg-amber-500/15 text-amber-300 border-amber-400/40'
                : 'bg-white/5 text-[#94A3B8] border-white/10 hover:text-white'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            Tactical Ghost Line
          </button>

          <button
            type="button"
            onClick={() => setShowAllShotsMap((v) => !v)}
            className={`px-2.5 py-1 rounded-full font-mono text-[10px] tracking-wider uppercase flex items-center gap-1.5 border transition-all ${
              showAllShotsMap
                ? 'bg-[#00F0FF]/15 text-[#00F0FF] border-[#00F0FF]/40'
                : 'bg-white/5 text-[#94A3B8] border-white/10 hover:text-white'
            }`}
          >
            <Layers className="w-3 h-3" />
            All Shot Origins ({shots.filter((s) => s.object_ball_position).length})
          </button>
        </div>
      </div>

      {/* SVG Snooker Table */}
      <div className="relative w-full overflow-hidden rounded-xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] border border-white/10">
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          className="w-full h-auto block select-none"
          role="img"
          aria-label="Top-down interactive snooker table"
        >
          <defs>
            {/* Futuristic Dark Tournament Slate-Emerald Baize Radial Lighting */}
            <radialGradient id="baizeGrad" cx="50%" cy="50%" r="65%">
              <stop offset="0%" stopColor="#0B3B36" />
              <stop offset="65%" stopColor="#062925" />
              <stop offset="100%" stopColor="#031816" />
            </radialGradient>

            {/* Anodized Titanium / Carbon Rail Gradient */}
            <linearGradient id="railGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1E293B" />
              <stop offset="50%" stopColor="#0F172A" />
              <stop offset="100%" stopColor="#070A12" />
            </linearGradient>

            {/* Ball 3D Gradients */}
            {Object.entries(BALL_COLORS).map(([name, meta]) => (
              <radialGradient key={name} id={`ball-${name}`} cx="35%" cy="32%" r="68%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
                <stop offset="28%" stopColor={meta.hex} stopOpacity="1" />
                <stop offset="100%" stopColor={meta.rim} stopOpacity="1" />
              </radialGradient>
            ))}

            <filter id="glowEmerald" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Outer Mahogany Cabinet */}
          <rect x="0" y="0" width={SVG_W} height={SVG_H} rx="18" fill="url(#railGrad)" />
          <rect
            x="6"
            y="6"
            width={SVG_W - 12}
            height={SVG_H - 12}
            rx="14"
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1.5"
          />

          {/* Cushion Bank */}
          <rect
            x={RAIL_PAD - 10}
            y={RAIL_PAD - 10}
            width={PLAY_W + 20}
            height={PLAY_H + 20}
            rx="8"
            fill="#0a3b1f"
            stroke="#062312"
            strokeWidth="3"
          />

          {/* Championship Baize Surface */}
          <rect
            x={RAIL_PAD}
            y={RAIL_PAD}
            width={PLAY_W}
            height={PLAY_H}
            fill="url(#baizeGrad)"
          />

          {/* Subtle Optical Telemetry Grid */}
          {[0.25, 0.5, 0.75].map((gx) => (
            <line
              key={gx}
              x1={RAIL_PAD + PLAY_W * gx}
              y1={RAIL_PAD}
              x2={RAIL_PAD + PLAY_W * gx}
              y2={RAIL_PAD + PLAY_H}
              stroke="rgba(255,255,255,0.03)"
              strokeDasharray="4 6"
            />
          ))}

          {/* Baulk Line & 'D' Semicircle */}
          <line
            x1={baulkX}
            y1={RAIL_PAD}
            x2={baulkX}
            y2={RAIL_PAD + PLAY_H}
            stroke="rgba(255,255,255,0.38)"
            strokeWidth="1.5"
          />
          <path
            d={`M ${baulkX} ${centerY - dRadius} A ${dRadius} ${dRadius} 0 0 0 ${baulkX} ${centerY + dRadius}`}
            fill="none"
            stroke="rgba(255,255,255,0.38)"
            strokeWidth="1.5"
          />

          {/* Standard Color Spots */}
          {Object.entries(TABLE_DIMENSIONS.spots).map(([spotName, pos]) => (
            <g key={spotName}>
              <circle
                cx={toSvgX(pos.x)}
                cy={toSvgY(pos.y)}
                r="3"
                fill="rgba(255,255,255,0.45)"
              />
            </g>
          ))}

          {/* 6 Pockets */}
          {pockets.map((p) => {
            const isTarget = activeShot?.target_pocket === p.id;
            return (
              <g key={p.id}>
                {isTarget && (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r="24"
                    fill="none"
                    stroke="#00F0FF"
                    strokeWidth="2"
                    strokeDasharray="4 3"
                    opacity="0.85"
                  />
                )}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="17"
                  fill="#050806"
                  stroke={isTarget ? '#00F0FF' : '#3a2818'}
                  strokeWidth={isTarget ? '2.5' : '2'}
                />
              </g>
            );
          })}

          {/* All Shots Scatter Map (clickable) */}
          {showAllShotsMap &&
            shots.map((s, idx) => {
              if (!s.object_ball_position) return null;
              const isSelected = idx === selectedShotIndex;
              const sx = toSvgX(s.object_ball_position.x);
              const sy = toSvgY(s.object_ball_position.y);
              const ballMeta = BALL_COLORS[s.object_ball || 'red'] || BALL_COLORS.red;
              return (
                <g
                  key={s.id}
                  onClick={() => onShotSelect && onShotSelect(idx)}
                  className="cursor-pointer"
                >
                  <circle
                    cx={sx}
                    cy={sy}
                    r={isSelected ? 11 : 7}
                    fill={ballMeta.hex}
                    fillOpacity={isSelected ? 0.95 : 0.45}
                    stroke={s.outcome === 'successful' ? '#00F0FF' : '#f87171'}
                    strokeWidth={isSelected ? 2.5 : 1.2}
                  />
                  <text
                    x={sx}
                    y={sy + 3}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="8"
                    fontFamily="monospace"
                  >
                    {s.shot_number}
                  </text>
                </g>
              );
            })}

          {/* Active Shot Trajectories & Balls */}
          {activeShot && hasValidCoordinates && showTrajectory && (
            <g>
              {/* Alternative Tactical Ghost Path */}
              {showAlternativeLine && alternativePath && (
                <motion.path
                  key={`alt-${activeShot.id}`}
                  d={alternativePath}
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="2"
                  strokeDasharray="5 6"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.55 }}
                  transition={{ duration: 0.75, ease: 'easeOut' }}
                />
              )}

              {/* Cue Ball Path */}
              {activeShot.cue_ball_trajectory && activeShot.cue_ball_trajectory.length >= 2 && (
                <motion.path
                  key={`cue-traj-${activeShot.id}`}
                  d={pointsToPath(activeShot.cue_ball_trajectory)}
                  fill="none"
                  stroke="rgba(255,255,255,0.85)"
                  strokeWidth="2.5"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.9 }}
                  transition={{ duration: 0.55, ease: 'easeOut' }}
                />
              )}

              {/* Object Ball Trajectory to Pocket/End */}
              {activeShot.trajectory && activeShot.trajectory.length >= 2 && (
                <motion.path
                  key={`obj-traj-${activeShot.id}`}
                  d={pointsToPath(activeShot.trajectory)}
                  fill="none"
                  stroke={activeShot.outcome === 'successful' ? '#00F0FF' : '#f87171'}
                  strokeWidth="3.2"
                  strokeDasharray="8 4"
                  filter="url(#glowEmerald)"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 0.65, delay: 0.15, ease: 'easeOut' }}
                />
              )}

              {/* Ghost Contact Circle at Object Ball */}
              {activeShot.object_ball_position && (
                <circle
                  cx={toSvgX(activeShot.object_ball_position.x)}
                  cy={toSvgY(activeShot.object_ball_position.y)}
                  r="16"
                  fill="none"
                  stroke="rgba(0, 240, 255, 0.45)"
                  strokeWidth="1.2"
                  strokeDasharray="3 3"
                />
              )}

              {/* Cue Ball */}
              {activeShot.cue_ball_position && (
                <g
                  onMouseEnter={() => setHoveredBall('cue')}
                  onMouseLeave={() => setHoveredBall(null)}
                  className="cursor-pointer"
                >
                  <circle
                    cx={toSvgX(activeShot.cue_ball_position.x) + 2}
                    cy={toSvgY(activeShot.cue_ball_position.y) + 3}
                    r="10"
                    fill="rgba(0,0,0,0.45)"
                  />
                  <circle
                    cx={toSvgX(activeShot.cue_ball_position.x)}
                    cy={toSvgY(activeShot.cue_ball_position.y)}
                    r="10"
                    fill="url(#ball-white)"
                    stroke="#ffffff"
                    strokeWidth="1"
                  />
                </g>
              )}

              {/* Object Ball */}
              {activeShot.object_ball_position && (
                <g
                  onMouseEnter={() => setHoveredBall('object')}
                  onMouseLeave={() => setHoveredBall(null)}
                  className="cursor-pointer"
                >
                  <circle
                    cx={toSvgX(activeShot.object_ball_position.x) + 2}
                    cy={toSvgY(activeShot.object_ball_position.y) + 3}
                    r="10.5"
                    fill="rgba(0,0,0,0.5)"
                  />
                  <circle
                    cx={toSvgX(activeShot.object_ball_position.x)}
                    cy={toSvgY(activeShot.object_ball_position.y)}
                    r="10.5"
                    fill={`url(#ball-${activeShot.object_ball || 'red'})`}
                    stroke="#00F0FF"
                    strokeWidth="1.5"
                  />
                </g>
              )}
            </g>
          )}
        </svg>

        {/* Overlay Notice When Footage Has No Verified Ball Coordinates */}
        {activeShot && !hasValidCoordinates && (
          <div className="absolute inset-0 bg-[#030407]/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
            <Eye className="w-7 h-7 text-amber-400 mb-2" />
            <p className="text-sm font-medium text-white">
              Ball Coordinates Not Fabricated for This Motion Window
            </p>
            <p className="text-xs text-[#94A3B8] max-w-md mt-1">
              This segment was detected via motion energy without a locked overhead table homography.
              Cue IQ only renders ball trajectories when optically verified or in labelled Sample Benchmark mode.
            </p>
          </div>
        )}

        {/* Hover Telemetry Pill */}
        {hoveredBall && activeShot && hasValidCoordinates && (
          <div className="absolute top-3 left-3 glass-panel px-3 py-1.5 rounded-lg border border-white/15 text-xs font-mono">
            {hoveredBall === 'cue' ? (
              <span>
                CUE BALL · ({activeShot.cue_ball_position?.x.toFixed(2)},{' '}
                {activeShot.cue_ball_position?.y.toFixed(2)})
              </span>
            ) : (
              <span className="uppercase">
                {activeShot.object_ball} BALL · TARGET:{' '}
                {(activeShot.target_pocket || 'N/A').replace('_', ' ')}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Legend Bar */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#94A3B8]">
        <div className="flex flex-wrap items-center gap-4">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-4 h-0.5 bg-white inline-block" /> Cue Ball Vector
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-4 h-0.5 bg-[#00F0FF] inline-block" /> Object Trajectory (Pot)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-4 h-0.5 bg-[#f87171] inline-block" /> Missed Vector
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-4 h-0.5 bg-amber-400 inline-block" /> AI Alternative Line
          </span>
        </div>
        {activeShot && (
          <span className="font-mono text-[10px] text-[#F8FAFC]">
            SHOT #{activeShot.shot_number} ·{' '}
            {activeShot.outcome ? activeShot.outcome.toUpperCase() : 'MOTION EVENT'}
          </span>
        )}
      </div>
    </div>
  );
}
