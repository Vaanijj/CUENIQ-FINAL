'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Navigation from '@/components/ui/Navigation';
import IntelligenceOrb from '@/components/orb/IntelligenceOrb';
import { ORB_STATES } from '@/lib/constants';
import {
  api,
  getStoredUser,
  type UserProfile,
  type MatchItem,
  type AnalyticsOverviewResponse,
} from '@/lib/api';
import {
  ArrowUpRight,
  BarChart3,
  Clock,
  LogIn,
  MessageSquare,
  PlayCircle,
  Sparkles,
  UploadCloud,
  UserCheck,
} from 'lucide-react';

export default function CommandCenterPage() {
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsOverviewResponse | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUser(getStoredUser());
    let mounted = true;
    async function load() {
      try {
        const [mList, ov] = await Promise.all([
          api.matches.list().catch(() => ({ matches: [], total: 0 })),
          api.analytics.overview(false).catch(() => null),
        ]);
        if (!mounted) return;
        setMatches(mList.matches || []);
        setAnalytics(ov);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const hasUploadedMatches = matches.length > 0;

  return (
    <div className="min-h-screen bg-[#030407] text-[#F8FAFC]">
      <Navigation />

      <main className="max-w-[1440px] mx-auto px-4 sm:px-8 py-10 space-y-12">
        {/* Top Editorial Command Header */}
        <section className="glass-panel rounded-3xl p-6 sm:p-10 border border-white/[0.08] relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="kicker-label">Command Center</span>
                {user ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-cyan-400/15 text-[#00F0FF] border border-cyan-400/35 flex items-center gap-1.5">
                    <UserCheck className="w-3 h-3" />
                    Signed in as {user.display_name || user.email} ({user.email})
                  </span>
                ) : (
                  <Link
                    href="/auth"
                    className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase bg-cyan-400/15 text-[#00F0FF] border border-cyan-400/35 hover:bg-cyan-400/25 flex items-center gap-1.5"
                  >
                    <LogIn className="w-3 h-3" />
                    Sign In with Email to Sync Cloud Profile
                  </Link>
                )}
                {analytics?.is_sample && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase bg-amber-500/15 text-amber-300 border border-amber-400/35">
                    Sample Benchmark Active (No Uploaded Matches Yet)
                  </span>
                )}
              </div>

              <h1 className="text-3xl sm:text-5xl font-light tracking-tight text-white">
                Tactical Match Intelligence & Telemetry Hub
              </h1>
              <p className="text-sm sm:text-base text-[#94A3B8] max-w-2xl leading-relaxed">
                Upload match footage for OpenCV table and ball trajectory analysis, inspect
                frame-by-frame tactical decisions, or consult your contextual AI Coach.
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-3.5">
                <Link href="/upload" className="btn-cue-primary text-xs sm:text-sm">
                  <UploadCloud className="w-4 h-4" />
                  Analyze New Match
                </Link>
                <Link
                  href="/analysis?sample=true"
                  className="btn-cue-secondary text-xs sm:text-sm"
                >
                  <PlayCircle className="w-4 h-4 text-[#00F0FF]" />
                  Explore Sample Benchmark
                </Link>
                <Link
                  href="/coach"
                  className="px-4 py-2.5 rounded-full text-xs font-mono uppercase tracking-wider text-[#94A3B8] hover:text-white border border-white/10 hover:border-white/25 transition-all flex items-center gap-2"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-[#00F0FF]" />
                  Open AI Coach
                </Link>
              </div>
            </div>

            <div className="lg:col-span-4 flex flex-col items-center justify-center">
              <IntelligenceOrb
                state={hasUploadedMatches ? ORB_STATES.COMPLETE : ORB_STATES.IDLE}
                size="md"
              />
            </div>
          </div>
        </section>

        {/* Performance Overview Strip */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="kicker-label">Performance Overview</span>
              <h2 className="text-xl font-light text-white mt-1">
                {analytics?.is_sample
                  ? 'Calibrated Sample Benchmark Telemetry'
                  : `Aggregated Across ${analytics?.total_matches || matches.length} Analyzed Matches`}
              </h2>
            </div>
            <Link
              href="/analytics"
              className="text-xs font-mono uppercase tracking-wider text-[#00F0FF] hover:underline flex items-center gap-1"
            >
              Full Analytics <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              {
                label: 'Matches Indexed',
                val: hasUploadedMatches ? matches.length : '1 (Sample)',
                sub: hasUploadedMatches ? 'Persisted in SQLite' : 'Demo Benchmark Mode',
              },
              {
                label: 'Pot Success Rate',
                val: analytics ? `${analytics.pot_success_rate}%` : '78.6%',
                sub: `${analytics?.total_shots ?? 16} total shots tracked`,
                highlight: true,
              },
              {
                label: 'Safety Efficiency',
                val: analytics ? `${analytics.safety_success_rate}%` : '66.7%',
                sub: 'Containment & snookers',
              },
              {
                label: 'Positional Control',
                val: analytics ? `${analytics.positional_accuracy}%` : '81.4%',
                sub: 'Cue ball landing accuracy',
              },
              {
                label: 'Highest Break',
                val: analytics ? analytics.highest_break : 21,
                sub: 'Points in single visit',
                highlight: true,
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="glass-panel rounded-2xl p-5 border border-white/[0.07]"
              >
                <span className="block font-mono text-[10px] uppercase tracking-wider text-[#94A3B8]">
                  {stat.label}
                </span>
                <div
                  className={`mt-2 text-3xl font-light stat-value ${
                    stat.highlight ? 'text-[#00F0FF]' : 'text-white'
                  }`}
                >
                  {stat.val}
                </div>
                <span className="mt-1 block text-xs text-[#94A3B8]">{stat.sub}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Two-Column Editorial Split: Recent Matches & Recent AI Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left 7 Columns: Recent Matches & Reports */}
          <section className="lg:col-span-7 glass-panel rounded-2xl p-6 border border-white/[0.08] space-y-5">
            <div className="flex items-center justify-between border-b border-white/[0.07] pb-4">
              <div>
                <span className="kicker-label">Match Ledger</span>
                <h3 className="text-lg font-light text-white mt-0.5">
                  Recent Matches & Analysis Reports
                </h3>
              </div>
              <Link
                href="/history"
                className="text-xs font-mono uppercase tracking-wider text-[#94A3B8] hover:text-white flex items-center gap-1"
              >
                <Clock className="w-3.5 h-3.5 text-[#00F0FF]" />
                All History
              </Link>
            </div>

            {loading ? (
              <div className="py-12 text-center text-xs font-mono text-[#94A3B8]">
                LOADING MATCH TELEMETRY...
              </div>
            ) : (
              <div className="space-y-3">
                {/* Uploaded Matches */}
                {matches.map((m) => (
                  <div
                    key={m.id}
                    className="p-4 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.07] transition-all flex flex-wrap items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <span className="text-sm font-medium text-white">
                          {m.title || m.video_filename}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full font-mono text-[10px] uppercase ${
                            m.status === 'analyzed'
                              ? 'bg-[#00F0FF]/15 text-[#00F0FF]'
                              : m.status === 'processing'
                              ? 'bg-amber-500/15 text-amber-300'
                              : 'bg-white/10 text-[#94A3B8]'
                          }`}
                        >
                          {m.status}
                        </span>
                        {m.detection_mode === 'cv_motion_only' && (
                          <span className="px-2 py-0.5 rounded-full font-mono text-[10px] bg-sky-500/15 text-sky-300">
                            Motion Segmented
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[#94A3B8] font-mono flex flex-wrap items-center gap-3">
                        <span>{new Date(m.created_at).toLocaleDateString()}</span>
                        {m.duration_seconds && <span>{m.duration_seconds.toFixed(1)}s</span>}
                        {m.pot_success_rate !== null && m.pot_success_rate !== undefined && (
                          <span className="text-[#00F0FF]">Pot {m.pot_success_rate}%</span>
                        )}
                        {m.total_shots !== null && m.total_shots !== undefined && (
                          <span>{m.total_shots} Events</span>
                        )}
                      </div>
                    </div>

                    <Link
                      href={`/analysis?id=${encodeURIComponent(m.id)}`}
                      className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/35 hover:bg-[#00F0FF] hover:text-[#030407] transition-all flex items-center gap-1.5"
                    >
                      Open Analysis
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                ))}

                {/* Always include the clearly-labelled Championship Sample Benchmark */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-[#00F0FF]/[0.07] to-transparent border border-[#00F0FF]/30 flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="text-sm font-medium text-white">
                        Championship Quarter-Final — Frame 3
                      </span>
                      <span className="px-2 py-0.5 rounded-full font-mono text-[10px] uppercase bg-amber-500/15 text-amber-300 border border-amber-400/35">
                        Sample Benchmark
                      </span>
                    </div>
                    <div className="text-xs text-[#94A3B8] font-mono flex flex-wrap items-center gap-3">
                      <span>16 Verified Shots</span>
                      <span className="text-[#00F0FF]">Pot Rate 78.6%</span>
                      <span>Positional 81.4%</span>
                      <span>Rating 7.6/10</span>
                    </div>
                  </div>

                  <Link
                    href="/analysis?sample=true"
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#00F0FF] text-[#030407] hover:bg-[#38BDF8] transition-all flex items-center gap-1.5"
                  >
                    Launch Sample
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )}
          </section>

          {/* Right 5 Columns: Recent AI Tactical Insights */}
          <section className="lg:col-span-5 glass-panel rounded-2xl p-6 border border-white/[0.08] space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/[0.07] pb-4">
                <div>
                  <span className="kicker-label">Tactical Briefings</span>
                  <h3 className="text-lg font-light text-white mt-0.5">
                    Recent AI Analyst Insights
                  </h3>
                </div>
                <Sparkles className="w-4 h-4 text-[#00F0FF]" />
              </div>

              <div className="space-y-3.5">
                {[
                  {
                    tag: 'SHOT #09 · ALIGNMENT & SPIN',
                    text: 'Applying check-side on 40° medium-pace cuts induced 1.8° of cue-ball squirt. Plain-ball striking increases corner-pocket margin by 18%.',
                    href: '/analysis?sample=true&shot=9',
                  },
                  {
                    tag: 'SHOT #02 · RISK MANAGEMENT',
                    text: 'Long pot attempts when bridging within 15cm of the baulk cushion converted at <35% and left 4 open reds in the center scoring triangle.',
                    href: '/analysis?sample=true&shot=2',
                  },
                  {
                    tag: 'BREAK CONTINUATION · BLACK SPOT',
                    text: 'Floating one cushion with slight top-side off the black spot achieved an 89% positional landing score onto middle-pocket reds.',
                    href: '/analysis?sample=true&shot=4',
                  },
                ].map((insight, idx) => (
                  <Link
                    key={idx}
                    href={insight.href}
                    className="block p-4 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.06] hover:border-[#00F0FF]/35 transition-all"
                  >
                    <div className="flex items-center justify-between font-mono text-[10px] text-[#00F0FF] mb-1.5">
                      <span>{insight.tag}</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </div>
                    <p className="text-xs text-[#F8FAFC] leading-relaxed">{insight.text}</p>
                  </Link>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-white/[0.07] flex items-center justify-between">
              <span className="text-xs text-[#94A3B8]">
                Need a personalized practice drill?
              </span>
              <Link
                href="/coach"
                className="text-xs font-mono uppercase tracking-wider text-[#00F0FF] hover:underline flex items-center gap-1"
              >
                Consult AI Coach <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
