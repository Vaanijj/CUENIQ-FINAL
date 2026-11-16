'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/ui/Navigation';
import IntelligenceOrb from '@/components/orb/IntelligenceOrb';
import { ORB_STATES } from '@/lib/constants';
import { api, type MatchItem } from '@/lib/api';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  FileVideo,
  Play,
  Sparkles,
  UploadCloud,
  X,
} from 'lucide-react';

const ALLOWED_EXTS = ['.mp4', '.mov', '.webm', '.avi', '.mkv'];

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const [phase, setPhase] = useState<
    'idle' | 'uploading' | 'processing' | 'complete' | 'error'
  >('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStage, setProcessingStage] = useState('Initializing optical pipeline...');
  const [uploadedMatch, setUploadedMatch] = useState<MatchItem | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const validateAndSelectFile = (selected: File) => {
    setErrorMessage(null);
    const ext = selected.name.slice(selected.name.lastIndexOf('.')).toLowerCase();
    if (!ALLOWED_EXTS.includes(ext)) {
      setErrorMessage(
        `Unsupported file format (${ext}). Please select an MP4, MOV, WEBM, AVI, or MKV video.`
      );
      return;
    }
    if (selected.size > 500 * 1024 * 1024) {
      setErrorMessage('File exceeds the 500 MB maximum size limit.');
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
    if (!title) {
      setTitle(selected.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) validateAndSelectFile(dropped);
  };

  const handleStartUpload = async () => {
    if (!file) return;
    setErrorMessage(null);
    setPhase('uploading');
    setUploadProgress(0);

    try {
      const match = await api.matches.upload(
        file,
        title.trim() || file.name,
        description.trim() || undefined,
        (pct) => setUploadProgress(pct)
      );
      setUploadedMatch(match);
      setPhase('processing');
      setProcessingProgress(10);
      setProcessingStage(match.processing_stage || 'Extracting video frames...');
    } catch (err: any) {
      setPhase('error');
      setErrorMessage(err?.message || 'Failed to upload match video to backend.');
    }
  };

  // Poll processing status until analyzed or error
  useEffect(() => {
    if (phase !== 'processing' || !uploadedMatch) return;
    let active = true;

    const timer = setInterval(async () => {
      try {
        const statusRes = await api.matches.getStatus(uploadedMatch.id);
        if (!active) return;
        setProcessingProgress(statusRes.progress || 0);
        if (statusRes.stage) setProcessingStage(statusRes.stage);

        if (statusRes.status === 'analyzed') {
          clearInterval(timer);
          setProcessingProgress(100);
          setPhase('complete');
        } else if (statusRes.status === 'error') {
          clearInterval(timer);
          setPhase('error');
          setErrorMessage(statusRes.error || 'Video processing encountered an error.');
        }
      } catch {
        // retry on next interval
      }
    }, 900);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [phase, uploadedMatch]);

  const currentOrbState =
    phase === 'uploading'
      ? ORB_STATES.UPLOAD
      : phase === 'processing'
      ? ORB_STATES.ANALYZING
      : phase === 'complete'
      ? ORB_STATES.COMPLETE
      : file
      ? ORB_STATES.HOVER
      : ORB_STATES.IDLE;

  return (
    <div className="min-h-screen bg-[#030407] text-[#F8FAFC]">
      <Navigation />

      <main className="max-w-[1280px] mx-auto px-4 sm:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Left Column: Intelligence Orb & Pipeline Telemetry */}
          <div className="lg:col-span-5 glass-panel rounded-3xl p-8 border border-white/[0.08] flex flex-col items-center text-center space-y-6">
            <span className="kicker-label">Optical Ingest Pipeline</span>
            <h1 className="text-2xl sm:text-3xl font-light text-white">
              Match Footage Analysis
            </h1>
            <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed">
              Cue IQ inspects your video stream using OpenCV to verify green baize coverage,
              segment shot motion windows, and track ball trajectories.
            </p>

            <div className="py-4">
              <IntelligenceOrb state={currentOrbState} size="md" showStateBadge />
            </div>

            <div className="w-full pt-6 border-t border-white/[0.07] text-left space-y-2.5 text-xs text-[#94A3B8]">
              <div className="font-mono text-[10px] uppercase tracking-widest text-[#00F0FF]">
                Capability Boundary Guarantee
              </div>
              <p className="leading-relaxed">
                • Fixed overhead or broadcast-angle snooker footage unlocks full HSV ball & pocket
                trajectory tracking.
              </p>
              <p className="leading-relaxed">
                • Non-snooker or obstructed angles are segmented by motion energy without
                fabricating synthetic ball coordinates.
              </p>
            </div>
          </div>

          {/* Right Column: Upload Dropzone, Preview & Progress */}
          <div className="lg:col-span-7 glass-panel rounded-3xl p-6 sm:p-8 border border-white/[0.08] space-y-6">
            {errorMessage && (
              <div className="p-4 rounded-2xl bg-red-500/10 border border-red-400/35 flex items-start gap-3 text-xs text-red-200">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-semibold text-red-300 mb-0.5">Upload / Analysis Notice</div>
                  {errorMessage}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage(null);
                    if (phase === 'error') setPhase('idle');
                  }}
                  className="text-red-300 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {phase === 'idle' && (
              <>
                {/* Dropzone */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 sm:p-12 text-center transition-all ${
                    isDragging
                      ? 'border-[#00F0FF] bg-[#00F0FF]/10'
                      : 'border-white/15 hover:border-[#00F0FF]/50 bg-white/[0.02]'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".mp4,.mov,.webm,.avi,.mkv,video/mp4,video/quicktime,video/webm"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) validateAndSelectFile(f);
                    }}
                  />
                  <div className="w-14 h-14 rounded-2xl bg-[#00F0FF]/15 border border-[#00F0FF]/35 flex items-center justify-center mx-auto mb-4">
                    <UploadCloud className="w-7 h-7 text-[#00F0FF]" />
                  </div>
                  <h2 className="text-lg font-medium text-white">
                    Drag & drop your snooker match video
                  </h2>
                  <p className="text-xs text-[#94A3B8] mt-1">
                    Supports MP4, MOV, WEBM, AVI, MKV (up to 500 MB) · Click to browse files
                  </p>
                </div>

                {/* Selected Video Preview & Metadata Inputs */}
                {file && (
                  <div className="space-y-5 pt-2">
                    <div className="p-4 rounded-2xl bg-[#070A12] border border-white/10 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <FileVideo className="w-5 h-5 text-[#00F0FF] flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-white truncate">{file.name}</p>
                            <p className="text-xs font-mono text-[#94A3B8]">
                              {formatBytes(file.size)} · Ready for ingest
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setFile(null);
                            if (previewUrl) URL.revokeObjectURL(previewUrl);
                            setPreviewUrl(null);
                          }}
                          className="text-xs text-[#94A3B8] hover:text-white px-2.5 py-1 rounded-lg bg-white/5"
                        >
                          Change File
                        </button>
                      </div>

                      {previewUrl && (
                        <video
                          src={previewUrl}
                          controls
                          className="w-full max-h-56 rounded-xl bg-black border border-white/10"
                        />
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block font-mono text-[10px] uppercase tracking-wider text-[#94A3B8] mb-1.5">
                          Match Title
                        </label>
                        <input
                          type="text"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="e.g., Club Championship Semi-Final — Frame 2"
                          className="w-full px-4 py-2.5 rounded-xl bg-[#070A12] border border-white/10 text-sm text-white focus:outline-none focus:border-[#00F0FF]"
                        />
                      </div>

                      <div>
                        <label className="block font-mono text-[10px] uppercase tracking-wider text-[#94A3B8] mb-1.5">
                          Tactical Notes / Context (Optional)
                        </label>
                        <textarea
                          rows={2}
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="e.g., Focusing on long pot conversion and safety exchanges in baulk..."
                          className="w-full px-4 py-2.5 rounded-xl bg-[#070A12] border border-white/10 text-sm text-white focus:outline-none focus:border-[#00F0FF]"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleStartUpload}
                      className="btn-cue-primary w-full text-sm py-3.5"
                    >
                      Start Optical Match Analysis
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Quick Demo Option */}
                <div className="pt-4 border-t border-white/[0.07] flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
                    <Sparkles className="w-4 h-4 text-[#00F0FF]" />
                    <span>Don&apos;t have a match video on hand right now?</span>
                  </div>
                  <Link
                    href="/analysis?sample=true"
                    className="text-xs font-mono uppercase tracking-wider text-[#00F0FF] hover:underline flex items-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5" />
                    Explore Calibrated Sample Match
                  </Link>
                </div>
              </>
            )}

            {/* Uploading & Processing Telemetry View */}
            {(phase === 'uploading' || phase === 'processing') && (
              <div className="py-8 space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between font-mono text-xs">
                    <span className="text-[#00F0FF] uppercase tracking-wider">
                      {phase === 'uploading'
                        ? 'STAGE 1/2 · TRANSFERRING VIDEO STREAM'
                        : 'STAGE 2/2 · OPENCV OPTICAL ANALYSIS'}
                    </span>
                    <span className="text-white font-semibold">
                      {phase === 'uploading' ? `${uploadProgress}%` : `${processingProgress}%`}
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#00F0FF] to-[#38BDF8] transition-all duration-300"
                      style={{
                        width: `${
                          phase === 'uploading' ? uploadProgress : Math.max(12, processingProgress)
                        }%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-[#94A3B8] font-mono pt-1">{processingStage}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {[
                    { label: 'Frame Stream Extraction', threshold: 15 },
                    { label: 'Green Baize Table Lock', threshold: 40 },
                    { label: 'HSV Ball & Motion Tracking', threshold: 65 },
                    { label: 'Tactical Report Compilation', threshold: 90 },
                  ].map((step) => {
                    const done =
                      phase === 'processing' && processingProgress >= step.threshold;
                    return (
                      <div
                        key={step.label}
                        className={`p-3.5 rounded-xl border flex items-center gap-3 text-xs ${
                          done
                            ? 'bg-[#00F0FF]/10 border-[#00F0FF]/35 text-white'
                            : 'bg-white/[0.02] border-white/[0.06] text-[#94A3B8]'
                        }`}
                      >
                        <CheckCircle2
                          className={`w-4 h-4 ${
                            done ? 'text-[#00F0FF]' : 'text-white/20'
                          }`}
                        />
                        <span>{step.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Complete State */}
            {phase === 'complete' && uploadedMatch && (
              <div className="py-10 text-center space-y-6">
                <div className="w-14 h-14 rounded-full bg-[#00F0FF]/20 border border-[#00F0FF] flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7 text-[#00F0FF]" />
                </div>
                <div className="space-y-2">
                  <span className="kicker-label">Analysis Ready</span>
                  <h2 className="text-2xl font-light text-white">
                    {uploadedMatch.title || uploadedMatch.video_filename}
                  </h2>
                  <p className="text-xs text-[#94A3B8] max-w-md mx-auto">
                    Your match footage has been processed and stored. Transition into the Cinematic
                    Analysis Workspace to inspect timeline events and table trajectories.
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
                  <button
                    type="button"
                    onClick={() =>
                      router.push(`/analysis?id=${encodeURIComponent(uploadedMatch.id)}`)
                    }
                    className="btn-cue-primary text-sm"
                  >
                    Open Cinematic Analysis Workspace
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
