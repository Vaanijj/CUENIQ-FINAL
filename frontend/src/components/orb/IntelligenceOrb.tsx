'use client';

import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { vertexShader, fragmentShader } from './shaders';
import OrbParticles from './OrbParticles';
import { ORB_STATES, ORB_STATE_INDEX, ORB_STATE_LABELS } from '@/lib/constants';

interface OrbSceneProps {
  stateIndex: number;
  isHovered: boolean;
  mousePos: { x: number; y: number };
  pulse: number;
}

function QuantumGyroCore({ stateIndex, isHovered, mousePos, pulse }: OrbSceneProps) {
  const coreMeshRef = useRef<THREE.Mesh>(null);
  const geodesicCageRef = useRef<THREE.Mesh>(null);
  const innerLatticeRef = useRef<THREE.Mesh>(null);
  const gimbal1Ref = useRef<THREE.Group>(null);
  const gimbal2Ref = useRef<THREE.Group>(null);
  const gimbal3Ref = useRef<THREE.Group>(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uState: { value: stateIndex },
      uHover: { value: 0 },
      uPulse: { value: 0 },
    }),
    []
  );

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime();
    uniforms.uTime.value = t;
    uniforms.uState.value = THREE.MathUtils.lerp(
      uniforms.uState.value,
      stateIndex,
      Math.min(1, delta * 3.5)
    );
    uniforms.uHover.value = THREE.MathUtils.lerp(
      uniforms.uHover.value,
      isHovered ? 1.0 : 0.0,
      Math.min(1, delta * 4.5)
    );
    uniforms.uPulse.value = THREE.MathUtils.lerp(
      uniforms.uPulse.value,
      pulse,
      Math.min(1, delta * 5.0)
    );
    uniforms.uMouse.value.x = THREE.MathUtils.lerp(
      uniforms.uMouse.value.x,
      mousePos.x,
      Math.min(1, delta * 6.0)
    );
    uniforms.uMouse.value.y = THREE.MathUtils.lerp(
      uniforms.uMouse.value.y,
      mousePos.y,
      Math.min(1, delta * 6.0)
    );

    const speedBoost = stateIndex === 3 ? 2.4 : stateIndex === 2 ? 1.7 : 1.0;

    if (coreMeshRef.current) {
      coreMeshRef.current.rotation.y += delta * 0.25 * speedBoost;
      coreMeshRef.current.rotation.x = THREE.MathUtils.lerp(
        coreMeshRef.current.rotation.x,
        mousePos.y * 0.35 + Math.sin(t * 0.6) * 0.1,
        Math.min(1, delta * 3.0)
      );
      coreMeshRef.current.position.y = Math.sin(t * 1.4) * 0.04;
    }

    if (geodesicCageRef.current) {
      geodesicCageRef.current.rotation.y = -t * 0.18 * speedBoost;
      geodesicCageRef.current.rotation.z = t * 0.12;
      const cageScale =
        1.26 + Math.sin(t * 2.0) * 0.025 + (isHovered ? 0.045 : 0);
      geodesicCageRef.current.scale.setScalar(cageScale);
    }

    if (innerLatticeRef.current) {
      innerLatticeRef.current.rotation.x = t * 0.4 * speedBoost;
      innerLatticeRef.current.rotation.y = t * 0.3 * speedBoost;
    }

    // 3-Axis Precision Gyroscopic Gimbal Rings
    if (gimbal1Ref.current) {
      gimbal1Ref.current.rotation.z = t * 0.38 * speedBoost;
      gimbal1Ref.current.rotation.x =
        Math.PI / 2.2 + mousePos.y * 0.28 + Math.sin(t * 0.7) * 0.12;
      gimbal1Ref.current.rotation.y = mousePos.x * 0.25;
    }

    if (gimbal2Ref.current) {
      gimbal2Ref.current.rotation.y = -t * 0.32 * speedBoost;
      gimbal2Ref.current.rotation.x =
        Math.PI / 3.4 - mousePos.y * 0.2 + Math.cos(t * 0.6) * 0.15;
    }

    if (gimbal3Ref.current) {
      gimbal3Ref.current.rotation.x = t * 0.22 * speedBoost;
      gimbal3Ref.current.rotation.z =
        -Math.PI / 4.0 + mousePos.x * 0.3 + Math.sin(t * 0.5) * 0.1;
    }
  });

  return (
    <group>
      <ambientLight intensity={0.6} />
      <pointLight position={[4, 4, 4]} intensity={2.8} color="#00F0FF" />
      <pointLight position={[-4, -3, -2]} intensity={2.2} color="#8B5CF6" />
      <pointLight position={[0, 3, -4]} intensity={1.5} color="#F8FAFC" />

      {/* 1. Innermost Quantum Singularity Lattice */}
      <mesh ref={innerLatticeRef}>
        <octahedronGeometry args={[0.58, 2]} />
        <meshBasicMaterial
          color="#00F0FF"
          wireframe
          transparent
          opacity={0.32}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* 2. Prismatic Ferrofluid / Liquid-Chrome Core */}
      <mesh ref={coreMeshRef}>
        <icosahedronGeometry args={[0.96, 64]} />
        <shaderMaterial
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms}
          transparent
        />
      </mesh>

      {/* 3. Faceted Crystalline Geodesic Exoskeleton */}
      <mesh ref={geodesicCageRef}>
        <icosahedronGeometry args={[1.0, 2]} />
        <meshBasicMaterial
          color={stateIndex === 3 ? '#00FFA3' : '#38BDF8'}
          wireframe
          transparent
          opacity={isHovered || stateIndex === 3 ? 0.26 : 0.13}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* 4. Gimbal Ring 1 — Primary Equatorial Telemetry Track + Satellite Nodes */}
      <group ref={gimbal1Ref}>
        <mesh>
          <torusGeometry args={[1.52, 0.0055, 16, 160]} />
          <meshBasicMaterial
            color="#00F0FF"
            transparent
            opacity={stateIndex === 3 ? 0.78 : 0.42}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
        {/* Satellite Optical Nodes on Gimbal 1 */}
        <mesh position={[1.52, 0, 0]}>
          <sphereGeometry args={[0.032, 16, 16]} />
          <meshBasicMaterial color="#FFFFFF" />
        </mesh>
        <mesh position={[-1.52, 0, 0]}>
          <sphereGeometry args={[0.024, 16, 16]} />
          <meshBasicMaterial color="#00F0FF" />
        </mesh>
      </group>

      {/* 5. Gimbal Ring 2 — Inclined Prismatic Violet Gyroscope */}
      <group ref={gimbal2Ref}>
        <mesh>
          <torusGeometry args={[1.72, 0.004, 16, 160]} />
          <meshBasicMaterial
            color="#8B5CF6"
            transparent
            opacity={stateIndex === 3 ? 0.65 : 0.32}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
        <mesh position={[0, 1.72, 0]}>
          <sphereGeometry args={[0.026, 16, 16]} />
          <meshBasicMaterial color="#8B5CF6" />
        </mesh>
      </group>

      {/* 6. Gimbal Ring 3 — Outer Titanium Calibrator Arc */}
      <group ref={gimbal3Ref}>
        <mesh>
          <torusGeometry args={[1.92, 0.003, 16, 160]} />
          <meshBasicMaterial
            color="#E2E8F0"
            transparent
            opacity={0.2}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      </group>

      {/* 7. Dual-Band Photon Accretion Disk & Spatial Field */}
      <OrbParticles stateIndex={stateIndex} />
    </group>
  );
}

export interface IntelligenceOrbProps {
  state?: ORB_STATES;
  size?: 'sm' | 'md' | 'lg' | 'hero';
  className?: string;
  interactive?: boolean;
  pulse?: number;
  showStateBadge?: boolean;
  onStateChange?: (newState: ORB_STATES) => void;
}

const SIZE_CLASSES: Record<'sm' | 'md' | 'lg' | 'hero', string> = {
  sm: 'w-36 h-36',
  md: 'w-64 h-64 md:w-72 md:h-72',
  lg: 'w-80 h-80 md:w-[440px] md:h-[440px]',
  hero: 'w-[340px] h-[340px] sm:w-[450px] sm:h-[450px] lg:w-[540px] lg:h-[540px]',
};

export default function IntelligenceOrb({
  state = ORB_STATES.IDLE,
  size = 'md',
  className = '',
  interactive = true,
  pulse = 0,
  showStateBadge = false,
  onStateChange,
}: IntelligenceOrbProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [reducedMotion, setReducedMotion] = useState(false);
  const [webglSupported, setWebglSupported] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);

    try {
      const canvas = document.createElement('canvas');
      const gl =
        canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) setWebglSupported(false);
    } catch {
      setWebglSupported(false);
    }

    return () => mq.removeEventListener('change', handler);
  }, []);

  const effectiveState =
    isHovered && state === ORB_STATES.IDLE ? ORB_STATES.HOVER : state;
  const stateIndex = ORB_STATE_INDEX[effectiveState] ?? 0;
  const stateMeta = ORB_STATE_LABELS[effectiveState];

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    setMousePos({ x: nx, y: ny });
  };

  return (
    <div
      ref={containerRef}
      onPointerEnter={() => interactive && setIsHovered(true)}
      onPointerLeave={() => {
        setIsHovered(false);
        setMousePos({ x: 0, y: 0 });
      }}
      onPointerMove={handlePointerMove}
      className={`relative select-none flex items-center justify-center ${SIZE_CLASSES[size]} ${className}`}
      aria-label={`Cue IQ Quantum Gyroscopic Core — ${stateMeta.title}`}
    >
      {/* Futuristic HUD Reticle Frame (for lg and hero sizes) */}
      {(size === 'hero' || size === 'lg') && (
        <div className="pointer-events-none absolute inset-3 border border-white/[0.05] rounded-full">
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 px-2 bg-[#030407] font-mono text-[9px] tracking-[0.25em] text-cyan-400/70">
            SYS.GYRO // 0{stateIndex + 1}
          </div>
          <div className="absolute top-1/2 -left-2 -translate-y-1/2 font-mono text-[8px] text-slate-500">
            +
          </div>
          <div className="absolute top-1/2 -right-2 -translate-y-1/2 font-mono text-[8px] text-slate-500">
            +
          </div>
        </div>
      )}

      {/* Prismatic Cyber-Cyan & Indigo Volumetric Backlight */}
      <div
        className="pointer-events-none absolute inset-6 rounded-full blur-3xl transition-opacity duration-700"
        style={{
          background:
            effectiveState === ORB_STATES.ANALYZING
              ? 'radial-gradient(circle, rgba(0,240,255,0.34) 0%, rgba(139,92,246,0.22) 48%, transparent 74%)'
              : 'radial-gradient(circle, rgba(0,240,255,0.20) 0%, rgba(99,102,241,0.14) 52%, transparent 75%)',
          opacity: isHovered ? 1 : 0.85,
        }}
      />

      {webglSupported && !reducedMotion ? (
        <Canvas
          camera={{ position: [0, 0, 4.1], fov: 44 }}
          dpr={[1, 2]}
          gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
          className="w-full h-full cursor-crosshair"
        >
          <QuantumGyroCore
            stateIndex={stateIndex}
            isHovered={isHovered}
            mousePos={mousePos}
            pulse={pulse}
          />
        </Canvas>
      ) : (
        <div className="relative w-3/4 h-3/4 rounded-full flex items-center justify-center border border-cyan-400/40 bg-gradient-to-br from-cyan-500/20 via-indigo-950/80 to-[#030407]">
          <div className="w-2/3 h-2/3 rounded-full border border-white/15" />
        </div>
      )}

      {showStateBadge && (
        <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2.5 z-10 w-max max-w-full">
          <div className="px-4 py-1.5 rounded-full bg-[#070910]/90 backdrop-blur-xl flex items-center gap-2.5 border border-cyan-400/25 shadow-[0_0_25px_rgba(0,240,255,0.15)]">
            <span
              className={`w-2 h-2 rounded-full ${
                effectiveState === ORB_STATES.ANALYZING
                  ? 'bg-cyan-300 animate-ping'
                  : 'bg-cyan-400 shadow-[0_0_8px_#00F0FF]'
              }`}
            />
            <span className="font-mono text-[10px] tracking-[0.22em] text-slate-100 uppercase">
              {stateMeta.title}
            </span>
          </div>
          {onStateChange && (
            <div className="flex flex-wrap items-center justify-center gap-1.5 mt-0.5">
              {Object.values(ORB_STATES).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => onStateChange(st)}
                  className={`px-2.5 py-1 rounded-md font-mono text-[9px] tracking-[0.16em] uppercase transition-all border ${
                    state === st
                      ? 'bg-white text-[#030407] border-white font-semibold shadow-[0_0_15px_rgba(255,255,255,0.4)]'
                      : 'bg-[#080B12]/80 text-slate-400 border-white/10 hover:text-white hover:border-cyan-400/40'
                  }`}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
