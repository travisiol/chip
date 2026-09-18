"use client";

import { Environment, Lightformer } from "@react-three/drei";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { clearHoverCycle, setHoverCycle, stackInput, stackDrag } from "@/lib/chip/signals";
import { useInView, useLowQuality, usePrefersReducedMotion } from "@/lib/hooks";
import { useChip } from "@/lib/store/chip";
import type { Execution } from "@/types/cycle";

/**
 * The reserve as a stack of wafers: one polished silicon disc per completed
 * cycle, the newest on top. A new execution drops its wafer onto the stack
 * with a green edge that cools over a few seconds. Hover a wafer (or a row of
 * the list) and it lifts and lights.
 */
const R = 0.95;
const H = 0.04;
const GAP = 0.085;
const PITCH = H + GAP;
export const MAX_WAFERS = 40;
/** A stack is never perfectly aligned: each wafer sits a hair off-centre and turned, deterministically. */
const jitter = (i: number) => {
  const a = Math.sin(i * 12.9898) * 43758.5453;
  const b = Math.sin(i * 78.233) * 43758.5453;
  return { x: ((a - Math.floor(a)) - 0.5) * 0.05, z: ((b - Math.floor(b)) - 0.5) * 0.05, rot: (a - Math.floor(a)) * Math.PI };
};

export interface WaferHover {
  cycle: number;
  x: number;
  y: number;
}

function CameraRig({ count }: { count: number }) {
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    const top = Math.max(8, count) * PITCH;
    const dist = 3.4 + top * 0.5;
    camera.position.set(dist * 0.85, top * 0.75 + 2.2, dist);
    camera.lookAt(0, top * 0.45, 0);
    camera.updateProjectionMatrix();
  }, [camera, count]);
  return null;
}

/** Four seconds of green edge for a wafer that just landed. Module level: the React Compiler forbids impure calls in components. */
const litStamp = () => Date.now() + 4000;

function Wafer({ execution, index, dropIn, onHover, onLeave, litUntil }: { execution: Execution; index: number; dropIn: boolean; onHover: (e: ThreeEvent<PointerEvent>) => void; onLeave: () => void; litUntil: number }) {
  const mesh = useRef<THREE.Mesh>(null);
  const edgeMesh = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.MeshPhysicalMaterial>(null);
  const edge = useRef<THREE.MeshStandardMaterial>(null);
  const anim = useRef({ y: index * PITCH + (dropIn ? 1.6 : 0), lift: 0 });
  const target = index * PITCH;

  useFrame((st, dt) => {
    const step = Math.min(dt, 0.05);
    const a = anim.current;
    const hovered = stackInput.hoverCycle === execution.cycle;
    a.y += (target - a.y) * (1 - Math.exp(-step * 5));
    a.lift += ((hovered ? 0.06 : 0) - a.lift) * (1 - Math.exp(-step * 8));
    const hot = Math.max(0, Math.min(1, (litUntil - Date.now()) / 4000));
    if (mesh.current) mesh.current.position.y = a.y + a.lift;
    if (edgeMesh.current) edgeMesh.current.position.y = a.y + a.lift;
    if (edge.current) {
      edge.current.emissiveIntensity = hot * 1.8 + (hovered ? 1.2 : 0);
      edge.current.color.set(hovered || hot > 0 ? "#B7FF39" : "#3a4347");
    }
    if (mat.current) mat.current.envMapIntensity = 1.3 + (hovered ? 0.6 : 0) + Math.sin(st.clock.elapsedTime * 0.7 + index) * 0.05;
  });

  const j = jitter(index);
  return (
    <group position={[j.x, 0, j.z]} rotation-y={j.rot}>
      <mesh ref={mesh} position-y={target} onPointerMove={onHover} onPointerOut={onLeave}>
        <cylinderGeometry args={[R, R, H, 72]} />
        <meshPhysicalMaterial ref={mat} color="#b4bcc1" metalness={0.72} roughness={0.3} clearcoat={0.8} clearcoatRoughness={0.12} envMapIntensity={1.3} iridescence={0.35} iridescenceIOR={1.4} />
      </mesh>
      {/* The wafer flat: a small notch on the rim, the way real wafers are keyed. */}
      <mesh position={[R - 0.02, target, 0]}>
        <boxGeometry args={[0.06, H + 0.002, 0.28]} />
        <meshPhysicalMaterial color="#0f1315" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* The edge ring: green when new or hovered. */}
      <mesh ref={edgeMesh} position-y={target} rotation-x={Math.PI / 2}>
        <torusGeometry args={[R + 0.004, 0.012, 8, 72]} />
        <meshStandardMaterial ref={edge} color="#4a545a" emissive="#B7FF39" emissiveIntensity={0} metalness={0.6} roughness={0.4} />
      </mesh>
    </group>
  );
}

function Base({ hidden }: { hidden: number }) {
  if (hidden <= 0) return null;
  return (
    <mesh position-y={-0.2}>
      <cylinderGeometry args={[R + 0.06, R + 0.1, 0.32, 72]} />
      <meshPhysicalMaterial color="#0f1315" metalness={0.5} roughness={0.35} clearcoat={0.5} />
    </mesh>
  );
}

function Stack({ onHover, onLeave }: { onHover: (h: WaferHover | null) => void; onLeave: () => void }) {
  const executions = useChip((s) => s.executions);
  const group = useRef<THREE.Group>(null);
  const [litUntil, setLitUntil] = useState(0);
  // Wafers present at mount sit in place; the ones that arrive later drop in.
  const [initialIds] = useState(() => new Set(executions.map((e) => e.id)));
  const seen = useRef<number>(-1);
  const gl = useThree((s) => s.gl);

  // Chronological, last MAX_WAFERS; the rest is the base.
  const visible = useMemo(() => [...executions].sort((a, b) => a.at - b.at).slice(-MAX_WAFERS), [executions]);
  const hidden = executions.length - visible.length;

  useEffect(() => {
    if (seen.current === -1) {
      seen.current = executions.length;
      return;
    }
    if (executions.length > seen.current) {
      seen.current = executions.length;
      // The newest wafer lights for four seconds after it lands.
      window.setTimeout(() => setLitUntil(litStamp()), 0);
    }
  }, [executions.length]);

  useFrame((st, dt) => {
    const step = Math.min(dt, 0.05);
    if (group.current) {
      const targetYaw = stackInput.active ? stackInput.yaw : stackInput.yaw + Math.sin(st.clock.elapsedTime * 0.12) * 0.15;
      group.current.rotation.y += (targetYaw - group.current.rotation.y) * (1 - Math.exp(-step * 4));
    }
  });

  const newestId = visible[visible.length - 1]?.id;

  return (
    <group ref={group}>
      <Base hidden={hidden} />
      {visible.map((e, i) => (
        <Wafer
          key={e.id}
          execution={e}
          index={i}
          dropIn={!initialIds.has(e.id)}
          litUntil={e.id === newestId ? litUntil : 0}
          onHover={(ev) => {
            ev.stopPropagation();
            setHoverCycle(e.cycle);
            const rect = gl.domElement.getBoundingClientRect();
            onHover({ cycle: e.cycle, x: ev.clientX - rect.left, y: ev.clientY - rect.top });
          }}
          onLeave={() => {
            clearHoverCycle(e.cycle);
            onLeave();
          }}
        />
      ))}
      <CameraRig count={visible.length} />
    </group>
  );
}

function Studio() {
  return (
    <Environment resolution={256} frames={1}>
      {/* Bands behind the camera, so the disc faces have something to mirror. */}
      <Lightformer form="rect" intensity={1.2} color="#ffffff" position={[0, 3, 9]} target={[0, 0, 0]} scale={[16, 1.2, 1]} />
      <Lightformer form="rect" intensity={0.5} color="#c3c7cd" position={[0, 1, 9]} target={[0, 0, 0]} scale={[16, 0.6, 1]} />
      <Lightformer form="rect" intensity={0.9} color="#e8eaee" position={[0, 5, 8]} target={[0, 0, 0]} scale={[16, 1.6, 1]} />
      <Lightformer form="rect" intensity={1.5} color="#ffffff" position={[0, 7, 3]} target={[0, 0, 0]} scale={[12, 4, 1]} />
      <Lightformer form="rect" intensity={0.9} color="#eef1f3" position={[4, 6, 6]} target={[0, 0, 0]} scale={[6, 2, 1]} />
      <Lightformer form="rect" intensity={0.8} color="#e6e8ec" position={[-6, 2, 3]} target={[0, 0, 0]} scale={[2, 8, 1]} />
      <Lightformer form="rect" intensity={0.6} color="#c3c7cd" position={[6, 1, 2]} target={[0, 0, 0]} scale={[2, 8, 1]} />
      <Lightformer form="rect" intensity={0.5} color="#b7ff39" position={[3, -2, 5]} target={[0, 0, 0]} scale={[1, 4, 1]} />
      <Lightformer form="rect" intensity={0.3} color="#ffffff" position={[0, 0.5, 9]} target={[0, 0, 0]} scale={[20, 12, 1]} />
    </Environment>
  );
}

export default function ReserveStack({ className = "", onHover }: { className?: string; onHover: (h: WaferHover | null) => void }) {
  const low = useLowQuality();
  const reduced = usePrefersReducedMotion();
  const [ref, inView] = useInView<HTMLDivElement>("120px");

  return (
    <div
      ref={ref}
      className={`relative cursor-grab active:cursor-grabbing ${className}`}
      onPointerDown={(e) => stackDrag.start(e.clientX)}
      onPointerMove={(e) => stackDrag.move(e.clientX)}
      onPointerUp={stackDrag.end}
      onPointerLeave={stackDrag.end}
    >
      <Canvas dpr={low ? 1 : [1, 1.6]} frameloop={reduced ? "demand" : inView ? "always" : "never"} gl={{ antialias: true, alpha: true, powerPreference: "high-performance", stencil: false }} camera={{ position: [3, 2.5, 3.6], fov: 28, near: 0.1, far: 50 }} style={{ background: "transparent" }}>
        <Studio />
        <Stack onHover={onHover} onLeave={() => onHover(null)} />
        <directionalLight color="#ffffff" intensity={1.6} position={[3, 6, 4]} />
        <directionalLight color="#dfe6ea" intensity={0.5} position={[-4, 3, -2]} />
        <pointLight color="#ffffff" intensity={1.2} position={[2, 4, 3]} distance={14} decay={2} />
      </Canvas>
    </div>
  );
}
