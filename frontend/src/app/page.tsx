'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import IntelligenceOrb from '@/components/orb/IntelligenceOrb';
import SnookerTable from '@/components/table/SnookerTable';
import { ORB_STATES } from '@/lib/constants';
import type { ShotItem } from '@/lib/api';
import {
  Activity,
  ArrowRight,
  Compass,
  Cpu,
  Play,
  Radio,
  Target,
  UploadCloud,
} from 'lucide-react';

const DEMO_HERO_SHOTS: ShotItem[] = [
  {
    id: 'landing-shot-1',
    shot_number: 3,
    timestamp_start: 9.0,
    timestamp_end: 12.2,
    player: "R. O'Sullivan (Sample)",
    shot_type: 'pot',
    object_ball: 'red',
    outcome: 'successful',
    difficulty: 0.38,
    cue_ball_position: { x: 0.56, y: 0.32 },
    object_ball_position: { x: 0.76, y: 0.38 },
    target_pocket: 'bottom_right',
    trajectory: [
      { x: 0.76, y: 0.38 },
      { x: 0.87, y: 0.43 },
      { x: 0.98, y: 0.47 },
    ],
    cue_ball_trajectory: [
      { x: 0.56, y: 0.32 },
      { x: 0.76, y: 0.38 },
      { x: 0.83, y: 0.29 },
    ],
    tactical_assessment:
      'Controlled three-quarter ball red into bottom-right corner with soft stun-run to land on the black.',
    alternative_suggestion:
      'Pure stun stopping at (0.78, 0.34) preserves a natural angle on the pink if the black spot is congested.',
    position_score: 0.94,
    ai_explanation:
      'Minimal cue action kept the cue ball on the 90° tangent line toward the black spot.',
  },
  {
    id: 'landing-shot-2',
    shot_number: 7,
    timestamp_start: 25.0,
    timestamp_end: 28.2,
    player: "R. O'Sullivan (Sample)",
    shot_type: 'break_building',
    object_ball: 'red',
    outcome: 'successful',
    difficulty: 0.76,
    cue_ball_position: { x: 0.79, y: 0.21 },
    object_ball_position: { x: 0.86, y: 0.09 },
    target_pocket: 'top_right',
    trajectory: [
      { x: 0.86, y: 0.09 },
      { x: 0.92, y: 0.06 },
      { x: 0.98, y: 0.03 },
    ],
    cue_ball_trajectory: [
      { x: 0.79, y: 0.21 },
      { x: 0.86, y: 0.09 },
      { x: 0.65, y: 0.04 },
      { x: 0.48, y: 0.21 },
    ],
    tactical_assessment:
      'Thin recovery cut along the top cushion into top-right, releasing the cue ball down-table onto the blue.',
    alternative_suggestion:
      'Playing safe off the thin edge of the red back to baulk was the conservative option.',
    position_score: 0.85,
    ai_explanation:
      'Running side expanded the two-cushion release angle to bring the blue spot cleanly into play.',
  },
  {
    id: 'landing-shot-3',
    shot_number: 9,
    timestamp_start: 33.0,
    timestamp_end: 36.2,
    player: "R. O'Sullivan (Sample)",
    shot_type: 'miss',
    object_ball: 'red',
    outcome: 'missed',
    difficulty: 0.68,
    cue_ball_position: { x: 0.67, y: 0.34 },
    object_ball_position: { x: 0.82, y: 0.41 },
    target_pocket: 'bottom_right',
    trajectory: [
      { x: 0.82, y: 0.41 },
      { x: 0.89, y: 0.43 },
      { x: 0.94, y: 0.44 },
    ],
    cue_ball_trajectory: [
      { x: 0.67, y: 0.34 },
      { x: 0.82, y: 0.41 },
      { x: 0.61, y: 0.16 },
    ],
    tactical_assessment:
      'Over-cut the red to the bottom-right corner while playing with check side to hold for the black.',
    alternative_suggestion:
      'Playing with plain ball and accepting the pink or blue next avoids side-spin throw on a 40° cut.',
    position_score: 0.35,
    ai_explanation:
      'Applying check side at medium pace induced 1.8° of cue-ball squirt, pushing the contact point too thin.',
  },
];

export default function LandingPage() {
  const [orbState, setOrbState] = useState<ORB_STATES>(ORB_STATES.IDLE);
  const [demoShotIdx, setDemoShotIdx] = useState<number>(0);

  return (
    <div className="min-h-screen bg-[#030407] text-[#F8FAFC] relative overflow-hidden">
      {/* Futuristic Spatial Ambient Spotlights */}
      <div
        className="pointer-events-none fixed inset-0 opacity-90"
        style={{
          background:
            'radial-gradient(ellipse 75% 50% at 65% 25%, rgba(0, 240, 255, 0.11) 0%, rgba(139, 92, 246, 0.08) 42%, transparent 75%)',
        }}
      />

      {/* Top Architectural Telemetry Header */}
      <header className="relative z-30 max-w-[1440px] mx-auto px-6 sm:px-10 h-20 flex items-center justify-between border-b border-white/[0.06]">
        <Link href="/" className="flex items-center gap-3">
          <span className="h-2.5 w-2.5 rounded-full bg-[#00F0FF] shadow-[0_0_14px_#00F0FF]" />
          <span className="text-lg tracking-[0.24em] font-light text-white">
            CUE <strong className="font-semibold text-[#00F0FF]">IQ</strong>
          </span>
          <span className="hidden sm:inline-block font-mono text-[10px] tracking-[0.2em] text-slate-500 pl-2 border-l border-white/10">
            SPATIAL.OS // 04
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-[11px] font-mono uppercase tracking-[0.2em] text-slate-400">
          <a href="#features" className="hover:text-[#00F0FF] transition-colors">
            [01] Architecture
          </a>
          <a href="#interactive-table" className="hover:text-[#00F0FF] transition-colors">
            [02] Vector Matrix
          </a>
          <Link href="/analysis?sample=true" className="hover:text-[#00F0FF] transition-colors">
            [03] Live Workspace
          </Link>
          <Link href="/coach" className="hover:text-[#00F0FF] transition-colors">
            [04] Neural Coach
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/auth"
            className="px-4 py-2 rounded-full text-xs font-mono uppercase tracking-wider text-[#00F0FF] border border-cyan-400/35 hover:bg-cyan-400/10 transition-all"
          >
            Sign In
          </Link>
          <Link
            href="/dashboard"
            className="hidden md:inline-flex px-4 py-2 rounded-full text-xs font-mono uppercase tracking-wider text-slate-200 border border-white/15 hover:border-[#00F0FF]/60 transition-all"
          >
            Command Center
          </Link>
          <Link
            href="/upload"
            className="hidden sm:inline-flex px-4 py-2 rounded-full text-xs font-semibold bg-white text-[#030407] hover:bg-[#00F0FF] transition-all shadow-[0_0_24px_rgba(0,240,255,0.3)]"
          >
            Analyze Your Game
          </Link>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative z-20 max-w-[1440px] mx-auto px-6 sm:px-10 pt-8 pb-24 lg:py-20 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center min-h-[calc(100vh-5rem)]">
        {/* Left Futuristic Telemetry Column */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-7 space-y-7"
        >
          <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-[#090D18]/90 border border-cyan-400/30 shadow-[0_0_25px_rgba(0,240,255,0.12)]">
            <Radio className="w-3.5 h-3.5 text-[#00F0FF] animate-pulse" />
            <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#00F0FF]">
              AUTONOMOUS SNOOKER TELEMETRY ENGINE
            </span>
          </div>

          <h1 className="text-5xl sm:text-7xl xl:text-[5.5rem] font-light tracking-[-0.035em] leading-[0.96] text-white">
            SEE THE GAME{' '}
            <span className="block font-normal text-emerald-gradient mt-1.5">
              DIFFERENTLY.
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-400 font-light max-w-xl leading-relaxed">
            Your game. Every decision. Every shot. Understood.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link
              href="/upload"
              onMouseEnter={() => setOrbState(ORB_STATES.UPLOAD)}
              onMouseLeave={() => setOrbState(ORB_STATES.IDLE)}
              className="btn-cue-primary text-sm"
            >
              <UploadCloud className="w-4 h-4" />
              Analyze Your Game
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/dashboard"
              onMouseEnter={() => setOrbState(ORB_STATES.ANALYZING)}
              onMouseLeave={() => setOrbState(ORB_STATES.IDLE)}
              className="btn-cue-secondary text-sm"
            >
              <Compass className="w-4 h-4 text-[#00F0FF]" />
              Explore Cue IQ
            </Link>

            <Link
              href="/analysis?sample=true"
              className="px-4 py-2.5 text-xs font-mono uppercase tracking-[0.18em] text-slate-400 hover:text-[#00F0FF] flex items-center gap-2 transition-colors"
            >
              <Play className="w-3.5 h-3.5 text-[#00F0FF]" />
              Launch Sample Frame
            </Link>
          </div>

          {/* Architectural Hardware Readout Strip */}
          <div className="pt-8 grid grid-cols-3 gap-6 border-t border-white/[0.08] max-w-xl">
            <div className="border-l-2 border-[#00F0FF]/50 pl-3.5">
              <div className="text-2xl sm:text-3xl font-light text-white stat-value">
                OpenCV
              </div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-slate-400 mt-1">
                Homography & Vector Lock
              </div>
            </div>
            <div className="border-l-2 border-indigo-400/50 pl-3.5">
              <div className="text-2xl sm:text-3xl font-light text-[#00F0FF] stat-value">
                3569 mm
              </div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-slate-400 mt-1">
                Spatial Table Coordinate Map
              </div>
            </div>
            <div className="border-l-2 border-white/30 pl-3.5">
              <div className="text-2xl sm:text-3xl font-light text-white stat-value">
                6-Axis
              </div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-slate-400 mt-1">
                Quantum Gyroscopic Core
              </div>
            </div>
          </div>
        </motion.div>

        {/* Right 3D Quantum Gyroscopic Core Column */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-5 flex flex-col items-center justify-center relative pb-12"
        >
          <IntelligenceOrb
            state={orbState}
            size="hero"
            interactive
            showStateBadge
            onStateChange={setOrbState}
          />
        </motion.div>
      </section>

      {/* FOUR SIGNATURE FEATURES SECTION */}
      <section
        id="features"
        className="relative z-20 max-w-[1440px] mx-auto px-6 sm:px-10 py-24 border-t border-white/[0.08]"
      >
        <div className="max-w-2xl mb-16">
          <span className="kicker-label">SYS.ARCHITECTURE // 01–04</span>
          <h2 className="mt-3 text-3xl sm:text-5xl font-light tracking-tight text-white">
            Precision spatial telemetry for the hardest game on earth.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {/* Feature 1 */}
          <div className="glass-panel-interactive rounded-2xl p-8 flex flex-col justify-between relative overflow-hidden">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-[#00F0FF] tracking-widest">
                  [01] // VECTOR TELEMETRY
                </span>
                <Target className="w-5 h-5 text-[#00F0FF]" />
              </div>
              <h3 className="text-2xl font-light text-white">
                Intelligence Behind Every Shot.
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Every event is indexed with cue-ball origin, object-ball contact point, entry
                pocket geometry, and cut-angle difficulty—linking video frames directly to spatial
                table coordinates.
              </p>
            </div>
            <div className="mt-8 pt-4 border-t border-white/[0.07] flex items-center justify-between font-mono text-[11px] text-slate-300">
              <span>CUT ANGLE & PACE VECTORS</span>
              <span className="text-[#00F0FF]">SUB-SECOND SEEKING</span>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="glass-panel-interactive rounded-2xl p-8 flex flex-col justify-between relative overflow-hidden">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-indigo-400 tracking-widest">
                  [02] // TACTICAL MATRIX
                </span>
                <Compass className="w-5 h-5 text-indigo-400" />
              </div>
              <h3 className="text-2xl font-light text-white">
                Understand Your Decisions.
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Snooker frames are won on shot selection. Cue IQ evaluates whether an aggressive long
                pot or a two-cushion containment safety to baulk offered the superior frame-winning
                percentage.
              </p>
            </div>
            <div className="mt-8 pt-4 border-t border-white/[0.07] flex items-center justify-between font-mono text-[11px] text-slate-300">
              <span>RISK / REWARD PROBABILITY</span>
              <span className="text-indigo-400">ALTERNATIVE GHOST LINES</span>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="glass-panel-interactive rounded-2xl p-8 flex flex-col justify-between relative overflow-hidden">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-[#00F0FF] tracking-widest">
                  [03] // DIAGNOSTIC ENGINE
                </span>
                <Activity className="w-5 h-5 text-[#00F0FF]" />
              </div>
              <h3 className="text-2xl font-light text-white">
                Every Miss Has a Lesson.
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Distinguish alignment errors from side-spin squirt and deceleration. When a break
                ends prematurely, our contextual AI Coach pinpoints the exact positional drift that
                caused it.
              </p>
            </div>
            <div className="mt-8 pt-4 border-t border-white/[0.07] flex items-center justify-between font-mono text-[11px] text-slate-300">
              <span>SIDE-SPIN THROW ANALYSIS</span>
              <span className="text-[#00F0FF]">DRILL PRESCRIPTIONS</span>
            </div>
          </div>

          {/* Feature 4 */}
          <div className="glass-panel-interactive rounded-2xl p-8 flex flex-col justify-between relative overflow-hidden">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-indigo-400 tracking-widest">
                  [04] // OPTICAL PIPELINE
                </span>
                <Cpu className="w-5 h-5 text-indigo-400" />
              </div>
              <h3 className="text-2xl font-light text-white">
                From Match Footage to Match Intelligence.
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Upload raw MP4 or MOV footage. Our OpenCV pipeline verifies baize coverage, extracts
                active shot windows, and compiles a persistent performance dossier with honest
                capability boundaries.
              </p>
            </div>
            <div className="mt-8 pt-4 border-t border-white/[0.07] flex items-center justify-between font-mono text-[11px] text-slate-300">
              <span>REAL OPENCV FRAME INGEST</span>
              <span className="text-indigo-400">ZERO FABRICATED METRICS</span>
            </div>
          </div>
        </div>
      </section>

      {/* INTERACTIVE SNOOKER TABLE DEMONSTRATION SECTION */}
      <section
        id="interactive-table"
        className="relative z-20 max-w-[1440px] mx-auto px-6 sm:px-10 py-20 border-t border-white/[0.08]"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-5 space-y-6">
            <span className="kicker-label">LIVE SPATIAL SIMULATION</span>
            <h2 className="text-3xl sm:text-4xl font-light tracking-tight text-white">
              Inspect verified trajectories in real time.
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Select a sample shot below to inspect cue-ball tangent paths, pocket entry vectors,
              and the AI alternative ghost line on our regulation 2:1 championship table.
            </p>

            {/* Interactive Shot Selector Pills */}
            <div className="space-y-3">
              {DEMO_HERO_SHOTS.map((s, idx) => {
                const active = idx === demoShotIdx;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setDemoShotIdx(idx)}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      active
                        ? 'bg-cyan-400/10 border-[#00F0FF] shadow-[0_0_25px_rgba(0,240,255,0.15)]'
                        : 'bg-white/[0.02] border-white/[0.07] hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between font-mono text-xs mb-1">
                      <span className="text-white font-semibold">
                        SHOT #{s.shot_number} · {s.shot_type?.replace('_', ' ').toUpperCase()}
                      </span>
                      <span
                        className={
                          s.outcome === 'successful' ? 'text-[#00F0FF]' : 'text-rose-400'
                        }
                      >
                        {s.outcome?.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-2">
                      {s.tactical_assessment}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="pt-2 flex items-center gap-4">
              <Link href="/analysis?sample=true" className="btn-cue-primary text-xs">
                Open Full Cinematic Workspace
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <div className="lg:col-span-7">
            <SnookerTable
              shots={DEMO_HERO_SHOTS}
              selectedShotIndex={demoShotIdx}
              onShotSelect={setDemoShotIdx}
            />
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-20 border-t border-white/[0.08] bg-[#020306] py-12 px-6 sm:px-10">
        <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <span className="h-2.5 w-2.5 rounded-full bg-[#00F0FF]" />
            <span className="text-sm tracking-[0.22em] font-light text-white">
              CUE <strong className="font-semibold text-[#00F0FF]">IQ</strong>
            </span>
            <span className="text-xs text-slate-500 ml-2 font-mono">
              // SPATIAL SNOOKER INTELLIGENCE PLATFORM
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs font-mono uppercase tracking-wider text-slate-400">
            <Link href="/dashboard" className="hover:text-[#00F0FF] transition-colors">
              Command Center
            </Link>
            <Link href="/upload" className="hover:text-[#00F0FF] transition-colors">
              Upload
            </Link>
            <Link href="/analysis?sample=true" className="hover:text-[#00F0FF] transition-colors">
              Analysis
            </Link>
            <Link href="/coach" className="hover:text-[#00F0FF] transition-colors">
              Coach
            </Link>
            <Link href="/analytics" className="hover:text-[#00F0FF] transition-colors">
              Analytics
            </Link>
            <Link href="/history" className="hover:text-[#00F0FF] transition-colors">
              History
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
