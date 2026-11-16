'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Navigation from '@/components/ui/Navigation';
import { BALL_COLORS } from '@/lib/constants';
import { api, type AnalyticsOverviewResponse } from '@/lib/api';
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Layers,
  Sparkles,
  Target,
  UploadCloud,
} from 'lucide-react';

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsOverviewResponse | null>(null);
  const [viewSampleBenchmark, setViewSampleBenchmark] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    api.analytics
      .overview(viewSampleBenchmark)
      .then((res) => {
        if (mounted) setData(res);
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [viewSampleBenchmark]);

  return (
    <div className="min-h-screen bg-[#030407] text-[#F8FAFC]">
      <Navigation />

      <main className="max-w-[1440px] mx-auto px-4 sm:px-8 py-10 space-y-10">
        {/* Header & Data Source Toggle */}
        <div className="flex flex-wrap items-end justify-between gap-6 border-b border-white/[0.07] pb-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="kicker-label">Performance Analytics</span>
              {data?.is_sample ? (
                <span className="px-2.5 py-0.5 rounded-full font-mono text-[10px] uppercase bg-amber-500/15 text-amber-300 border border-amber-400/35">
                  Sample Benchmark Dataset
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full font-mono text-[10px] uppercase bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/35">
                  Verified User Match Data ({data?.total_matches || 0} Matches)
                </span>
              )}
            </div>
            <h1 className="text-3xl sm:text-4xl font-light text-white">
              Quantitative Shot & Positional Telemetry
            </h1>
            <p className="text-xs sm:text-sm text-[#94A3B8] max-w-2xl">
              All metrics are computed directly from tracked shot records—never fabricated.
              {data?.is_sample &&
                ' Currently displaying the calibrated 16-shot Championship Sample Benchmark.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {data?.has_real_matches && (
              <button
                type="button"
                onClick={() => setViewSampleBenchmark((v) => !v)}
                className="px-4 py-2 rounded-full text-xs font-mono uppercase border border-white/15 hover:border-[#00F0FF]/50 text-[#F8FAFC]"
              >
                {viewSampleBenchmark
                  ? 'Show My Uploaded Matches'
                  : 'Compare w/ Sample Benchmark'}
              </button>
            )}
            <Link href="/upload" className="btn-cue-primary text-xs">
              <UploadCloud className="w-4 h-4" />
              Upload Match Footage
            </Link>
          </div>
        </div>

        {loading || !data ? (
          <div className="py-20 text-center font-mono text-xs text-[#94A3B8]">
            COMPUTING TELEMETRY AGGREGATIONS...
          </div>
        ) : (
          <>
            {/* Top 6 KPI Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                {
                  label: 'Pot Success Rate',
                  val: `${data.pot_success_rate}%`,
                  sub: `${data.total_shots} total events`,
                  accent: true,
                },
                {
                  label: 'Safety Efficiency',
                  val: `${data.safety_success_rate}%`,
                  sub: `${data.shot_distribution.safety} safety shots`,
                },
                {
                  label: 'Positional Control',
                  val: `${data.positional_accuracy}%`,
                  sub: 'Cue ball landing score',
                  accent: true,
                },
                {
                  label: 'Highest Break',
                  val: data.highest_break,
                  sub: 'Points in single visit',
                },
                {
                  label: 'Missed Opportunities',
                  val: data.missed_opportunities,
                  sub: 'Unconverted attempts',
                },
                {
                  label: 'Avg Shot Difficulty',
                  val: `${data.average_difficulty}%`,
                  sub: 'Cut angle & distance index',
                },
              ].map((kpi) => (
                <div
                  key={kpi.label}
                  className="glass-panel rounded-2xl p-5 border border-white/[0.07]"
                >
                  <span className="block font-mono text-[10px] uppercase tracking-wider text-[#94A3B8]">
                    {kpi.label}
                  </span>
                  <div
                    className={`mt-2 text-3xl font-light stat-value ${
                      kpi.accent ? 'text-[#00F0FF]' : 'text-white'
                    }`}
                  >
                    {kpi.val}
                  </div>
                  <span className="mt-1 block text-xs text-[#94A3B8]">{kpi.sub}</span>
                </div>
              ))}
            </div>

            {/* Middle Charts Grid: Pot Success by Ball Color + Shot Selection Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Pot Conversion by Object Ball Color */}
              <section className="lg:col-span-7 glass-panel rounded-2xl p-6 border border-white/[0.08] space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="kicker-label">Object Ball Conversion</span>
                    <h2 className="text-lg font-light text-white mt-0.5">
                      Pot Success Rate by Ball Color
                    </h2>
                  </div>
                  <BarChart3 className="w-4 h-4 text-[#00F0FF]" />
                </div>

                <div className="space-y-4">
                  {data.pot_by_ball.map((item) => {
                    const meta = BALL_COLORS[item.ball] || BALL_COLORS.red;
                    return (
                      <div key={item.ball} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2.5">
                            <span
                              className="w-3 h-3 rounded-full border border-white/25"
                              style={{ backgroundColor: meta.hex }}
                            />
                            <span className="font-medium text-white capitalize">
                              {meta.label}
                            </span>
                          </div>
                          <div className="font-mono text-xs text-[#94A3B8]">
                            <strong className="text-white">{item.rate}%</strong> (
                            {item.successful}/{item.attempted})
                          </div>
                        </div>
                        <div className="h-2 w-full rounded-full bg-white/[0.06] overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${Math.max(item.attempted > 0 ? 4 : 0, item.rate)}%`,
                              backgroundColor: meta.hex,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Shot Selection & Table Zone Accuracy */}
              <section className="lg:col-span-5 glass-panel rounded-2xl p-6 border border-white/[0.08] space-y-6 flex flex-col justify-between">
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="kicker-label">Spatial & Tactical Split</span>
                      <h2 className="text-lg font-light text-white mt-0.5">
                        Table Zone Conversion & Shot Selection
                      </h2>
                    </div>
                    <Layers className="w-4 h-4 text-[#00F0FF]" />
                  </div>

                  {/* Table Zone Heatmap Bars */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      {
                        id: 'baulk',
                        title: 'Baulk Zone',
                        sub: 'D & Baulk Colors',
                        stat: data.zone_performance.baulk,
                      },
                      {
                        id: 'center',
                        title: 'Center Table',
                        sub: 'Blue to Pink Line',
                        stat: data.zone_performance.center,
                      },
                      {
                        id: 'scoring_top',
                        title: 'Top Scoring',
                        sub: 'Pack & Black Spot',
                        stat: data.zone_performance.scoring_top,
                      },
                    ].map((z) => (
                      <div
                        key={z.id}
                        className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.07] text-center space-y-1"
                      >
                        <span className="block font-mono text-[10px] uppercase text-[#94A3B8]">
                          {z.title}
                        </span>
                        <div className="text-2xl font-light text-[#00F0FF] stat-value">
                          {z.stat.success_rate}%
                        </div>
                        <span className="block text-[10px] text-[#94A3B8]">
                          {z.stat.shots} shots · {z.sub}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Shot Selection Breakdown */}
                  <div className="space-y-2.5 pt-2">
                    <span className="block font-mono text-[10px] uppercase tracking-wider text-[#94A3B8]">
                      Shot Selection Distribution
                    </span>
                    {[
                      {
                        label: 'Break-Building Pots',
                        count: data.shot_distribution.break_building,
                        color: '#38BDF8',
                      },
                      {
                        label: 'Starter Pots',
                        count: data.shot_distribution.pot,
                        color: '#00F0FF',
                      },
                      {
                        label: 'Tactical Safeties',
                        count: data.shot_distribution.safety,
                        color: '#38bdf8',
                      },
                      {
                        label: 'Missed Attempts',
                        count: data.shot_distribution.missed,
                        color: '#f87171',
                      },
                    ].map((row) => {
                      const pct =
                        data.total_shots > 0
                          ? Math.round((row.count / data.total_shots) * 100)
                          : 0;
                      return (
                        <div
                          key={row.label}
                          className="flex items-center justify-between text-xs py-1.5 border-b border-white/[0.05]"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: row.color }}
                            />
                            <span className="text-[#F8FAFC]">{row.label}</span>
                          </div>
                          <span className="font-mono text-xs text-[#94A3B8]">
                            <strong className="text-white">{row.count}</strong> ({pct}%)
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-4 border-t border-white/[0.07] flex items-center justify-between">
                  <span className="text-xs text-[#94A3B8]">
                    Inspect individual shot trajectories
                  </span>
                  <Link
                    href="/analysis?sample=true"
                    className="text-xs font-mono uppercase tracking-wider text-[#00F0FF] hover:underline flex items-center gap-1"
                  >
                    Open Analysis <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </section>
            </div>

            {/* Match Progression Ledger */}
            <section className="glass-panel rounded-2xl p-6 border border-white/[0.08] space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="kicker-label">Performance Progression</span>
                  <h2 className="text-lg font-light text-white mt-0.5">
                    Match-by-Match Telemetry Ledger
                  </h2>
                </div>
                <Activity className="w-4 h-4 text-[#00F0FF]" />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-white/10 font-mono text-[10px] uppercase tracking-wider text-[#94A3B8]">
                      <th className="py-3 pr-4">Match</th>
                      <th className="py-3 px-4">Date / Mode</th>
                      <th className="py-3 px-4">Shots</th>
                      <th className="py-3 px-4">Pot Rate</th>
                      <th className="py-3 px-4">Safety Rate</th>
                      <th className="py-3 px-4">Positional</th>
                      <th className="py-3 px-4">High Break</th>
                      <th className="py-3 pl-4 text-right">Rating</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {data.match_progression.map((m) => (
                      <tr key={m.id} className="hover:bg-white/[0.02]">
                        <td className="py-3.5 pr-4 font-medium text-white">
                          <Link
                            href={
                              m.is_sample
                                ? '/analysis?sample=true'
                                : `/analysis?id=${encodeURIComponent(m.id)}`
                            }
                            className="hover:text-[#00F0FF] transition-colors"
                          >
                            {m.title}
                          </Link>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[#94A3B8]">{m.date}</td>
                        <td className="py-3.5 px-4 font-mono">{m.total_shots}</td>
                        <td className="py-3.5 px-4 font-mono text-[#00F0FF] font-semibold">
                          {m.pot_success_rate}%
                        </td>
                        <td className="py-3.5 px-4 font-mono">{m.safety_success_rate}%</td>
                        <td className="py-3.5 px-4 font-mono">{m.positional_accuracy}%</td>
                        <td className="py-3.5 px-4 font-mono text-white">{m.highest_break}</td>
                        <td className="py-3.5 pl-4 font-mono text-right text-[#00F0FF] font-semibold">
                          {m.overall_rating}/10
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
