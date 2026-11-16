'use client';

import React from 'react';
import type { MatchReportData } from '@/lib/api';
import { Award, CheckCircle2, Flame, ShieldAlert, TrendingUp } from 'lucide-react';

interface MatchReportProps {
  report: MatchReportData | null;
  isSample?: boolean;
  className?: string;
}

export default function MatchReport({
  report,
  isSample = false,
  className = '',
}: MatchReportProps) {
  if (!report) return null;

  return (
    <section
      className={`glass-panel rounded-2xl p-6 sm:p-8 border border-white/[0.08] space-y-8 ${className}`}
    >
      {/* Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/[0.07] pb-6">
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <span className="kicker-label">Match Intelligence Dossier</span>
            {isSample && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase bg-amber-500/15 text-amber-300 border border-amber-400/35">
                Sample Benchmark Data
              </span>
            )}
          </div>
          <h2 className="text-2xl sm:text-3xl font-light tracking-tight text-white">
            Executive Performance Synthesis
          </h2>
        </div>

        {/* Overall Index Badge */}
        <div className="flex items-center gap-4 bg-[#070A12] px-5 py-3.5 rounded-2xl border border-[#00F0FF]/30">
          <div>
            <span className="block font-mono text-[10px] uppercase tracking-widest text-[#94A3B8]">
              Cue IQ Match Index
            </span>
            <span className="text-xs text-[#00F0FF]">Tactical & Execution Composite</span>
          </div>
          <div className="text-3xl font-light text-white stat-value">
            {report.overall_rating ? report.overall_rating.toFixed(1) : '—'}
            <span className="text-sm text-[#94A3B8]">/10</span>
          </div>
        </div>
      </div>

      {/* Primary Quantitative Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {[
          {
            label: 'Total Shots',
            value: report.total_shots,
            sub: `${report.pots_attempted} pot attempts`,
          },
          {
            label: 'Pot Success',
            value: `${report.pot_success_rate}%`,
            sub: `${report.pots_successful}/${report.pots_attempted} converted`,
            accent: true,
          },
          {
            label: 'Safety Rate',
            value: `${report.safety_success_rate}%`,
            sub: `${report.safety_shots} tactical safeties`,
          },
          {
            label: 'Positional Control',
            value: `${report.positional_accuracy}%`,
            sub: 'Cue ball landing index',
          },
          {
            label: 'Highest Break',
            value: report.highest_break,
            sub: 'Points in single visit',
            accent: true,
          },
          {
            label: 'Missed Chances',
            value: report.missed_opportunities,
            sub: `Avg Diff ${Math.round(report.average_shot_difficulty * 100)}%`,
          },
        ].map((metric) => (
          <div
            key={metric.label}
            className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]"
          >
            <span className="block font-mono text-[10px] uppercase tracking-wider text-[#94A3B8]">
              {metric.label}
            </span>
            <div
              className={`mt-1.5 text-2xl font-light stat-value ${
                metric.accent ? 'text-[#00F0FF]' : 'text-white'
              }`}
            >
              {metric.value}
            </div>
            <span className="mt-1 block text-[11px] text-[#94A3B8]">{metric.sub}</span>
          </div>
        ))}
      </div>

      {/* AI Narrative Summary */}
      {report.ai_summary && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-[#00F0FF]/[0.08] via-[#0F172A]/40 to-transparent border-l-2 border-[#00F0FF]">
          <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-[#00F0FF] mb-2">
            <Award className="w-4 h-4" />
            Analyst Assessment
          </div>
          <p className="text-sm leading-relaxed text-[#F8FAFC]">{report.ai_summary}</p>
        </div>
      )}

      {/* Strengths, Weaknesses & Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Key Strengths */}
        <div className="p-5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#00F0FF]">
            <CheckCircle2 className="w-4 h-4" />
            Verified Strengths
          </div>
          <ul className="space-y-2.5 text-xs text-[#F8FAFC]">
            {(report.key_strengths || []).map((item, i) => (
              <li key={i} className="flex items-start gap-2.5 leading-relaxed">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00F0FF] mt-1.5 flex-shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Key Weaknesses */}
        <div className="p-5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-amber-300">
            <ShieldAlert className="w-4 h-4" />
            Tactical Vulnerabilities
          </div>
          <ul className="space-y-2.5 text-xs text-[#F8FAFC]">
            {(report.key_weaknesses || []).map((item, i) => (
              <li key={i} className="flex items-start gap-2.5 leading-relaxed">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Practice Prescription */}
        <div className="p-5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-sky-300">
            <TrendingUp className="w-4 h-4" />
            Priority Training Focus
          </div>
          <ol className="space-y-2.5 text-xs text-[#F8FAFC]">
            {(report.improvement_areas || []).map((item, i) => (
              <li key={i} className="flex items-start gap-2.5 leading-relaxed">
                <span className="font-mono text-[10px] text-[#00F0FF] font-bold mt-0.5">
                  0{i + 1}
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* Tactical Patterns */}
      {report.tactical_patterns && report.tactical_patterns.length > 0 && (
        <div className="pt-2 border-t border-white/[0.06] flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-[#94A3B8]">
            <Flame className="w-3.5 h-3.5 text-[#00F0FF]" />
            Observed Patterns:
          </span>
          {report.tactical_patterns.map((pat, i) => (
            <span
              key={i}
              className="px-3 py-1 rounded-full text-xs bg-white/[0.04] border border-white/[0.08] text-[#F8FAFC]"
            >
              {pat}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
