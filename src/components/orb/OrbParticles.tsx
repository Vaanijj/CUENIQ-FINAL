'use client';

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface OrbParticlesProps {
  count?: number;
  stateIndex: number;
  radius?: number;
}

export default function OrbParticles({
  count = 220,
  stateIndex,
  radius = 2.25,
}: OrbParticlesProps) {
  const pointsRef = useRef<THREE.Points>(null);

  const { positions, colors, phases, speeds, radii, bands } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const ph = new Float32Array(count * 2);
    const sp = new Float32Array(count);
    const rad = new Float32Array(count);
    const bnd = new Float32Array(count);

    const cCyan = new THREE.Color('#00F0FF');
    const cViolet = new THREE.Color('#8B5CF6');
    const cWhite = new THREE.Color('#F8FAFC');

    for (let i = 0; i < count; i++) {
      // 65% in a tight equatorial accretion disk, 35% in a 3D orbital halo
      const isDisk = i < count * 0.65;
      const theta = Math.random() * Math.PI * 2;
      const phi = isDisk
        ? Math.PI * 0.5 + (Math.random() - 0.5) * 0.22
        : Math.acos(2 * Math.random() - 1);
      const r = isDisk
        ? radius * (0.78 + Math.random() * 0.35)
        : radius * (0.65 + Math.random() * 0.6);

      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.cos(phi);
      pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

      const pick = i % 3 === 0 ? cCyan : i % 3 === 1 ? cViolet : cWhite;
      col[i * 3] = pick.r;
      col[i * 3 + 1] = pick.g;
      col[i * 3 + 2] = pick.b;

      ph[i * 2] = theta;
      ph[i * 2 + 1] = phi;
      sp[i] = (isDisk ? 0.35 : 0.18) + Math.random() * 0.35;
      rad[i] = r;
      bnd[i] = isDisk ? 1.0 : 0.0;
    }

    return { positions: pos, colors: col, phases: ph, speeds: sp, radii: rad, bands: bnd };
  }, [count, radius]);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    const t = clock.getElapsedTime();
    const geom = pointsRef.current.geometry;
    const posAttr = geom.getAttribute('position') as THREE.BufferAttribute;

    const stateMultiplier =
      stateIndex === 3 ? 2.6 : stateIndex === 2 ? 1.8 : stateIndex === 5 ? 1.5 : 1.0;

    for (let i = 0; i < count; i++) {
      const speed = speeds[i] * stateMultiplier;
      const theta = phases[i * 2] + t * speed;
      const isDisk = bands[i] > 0.5;
      const phi = isDisk
        ? phases[i * 2 + 1] + Math.sin(t * 1.5 + i * 0.2) * 0.04
        : phases[i * 2 + 1] + Math.sin(t * 0.6 + i) * 0.15;
      const r = radii[i] + Math.sin(t * 1.8 + i * 0.5) * 0.05;

      posAttr.setXYZ(
        i,
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi),
        r * Math.sin(phi) * Math.sin(theta)
      );
    }

    posAttr.needsUpdate = true;
    pointsRef.current.rotation.z = Math.sin(t * 0.25) * 0.18;
    pointsRef.current.rotation.x = 0.28;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={colors.length / 3}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.032}
        vertexColors
        transparent
        opacity={stateIndex === 3 ? 0.9 : 0.68}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}
