"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  centroid,
  cross,
  normalize,
  sub,
  type Mesh,
  type Vec3,
} from "@/lib/polyhedra";
import styles from "./HexSphere.module.css";

/**
 * Interactive hex-sphere with cursor-driven parallax tilt and idle drift.
 *
 * Geometry: any Mesh (intended for Goldberg polyhedra — 12 pentagons +
 * N hexagons). Faces are projected to 2D via a simple perspective camera
 * placed on +Z. Backface culling skips faces whose normals point away
 * from the camera; remaining faces are painter-sorted by centroid Z.
 *
 * Interaction model:
 *   - Cursor inside the canvas sets a TARGET tilt (yaw + pitch),
 *     each component capped at TILT_RANGE degrees. The cursor's distance
 *     from canvas center maps linearly to tilt magnitude.
 *   - Cursor outside the canvas releases control; tilt eases back toward
 *     the autonomous-drift target.
 *   - Each animation frame, current tilt lerps toward target at LERP_RATE,
 *     so motion feels weighted instead of snapped.
 *   - When the cursor has been idle for IDLE_MS, a slow autonomous drift
 *     (sine/cosine of elapsed time) becomes the target so the sphere
 *     always feels alive.
 *
 * Atmosphere parameter (0..1) controls how dramatically back-facing /
 * edge-facing hexagons fade. Higher = more atmospheric depth; lower =
 * more solid object. Front-facing cells are always fully opaque so the
 * labeled cluster stays legible.
 *
 * The 5 labeled cells (the would-be navigation slots) are picked at
 * mount time by finding the 5 hexagons closest to the +Z pole — that
 * gives a contiguous cluster centered on the viewer's initial line of
 * sight. They stay locked to the sphere and rotate with it.
 */

// Defaults used by the comparison page; every value is overridable per-instance.
const DEFAULT_TILT_RANGE_DEG = 10;
const DEFAULT_LERP_RATE = 0.08;
const DEFAULT_IDLE_MS = 1500;
const DEFAULT_DRIFT_AMPLITUDE_DEG = 6;
const DEFAULT_DRIFT_PERIOD_S = 14;

const LABELS = [
  "Web Presence",
  "Custom Software",
  "Scooters & Computers",
  "About",
  "Client Portal",
];

export function HexSphere({
  mesh,
  size = 600,
  cameraZ = 4,
  zoom = 1,
  cameraInside = false,
  atmosphere = 0.35,
  tiltRange = DEFAULT_TILT_RANGE_DEG,
  invertX = true,
  invertY = false,
  lerpRate = DEFAULT_LERP_RATE,
  idleDriftEnabled = true,
  driftAmplitude = DEFAULT_DRIFT_AMPLITUDE_DEG,
  driftPeriod = DEFAULT_DRIFT_PERIOD_S,
  idleMs = DEFAULT_IDLE_MS,
  showLabels = true,
  highlightPentagons = true,
  labeledOnly = false,
  faceInset = 0,
  jitter = 0,
}: {
  mesh: Mesh;
  /** SVG viewBox edge (also the displayed pixel size at 1:1). */
  size?: number;
  /**
   * Camera distance on +Z. Outside the unit sphere (>1) gives a standard
   * external view; inside (<1) flips the experience — you're surrounded.
   */
  cameraZ?: number;
  /**
   * Apparent-size multiplier — decoupled from cameraZ so you can pull the
   * camera back (flatter perspective) without shrinking the sphere, or
   * push in for fisheye without growing it. 1 = baseline; >1 grows, <1
   * shrinks. The classic dolly-zoom effect is achieved by changing
   * cameraZ and zoom together in opposite directions.
   */
  zoom?: number;
  /**
   * When true, backface culling flips: only faces with normals pointing
   * TOWARD the camera origin (i.e. the inner surface from the camera's
   * perspective) get rendered. Required when cameraZ < 1.
   */
  cameraInside?: boolean;
  /**
   * 0..1. How much hexagons further from the viewer fade out. 0 = solid
   * object, no fade. 1 = strong atmospheric haze on back-facing cells.
   */
  atmosphere?: number;
  /** Max parallax tilt in degrees per axis. */
  tiltRange?: number;
  /**
   * Invert horizontal axis: when true, cursor-right rotates the sphere's
   * left side toward the viewer (natural "examine an object" feel).
   * When false, sphere yaws WITH the cursor.
   */
  invertX?: boolean;
  /**
   * Invert vertical axis: when true, cursor-down rotates the sphere's
   * top toward the viewer (natural). When false, sphere pitches WITH
   * the cursor. Independent of invertX because cursor-tracking feels
   * right on one axis and wrong on the other depending on framing.
   */
  invertY?: boolean;
  /** Per-frame ease toward target tilt. 0.01 = slow/weighty, 0.5 = snappy. */
  lerpRate?: number;
  /** Whether the sphere autonomously drifts when the cursor is idle. */
  idleDriftEnabled?: boolean;
  /** Amplitude of autonomous drift in degrees. */
  driftAmplitude?: number;
  /** Seconds for one full drift cycle. */
  driftPeriod?: number;
  /** Ms of cursor inactivity before autonomous drift kicks in. */
  idleMs?: number;
  /** Whether to render the labels on labeled cells. */
  showLabels?: boolean;
  /** Whether to color pentagons distinctly. */
  highlightPentagons?: boolean;
  /** When true, only the 5 labeled cells render — everything else hidden. */
  labeledOnly?: boolean;
  /**
   * 0..1. Shrink each face toward its centroid so neighboring cells show
   * visible gaps. 0 = no inset (cells share edges). 0.2 = 20% shrink.
   * Pure rendering — geometry unchanged.
   */
  faceInset?: number;
  /**
   * Vertex perturbation amplitude (in unit-sphere coords). Each vertex
   * is offset by a deterministic per-vertex pseudo-random vector scaled
   * by this amount before projection. 0 = perfect sphere; 0.05 = visibly
   * organic. Higher values break the mesh visually.
   */
  jitter?: number;
}) {
  // Target tilt in radians (set by cursor or autonomous drift).
  const target = useRef({ yaw: 0, pitch: 0 });
  // Current tilt (lerps toward target each frame).
  const [tilt, setTilt] = useState({ yaw: 0, pitch: 0 });
  // Cursor inactivity timestamp. Starts at 0 so the autonomous-drift
  // branch wins immediately at mount — sphere is alive before any cursor
  // input arrives. `performance.now()` can't go in a useRef initializer
  // (React 19 purity rule); first pointermove will write the real value.
  const lastCursorActivity = useRef<number>(0);
  const cursorInside = useRef(false);
  const svgRef = useRef<SVGSVGElement>(null);

  // Frame loop: update target from cursor/drift, lerp current toward target.
  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = (now - start) / 1000;
      const cursorIdle = now - lastCursorActivity.current > idleMs;

      // Compute target. Cursor-driven if active+inside, autonomous-drift otherwise.
      if (cursorIdle || !cursorInside.current) {
        if (idleDriftEnabled) {
          const driftAngle = (elapsed / driftPeriod) * Math.PI * 2;
          // Lissajous-style drift so yaw/pitch don't sync up to one straight line.
          target.current.yaw =
            ((driftAmplitude * Math.PI) / 180) * Math.sin(driftAngle);
          target.current.pitch =
            ((driftAmplitude * Math.PI) / 180) * Math.cos(driftAngle * 0.6);
        } else {
          // Drift disabled — release to neutral.
          target.current.yaw = 0;
          target.current.pitch = 0;
        }
      }

      // Ease current toward target.
      setTilt((prev) => {
        const newYaw = prev.yaw + (target.current.yaw - prev.yaw) * lerpRate;
        const newPitch =
          prev.pitch + (target.current.pitch - prev.pitch) * lerpRate;
        // Skip a render if the delta is negligible — saves React reconciliation.
        if (
          Math.abs(newYaw - prev.yaw) < 1e-5 &&
          Math.abs(newPitch - prev.pitch) < 1e-5
        ) {
          return prev;
        }
        return { yaw: newYaw, pitch: newPitch };
      });

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [lerpRate, idleDriftEnabled, driftAmplitude, driftPeriod, idleMs]);

  // Pointer handlers — update target from cursor position relative to canvas center.
  // Re-binds when invertParallax or tiltRange change so live tuning takes effect.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const handleMove = (e: PointerEvent) => {
      const rect = svg.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      // Normalized -1..1 offset from center.
      const nx = (e.clientX - cx) / (rect.width / 2);
      const ny = (e.clientY - cy) / (rect.height / 2);
      // Clamp; cursor far past the canvas still caps at tiltRange.
      const clamp = (v: number) => Math.max(-1, Math.min(1, v));
      // Per-axis invert. The intrinsic screen-vs-math flip on Y (-ny) is
      // separate from the user-facing "invert vertical axis" intent.
      // When the camera is inside the sphere, the *natural* parallax flips:
      // looking outward, cursor-right means "turn right" so the world
      // should rotate WITH the cursor, not against it. Auto-negate the
      // user's invert preference for interior mode so "invertX = true"
      // continues to mean "natural feel" in both modes — no need to toggle
      // when switching inside/outside.
      const interiorFlip = cameraInside ? -1 : 1;
      const signX = (invertX ? -1 : 1) * interiorFlip;
      const signY = (invertY ? -1 : 1) * interiorFlip;
      target.current.yaw = (signX * clamp(nx) * tiltRange * Math.PI) / 180;
      target.current.pitch = (signY * clamp(-ny) * tiltRange * Math.PI) / 180;
      lastCursorActivity.current = performance.now();
      cursorInside.current = true;
    };
    const handleLeave = () => {
      cursorInside.current = false;
    };

    svg.addEventListener("pointermove", handleMove);
    svg.addEventListener("pointerleave", handleLeave);
    return () => {
      svg.removeEventListener("pointermove", handleMove);
      svg.removeEventListener("pointerleave", handleLeave);
    };
  }, [invertX, invertY, tiltRange, cameraInside]);

  // Pick the 5 labeled hexagons. The visible pole depends on camera mode:
  //   - Outside (camera at +Z, looking toward origin): visible cells are
  //     those with outward normals pointing toward +Z, so pick the hexes
  //     nearest the +Z pole.
  //   - Inside (camera near origin, also looking toward +Z by convention):
  //     visible cells are the inner surface on the far wall (-Z side), so
  //     pick the hexes nearest the -Z pole.
  // Re-selecting on mode change keeps the cluster always facing the viewer.
  const labeledFaceIndices = useMemo(() => {
    type Candidate = { idx: number; z: number };
    const hexCandidates: Candidate[] = [];
    for (let i = 0; i < mesh.faces.length; i++) {
      const face = mesh.faces[i]!;
      if (face.length !== 6) continue;
      const c = centroid(face.map((vi) => mesh.vertices[vi]!));
      hexCandidates.push({ idx: i, z: c.z });
    }
    // Outside: largest z first (front). Inside: smallest z first (far wall).
    hexCandidates.sort((a, b) => (cameraInside ? a.z - b.z : b.z - a.z));
    return new Set(hexCandidates.slice(0, LABELS.length).map((c) => c.idx));
  }, [mesh, cameraInside]);

  // Stable mapping: labeled face index → label string.
  const faceIdxToLabel = useMemo(() => {
    const m = new Map<number, string>();
    const sorted = Array.from(labeledFaceIndices).sort((a, b) => a - b);
    sorted.forEach((idx, i) => {
      const label = LABELS[i];
      if (label !== undefined) m.set(idx, label);
    });
    return m;
  }, [labeledFaceIndices]);

  // ─── Projection ────────────────────────────────────────────────────
  const cx = size / 2;
  const cy = size / 2;
  // Scale chosen so the unit sphere fills most of the canvas at the default
  // cameraZ=4 with zoom=1. The zoom multiplier scales the projection
  // independently of cameraZ — see prop doc for the dolly-zoom rationale.
  const scale = size * 0.36 * zoom;

  const projected = useMemo(() => {
    const cosY = Math.cos(tilt.yaw);
    const sinY = Math.sin(tilt.yaw);
    const cosX = Math.cos(tilt.pitch);
    const sinX = Math.sin(tilt.pitch);
    return mesh.vertices.map((v, i) => {
      // Deterministic per-vertex jitter — same vertex index always perturbs
      // in the same direction so the sphere stays stable across renders.
      // Use a cheap hash on index so neighboring vertices don't sync up.
      let vx = v.x;
      let vy = v.y;
      let vz = v.z;
      if (jitter > 0) {
        const h1 = Math.sin(i * 12.9898) * 43758.5453;
        const h2 = Math.sin(i * 78.233) * 43758.5453;
        const h3 = Math.sin(i * 39.346) * 43758.5453;
        vx += (h1 - Math.floor(h1) - 0.5) * jitter;
        vy += (h2 - Math.floor(h2) - 0.5) * jitter;
        vz += (h3 - Math.floor(h3) - 0.5) * jitter;
      }
      const x1 = vx * cosY + vz * sinY;
      const z1 = -vx * sinY + vz * cosY;
      const y2 = vy * cosX - z1 * sinX;
      const z2 = vy * sinX + z1 * cosX;
      const x = x1;
      const y = y2;
      const z = z2;
      // Perspective: when cameraZ - z approaches zero, persp blows up — that's
      // a vertex passing through the camera plane. Clamp denominator to a
      // tiny positive value so the projection stays defined for interior cams.
      const denom = Math.max(cameraZ - z, 0.05);
      const persp = cameraZ / denom;
      return {
        x: x * persp * scale + cx,
        y: -y * persp * scale + cy,
        z,
        world: { x, y, z } satisfies Vec3,
      };
    });
  }, [mesh.vertices, tilt.yaw, tilt.pitch, cameraZ, scale, cx, cy, jitter]);

  // ─── Face processing ──────────────────────────────────────────────
  const faceRecords = useMemo(() => {
    const records: {
      idx: number;
      points: { x: number; y: number }[];
      centroidScreen: { x: number; y: number };
      centroidZ: number;
      sides: number;
      facingCamera: number; // -1..1; 1 = directly toward viewer
      label?: string;
    }[] = [];

    for (let i = 0; i < mesh.faces.length; i++) {
      const face = mesh.faces[i]!;
      const pts = face.map((vi) => projected[vi]!);

      // World-space normal (rotated coordinates).
      const A = pts[0]!.world;
      const B = pts[1]!.world;
      const C = pts[2]!.world;
      const normal = normalize(cross(sub(B, A), sub(C, A)));

      // Backface culling depends on inside-vs-outside camera.
      // Outside: cull faces whose normals point AWAY from camera (normal.z < 0)
      //   — we want to see the outer surface, which has normals pointing outward
      //   (away from sphere center, toward camera).
      // Inside: cull faces whose normals point TOWARD camera (normal.z > 0)
      //   — from inside, we want to see faces whose outward-normals point
      //   away from us (the inner surface presents the "back" of each face).
      if (cameraInside) {
        if (normal.z > -0.02) continue;
      } else {
        if (normal.z < 0.02) continue;
      }

      let cz = 0;
      let csx = 0;
      let csy = 0;
      for (const p of pts) {
        cz += p.z;
        csx += p.x;
        csy += p.y;
      }
      cz /= pts.length;
      csx /= pts.length;
      csy /= pts.length;

      records.push({
        idx: i,
        points: pts.map((p) => ({ x: p.x, y: p.y })),
        centroidScreen: { x: csx, y: csy },
        centroidZ: cz,
        sides: face.length,
        // For interior view, "facing camera" is inverted: faces whose outward
        // normals point most strongly AWAY from camera are the ones we see
        // most directly. Use absolute value of normal.z as the proxy in both
        // cases since brightness should peak at perpendicular-to-line-of-sight.
        facingCamera: Math.abs(normal.z),
        label: faceIdxToLabel.get(i),
      });
    }

    // Painter's algorithm: draw far-away (smaller z) first.
    // For interior view, draw order reverses naturally because the cells
    // "behind" us have larger z than the ones we're looking at.
    records.sort((a, b) =>
      cameraInside ? b.centroidZ - a.centroidZ : a.centroidZ - b.centroidZ,
    );
    return records;
  }, [mesh.faces, projected, cameraInside, faceIdxToLabel]);

  // ─── Render ───────────────────────────────────────────────────────
  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${size} ${size}`}
      className={styles.svg}
      role="img"
      aria-label="Hex sphere navigation prototype"
    >
      {/* Atmospheric backdrop — a faint radial glow centered on the sphere
          gives the void some depth without competing with the cells. */}
      <defs>
        <radialGradient id="hexAtmosphere" cx="50%" cy="50%" r="55%">
          <stop offset="0%" stopColor="rgba(120, 130, 180, 0.06)" />
          <stop offset="100%" stopColor="rgba(0, 0, 0, 0)" />
        </radialGradient>
      </defs>
      <rect width={size} height={size} fill="url(#hexAtmosphere)" />

      {faceRecords.map((face) => {
        const isPenta = face.sides === 5;
        const isLabeled = face.label !== undefined;

        // When labeledOnly is on, skip every non-labeled face entirely so
        // the cluster reads against pure void.
        if (labeledOnly && !isLabeled) return null;

        // Brightness from facing-camera (peaks at 1 when face is perpendicular
        // to view), modulated by atmosphere parameter.
        const facingBoost = face.facingCamera;
        const atmosphereDimming = 1 - atmosphere * (1 - facingBoost);

        let opacity: number;
        let fill: string;
        let stroke: string;

        if (isLabeled) {
          opacity = 0.95;
          fill = `rgba(96, 165, 250, ${0.18 + 0.22 * facingBoost})`;
          stroke = "rgba(147, 197, 253, 0.85)";
        } else if (isPenta && highlightPentagons) {
          opacity = atmosphereDimming;
          fill = `rgba(220, 200, 140, ${0.12 + 0.18 * facingBoost})`;
          stroke = `rgba(220, 200, 140, ${0.4 * atmosphereDimming})`;
        } else {
          opacity = atmosphereDimming;
          fill = `rgba(160, 170, 200, ${0.06 + 0.18 * facingBoost})`;
          stroke = `rgba(140, 150, 180, ${0.5 * atmosphereDimming})`;
        }

        // Apply face inset: shrink each point toward the 2D screen centroid
        // by faceInset fraction. inset=0 → original points; inset=0.2 → 80%.
        const inset = faceInset;
        const renderPoints =
          inset > 0
            ? face.points.map((p) => ({
                x: p.x + (face.centroidScreen.x - p.x) * inset,
                y: p.y + (face.centroidScreen.y - p.y) * inset,
              }))
            : face.points;

        return (
          <g key={face.idx} opacity={opacity}>
            <polygon
              points={renderPoints
                .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
                .join(" ")}
              fill={fill}
              stroke={stroke}
              strokeWidth={isLabeled ? 1.1 : 0.5}
              strokeLinejoin="round"
            />
            {showLabels && isLabeled && face.label && (
              <text
                x={face.centroidScreen.x}
                y={face.centroidScreen.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className={styles.label}
                opacity={face.facingCamera > 0.4 ? 1 : 0}
              >
                {face.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
