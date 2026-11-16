'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  BarChart3,
  Clock,
  Compass,
  Menu,
  MessageSquare,
  PlayCircle,
  UploadCloud,
  X,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Command Center', icon: Compass },
  { href: '/upload', label: 'Match Upload', icon: UploadCloud },
  { href: '/analysis?sample=true', matchPrefix: '/analysis', label: 'Match Analysis', icon: PlayCircle },
  { href: '/coach', label: 'AI Coach', icon: MessageSquare },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/history', label: 'Match History', icon: Clock },
];

export default function Navigation() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full bg-[#030407]/85 backdrop-blur-2xl border-b border-white/[0.08]">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-4">
        {/* Futuristic Hardware Brand Wordmark */}
        <div className="flex items-center gap-4">
          <Link href="/" className="group flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00F0FF] opacity-65" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#00F0FF] shadow-[0_0_12px_#00F0FF]" />
            </span>
            <span className="text-base tracking-[0.22em] font-light text-white">
              CUE <strong className="font-semibold text-[#00F0FF]">IQ</strong>
            </span>
          </Link>
          <span className="hidden md:inline-block h-3.5 w-[1px] bg-white/10" />
          <span className="hidden md:inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.2em] uppercase text-slate-400">
            <Activity className="w-3 h-3 text-[#00F0FF]" />
            SYS.OPTIC // v2.4
          </span>
        </div>

        {/* Desktop Links */}
        <nav className="hidden lg:flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const prefix = item.matchPrefix || item.href;
            const isActive =
              pathname === prefix || (prefix !== '/' && pathname?.startsWith(prefix));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative px-3.5 py-1.5 rounded-full text-xs font-medium tracking-wide transition-all flex items-center gap-2 ${
                  isActive
                    ? 'text-white bg-cyan-400/10 border border-cyan-400/40 shadow-[0_0_20px_rgba(0,240,255,0.15)]'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 ${
                    isActive ? 'text-[#00F0FF]' : 'text-slate-400'
                  }`}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Quick CTA */}
        <div className="hidden sm:flex items-center gap-3">
          <Link
            href="/upload"
            className="px-4 py-1.5 rounded-full text-xs font-semibold bg-white text-[#030407] hover:bg-[#00F0FF] transition-all shadow-[0_0_20px_rgba(0,240,255,0.25)]"
          >
            Analyze Match
          </Link>
        </div>

        {/* Mobile menu button */}
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
          aria-label="Toggle navigation menu"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Overlay Navigation */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-white/10 bg-[#05070E]/95 backdrop-blur-2xl px-6 py-5 space-y-2">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const prefix = item.matchPrefix || item.href;
            const isActive =
              pathname === prefix || (prefix !== '/' && pathname?.startsWith(prefix));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium ${
                  isActive
                    ? 'bg-cyan-400/15 text-white border border-cyan-400/35'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4 text-[#00F0FF]" />
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
