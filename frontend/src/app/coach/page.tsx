'use client';

import React, { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Navigation from '@/components/ui/Navigation';
import IntelligenceOrb from '@/components/orb/IntelligenceOrb';
import { ORB_STATES } from '@/lib/constants';
import {
  api,
  type AnalysisResponse,
  type MatchItem,
  type ShotItem,
} from '@/lib/api';
import {
  ArrowUpRight,
  Compass,
  Send,
  Sparkles,
  Target,
} from 'lucide-react';

const COACH_PROMPTS = [
  'Why was this shot a mistake?',
  'Was there a better positional shot?',
  'What would a professional player consider here?',
  'How could I have controlled the cue ball?',
  'What are my biggest weaknesses?',
  'What should I practice next?',
];

interface LocalChatMsg {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  shotContext?: number | null;
}

function CoachContent() {
  const searchParams = useSearchParams();
  const initialMatchId = searchParams.get('matchId') || 'sample';
  const initialShotNumber = searchParams.get('shotNumber');

  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<string>(initialMatchId);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [selectedShotNumber, setSelectedShotNumber] = useState<number | null>(
    initialShotNumber ? Number(initialShotNumber) : 9
  );

  const [messages, setMessages] = useState<LocalChatMsg[]>([
    {
      id: 'welcome-msg',
      role: 'assistant',
      content:
        'I am your CUE IQ Tactical Coach. I have loaded your match telemetry and shot geometry into context. Select any shot from the selector or ask me about shot selection, cue-ball control, or targeted practice routines.',
    },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [orbPulse, setOrbPulse] = useState(0);
  const scrollEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.matches
      .list()
      .then((res) => setMatches(res.matches || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let mounted = true;
    async function loadContext() {
      try {
        const res =
          selectedMatchId && selectedMatchId !== 'sample'
            ? await api.matches.get(selectedMatchId)
            : await api.matches.getSample();
        if (!mounted) return;
        setAnalysis(res);
        if (
          selectedShotNumber &&
          !res.shots.some((s) => s.shot_number === selectedShotNumber)
        ) {
          setSelectedShotNumber(res.shots[0]?.shot_number ?? null);
        }
      } catch {
        // fallback ignored
      }
    }
    loadContext();
    return () => {
      mounted = false;
    };
  }, [selectedMatchId]);

  const activeShot: ShotItem | null =
    analysis?.shots.find((s) => s.shot_number === selectedShotNumber) || null;

  const sendPrompt = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const userMsg: LocalChatMsg = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: trimmed,
      shotContext: selectedShotNumber,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setSending(true);
    setOrbPulse(1.0);

    try {
      const resp = await api.coach.chat(
        trimmed,
        selectedMatchId,
        activeShot?.id || null,
        selectedShotNumber
      );
      const assistantReply = resp.find((m) => m.role === 'assistant') || resp[resp.length - 1];
      setMessages((prev) => [
        ...prev,
        {
          id: assistantReply?.id || `a-${Date.now()}`,
          role: 'assistant',
          content:
            assistantReply?.content ||
            'Telemetry analyzed. Focus on plain-ball alignment and controlled stun along the tangent line.',
          shotContext: selectedShotNumber,
        },
      ]);
    } catch {
      // Fallback contextual synthesis if backend is unreachable
      const fallbackText = activeShot
        ? `For Shot #${activeShot.shot_number} (${activeShot.shot_type} on ${activeShot.object_ball}, ${activeShot.outcome}): ${activeShot.tactical_assessment} Recommended adjustment: ${activeShot.alternative_suggestion}`
        : `Based on your match telemetry (${analysis?.report?.pot_success_rate ?? 78.6}% pot conversion, ${analysis?.report?.positional_accuracy ?? 81.4}% positional control), prioritize plain-ball striking on medium cuts and two-cushion containment safeties from baulk.`;
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: fallbackText,
          shotContext: selectedShotNumber,
        },
      ]);
    } finally {
      setSending(false);
      setTimeout(() => setOrbPulse(0), 900);
      setTimeout(() => {
        scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  return (
    <main className="max-w-[1440px] mx-auto px-4 sm:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left 5 Columns: Intelligence Orb + Context Selector */}
        <div className="lg:col-span-5 glass-panel rounded-3xl p-6 sm:p-8 border border-white/[0.08] space-y-6">
          <div className="flex items-center justify-between">
            <span className="kicker-label">Contextual AI Coach</span>
            {analysis?.match.is_sample && (
              <span className="px-2.5 py-0.5 rounded-full font-mono text-[10px] uppercase bg-amber-500/15 text-amber-300 border border-amber-400/35">
                Sample Context
              </span>
            )}
          </div>

          <div className="flex flex-col items-center text-center">
            <IntelligenceOrb
              state={sending ? ORB_STATES.ANALYZING : ORB_STATES.AI_COACH}
              pulse={orbPulse}
              size="md"
              showStateBadge
            />
          </div>

          {/* Match & Shot Context Controls */}
          <div className="pt-4 border-t border-white/[0.07] space-y-4">
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-wider text-[#94A3B8] mb-1.5">
                Active Match Context
              </label>
              <select
                value={selectedMatchId}
                onChange={(e) => setSelectedMatchId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#070A12] border border-white/10 text-xs text-white focus:outline-none focus:border-[#00F0FF]"
              >
                <option value="sample">
                  Championship Quarter-Final — Frame 3 (Sample Benchmark)
                </option>
                {matches.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title || m.video_filename} ({m.status})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-mono text-[10px] uppercase tracking-wider text-[#94A3B8]">
                  Selected Shot Telemetry Context
                </label>
                {activeShot && (
                  <Link
                    href={`/analysis?${
                      selectedMatchId === 'sample'
                        ? 'sample=true'
                        : `id=${encodeURIComponent(selectedMatchId)}`
                    }&shot=${activeShot.shot_number}`}
                    className="font-mono text-[10px] text-[#00F0FF] hover:underline flex items-center gap-1"
                  >
                    Inspect on Table <ArrowUpRight className="w-3 h-3" />
                  </Link>
                )}
              </div>
              <select
                value={selectedShotNumber ?? ''}
                onChange={(e) =>
                  setSelectedShotNumber(e.target.value ? Number(e.target.value) : null)
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#070A12] border border-white/10 text-xs text-white focus:outline-none focus:border-[#00F0FF]"
              >
                <option value="">Entire Match Overview (All Shots)</option>
                {(analysis?.shots || []).map((s) => (
                  <option key={s.id} value={s.shot_number}>
                    Shot #{s.shot_number} · {s.player} · {s.shot_type?.replace('_', ' ')} (
                    {s.object_ball || 'event'} — {s.outcome || 'recorded'})
                  </option>
                ))}
              </select>
            </div>

            {/* Active Shot Mini Telemetry Card */}
            {activeShot && (
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.07] space-y-1.5 text-xs">
                <div className="flex items-center justify-between font-mono text-[11px]">
                  <span className="text-[#00F0FF] font-semibold">
                    SHOT #{activeShot.shot_number} TELEMETRY
                  </span>
                  <span className="text-[#94A3B8] uppercase">
                    {activeShot.outcome || 'EVENT'}
                  </span>
                </div>
                <p className="text-[#F8FAFC] leading-relaxed">
                  {activeShot.tactical_assessment}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right 7 Columns: Conversational Coaching Interface */}
        <div className="lg:col-span-7 glass-panel rounded-3xl border border-white/[0.08] flex flex-col h-[720px] overflow-hidden">
          {/* Top Coach Bar */}
          <div className="px-6 py-4 border-b border-white/[0.07] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-[#00F0FF]" />
              <span className="text-sm font-medium text-white">
                Tactical Dialogue & Shot Diagnostics
              </span>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#94A3B8]">
              {activeShot ? `Focused: Shot #${activeShot.shot_number}` : 'Focused: Full Frame'}
            </span>
          </div>

          {/* Prompt Chips */}
          <div className="px-6 py-3 bg-[#070A12]/90 border-b border-white/[0.06] flex items-center gap-2 overflow-x-auto">
            {COACH_PROMPTS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => sendPrompt(q)}
                disabled={sending}
                className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs bg-white/[0.04] hover:bg-[#00F0FF]/15 text-[#F8FAFC] hover:text-[#00F0FF] border border-white/10 hover:border-[#00F0FF]/40 transition-all"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3.5 text-xs sm:text-sm leading-relaxed whitespace-pre-line ${
                    m.role === 'user'
                      ? 'bg-[#00F0FF] text-[#030407] font-medium'
                      : 'bg-white/[0.04] border border-white/[0.08] text-[#F8FAFC]'
                  }`}
                >
                  {m.shotContext && m.role === 'user' && (
                    <div className="font-mono text-[10px] uppercase opacity-75 mb-1">
                      Context: Shot #{m.shotContext}
                    </div>
                  )}
                  {m.content}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="rounded-2xl px-4 py-3 bg-white/[0.04] border border-white/[0.08] font-mono text-xs text-[#00F0FF] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#00F0FF] animate-ping" />
                  Synthesizing tactical response...
                </div>
              </div>
            )}
            <div ref={scrollEndRef} />
          </div>

          {/* Input Composer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendPrompt(input);
            }}
            className="p-4 bg-[#070A12] border-t border-white/[0.07] flex items-center gap-3"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask why a shot missed, how to control the cue ball, or what to practice next..."
              className="flex-1 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-sm text-white placeholder-[#94A3B8] focus:outline-none focus:border-[#00F0FF]"
            />
            <button
              type="submit"
              disabled={!input.trim() || sending}
              className="px-5 py-3 rounded-xl bg-[#00F0FF] text-[#030407] font-semibold text-xs hover:bg-[#38BDF8] disabled:opacity-40 transition-all flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Ask Coach
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

export default function CoachPage() {
  return (
    <div className="min-h-screen bg-[#030407] text-[#F8FAFC]">
      <Navigation />
      <Suspense
        fallback={
          <div className="p-16 text-center font-mono text-xs text-[#94A3B8]">
            LOADING AI COACH...
          </div>
        }
      >
        <CoachContent />
      </Suspense>
    </div>
  );
}
