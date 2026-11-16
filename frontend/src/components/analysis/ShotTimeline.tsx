'use client';

import React, { useState } from 'react';
import { BALL_COLORS, SHOT_TYPE_META } from '@/lib/constants';
import type { ShotItem } from '@/lib/api';
import { ChevronLeft, ChevronRight, Crosshair } from 'lucide-react';

interface ShotTimelineProps {
  shots: ShotItem[];
  selectedShotIndex: number | null;
  onShotSelect: (index: number) => void;
  currentTime?: number;
  duration?: number;
  className?: string;
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function ShotTimeline({
  shots,
  selectedShotIndex,
  onShotSelect,
  currentTime = 0,
  duration = 65,
  className = '',
}: ShotTimelineProps) {
  const [filterType, setFilterType] = useState<string>('all');

  const maxTimestamp = Math.max(
    duration || 65,
    shots.length > 0 ? shots[shots.length - 1].timestamp_end || shots[shots.length - 1].timestamp_start + 4 : 65
  );

  const filteredShots = shots.map((shot, idx) => ({ shot, idx })).filter(({ shot }) => {
    if (filterType === 'all') return true;
    if (filterType === 'pots') return shot.outcome === 'successful' && (shot.shot_type === 'pot' || shot.shot_type === 'break_building');
    if (filterType === 'misses') return shot.outcome === 'missed';
    if (filterType === 'safety') return shot.shot_type === 'safety';
    if (filterType === 'breaks') return shot.shot_type === 'break_building';
    return true;
  });

  const handleStep = (delta: number) => {
    if (shots.length === 0) return;
    const current = selectedShotIndex ?? 0;
    const next = Math.max(0, Math.min(shots.length - 1, current + delta));
    onShotSelect(next);
  };

  return (
    <div className={`glass-panel rounded-2xl p-4 sm:p-5 border border-white/[0.08] ${className}`}>
      {/* Header & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <Crosshair className="w-4 h-4 text-[#00F0FF]" />
          <h3 className="text-xs font-mono uppercase tracking-[0.18em] text-white">
            Interactive Shot Timeline ({shots.length} Events)
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'all', label: 'All Events' },
            { id: 'pots', label: 'Successful Pots' },
            { id: 'breaks', label: 'Break Building' },
            { id: 'safety', label: 'Safeties' },
            { id: 'misses', label: 'Missed Pots' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterType(tab.id)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
                filterType === tab.id
                  ? 'bg-[#00F0FF] text-[#030407] font-semibold'
                  : 'bg-white/5 text-[#94A3B8] hover:text-white hover:bg-white/10'
              }`}
            >
              {tab.label}
            </button>
          ))}

          <div className="flex items-center gap-1 ml-2 border-l border-white/10 pl-2">
            <button
              type="button"
              onClick={() => handleStep(-1)}
              disabled={selectedShotIndex === null || selectedShotIndex <= 0}
              className="p-1 rounded-lg bg-white/5 text-[#94A3B8] hover:text-white disabled:opacity-35"
              title="Previous Shot"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleStep(1)}
              disabled={selectedShotIndex === null || selectedShotIndex >= shots.length - 1}
              className="p-1 rounded-lg bg-white/5 text-[#94A3B8] hover:text-white disabled:opacity-35"
              title="Next Shot"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Proportional Broadcast Scrubber Track */}
      <div className="relative h-14 bg-[#070A12] rounded-xl border border-white/[0.06] px-4 flex items-center mb-4 overflow-hidden">
        {/* Base horizontal axis */}
        <div className="w-full h-[2px] bg-gradient-to-r from-[#00F0FF]/40 via-white/15 to-[#00F0FF]/40 relative">
          {/* Playhead indicator */}
          <div
            className="absolute -top-5 bottom-0 w-[2px] bg-white/70 pointer-events-none transition-all duration-150"
            style={{
              left: `${Math.min(100, Math.max(0, (currentTime / maxTimestamp) * 100))}%`,
              height: '42px',
            }}
          />

          {/* Event Markers */}
          {shots.map((shot, idx) => {
            const leftPct = Math.min(97, Math.max(2, (shot.timestamp_start / maxTimestamp) * 100));
            const isSelected = idx === selectedShotIndex;
            const isVisible = filteredShots.some((f) => f.idx === idx);
            const markerColor =
              shot.outcome === 'missed'
                ? '#f87171'
                : shot.shot_type === 'safety'
                ? '#38bdf8'
                : '#00F0FF';

            return (
              <button
                key={shot.id}
                type="button"
                onClick={() => onShotSelect(idx)}
                style={{ left: `${leftPct}%` }}
                className={`group absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-all ${
                  isVisible ? 'opacity-100 scale-100' : 'opacity-20 scale-75'
                }`}
                title={`Shot #${shot.shot_number} (${formatTime(shot.timestamp_start)}) — ${
                  shot.shot_type
                }`}
              >
                <span
                  className={`block rounded-full transition-all ${
                    isSelected
                      ? 'w-4 h-4 ring-4 ring-[#00F0FF]/35 scale-110'
                      : 'w-2.5 h-2.5 hover:scale-125'
                  }`}
                  style={{ backgroundColor: markerColor }}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* Horizontal Scrollable Shot Cards Strip */}
      <div className="flex items-center gap-2.5 overflow-x-auto pb-1.5">
        {filteredShots.map(({ shot, idx }) => {
          const isSelected = idx === selectedShotIndex;
          const ballMeta = BALL_COLORS[shot.object_ball || 'red'] || BALL_COLORS.red;
          const typeMeta = SHOT_TYPE_META[shot.shot_type || 'pot'] || SHOT_TYPE_META.pot;
          return (
            <button
              key={shot.id}
              type="button"
              onClick={() => onShotSelect(idx)}
              className={`flex-shrink-0 text-left px-3.5 py-2.5 rounded-xl border transition-all min-w-[148px] ${
                isSelected
                  ? 'bg-[#00F0FF]/15 border-[#00F0FF] shadow-[0_0_25px_rgba(0,240,255,0.2)]'
                  : 'bg-[#0A0E19]/90 border-white/[0.07] hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="font-mono text-xs font-semibold text-white">
                  #{shot.shot_number.toString().padStart(2, '0')}
                </span>
                <span className="font-mono text-[10px] text-[#94A3B8]">
                  {formatTime(shot.timestamp_start)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0 border border-white/20"
                  style={{ backgroundColor: ballMeta.hex }}
                />
                <span className="text-xs font-medium text-[#F8FAFC] truncate capitalize">
                  {typeMeta.label}
                </span>
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[10px] font-mono">
                <span
                  className={
                    shot.outcome === 'successful'
                      ? 'text-[#00F0FF]'
                      : shot.outcome === 'missed'
                      ? 'text-[#f87171]'
                      : 'text-amber-300'
                  }
                >
                  {(shot.outcome || 'EVENT').toUpperCase()}
                </span>
                {shot.difficulty !== null && (
                  <span className="text-[#94A3B8]">
                    DIFF {Math.round(shot.difficulty * 100)}%
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
