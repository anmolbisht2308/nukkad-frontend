"use client";
/* The render loop mutates three.js objects every frame (standard R3F), which the React Compiler lint forbids. */
/* eslint-disable react-hooks/immutability */

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

/* A stylised night-time city: instanced blocks, glowing roads, a river,
   pulsing pins for live trucks / events / openings, and trucks driving the grid. */

const GRID = 13; // blocks per side
const BLOCK = 2;
const ROAD = 0.7;
const CELL = BLOCK + ROAD;
const HALF = (GRID * CELL) / 2;

function rand(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

function Buildings({ low }: { low: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null!);
  const { count, matrices, colors } = useMemo(() => {
    const r = rand(7);
    const m: THREE.Matrix4[] = [];
    const c: THREE.Color[] = [];
    const per = low ? 2 : 4;
    const palette = ["#2a2a48", "#30305a", "#363660", "#3d3160", "#283c56"].map((x) => new THREE.Color(x));
    for (let gx = 0; gx < GRID; gx++)
      for (let gz = 0; gz < GRID; gz++) {
        const cx = gx * CELL - HALF + CELL / 2;
        const cz = gz * CELL - HALF + CELL / 2;
        // river cuts diagonally through the city; parks are left empty
        if (Math.abs(cx * 0.55 + cz + 4) < 2.2) continue;
        if ((gx === 6 && gz === 6) || (gx === 3 && gz === 9)) continue;
        const dist = Math.hypot(cx, cz) / HALF;
        for (let i = 0; i < per; i++) {
          const w = BLOCK / 2 - 0.08;
          const ox = (i % 2) * (BLOCK / 2) - BLOCK / 4;
          const oz = Math.floor(i / 2) * (BLOCK / 2) - BLOCK / 4;
          const h = 0.3 + Math.pow(r(), 2.2) * (3.4 - dist * 2.4) + (dist < 0.25 ? r() * 2 : 0);
          const mat = new THREE.Matrix4().compose(
            new THREE.Vector3(cx + (per === 4 ? ox : 0), h / 2, cz + (per === 4 ? oz : 0)),
            new THREE.Quaternion(),
            new THREE.Vector3(per === 4 ? w : BLOCK - 0.16, h, per === 4 ? w : BLOCK / 2 - 0.08)
          );
          m.push(mat);
          c.push(palette[Math.floor(r() * palette.length)]);
        }
      }
    return { count: m.length, matrices: m, colors: c };
  }, [low]);

  return (
    <instancedMesh
      ref={(mesh) => {
        if (!mesh) return;
        ref.current = mesh;
        matrices.forEach((m, i) => {
          mesh.setMatrixAt(i, m);
          mesh.setColorAt(i, colors[i]);
        });
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      }}
      args={[undefined, undefined, count]}
    >
      <boxGeometry />
      <meshStandardMaterial roughness={0.85} metalness={0.1} />
    </instancedMesh>
  );
}

/** Lit windows: tiny emissive dots scattered on building faces, as one Points cloud. */
function Windows({ low }: { low: boolean }) {
  const geo = useMemo(() => {
    const r = rand(42);
    const n = low ? 700 : 1800;
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const warm = [new THREE.Color("#ffd23f"), new THREE.Color("#ff9f43"), new THREE.Color("#fff1c1"), new THREE.Color("#4cc9f0")];
    for (let i = 0; i < n; i++) {
      const gx = Math.floor(r() * GRID), gz = Math.floor(r() * GRID);
      const cx = gx * CELL - HALF + CELL / 2, cz = gz * CELL - HALF + CELL / 2;
      if (Math.abs(cx * 0.55 + cz + 4) < 2.2) continue;
      const side = Math.floor(r() * 4);
      const off = BLOCK / 2 - 0.02;
      const t = (r() - 0.5) * (BLOCK - 0.3);
      pos[i * 3] = cx + (side === 0 ? off : side === 1 ? -off : t);
      pos[i * 3 + 1] = 0.15 + r() * 1.6;
      pos[i * 3 + 2] = cz + (side === 2 ? off : side === 3 ? -off : t);
      warm[Math.floor(r() * (r() > 0.85 ? 4 : 3))].toArray(col, i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return g;
  }, [low]);
  return (
    <points geometry={geo}>
      <pointsMaterial size={0.1} toneMapped={false} vertexColors transparent opacity={0.9} sizeAttenuation depthWrite={false} />
    </points>
  );
}

function Ground() {
  const roads = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pts: number[] = [];
    for (let i = 0; i <= GRID; i++) {
      const p = i * CELL - HALF;
      pts.push(-HALF, 0.01, p, HALF, 0.01, p, p, 0.01, -HALF, p, 0.01, HALF);
    }
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, []);
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[HALF * 4, HALF * 4]} />
        <meshStandardMaterial color="#0d0d16" roughness={1} />
      </mesh>
      <lineSegments geometry={roads}>
        <lineBasicMaterial color="#ff7a1a" transparent opacity={0.35} toneMapped={false} />
      </lineSegments>
      {/* river */}
      <mesh rotation-x={-Math.PI / 2} rotation-z={Math.atan2(1, 0.55) - Math.PI / 2} position={[-2.2, 0.02, -2.8]}>
        <planeGeometry args={[3.2, HALF * 3]} />
        <meshStandardMaterial color="#123a5c" emissive="#0b4f80" emissiveIntensity={0.6} roughness={0.2} metalness={0.4} />
      </mesh>
      {/* parks / turf */}
      {[
        [6, 6, "#1f7a3a"],
        [3, 9, "#2b9348"],
      ].map(([gx, gz, c], i) => (
        <mesh key={i} rotation-x={-Math.PI / 2} position={[(gx as number) * CELL - HALF + CELL / 2, 0.03, (gz as number) * CELL - HALF + CELL / 2]}>
          <planeGeometry args={[BLOCK, BLOCK]} />
          <meshStandardMaterial color={c as string} emissive={c as string} emissiveIntensity={0.35} />
        </mesh>
      ))}
    </group>
  );
}

type PinSpec = { pos: [number, number]; color: string; delay: number };

function Pin({ pos, color, delay }: PinSpec) {
  const head = useRef<THREE.Group>(null!);
  const ring = useRef<THREE.Mesh>(null!);
  const ringMat = useRef<THREE.MeshBasicMaterial>(null!);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime + delay;
    head.current.position.y = 1.9 + Math.sin(t * 2) * 0.15;
    head.current.rotation.y = t * 1.5;
    const k = (t * 0.7) % 1;
    ring.current.scale.setScalar(0.3 + k * 2.4);
    ringMat.current.opacity = (1 - k) * 0.8;
  });
  return (
    <group position={[pos[0], 0, pos[1]]}>
      <mesh position={[0, 0.95, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 1.9, 6]} />
        <meshBasicMaterial color={color} transparent opacity={0.7} toneMapped={false} />
      </mesh>
      <group ref={head}>
        <mesh>
          <octahedronGeometry args={[0.38, 0]} />
          <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>
        <pointLight color={color} intensity={6} distance={4} />
      </group>
      <mesh ref={ring} rotation-x={-Math.PI / 2} position={[0, 0.05, 0]}>
        <ringGeometry args={[0.8, 0.95, 40]} />
        <meshBasicMaterial ref={ringMat} color={color} transparent depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Little glowing trucks driving the road grid, turning at intersections. */
function Trucks({ n }: { n: number }) {
  const ref = useRef<THREE.InstancedMesh>(null!);
  const state = useMemo(() => {
    const r = rand(99);
    return Array.from({ length: n }, () => {
      const horizontal = r() > 0.5;
      const lane = Math.floor(r() * (GRID + 1)) * CELL - HALF;
      return { horizontal, lane, t: r() * HALF * 2 - HALF, speed: (0.8 + r() * 1.4) * (r() > 0.5 ? 1 : -1) };
    });
  }, [n]);
  const tmp = useMemo(() => new THREE.Object3D(), []);
  useFrame((_, dt) => {
    state.forEach((s, i) => {
      s.t += s.speed * dt;
      if (s.t > HALF) s.t = -HALF;
      if (s.t < -HALF) s.t = HALF;
      tmp.position.set(s.horizontal ? s.t : s.lane, 0.12, s.horizontal ? s.lane : s.t);
      tmp.rotation.y = s.horizontal ? 0 : Math.PI / 2;
      tmp.scale.set(0.42, 0.2, 0.2);
      tmp.updateMatrix();
      ref.current.setMatrixAt(i, tmp.matrix);
    });
    ref.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, n]}>
      <boxGeometry />
      <meshBasicMaterial color="#ffb347" toneMapped={false} />
    </instancedMesh>
  );
}

function Rig() {
  const { camera, pointer } = useThree();
  const look = useMemo(() => new THREE.Vector3(0, 0, 0), []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * 0.05;
    const r = 23;
    const tx = Math.sin(t + pointer.x * 0.25) * r;
    const tz = Math.cos(t + pointer.x * 0.25) * r;
    camera.position.x += (tx - camera.position.x) * 0.04;
    camera.position.z += (tz - camera.position.z) * 0.04;
    camera.position.y += (11 + pointer.y * 2.5 - camera.position.y) * 0.04;
    camera.lookAt(look);
  });
  return null;
}

const cellCenter = (gx: number, gz: number): [number, number] => [gx * CELL - HALF + CELL, gz * CELL - HALF + CELL];

export default function CityScene() {
  const low = typeof navigator !== "undefined" && (navigator.hardwareConcurrency ?? 8) <= 4;
  const pins: PinSpec[] = [
    { pos: cellCenter(4, 3), color: "#ff7a1a", delay: 0 },
    { pos: cellCenter(8, 5), color: "#ff7a1a", delay: 1.3 },
    { pos: cellCenter(2, 7), color: "#ff2e63", delay: 0.6 },
    { pos: cellCenter(9, 9), color: "#2ee6a6", delay: 2.1 },
    { pos: cellCenter(5, 10), color: "#4cc9f0", delay: 0.9 },
    { pos: cellCenter(10, 2), color: "#ffd23f", delay: 1.7 },
  ];
  return (
    <Canvas dpr={[1, low ? 1 : 1.75]} camera={{ position: [0, 40, 34], fov: 42, near: 0.5, far: 200 }} gl={{ antialias: !low, powerPreference: "high-performance" }}>
      <color attach="background" args={["#0b0b0f"]} />
      <fog attach="fog" args={["#0b0b0f", 28, 70]} />
      <ambientLight intensity={0.7} />
      <hemisphereLight args={["#6b5bff", "#ff7a1a", 0.5]} />
      <directionalLight position={[10, 20, 5]} intensity={0.8} color="#ffd9b0" />
      <Ground />
      <Buildings low={low} />
      <Windows low={low} />
      <Trucks n={low ? 14 : 28} />
      {pins.map((p, i) => (
        <Pin key={i} {...p} />
      ))}
      <Rig />
    </Canvas>
  );
}
