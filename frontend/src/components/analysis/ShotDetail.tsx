'use client';

import React from 'react';
import Link from 'next/link';
import { BALL_COLORS, SHOT_TYPE_META } from '@/lib/constants';
import type { ShotItem } from '@/lib/api';
import {
  Brain,
  CheckCircle2,
  Compass,
  Lightbulb,
  MessageSquare,
  RotateCcw,
  Target,
  XCircle,
} from 'lucide-react';

interface ShotDetailProps {
  shot: ShotItem | null;
  matchId?: string;
  onReplayShot?: (shot: ShotItem) => void;
  className?: string;
}

function formatTimestamp(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = (sec % 60).toFixed(1);
  return `${m}:${Number(s) < 10 ? '0' : ''}${s}`;
}

export default function ShotDetail({
  shot,
  matchId,
  onReplayShot,
  className = '',
}: ShotDetailProps) {
  if (!shot) {
    return (
      <div
        className={`glass-panel rounded-2xl p-6 border border-white/[0.08] flex flex-col items-center justify-center text-center min-h-[280px] ${className}`}
      >
        <Target className="w-8 h-8 text-[#00F0FF]/60 mb-3" />
        <h3 className="text-base font-medium text-white">Select a Shot on the Timeline</h3>
        <p className="text-xs text-[#94A3B8] max-w-xs mt-1">
          Choose any event from the interactive timeline or table to inspect ball geometry,
          tactical reasoning, and AI coaching recommendations.
        </p>
      </div>
    );
  }

  const ballMeta = BALL_COLORS[shot.object_ball || 'red'] || BALL_COLORS.red;
  const shotTypeMeta = SHOT_TYPE_META[shot.shot_type || 'pot'] || SHOT_TYPE_META.pot;
  const diffPct = shot.difficulty !== null ? Math.round(shot.difficulty * 100) : null;
  const posPct = shot.position_score !== null ? Math.round(shot.position_score * 100) : null;

  return (
    <div className={`glass-panel rounded-2xl p-5 border border-white/[0.08] space-y-4 ${className}`}>
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-white/[0.07]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#00F0FF]/15 border border-[#00F0FF]/40 flex items-center justify-center font-mono text-sm font-bold text-[#00F0FF]">
            #{shot.shot_number}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-white">
                {shot.player || 'Match Player'}
              </h3>
              <span
                className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider border"
                style={{
                  color: shotTypeMeta.color,
                  backgroundColor: shotTypeMeta.bg,
                  borderColor: shotTypeMeta.border,
                }}
              >
                {shotTypeMeta.label}
              </span>
            </div>
            <p className="text-xs font-mono text-[#94A3B8] mt-0.5">
              TIMESTAMP {formatTimestamp(shot.timestamp_start)}
              {shot.timestamp_end ? ` → ${formatTimestamp(shot.timestamp_end)}` : ''}
            </p>
          </div>
        </div>

        {/* Outcome Badge */}
        <div className="flex items-center gap-2">
          {shot.outcome === 'successful' ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/35">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Successful
            </span>
          ) : shot.outcome === 'missed' ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-red-500/15 text-red-300 border border-red-400/35">
              <XCircle className="w-3.5 h-3.5" />
              Missed
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/15 text-amber-300 border border-amber-400/35">
              Recorded Event
            </span>
          )}
        </div>
      </div>

      {/* Telemetry Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
          <span className="block font-mono text-[10px] uppercase tracking-wider text-[#94A3B8]">
            Object Ball
          </span>
          <div className="mt-1 flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full border border-white/25"
              style={{ backgroundColor: ballMeta.hex }}
            />
            <span className="text-xs font-semibold text-white capitalize">
              {shot.object_ball || 'N/A'}
            </span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
          <span className="block font-mono text-[10px] uppercase tracking-wider text-[#94A3B8]">
            Target Pocket
          </span>
          <span className="mt-1 block text-xs font-semibold text-white capitalize">
            {(shot.target_pocket || 'N/A').replace('_', ' ')}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
          <div className="flex items-center justify-between font-mono text-[10px] uppercase text-[#94A3B8]">
            <span>Difficulty</span>
            <span className="text-white font-semibold">
              {diffPct !== null ? `${diffPct}%` : 'N/A'}
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${diffPct ?? 0}%`,
                backgroundColor:
                  (diffPct ?? 0) >= 75
                    ? '#f87171'
                    : (diffPct ?? 0) >= 50
                    ? '#fbbf24'
                    : '#00F0FF',
              }}
            />
          </div>
        </div>

        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
          <div className="flex items-center justify-between font-mono text-[10px] uppercase text-[#94A3B8]">
            <span>Position Score</span>
            <span className="text-[#00F0FF] font-semibold">
              {posPct !== null ? `${posPct}%` : 'N/A'}
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-[#00F0FF] transition-all duration-500"
              style={{ width: `${posPct ?? 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Coordinates Telemetry Bar */}
      {shot.cue_ball_position && shot.object_ball_position && (
        <div className="px-3.5 py-2 rounded-xl bg-[#070A12] border border-white/[0.05] flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] text-[#94A3B8]">
          <span className="flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-[#00F0FF]" />
            Cue Origin: ({shot.cue_ball_position.x.toFixed(2)}, {shot.cue_ball_position.y.toFixed(2)})
          </span>
          <span>
            Object Origin: ({shot.object_ball_position.x.toFixed(2)},{' '}
            {shot.object_ball_position.y.toFixed(2)})
          </span>
        </div>
      )}

      {/* Tactical Assessment & AI Explanation */}
      <div className="space-y-2.5">
        {shot.tactical_assessment && (
          <div className="p-3.5 rounded-xl bg-[#00F0FF]/[0.06] border-l-2 border-[#00F0FF]">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#00F0FF] mb-1">
              <Brain className="w-3.5 h-3.5" />
              Tactical Assessment
            </div>
            <p className="text-xs leading-relaxed text-[#F8FAFC]">
              {shot.tactical_assessment}
            </p>
          </div>
        )}

        {shot.ai_explanation && (
          <div className="p-3.5 rounded-xl bg-sky-500/[0.06] border-l-2 border-sky-400">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-sky-300 mb-1">
              <Target className="w-3.5 h-3.5" />
              Physics & Execution Insight
            </div>
            <p className="text-xs leading-relaxed text-[#F8FAFC]">{shot.ai_explanation}</p>
          </div>
        )}

        {shot.alternative_suggestion && (
          <div className="p-3.5 rounded-xl bg-amber-500/[0.06] border-l-2 border-amber-400">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-amber-300 mb-1">
              <Lightbulb className="w-3.5 h-3.5" />
              Alternative Tactical Approach
            </div>
            <p className="text-xs leading-relaxed text-[#F8FAFC]">
              {shot.alternative_suggestion}
            </p>
          </div>
        )}
      </div>

      {/* Action Controls */}
      <div className="pt-1 flex flex-wrap items-center gap-2.5">
        {onReplayShot && (
          <button
            type="button"
            onClick={() => onReplayShot(shot)}
            className="px-3.5 py-2 rounded-xl text-xs font-medium bg-white/[0.06] hover:bg-white/[0.12] text-white border border-white/10 flex items-center gap-2 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#00F0FF]" />
            Replay Shot Segment
          </button>
        )}

        <Link
          href={`/coach?matchId=${encodeURIComponent(matchId || 'sample')}&shotNumber=${
            shot.shot_number
          }`}
          className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#00F0FF]/15 hover:bg-[#00F0FF]/25 text-[#00F0FF] border border-[#00F0FF]/35 flex items-center gap-2 transition-all"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Ask AI Coach About Shot #{shot.shot_number}
        </Link>
      </div>
    </div>
  );
}
