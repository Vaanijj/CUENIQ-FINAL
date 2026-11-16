'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navigation from '@/components/ui/Navigation';
import IntelligenceOrb from '@/components/orb/IntelligenceOrb';
import { ORB_STATES } from '@/lib/constants';
import { api, getStoredUser, type UserProfile } from '@/lib/api';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  KeyRound,
  LogOut,
  Mail,
  ShieldCheck,
  Sparkles,
  User,
} from 'lucide-react';

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [orbState, setOrbState] = useState<ORB_STATES>(ORB_STATES.IDLE);

  useEffect(() => {
    setCurrentUser(getStoredUser());
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setOrbState(ORB_STATES.ANALYZING);

    try {
      const res =
        mode === 'login'
          ? await api.auth.login(email, password)
          : await api.auth.register(email, password, displayName);
      setCurrentUser(res.user);
      setOrbState(ORB_STATES.COMPLETE);
      setTimeout(() => {
        router.push('/dashboard');
      }, 650);
    } catch (err: any) {
      setOrbState(ORB_STATES.IDLE);
      setError(err?.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSignIn = async () => {
    setError(null);
    setLoading(true);
    setOrbState(ORB_STATES.ANALYZING);
    try {
      const res = await api.auth.login('demo@cueiq.ai', 'cueiq2026');
      setCurrentUser(res.user);
      setOrbState(ORB_STATES.COMPLETE);
      setTimeout(() => {
        router.push('/dashboard');
      }, 500);
    } catch (err: any) {
      setOrbState(ORB_STATES.IDLE);
      setError(err?.message || 'Demo login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    api.auth.logout();
    setCurrentUser(null);
    setOrbState(ORB_STATES.IDLE);
  };

  return (
    <div className="min-h-screen bg-[#030407] text-[#F8FAFC]">
      <Navigation />

      <main className="max-w-[1280px] mx-auto px-4 sm:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Left 5 Columns: 3D Quantum Gyroscopic Core */}
          <div className="lg:col-span-5 glass-panel rounded-3xl p-8 border border-white/[0.08] flex flex-col items-center text-center space-y-6">
            <span className="kicker-label">SYS.AUTH // IDENTITY VERIFICATION</span>
            <h1 className="text-2xl sm:text-3xl font-light text-white">
              Cue IQ Telemetry Access
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Sign in with your email to synchronize match analyses, shot telemetry reports, and
              AI Coach history across sessions.
            </p>

            <div className="py-2">
              <IntelligenceOrb state={orbState} size="md" showStateBadge />
            </div>

            <div className="w-full pt-4 border-t border-white/[0.07] flex items-center justify-between font-mono text-[10px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#00F0FF]" />
                PBKDF2-SHA256 + JWT
              </span>
              <span className="text-[#00F0FF]">CLOUD DB SYNC</span>
            </div>
          </div>

          {/* Right 7 Columns: Email Auth Form */}
          <div className="lg:col-span-7 glass-panel rounded-3xl p-6 sm:p-10 border border-white/[0.08] space-y-6">
            {currentUser ? (
              <div className="py-8 text-center space-y-6">
                <div className="w-14 h-14 rounded-full bg-cyan-400/15 border border-[#00F0FF] flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7 text-[#00F0FF]" />
                </div>
                <div className="space-y-1.5">
                  <span className="kicker-label">Authenticated Session Active</span>
                  <h2 className="text-2xl font-light text-white">
                    {currentUser.display_name || currentUser.email}
                  </h2>
                  <p className="font-mono text-xs text-slate-400">{currentUser.email}</p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
                  <Link href="/dashboard" className="btn-cue-primary text-xs sm:text-sm">
                    Enter Command Center
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="btn-cue-secondary text-xs sm:text-sm"
                  >
                    <LogOut className="w-4 h-4 text-rose-400" />
                    Sign Out
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Mode Switcher Tabs */}
                <div className="flex items-center gap-2 p-1 rounded-2xl bg-[#060912] border border-white/10 w-fit">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setError(null);
                    }}
                    className={`px-5 py-2 rounded-xl text-xs font-mono uppercase tracking-wider transition-all ${
                      mode === 'login'
                        ? 'bg-white text-[#030407] font-semibold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Sign In with Email
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('register');
                      setError(null);
                    }}
                    className={`px-5 py-2 rounded-xl text-xs font-mono uppercase tracking-wider transition-all ${
                      mode === 'register'
                        ? 'bg-white text-[#030407] font-semibold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Create Account
                  </button>
                </div>

                <div className="space-y-1">
                  <h2 className="text-2xl font-light text-white">
                    {mode === 'login'
                      ? 'Sign in to your Cue IQ account'
                      : 'Create your Cue IQ Analyst profile'}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {mode === 'login'
                      ? 'Enter your registered email and password below, or launch with our instant demo account.'
                      : 'Register with your email to store your match analyses and coaching telemetry.'}
                  </p>
                </div>

                {error && (
                  <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-400/35 flex items-center gap-3 text-xs text-rose-200">
                    <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {mode === 'register' && (
                    <div>
                      <label className="block font-mono text-[10px] uppercase tracking-wider text-slate-400 mb-1.5">
                        Player / Analyst Display Name
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          onFocus={() => setOrbState(ORB_STATES.HOVER)}
                          placeholder="e.g., Ronnie O."
                          className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#070A12] border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00F0FF]"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block font-mono text-[10px] uppercase tracking-wider text-slate-400 mb-1.5">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onFocus={() => setOrbState(ORB_STATES.HOVER)}
                        placeholder="you@example.com"
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#070A12] border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00F0FF]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-mono text-[10px] uppercase tracking-wider text-slate-400 mb-1.5">
                      Password
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        required
                        minLength={4}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onFocus={() => setOrbState(ORB_STATES.HOVER)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#070A12] border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00F0FF]"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-cue-primary w-full py-3.5 text-sm disabled:opacity-50"
                  >
                    {loading
                      ? 'Verifying Credentials...'
                      : mode === 'login'
                      ? 'Sign In with Email'
                      : 'Create Account & Continue'}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>

                {/* Instant Demo Account Sign-In */}
                <div className="pt-5 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Sparkles className="w-4 h-4 text-[#00F0FF]" />
                    <span>Want instant access without typing?</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleDemoSignIn}
                    disabled={loading}
                    className="px-4 py-2 rounded-full text-xs font-mono uppercase tracking-wider bg-cyan-400/10 hover:bg-cyan-400/20 text-[#00F0FF] border border-cyan-400/35 transition-all"
                  >
                    One-Click Demo Email Sign-In (demo@cueiq.ai)
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
