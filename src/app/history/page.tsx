'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Navigation from '@/components/ui/Navigation';
import { api, type MatchItem } from '@/lib/api';
import {
  ArrowLeftRight,
  ArrowUpRight,
  Clock,
  Search,
  Sparkles,
  Trash2,
  UploadCloud,
} from 'lucide-react';

const SAMPLE_BENCHMARK_ENTRY: MatchItem = {
  id: 'sample',
  title: 'Championship Quarter-Final — Frame 3 (Sample Benchmark)',
  description:
    'Pre-calibrated championship broadcast dataset with verified ball trajectories and tactical telemetry.',
  video_filename: 'sample_match.mp4',
  video_url: '/uploads/sample_match.mp4',
  duration_seconds: 65.0,
  status: 'analyzed',
  processing_progress: 100,
  processing_stage: 'Complete — Sample Benchmark Verified',
  detection_mode: 'sample_demo',
  table_coverage: 98.4,
  video_resolution: '960x540',
  video_fps: 15.0,
  is_sample: true,
  pot_success_rate: 78.6,
  safety_success_rate: 66.7,
  total_shots: 16,
  highest_break: 21,
  overall_rating: 7.6,
  created_at: '2026-11-14T18:00:00Z',
  updated_at: '2026-11-14T18:00:00Z',
};

export default function HistoryPage() {
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'analyzed' | 'sample'>('all');

  // Match Comparison State
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<MatchItem | null>(null);

  const loadMatches = async () => {
    setLoading(true);
    try {
      const res = await api.matches.list();
      setMatches(res.matches || []);
    } catch {
      setMatches([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMatches();
  }, []);

  const allEntries = useMemo(() => {
    return [...matches, SAMPLE_BENCHMARK_ENTRY];
  }, [matches]);

  const filteredEntries = useMemo(() => {
    return allEntries.filter((m) => {
      if (statusFilter === 'analyzed' && (m.status !== 'analyzed' || m.is_sample)) {
        return false;
      }
      if (statusFilter === 'sample' && !m.is_sample) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const t = (m.title || m.video_filename || '').toLowerCase();
        const d = (m.description || '').toLowerCase();
        return t.includes(q) || d.includes(q);
      }
      return true;
    });
  }, [allEntries, searchQuery, statusFilter]);

  const toggleCompare = (id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  };

  const comparedMatches = useMemo(() => {
    return compareIds
      .map((id) => allEntries.find((m) => m.id === id))
      .filter((m): m is MatchItem => Boolean(m));
  }, [compareIds, allEntries]);

  const handleConfirmDelete = async () => {
    if (!deleteTarget || deleteTarget.is_sample) return;
    try {
      await api.matches.delete(deleteTarget.id);
      setMatches((prev) => prev.filter((m) => m.id !== deleteTarget.id));
      setCompareIds((prev) => prev.filter((id) => id !== deleteTarget.id));
    } catch {
      // ignore
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#030407] text-[#F8FAFC]">
      <Navigation />

      <main className="max-w-[1440px] mx-auto px-4 sm:px-8 py-10 space-y-8">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-6 border-b border-white/[0.07] pb-6">
          <div className="space-y-2">
            <span className="kicker-label">Archive & Comparison</span>
            <h1 className="text-3xl sm:text-4xl font-light text-white">
              Match History & Side-by-Side Comparison
            </h1>
            <p className="text-xs sm:text-sm text-[#94A3B8] max-w-2xl">
              Search previous reports, compare any two matches side-by-side, revisit individual
              shots, or manage stored match footage.
            </p>
          </div>

          <Link href="/upload" className="btn-cue-primary text-xs">
            <UploadCloud className="w-4 h-4" />
            Analyze New Match
          </Link>
        </div>

        {/* Search & Filter Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="relative flex-1 min-w-[260px] max-w-md">
            <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search matches by title, filename, or notes..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-white placeholder-[#94A3B8] focus:outline-none focus:border-[#00F0FF]"
            />
          </div>

          <div className="flex items-center gap-2">
            {[
              { id: 'all', label: `All (${allEntries.length})` },
              { id: 'analyzed', label: `Uploaded (${matches.length})` },
              { id: 'sample', label: 'Sample Benchmark' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setStatusFilter(f.id as any)}
                className={`px-3.5 py-2 rounded-full text-xs font-medium transition-all ${
                  statusFilter === f.id
                    ? 'bg-[#00F0FF] text-[#030407] font-semibold'
                    : 'bg-white/5 text-[#94A3B8] hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Side-by-Side Match Comparison Panel */}
        {comparedMatches.length > 0 && (
          <section className="glass-panel rounded-2xl p-6 border border-[#00F0FF]/40 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ArrowLeftRight className="w-4 h-4 text-[#00F0FF]" />
                <h2 className="text-sm font-mono uppercase tracking-wider text-white">
                  Match Comparison Matrix ({comparedMatches.length}/2 Selected)
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setCompareIds([])}
                className="text-xs font-mono text-[#94A3B8] hover:text-white"
              >
                Clear Comparison
              </button>
            </div>

            {comparedMatches.length === 1 ? (
              <p className="text-xs text-[#94A3B8]">
                Select one more match using the <strong>Compare</strong> button on any card below to
                view a head-to-head telemetry breakdown.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {comparedMatches.map((m) => (
                  <div
                    key={m.id}
                    className="p-5 rounded-xl bg-white/[0.03] border border-white/10 space-y-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-base font-medium text-white truncate">
                        {m.title || m.video_filename}
                      </h3>
                      {m.is_sample && (
                        <span className="px-2 py-0.5 rounded-full font-mono text-[10px] bg-amber-500/15 text-amber-300">
                          Sample
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                      <div className="p-2.5 rounded-lg bg-[#030407] border border-white/5">
                        <span className="block font-mono text-[10px] text-[#94A3B8]">
                          POT RATE
                        </span>
                        <span className="text-lg font-semibold text-[#00F0FF]">
                          {m.pot_success_rate ?? 0}%
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-[#030407] border border-white/5">
                        <span className="block font-mono text-[10px] text-[#94A3B8]">
                          SAFETY
                        </span>
                        <span className="text-lg font-semibold text-white">
                          {m.safety_success_rate ?? 0}%
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-[#030407] border border-white/5">
                        <span className="block font-mono text-[10px] text-[#94A3B8]">
                          HIGH BREAK
                        </span>
                        <span className="text-lg font-semibold text-white">
                          {m.highest_break ?? 0}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-[#030407] border border-white/5">
                        <span className="block font-mono text-[10px] text-[#94A3B8]">
                          RATING
                        </span>
                        <span className="text-lg font-semibold text-[#00F0FF]">
                          {m.overall_rating ?? '—'}/10
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Match Cards List */}
        {loading ? (
          <div className="py-16 text-center font-mono text-xs text-[#94A3B8]">
            LOADING MATCH ARCHIVE...
          </div>
        ) : (
          <div className="space-y-4">
            {filteredEntries.map((m) => {
              const isSelectedForCompare = compareIds.includes(m.id);
              const analysisHref = m.is_sample
                ? '/analysis?sample=true'
                : `/analysis?id=${encodeURIComponent(m.id)}`;

              return (
                <div
                  key={m.id}
                  className={`glass-panel rounded-2xl p-5 sm:p-6 border transition-all ${
                    isSelectedForCompare
                      ? 'border-[#00F0FF] shadow-[0_0_25px_rgba(0,240,255,0.12)]'
                      : 'border-white/[0.08] hover:border-white/20'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h3 className="text-lg font-medium text-white">
                          {m.title || m.video_filename}
                        </h3>
                        {m.is_sample ? (
                          <span className="px-2.5 py-0.5 rounded-full font-mono text-[10px] uppercase bg-amber-500/15 text-amber-300 border border-amber-400/35">
                            Sample Benchmark
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full font-mono text-[10px] uppercase bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/35">
                            {m.status}
                          </span>
                        )}
                      </div>

                      {m.description && (
                        <p className="text-xs text-[#94A3B8] max-w-2xl">{m.description}</p>
                      )}

                      <div className="flex flex-wrap items-center gap-4 pt-1 font-mono text-xs text-[#94A3B8]">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-[#00F0FF]" />
                          {new Date(m.created_at).toLocaleDateString()}
                        </span>
                        {m.duration_seconds && <span>Duration: {m.duration_seconds}s</span>}
                        {m.total_shots !== null && m.total_shots !== undefined && (
                          <span>Shots: {m.total_shots}</span>
                        )}
                        {m.pot_success_rate !== null && m.pot_success_rate !== undefined && (
                          <span className="text-[#00F0FF]">
                            Pot Rate: {m.pot_success_rate}%
                          </span>
                        )}
                        {m.highest_break !== null && m.highest_break !== undefined && (
                          <span>High Break: {m.highest_break}</span>
                        )}
                      </div>

                      {/* Quick Individual Shot Revisiting Links */}
                      <div className="pt-2 flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[10px] uppercase text-[#94A3B8]">
                          Quick Shot Revisit:
                        </span>
                        {[1, 3, 7, 9, 13].map((sNum) => (
                          <Link
                            key={sNum}
                            href={`${analysisHref}&shot=${sNum}`}
                            className="px-2 py-0.5 rounded-md font-mono text-[10px] bg-white/5 hover:bg-[#00F0FF]/20 text-[#F8FAFC] hover:text-[#00F0FF] border border-white/10 transition-colors"
                          >
                            Shot #{sNum}
                          </Link>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => toggleCompare(m.id)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-mono uppercase border transition-all flex items-center gap-1.5 ${
                          isSelectedForCompare
                            ? 'bg-[#00F0FF]/20 text-[#00F0FF] border-[#00F0FF]'
                            : 'bg-white/5 text-[#F8FAFC] border-white/10 hover:border-white/25'
                        }`}
                      >
                        <ArrowLeftRight className="w-3.5 h-3.5" />
                        {isSelectedForCompare ? 'Comparing' : 'Compare'}
                      </button>

                      <Link
                        href={analysisHref}
                        className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#00F0FF] text-[#030407] hover:bg-[#38BDF8] transition-all flex items-center gap-1.5"
                      >
                        Open Report
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Link>

                      {!m.is_sample && (
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(m)}
                          className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-400/25 transition-all"
                          title="Delete Match"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="glass-panel rounded-2xl p-6 max-w-md w-full border border-white/15 space-y-4">
              <h3 className="text-lg font-medium text-white">Delete Match Record?</h3>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                Are you sure you want to permanently delete{' '}
                <strong className="text-white">
                  {deleteTarget.title || deleteTarget.video_filename}
                </strong>{' '}
                and its associated shot analysis report?
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="px-4 py-2 rounded-xl text-xs bg-white/5 hover:bg-white/10 text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-500 hover:bg-red-400 text-black"
                >
                  Delete Permanently
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
