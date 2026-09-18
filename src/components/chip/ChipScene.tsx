"use client";

import { Environment, Lightformer, RoundedBox } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { chipConfig } from "@/config/chip";
import { bindPointer, signals } from "@/lib/chip/signals";
import { buildTraceNetwork, pointAt } from "@/lib/chip/traces";
import { useInView, useLowQuality, usePrefersReducedMotion } from "@/lib/hooks";
import { getChip } from "@/lib/store/chip";
import { SEQUENCE } from "@/lib/chip/machine";
import { buildFrameGeometry, buildTraceGeometry, makeDieTexture, makeFadeTexture, makeGlowTexture, toWorld } from "./chipGeometry";
import { coreFragment, coreVertex, traceFragment, traceVertex } from "./chipShaders";

/**
 * The hero processor. An original semiconductor core: a dark ceramic
 * package with a brushed aluminum frame, micro pins on four edges, a
 * silicon die carrying the routed traces, and the core block in the middle.
 * Signals enter through the pins, ride the traces and converge on the core;
 * the execution leaves through the wide bus on the right. No bloom pass —
 * the glow is an additive pool and a point light over the core.
 */
const DIE = 1.35;
const FRAME_INNER = DIE + 0.06;
const FRAME_OUTER = 1.62;
const PIN_LEN = 0.22;
const CAM = { position: [0, 6.4, 7.5] as [number, number, number], fov: 26 };
const PACKETS = 18;
const REGION_INDEX: Record<NonNullable<typeof signals.region>, number> = { input: 1, processing: 2, core: 3, execution: 4, output: 5 };

type Quality = "high" | "low";

const dummy = new THREE.Object3D();

function Chip({ quality, hideGlow = false }: { quality: Quality; hideGlow?: boolean }) {
  const high = quality === "high";
  const group = useRef<THREE.Group>(null);
  const traceMat = useRef<THREE.ShaderMaterial>(null);
  const coreMat = useRef<THREE.ShaderMaterial>(null);
  const coreLight = useRef<THREE.PointLight>(null);
  const keyLight = useRef<THREE.PointLight>(null);
  const glowMat = useRef<THREE.MeshBasicMaterial>(null);
  const pins = useRef<THREE.InstancedMesh>(null);
  const vias = useRef<THREE.InstancedMesh>(null);
  const packets = useRef<THREE.InstancedMesh>(null);
  const packetMat = useRef<THREE.MeshBasicMaterial>(null);
  const vis = useRef({ power: 0, flash: 0, pulse: 0, exec: 0, speed: 1, yaw: 0, pitch: 0, scale: 1 });

  const net = useMemo(() => buildTraceNetwork({ pinsPerSide: high ? 9 : 6 }), [high]);

  const geo = useMemo(
    () => ({
      traces: buildTraceGeometry(net, DIE, 0.012, high ? 0.02 : 0.026),
      frame: buildFrameGeometry(FRAME_OUTER, FRAME_INNER, 0.05, 0.014),
      pin: new THREE.BoxGeometry(0.06, 0.05, PIN_LEN),
      via: new THREE.CylinderGeometry(0.02, 0.02, 0.01, high ? 10 : 6),
      packet: new THREE.BoxGeometry(0.024, 0.014, 0.085),
      die: makeDieTexture(high ? 1024 : 512),
      glow: makeGlowTexture(),
    }),
    [net, high],
  );

  useEffect(
    () => () => {
      geo.traces.dispose();
      geo.frame.dispose();
      geo.pin.dispose();
      geo.via.dispose();
      geo.packet.dispose();
      geo.die.dispose();
      geo.glow.dispose();
    },
    [geo],
  );

  const traceUniforms = useMemo(
    () => ({
      uPower: { value: 0 },
      uTime: { value: 0 },
      uFlash: { value: 0 },
      uExec: { value: 0 },
      uPulse: { value: 0 },
      uSpeed: { value: 1 },
      uRegion: { value: 0 },
      uDim: { value: new THREE.Color("#2b3236") },
      uDeep: { value: new THREE.Color("#1D6F32") },
      uEnergy: { value: new THREE.Color("#B7FF39") },
      uEnergy2: { value: new THREE.Color("#72FF7A") },
    }),
    [],
  );
  const coreUniforms = useMemo(
    () => ({
      uPower: { value: 0 },
      uTime: { value: 0 },
      uFlash: { value: 0 },
      uPulse: { value: 0 },
      uExec: { value: 0 },
      uEnergy: { value: new THREE.Color("#B7FF39") },
      uEnergy2: { value: new THREE.Color("#72FF7A") },
    }),
    [],
  );

  // Pins and vias never move: their instance matrices are written once.
  useEffect(() => {
    const pm = pins.current;
    if (pm) {
      net.pins.forEach((p, i) => {
        const [x, , z] = toWorld(p.at, DIE);
        const [dx, , dz] = toWorld(p.dir, 1);
        // Keep the along-edge coordinate of the pin, push it out from the die edge to the package edge.
        const out = FRAME_OUTER + PIN_LEN / 2 - 0.03 - DIE;
        dummy.position.set(x + dx * out, -0.03, z + dz * out);
        dummy.rotation.set(0, Math.atan2(dx, dz), 0);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        pm.setMatrixAt(i, dummy.matrix);
      });
      pm.count = net.pins.length;
      pm.instanceMatrix.needsUpdate = true;
    }
    const vm = vias.current;
    if (vm) {
      net.vias.forEach((v, i) => {
        const [x, y, z] = toWorld(v, DIE, 0.016);
        dummy.position.set(x, y, z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        vm.setMatrixAt(i, dummy.matrix);
      });
      vm.count = net.vias.length;
      vm.instanceMatrix.needsUpdate = true;
    }
  }, [net]);

  useFrame((st, dt) => {
    const s = getChip();
    const v = vis.current;
    const step = Math.min(dt, 0.05);
    const status = s.chip.status;
    const now = Date.now();

    const targetPower = s.chip.corePowerPercent / 100;
    const resetting = status === "RESETTING";
    v.power += (targetPower - v.power) * (1 - Math.exp(-step * (resetting ? 2.6 : 5)));

    // White-green for ~300 ms at 100 %, then a 350 ms fade — on the clock, not per frame.
    const sinceFlash = s.flashAt > 0 ? now - s.flashAt : Infinity;
    v.flash = sinceFlash < 0 ? 0 : sinceFlash < 60 ? sinceFlash / 60 : sinceFlash < 320 ? 1 : Math.min(1, Math.max(0, 1 - (sinceFlash - 320) / 350));

    const pulseTarget = status === "FULL" || status === "EXECUTING" ? 1 : status === "POWERING" && v.power >= 0.9 ? (v.power - 0.9) / 0.1 : 0;
    v.pulse += (pulseTarget - v.pulse) * (1 - Math.exp(-step * 4));

    const execTarget = status === "EXECUTING" || status === "CONFIRMED" ? 1 : 0;
    v.exec += (execTarget - v.exec) * (1 - Math.exp(-step * (execTarget ? 5 : 2.5)));

    const speedTarget = 0.6 + v.power * 1.2 + (signals.hover ? 0.5 : 0) + (status === "EXECUTING" ? 1.2 : 0);
    v.speed += (speedTarget - v.speed) * (1 - Math.exp(-step * 3));

    v.yaw += (signals.mouseX * 0.16 - v.yaw) * (1 - Math.exp(-step * 5));
    v.pitch += (signals.mouseY * 0.06 - v.pitch) * (1 - Math.exp(-step * 5));
    v.scale += ((signals.hover ? 1.02 : 1) - v.scale) * (1 - Math.exp(-step * 6));

    const t = st.clock.elapsedTime;
    if (traceMat.current) {
      const u = traceMat.current.uniforms;
      u.uPower.value = v.power;
      u.uTime.value = t;
      u.uFlash.value = v.flash;
      u.uExec.value = v.exec;
      u.uPulse.value = v.pulse;
      u.uSpeed.value = v.speed;
      u.uRegion.value = signals.region ? REGION_INDEX[signals.region] : 0;
    }
    if (coreMat.current) {
      const u = coreMat.current.uniforms;
      u.uPower.value = v.power;
      u.uTime.value = t;
      u.uFlash.value = v.flash;
      u.uPulse.value = v.pulse + (signals.region === "core" ? 0.35 : 0);
      u.uExec.value = v.exec;
    }
    if (group.current) {
      group.current.rotation.set(v.pitch, v.yaw, 0);
      group.current.scale.setScalar(v.scale);
      group.current.position.y = Math.sin(t * 0.55) * 0.02;
    }
    if (coreLight.current) coreLight.current.intensity = 0.15 + v.power * 2.4 + v.pulse * 1.6 + v.flash * 14 + v.exec * 0.8;
    if (keyLight.current) keyLight.current.position.set(signals.mouseX * 3.5, 4.2 - signals.mouseY * 1.2, 3.2);
    if (glowMat.current) glowMat.current.opacity = Math.min(0.75, 0.02 + v.power * 0.42 + v.pulse * 0.14 + v.flash * 0.35);
    if (packetMat.current) packetMat.current.color.setRGB(0.9 + v.flash * 0.1, 1, 0.78 + v.exec * 0.2);

    // Signal packets: fees riding their pin's route to the core; the execution leaving through the bus.
    const pm = packets.current;
    if (pm) {
      let n = 0;
      const place = (p: { x: number; y: number; dx: number; dy: number }, scale: number) => {
        if (n >= PACKETS) return;
        const [x, y, z] = toWorld(p, DIE, 0.026);
        dummy.position.set(x, y, z);
        dummy.rotation.set(0, Math.atan2(p.dx, -p.dy), 0);
        dummy.scale.setScalar(scale);
        dummy.updateMatrix();
        pm.setMatrixAt(n++, dummy.matrix);
      };
      for (const fee of s.fees) {
        const u = (now - fee.at) / chipConfig.signalMs;
        if (u < 0 || u > 1.02) continue;
        const path = net.signalPaths[fee.pin % net.signalPaths.length];
        place(pointAt(path, u), 1 - Math.max(0, u - 0.92) * 10);
      }
      if (status === "CONFIRMED") {
        const u = (now - s.statusSince) / (SEQUENCE.confirmedMs * 0.55);
        if (u >= 0 && u <= 1) for (const path of net.executionPaths) place(pointAt(path, u), 1.25);
      }
      for (let i = n; i < PACKETS; i++) {
        dummy.position.set(0, -10, 0);
        dummy.scale.setScalar(0.0001);
        dummy.updateMatrix();
        pm.setMatrixAt(i, dummy.matrix);
      }
      pm.instanceMatrix.needsUpdate = true;
    }
  });

  const aluminum = {
    color: "#c9ced2",
    metalness: 0.96,
    roughness: 0.34,
    anisotropy: high ? 0.7 : 0,
    anisotropyRotation: Math.PI / 4,
    clearcoat: high ? 0.1 : 0,
    clearcoatRoughness: 0.4,
    envMapIntensity: 1.2,
  } as const;
  const ceramic = { color: "#0b0e10", metalness: 0.1, roughness: 0.28, clearcoat: high ? 0.8 : 0, clearcoatRoughness: 0.2, envMapIntensity: 0.9 } as const;
  const coreHalf = net.core * DIE;

  return (
    <group ref={group}>
      {/* Substrate: the ceramic package. */}
      <RoundedBox args={[FRAME_OUTER * 2, 0.2, FRAME_OUTER * 2]} radius={0.03} smoothness={3} position={[0, -0.1, 0]}>
        <meshPhysicalMaterial {...ceramic} />
      </RoundedBox>
      {/* The die surface, recessed inside the frame. */}
      <mesh rotation-x={-Math.PI / 2} position-y={0.002}>
        <planeGeometry args={[FRAME_INNER * 2, FRAME_INNER * 2]} />
        <meshStandardMaterial map={geo.die} color="#ffffff" metalness={0.35} roughness={0.55} envMapIntensity={0.7} />
      </mesh>
      {/* Brushed aluminum frame. */}
      <mesh geometry={geo.frame} position-y={0.0}>
        <meshPhysicalMaterial {...aluminum} />
      </mesh>
      {/* Routed traces. */}
      <mesh geometry={geo.traces} renderOrder={1}>
        <shaderMaterial ref={traceMat} vertexShader={traceVertex} fragmentShader={traceFragment} uniforms={traceUniforms} toneMapped={false} />
      </mesh>
      {/* Vias at the bends. */}
      <instancedMesh ref={vias} args={[geo.via, undefined, net.vias.length]} renderOrder={2}>
        <meshStandardMaterial color="#9aa3a8" metalness={0.9} roughness={0.35} envMapIntensity={0.9} />
      </instancedMesh>
      {/* The core block and its die. */}
      <RoundedBox args={[coreHalf * 2, 0.07, coreHalf * 2]} radius={0.012} smoothness={2} position={[0, 0.035, 0]}>
        <meshPhysicalMaterial color="#111517" metalness={0.5} roughness={0.3} clearcoat={high ? 0.6 : 0} envMapIntensity={0.9} />
      </RoundedBox>
      <mesh rotation-x={-Math.PI / 2} position-y={0.0705} renderOrder={3}>
        <planeGeometry args={[coreHalf * 1.9, coreHalf * 1.9]} />
        <shaderMaterial ref={coreMat} vertexShader={coreVertex} fragmentShader={coreFragment} uniforms={coreUniforms} toneMapped={false} />
      </mesh>
      {/* Pool of light around the core (additive, vanishes well inside the die). */}
      <mesh rotation-x={-Math.PI / 2} position-y={0.08} renderOrder={4} visible={!hideGlow}>
        <planeGeometry args={[2.2, 2.2]} />
        <meshBasicMaterial ref={glowMat} map={geo.glow} transparent opacity={0.1} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      {/* Signal packets. */}
      <instancedMesh ref={packets} args={[geo.packet, undefined, PACKETS]} renderOrder={5} frustumCulled={false}>
        <meshBasicMaterial ref={packetMat} color="#e6ffc4" toneMapped={false} />
      </instancedMesh>
      {/* Top protection layer: a thin glass sheen over the die. */}
      {high ? (
        <mesh rotation-x={-Math.PI / 2} position-y={0.095} renderOrder={6}>
          <planeGeometry args={[FRAME_INNER * 2, FRAME_INNER * 2]} />
          <meshPhysicalMaterial color="#ffffff" metalness={0} roughness={0.05} transparent opacity={0.055} depthWrite={false} envMapIntensity={1.4} />
        </mesh>
      ) : null}
      {/* Micro pins on the four edges. */}
      <instancedMesh ref={pins} args={[geo.pin, undefined, net.pins.length]}>
        <meshStandardMaterial color="#d8d5c9" metalness={0.85} roughness={0.32} envMapIntensity={1.2} />
      </instancedMesh>
      {/* Lighting inside the scene rather than bloom. */}
      <pointLight ref={coreLight} color="#b7ff39" intensity={0.5} distance={6} decay={2} position={[0, 0.7, 0]} />
      <pointLight ref={keyLight} color="#ffffff" intensity={2.4} distance={14} decay={2} position={[1.5, 4.2, 3.2]} />
    </group>
  );
}

/** A studio for brushed metal: bands behind the camera, a cool panel above, a green strip to the right. */
const STRIPS: Array<[number, number, string, number]> = [
  [0.7, 1.5, "#ffffff", 0.7],
  [1.8, 0.8, "#e8eaee", 1.1],
  [3.4, 0.4, "#c3c7cd", 1.6],
  [-0.5, 0.1, "#5f636a", 0.5],
  [-1.7, 0.45, "#d0d3d8", 1.0],
  [-3.6, 0.7, "#ffffff", 1.8],
];

function Studio() {
  return (
    <Environment resolution={256} frames={1}>
      {STRIPS.map(([y, intensity, color, h], i) => (
        <Lightformer key={i} form="rect" intensity={intensity} color={color} position={[0, y, 9]} target={[0, 0, 0]} scale={[18, h, 1]} />
      ))}
      <Lightformer form="rect" intensity={0.28} color="#d9dce2" position={[0, 0.5, 10]} target={[0, 0, 0]} scale={[30, 16, 1]} />
      <Lightformer form="rect" intensity={1.0} color="#ffffff" position={[-7, 1, 2.5]} target={[0, 0, 0]} scale={[1.6, 9, 1]} />
      <Lightformer form="rect" intensity={0.75} color="#e6e8ec" position={[7.5, 2, 1.5]} target={[0, 0, 0]} scale={[1.2, 9, 1]} />
      <Lightformer form="rect" intensity={0.9} color="#b7ff39" position={[6, -1.2, 5.5]} target={[0, 0, 0]} scale={[0.8, 5, 1]} />
      <Lightformer form="rect" intensity={1.4} color="#ffffff" position={[0, 8, 0]} rotation-x={Math.PI / 2} scale={[14, 5, 1]} />
      <Lightformer form="rect" intensity={0.35} color="#b8c0c4" position={[0, -8, 0]} rotation-x={-Math.PI / 2} scale={[14, 4, 1]} />
    </Environment>
  );
}

/** A dark floor that fades out well inside the frustum — it exists to catch the pool of light under the chip. */
function Ground() {
  const alpha = useMemo(() => makeFadeTexture(), []);
  useEffect(() => () => alpha.dispose(), [alpha]);
  return (
    <mesh rotation-x={-Math.PI / 2} position-y={-0.42}>
      <planeGeometry args={[7, 7]} />
      <meshStandardMaterial color="#070809" metalness={0} roughness={0.85} envMapIntensity={0} transparent alphaMap={alpha} depthWrite={false} />
    </mesh>
  );
}

/** Dev only: lets a script advance the frame loop when rAF is throttled, and read the canvas. */
function DevHook() {
  const advance = useThree((s) => s.advance);
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    (window as unknown as { __chipScene?: unknown }).__chipScene = { gl, advance: (t: number) => advance(t, true) };
  }, [advance, gl]);
  return null;
}

/** Dev/QA: ?dbg=noglow | noground isolates one element in captures. */
const dbg = () => (process.env.NODE_ENV !== "production" && typeof location !== "undefined" ? (new URLSearchParams(location.search).get("dbg") ?? "") : "");

/** The hero canvas. Fills its container; pauses when scrolled away; reduced motion renders on demand. */
export default function ChipScene({ className = "" }: { className?: string }) {
  const low = useLowQuality();
  const flag = dbg();
  const reduced = usePrefersReducedMotion();
  const [ref, inView] = useInView<HTMLDivElement>("120px");

  useEffect(() => {
    bindPointer();
  }, []);

  const frameloop = reduced ? "demand" : inView ? "always" : "never";

  return (
    <div ref={ref} className={`relative ${className}`} aria-hidden>
      <Canvas
        dpr={low ? 1 : [1, 1.75]}
        frameloop={frameloop}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance", stencil: false, preserveDrawingBuffer: process.env.NODE_ENV !== "production" }}
        camera={{ position: CAM.position, fov: CAM.fov, near: 0.1, far: 60 }}
        onCreated={({ camera }) => camera.lookAt(0, -0.1, 0)}
        style={{ background: "transparent" }}
      >
        <Studio />
        <DevHook />
        <Chip quality={low ? "low" : "high"} hideGlow={flag === "noglow"} />
        {flag === "noground" ? null : <Ground />}
      </Canvas>
    </div>
  );
}
