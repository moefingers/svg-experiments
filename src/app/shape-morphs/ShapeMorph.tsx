"use client";

import { useEffect, useRef, useState } from "react";
import {
  lerpPoints,
  morphShapePath,
  polygonPerimeterPoints,
  type ShapeConfig,
} from "@/lib/polygon-path";
import styles from "./ShapeMorph.module.css";

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}
function lcm(a: number, b: number): number {
  return (a * b) / gcd(a, b);
}
function lcmAll(nums: number[]): number {
  return nums.reduce((acc, n) => lcm(acc, n), 1);
}

/**
 * Interactive demo: a single SVG that morphs between N predefined shapes
 * on toggle. Cycles through `shapes` in order; clicking the toggle advances.
 *
 * Visual controls:
 *   - `cornerRadius`: > 0 produces Bézier-arc corners (true geometric rounding).
 *   - `strokeRoundCap`: applies a stroke with linejoin=round + linecap=round.
 *     This is the "round-cap trick" — the path stays geometrically sharp,
 *     but the stroke renders rounded outside the fill, visually rounding
 *     the silhouette. Combine with cornerRadius=0 for the pure trick, or
 *     stack with cornerRadius > 0 for both at once.
 *
 * Animation: each toggle starts an rAF loop that interpolates `progress`
 * from 0 to 1 over `duration` ms with eased timing. The path `d` is
 * recomputed every frame from the current pair of shapes plus the
 * interpolated progress.
 */
export function ShapeMorph({
  title,
  shapes,
  cornerRadius,
  strokeRoundCap = false,
  hollow = false,
  duration = 600,
  viewBoxSize = 160,
}: {
  title: string;
  shapes: ShapeConfig[];
  /**
   * Optional uniform corner radius applied to every shape in the cycle.
   * Overrides each shape's per-shape `cornerRadius`. Leave undefined to
   * let each shape carry its own rounding — the morph will then
   * interpolate radius alongside position (e.g. sharp triangle to
   * rounded hexagon).
   */
  cornerRadius?: number;
  strokeRoundCap?: boolean;
  /**
   * Render as outline only — `fill="none"`. When combined with
   * `strokeRoundCap`, the chunky round-cap stroke becomes the visible
   * shape (fat outline with rounded joins). When `strokeRoundCap` is
   * false, draws a thin diagnostic outline so you can see where each
   * path vertex sits — useful for spotting mid-edge synthetic points
   * during a morph.
   */
  hollow?: boolean;
  duration?: number;
  viewBoxSize?: number;
}) {
  // `index` is the *current* shape — the one we're showing or morphing FROM.
  // `target` is the shape we're morphing TO. When progress reaches 1 we
  // collapse target into index and wait for the next toggle.
  const [index, setIndex] = useState(0);
  const [target, setTarget] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | null>(null);

  // When `target` is set, run an animation that drives `progress` from 0 → 1.
  // The rAF loop cleans up if the component unmounts mid-animation or if the
  // user clicks toggle again before the previous morph finishes (the new
  // morph reuses whatever progress is current, so toggles feel responsive).
  useEffect(() => {
    if (target === null) return;
    const start = performance.now();
    const startProgress = progress;
    const remaining = duration * (1 - startProgress);

    const tick = (now: number) => {
      const elapsed = now - start;
      const p = Math.min(1, startProgress + elapsed / duration);
      // Ease-in-out cubic for a more interesting morph than linear.
      const eased = easeInOutCubic(p);
      setProgress(eased);
      if (p < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        // Settle: commit target into index, reset progress.
        setIndex(target);
        setTarget(null);
        setProgress(0);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    void remaining; // (kept for potential future use; rAF uses absolute timing)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
    // We only want this to run when a NEW target is set.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  const handleToggle = () => {
    if (target !== null) return; // already animating
    const next = (index + 1) % shapes.length;
    setProgress(0);
    setTarget(next);
  };

  const from = shapes[index]!;
  const to = target !== null ? shapes[target]! : from;
  const cx = viewBoxSize / 2;
  const cy = viewBoxSize / 2;
  const d = morphShapePath({
    from,
    to,
    t: progress,
    cornerRadius,
    cx,
    cy,
  });

  // For hollow + no round-cap, also render every topology point as a dot
  // so the path's underlying vertex structure is visible. The topology
  // count must match what morphShapePath uses (lcm of side counts).
  const topologyCount = lcmAll(shapes.map((s) => s.sides));
  const fromPts = polygonPerimeterPoints(from, topologyCount);
  const toPts = polygonPerimeterPoints(to, topologyCount);
  const interpPts = lerpPoints(fromPts, toPts, progress);

  const currentShape = target !== null ? shapes[target]! : shapes[index]!;
  const label = shapeDescriptor(currentShape, cornerRadius);

  // Render-mode resolution:
  //   - Solid (default): fill = shape color; optional chunky stroke for round-cap.
  //   - Hollow + no round-cap: no fill, thin outline + vertex dots (diagnostic).
  //   - Hollow + round-cap: no fill, chunky stroke is the visible shape.
  let fill = "var(--shape-fill)";
  let stroke: string = "none";
  let strokeWidth = 0;
  if (hollow && strokeRoundCap) {
    fill = "none";
    stroke = "var(--shape-fill)";
    strokeWidth = 14;
  } else if (hollow) {
    fill = "none";
    stroke = "var(--shape-fill)";
    strokeWidth = 1.5;
  } else if (strokeRoundCap) {
    stroke = "var(--shape-fill)";
    strokeWidth = 14;
  }

  return (
    <div className={styles.card}>
      <div className={styles.preview}>
        <svg
          viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
          className={styles.svg}
        >
          <path
            d={d}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
            strokeLinecap="round"
            paintOrder="stroke fill"
          />
          {/* Diagnostic vertex dots — only in the thin-outline hollow mode.
              Each dot sits at one of the `topologyCount` perimeter points,
              so during a morph you can watch the mid-edge synthetic points
              slide from edge-midpoints to corner positions (or vice versa). */}
          {hollow &&
            !strokeRoundCap &&
            interpPts.map((p, i) => (
              <circle
                key={i}
                cx={p.x + cx}
                cy={p.y + cy}
                r={2}
                fill="var(--shape-fill)"
              />
            ))}
        </svg>
      </div>
      <div className={styles.controls}>
        <p className={styles.title}>{title}</p>
        <p className={styles.label}>
          {label}
          {target !== null && (
            <span className={styles.morphing}>
              {" → "}
              {shapeDescriptor(shapes[target]!, cornerRadius)}
            </span>
          )}
        </p>
        <button
          type="button"
          onClick={handleToggle}
          disabled={target !== null}
          className={styles.toggle}
        >
          {target !== null ? "morphing…" : "toggle"}
        </button>
      </div>
    </div>
  );
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function shapeDescriptor(
  shape: ShapeConfig,
  uniformRadius: number | undefined,
): string {
  const effective = uniformRadius ?? shape.cornerRadius ?? 0;
  const rounding = effective > 0 ? "rounded " : "sharp ";
  return `${rounding}${shapeLabel(shape.sides)}`;
}

function shapeLabel(sides: number): string {
  switch (sides) {
    case 3:
      return "triangle";
    case 4:
      return "square";
    case 5:
      return "pentagon";
    case 6:
      return "hexagon";
    case 8:
      return "octagon";
    default:
      return `${sides}-gon`;
  }
}
