'use client';

import React, { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Navigation from '@/components/ui/Navigation';
import SnookerTable from '@/components/table/SnookerTable';
import ShotTimeline from '@/components/analysis/ShotTimeline';
import ShotDetail from '@/components/analysis/ShotDetail';
import MatchReport from '@/components/analysis/MatchReport';
import BroadcastVideoCanvas from '@/components/analysis/BroadcastVideoCanvas';
import {
  api,
  resolveVideoUrl,
  type AnalysisResponse,
  type ShotItem,
} from '@/lib/api';
import {
  AlertTriangle,
  Maximize2,
  MessageSquare,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  UploadCloud,
} from 'lucide-react';

function formatClock(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const tenths = Math.floor((sec % 1) * 10);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${tenths}`;
}

function AnalysisWorkspaceContent() {
  const searchParams = useSearchParams();
  const matchIdParam = searchParams.get('id');
  const sampleParam = searchParams.get('sample');
  const initialShotNumber = searchParams.get('shot');

  const videoRef = useRef<HTMLVideoElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);

  const [data, setData] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useCanvasBroadcast, setUseCanvasBroadcast] = useState(false);

  const [selectedShotIdx, setSelectedShotIdx] = useState<number | null>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(1.0);
  const [duration, setDuration] = useState(65);
  const [playbackRate, setPlaybackRate] = useState(1);

  useEffect(() => {
    let mounted = true;
    async function loadAnalysis() {
      setLoading(true);
      setError(null);
      try {
        const res =
          matchIdParam && matchIdParam !== 'sample'
            ? await api.matches.get(matchIdParam)
            : await api.matches.getSample();
        if (!mounted) return;
        setData(res);
        setUseCanvasBroadcast(Boolean(res.match.is_sample));
        if (res.match.duration_seconds) {
          setDuration(res.match.duration_seconds);
        }
        if (initialShotNumber && res.shots.length > 0) {
          const foundIdx = res.shots.findIndex(
            (s) => s.shot_number === Number(initialShotNumber)
          );
          const idx = foundIdx >= 0 ? foundIdx : 0;
          setSelectedShotIdx(idx);
          setCurrentTime(res.shots[idx].timestamp_start);
        } else if (res.shots.length > 0) {
          setSelectedShotIdx(0);
          setCurrentTime(res.shots[0].timestamp_start);
        } else {
          setSelectedShotIdx(null);
          setCurrentTime(0);
        }
      } catch (err: any) {
        if (!mounted) return;
        setError(err?.message || 'Unable to load match analysis.');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadAnalysis();
    return () => {
      mounted = false;
    };
  }, [matchIdParam, sampleParam, initialShotNumber]);

  const shots = data?.shots || [];
  const activeShot: ShotItem | null =
    selectedShotIdx !== null && shots[selectedShotIdx] ? shots[selectedShotIdx] : null;
  const videoSrc = resolveVideoUrl(data?.match.video_url);

  const syncSelectedShotToTime = (t: number) => {
    if (shots.length === 0) return;
    const idx = shots.findIndex(
      (s) =>
        t >= s.timestamp_start - 0.3 &&
        t <= (s.timestamp_end || s.timestamp_start + 3.5)
    );
    if (idx >= 0 && idx !== selectedShotIdx) {
      setSelectedShotIdx(idx);
    }
  };

  const handleSelectShot = (index: number) => {
    setSelectedShotIdx(index);
    const shot = shots[index];
    if (!shot) return;
    setCurrentTime(shot.timestamp_start);
    if (!useCanvasBroadcast && videoRef.current) {
      videoRef.current.currentTime = shot.timestamp_start;
    }
  };

  const handleReplayShot = (shot: ShotItem) => {
    setCurrentTime(shot.timestamp_start);
    if (!useCanvasBroadcast && videoRef.current) {
      videoRef.current.currentTime = shot.timestamp_start;
      videoRef.current.play().catch(() => {
        setUseCanvasBroadcast(true);
        setIsPlaying(true);
      });
    } else {
      setIsPlaying(true);
    }
  };

  const togglePlay = () => {
    if (!useCanvasBroadcast && videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play().catch(() => {
          setUseCanvasBroadcast(true);
          setIsPlaying(true);
        });
      } else {
        videoRef.current.pause();
      }
    } else {
      setIsPlaying((p) => !p);
    }
  };

  const changeSpeed = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  };

  const handleFullscreen = () => {
    if (playerContainerRef.current?.requestFullscreen) {
      playerContainerRef.current.requestFullscreen();
    } else if (videoRef.current?.requestFullscreen) {
      videoRef.current.requestFullscreen();
    }
  };

  if (loading) {
    return (
      <div className="max-w-[1440px] mx-auto px-6 py-24 text-center space-y-4">
        <div className="w-10 h-10 rounded-full border-2 border-[#00F0FF] border-t-transparent animate-spin mx-auto" />
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#00F0FF]">
          SYNCHRONIZING CINEMATIC MATCH TELEMETRY...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-xl mx-auto px-6 py-24 text-center space-y-5">
        <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
        <h2 className="text-2xl font-light text-white">Analysis Workspace Unavailable</h2>
        <p className="text-xs text-[#94A3B8]">{error}</p>
        <div className="flex justify-center gap-3">
          <Link href="/analysis?sample=true" className="btn-cue-primary text-xs">
            Load Sample Benchmark
          </Link>
          <Link href="/upload" className="btn-cue-secondary text-xs">
            Upload Match Video
          </Link>
        </div>
      </div>
    );
  }

  const { match, report } = data;

  return (
    <main className="max-w-[1440px] mx-auto px-4 sm:px-8 py-6 space-y-6">
      {/* Top Broadcast Status & Capability Banner */}
      <div className="glass-panel rounded-2xl px-5 py-4 border border-white/[0.08] flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="kicker-label">Cinematic Match Analysis</span>
            {match.is_sample ? (
              <span className="px-2.5 py-0.5 rounded-full font-mono text-[10px] uppercase bg-amber-500/15 text-amber-300 border border-amber-400/35">
                Sample Benchmark Dataset
              </span>
            ) : match.detection_mode === 'cv_motion_only' ? (
              <span className="px-2.5 py-0.5 rounded-full font-mono text-[10px] uppercase bg-sky-500/15 text-sky-300 border border-sky-400/35">
                Motion Segmented (Baize Coverage: {match.table_coverage ?? 0}%)
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full font-mono text-[10px] uppercase bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/35">
                OpenCV Optical Tracked ({match.table_coverage ?? 100}% Baize Lock)
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-light text-white">
            {match.title || match.video_filename}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {!match.is_sample && (
            <Link
              href="/analysis?sample=true"
              className="px-3.5 py-2 rounded-xl text-xs font-mono uppercase bg-white/5 hover:bg-white/10 text-[#F8FAFC] border border-white/10 flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#00F0FF]" />
              Compare w/ Sample Benchmark
            </Link>
          )}
          <Link
            href={`/coach?matchId=${encodeURIComponent(match.id)}${
              activeShot ? `&shotNumber=${activeShot.shot_number}` : ''
            }`}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#00F0FF] text-[#030407] hover:bg-[#38BDF8] transition-all flex items-center gap-2"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            AI Coach Session
          </Link>
          <Link
            href="/upload"
            className="px-3.5 py-2 rounded-xl text-xs font-medium bg-white/5 hover:bg-white/10 text-white border border-white/10 flex items-center gap-1.5"
          >
            <UploadCloud className="w-3.5 h-3.5 text-[#00F0FF]" />
            Upload New
          </Link>
        </div>
      </div>

      {/* Capability Boundary Notice if low table coverage */}
      {match.detection_mode === 'cv_motion_only' && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-400/35 flex flex-wrap items-center justify-between gap-4 text-xs text-amber-100">
          <div className="flex items-start gap-3 max-w-3xl">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong className="text-amber-300">Optical Capability Boundary:</strong> This
              uploaded video had {match.table_coverage ?? 0}% green baize coverage (below the 14%
              threshold required for automated ball tracking). Cue IQ segmented real motion
              timestamps for video review without fabricating ball trajectories.
            </p>
          </div>
          <Link
            href="/analysis?sample=true"
            className="px-3.5 py-1.5 rounded-full font-mono text-[10px] uppercase bg-amber-400 text-black font-semibold hover:bg-amber-300"
          >
            Switch to Sample Match
          </Link>
        </div>
      )}

      {/* Primary Broadcast Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 Columns: Video Player + Interactive Timeline */}
        <div className="lg:col-span-7 space-y-5">
          {/* Video Player Card */}
          <div
            ref={playerContainerRef}
            className="glass-panel rounded-2xl overflow-hidden border border-white/[0.08]"
          >
            <div className="relative aspect-video bg-[#03050A] flex items-center justify-center">
              {!useCanvasBroadcast && videoSrc ? (
                <video
                  ref={videoRef}
                  src={videoSrc}
                  className="w-full h-full object-contain"
                  playsInline
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onError={() => setUseCanvasBroadcast(true)}
                  onLoadedMetadata={(e) => {
                    const dur = e.currentTarget.duration;
                    if (dur && isFinite(dur)) setDuration(dur);
                  }}
                  onTimeUpdate={(e) => {
                    const t = e.currentTarget.currentTime;
                    setCurrentTime(t);
                    if (isPlaying) syncSelectedShotToTime(t);
                  }}
                />
              ) : (
                <BroadcastVideoCanvas
                  shots={shots}
                  currentTime={currentTime}
                  duration={duration}
                  isPlaying={isPlaying}
                  playbackRate={playbackRate}
                  matchTitle={match.title || 'Championship Match Feed'}
                  isSample={match.is_sample}
                  onTimeUpdate={(t) => {
                    setCurrentTime(t);
                    if (isPlaying) syncSelectedShotToTime(t);
                  }}
                  onEnded={() => setIsPlaying(false)}
                />
              )}

              {/* Active Shot HUD Overlay */}
              {activeShot && (
                <div className="pointer-events-none absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                  <div className="px-3 py-1.5 rounded-lg bg-[#030407]/85 backdrop-blur-md border border-white/10 font-mono text-[11px] text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#00F0FF]" />
                    <span>SHOT #{activeShot.shot_number}</span>
                    <span className="text-[#94A3B8]">|</span>
                    <span className="text-[#00F0FF] uppercase">
                      {activeShot.shot_type?.replace('_', ' ')}
                    </span>
                  </div>

                  {match.is_sample && (
                    <div className="px-2.5 py-1 rounded-lg bg-[#030407]/85 backdrop-blur-md border border-amber-400/30 font-mono text-[10px] text-amber-300 uppercase">
                      Sample Broadcast Feed
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Video Transport Controls Bar */}
            <div className="p-3.5 sm:px-5 bg-[#070A12] border-t border-white/[0.07] space-y-2.5">
              {/* Scrubber slider */}
              <input
                type="range"
                min={0}
                max={Math.max(1, duration)}
                step={0.1}
                value={Math.min(currentTime, duration)}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setCurrentTime(val);
                  syncSelectedShotToTime(val);
                  if (!useCanvasBroadcast && videoRef.current) {
                    videoRef.current.currentTime = val;
                  }
                }}
                className="w-full accent-[#00F0FF] h-1.5 bg-white/10 rounded-lg cursor-pointer"
              />

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="w-9 h-9 rounded-xl bg-[#00F0FF] text-[#030407] flex items-center justify-center hover:bg-[#38BDF8] transition-all"
                    aria-label={isPlaying ? 'Pause video' : 'Play video'}
                  >
                    {isPlaying ? (
                      <Pause className="w-4 h-4 fill-current" />
                    ) : (
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    )}
                  </button>

                  {activeShot && (
                    <button
                      type="button"
                      onClick={() => handleReplayShot(activeShot)}
                      className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-mono text-[#F8FAFC] border border-white/10 flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-[#00F0FF]" />
                      Replay Shot #{activeShot.shot_number}
                    </button>
                  )}

                  <span className="font-mono text-xs text-[#94A3B8] ml-1">
                    <strong className="text-white">{formatClock(currentTime)}</strong> /{' '}
                    {formatClock(duration)}
                  </span>
                </div>

                {/* Playback Speed & Fullscreen */}
                <div className="flex items-center gap-1.5">
                  {[0.5, 1, 1.5, 2].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => changeSpeed(rate)}
                      className={`px-2 py-1 rounded-md font-mono text-[11px] transition-all ${
                        playbackRate === rate
                          ? 'bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/40 font-semibold'
                          : 'text-[#94A3B8] hover:text-white bg-white/[0.03]'
                      }`}
                    >
                      {rate}x
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={handleFullscreen}
                    className="p-1.5 rounded-lg text-[#94A3B8] hover:text-white hover:bg-white/10 ml-1"
                    title="Fullscreen"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Timeline */}
          <ShotTimeline
            shots={shots}
            selectedShotIndex={selectedShotIdx}
            onShotSelect={handleSelectShot}
            currentTime={currentTime}
            duration={duration}
          />
        </div>

        {/* Right 5 Columns: Interactive Snooker Table + Shot Intelligence Detail */}
        <div className="lg:col-span-5 space-y-5">
          <SnookerTable
            shots={shots}
            selectedShotIndex={selectedShotIdx}
            onShotSelect={handleSelectShot}
          />

          <ShotDetail
            shot={activeShot}
            matchId={match.id}
            onReplayShot={handleReplayShot}
          />
        </div>
      </div>

      {/* Match Intelligence Report Dossier */}
      {report && <MatchReport report={report} isSample={match.is_sample} />}
    </main>
  );
}

export default function AnalysisPage() {
  return (
    <div className="min-h-screen bg-[#030407] text-[#F8FAFC]">
      <Navigation />
      <Suspense
        fallback={
          <div className="p-16 text-center font-mono text-xs text-[#94A3B8]">
            INITIALIZING ANALYSIS WORKSPACE...
          </div>
        }
      >
        <AnalysisWorkspaceContent />
      </Suspense>
    </div>
  );
}
