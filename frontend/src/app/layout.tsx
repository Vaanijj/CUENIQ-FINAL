import type { Metadata } from 'next';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'CUE IQ — Spatial Snooker Telemetry & Optical Intelligence',
  description:
    'See the game differently. Your game. Every decision. Every shot. Understood. Spatial computer-vision snooker match analysis and tactical coaching.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#030407] text-[#F8FAFC] antialiased selection:bg-[#00F0FF]/30 selection:text-white">
        <div className="relative min-h-screen flex flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
