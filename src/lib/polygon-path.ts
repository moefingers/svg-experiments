/**
 * Generates SVG path strings for regular polygons under a uniform topology.
 *
 * Every shape in a given morph cycle is expressed with the **same** number
 * of corner positions, so that linear interpolation between any two shapes
 * produces a clean morph (no point-count changes mid-animation).
 *
 * The trick: pick a topology count N >= max(shape.corners) for all shapes
 * in the cycle. For a shape with K < N real corners, "synthesize" the
 * missing N-K corners by placing them on the edges between real corners,
 * evenly spaced. Visually invisible (a point on a straight edge looks
 * exactly like the edge), but mathematically they exist and can move.
 *
 * When morphing to a shape that uses those positions as real corners, the
 * synthetic mid-edge points pull outward to become actual vertices — the
 * geometry "unfolds."
 */

export interface ShapeConfig {
  /** Number of real corners (3=triangle, 4=square, 6=hexagon, etc). */
  sides: number;
  /** Radius from center to each corner, in viewBox units. */
  radius: number;
  /**
   * Rotation offset in degrees. 0 puts the first vertex at the top
   * (12 o'clock); 90 puts it on the right. Used to align shapes
   * pleasingly during morph — e.g. a triangle and a hexagon both
   * pointing up.
   */
  rotation?: number;
  /**
   * Per-corner rounding radius (in the same units as `radius`). 0 = sharp.
   * Applied as a quadratic Bézier arc at each corner. Capped at radius/2
   * internally so adjacent arcs don't overlap.
   */
  cornerRadius?: number;
}

/**
 * Compute the (x, y) coordinates of `topologyCount` points distributed
 * around the perimeter of a regular polygon of `sides` corners with the
 * given radius and rotation. Real corners are spaced sides-apart; the
 * remaining points fall on the straight edges between them.
 *
 * Center is at (0, 0). Caller is responsible for translating to viewBox.
 */
export function polygonPerimeterPoints(
  config: ShapeConfig,
  topologyCount: number,
): { x: number; y: number }[] {
  const { sides, radius, rotation = 0 } = config;
  const rotRad = (rotation * Math.PI) / 180;

  // Real corner positions for the polygon's `sides` corners.
  const corners: { x: number; y: number }[] = [];
  for (let i = 0; i < sides; i++) {
    // Start at -π/2 so the first corner is at the top (12 o'clock).
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / sides + rotRad;
    corners.push({
      x: radius * Math.cos(angle),
      y: radius * Math.sin(angle),
    });
  }

  // Distribute `topologyCount` points around the perimeter. Each point
  // is parametrized by a position `t` in [0, sides), where the integer
  // part identifies the edge and the fractional part is the position
  // along that edge from corner[i] to corner[i+1].
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i < topologyCount; i++) {
    const t = (i * sides) / topologyCount;
    const edgeIndex = Math.floor(t) % sides;
    const frac = t - Math.floor(t);
    const a = corners[edgeIndex]!;
    const b = corners[(edgeIndex + 1) % sides]!;
    out.push({
      x: a.x + (b.x - a.x) * frac,
      y: a.y + (b.y - a.y) * frac,
    });
  }
  return out;
}

/**
 * Linear interpolation between two equal-length point arrays at progress
 * `t` in [0, 1]. The two arrays MUST share length and indexing — that's
 * the whole reason we built shapes on a uniform topology.
 */
export function lerpPoints(
  a: { x: number; y: number }[],
  b: { x: number; y: number }[],
  t: number,
): { x: number; y: number }[] {
  if (a.length !== b.length) {
    throw new Error(
      `lerpPoints: length mismatch ${a.length} vs ${b.length} — both shapes must use the same topology count`,
    );
  }
  return a.map((p, i) => ({
    x: p.x + (b[i]!.x - p.x) * t,
    y: p.y + (b[i]!.y - p.y) * t,
  }));
}

/**
 * Build an SVG `d` attribute from a perimeter point list.
 *
 * If `cornerRadius` is 0, emits straight `L` segments — sharp polygon.
 *
 * If `cornerRadius` > 0, emits a quadratic Bézier arc at each *real*
 * corner. A "real corner" is detected by the angle change exceeding a
 * threshold; mid-edge synthetic points have ~0 angle change and stay
 * straight, so they don't get rounded.
 *
 * The rounding works by:
 *   1. Stopping the previous straight edge `cornerRadius` units short
 *      of the corner.
 *   2. Drawing a `Q` curve through the corner to a point `cornerRadius`
 *      units along the next edge.
 *   3. Continuing the next edge.
 *
 * Capping radius at min(edgeLen/2) per pair ensures arcs from adjacent
 * corners don't overlap.
 */
export function pointsToPathD(
  points: { x: number; y: number }[],
  cornerRadius: number,
  cx: number,
  cy: number,
): string {
  const n = points.length;
  if (n === 0) return "";
  // Translate to center.
  const pts = points.map((p) => ({ x: p.x + cx, y: p.y + cy }));

  if (cornerRadius <= 0) {
    // Sharp: simple M + L's + Z.
    const cmds: string[] = [
      `M ${pts[0]!.x.toFixed(2)} ${pts[0]!.y.toFixed(2)}`,
    ];
    for (let i = 1; i < n; i++) {
      cmds.push(`L ${pts[i]!.x.toFixed(2)} ${pts[i]!.y.toFixed(2)}`);
    }
    cmds.push("Z");
    return cmds.join(" ");
  }

  // Rounded: emit a Q at every vertex. For mid-edge synthetic points
  // (where the incoming and outgoing edges are collinear), the Q
  // degenerates into a tiny curve that's visually indistinguishable
  // from a straight line — so we DON'T special-case those, we just
  // round them too. Each point gets a Q.
  //
  // The convention: start at a point r units BEFORE point[0] along the
  // edge from point[n-1] to point[0]. Then for each i:
  //   L (toward point[i], stopping r units short)
  //   Q point[i] (control), (r units past point[i] along the next edge)
  // The "r units before/past" math uses the unit vector along each edge.
  const cmds: string[] = [];
  for (let i = 0; i < n; i++) {
    const prev = pts[(i - 1 + n) % n]!;
    const here = pts[i]!;
    const next = pts[(i + 1) % n]!;

    // Vector from `here` back toward `prev`, normalized.
    const dxIn = prev.x - here.x;
    const dyIn = prev.y - here.y;
    const lenIn = Math.hypot(dxIn, dyIn) || 1;
    const inUnit = { x: dxIn / lenIn, y: dyIn / lenIn };

    // Vector from `here` forward toward `next`, normalized.
    const dxOut = next.x - here.x;
    const dyOut = next.y - here.y;
    const lenOut = Math.hypot(dxOut, dyOut) || 1;
    const outUnit = { x: dxOut / lenOut, y: dyOut / lenOut };

    // Cap radius at half the shorter adjacent edge so neighboring arcs
    // don't overlap.
    const r = Math.min(cornerRadius, lenIn / 2, lenOut / 2);

    const before = { x: here.x + inUnit.x * r, y: here.y + inUnit.y * r };
    const after = { x: here.x + outUnit.x * r, y: here.y + outUnit.y * r };

    if (i === 0) {
      cmds.push(`M ${before.x.toFixed(2)} ${before.y.toFixed(2)}`);
    } else {
      cmds.push(`L ${before.x.toFixed(2)} ${before.y.toFixed(2)}`);
    }
    cmds.push(
      `Q ${here.x.toFixed(2)} ${here.y.toFixed(2)} ${after.x.toFixed(2)} ${after.y.toFixed(2)}`,
    );
  }
  // Close back to the starting "before" position. The last Q lands at
  // an "after" point on the edge from points[n-1] to points[0]; we need
  // to L back to the M point (the "before" of points[0]) to close.
  cmds.push("Z");
  return cmds.join(" ");
}

/**
 * Compose: given two shapes and a progress `t`, return the path `d`.
 *
 * Corner radius is interpolated between the two shapes' `cornerRadius`
 * fields alongside position. So a sharp triangle (radius=0) morphing to
 * a rounded hexagon (radius=10) will both reshape AND round-out in one
 * motion — the corners visibly inflate as the polygon unfolds.
 *
 * An explicit `cornerRadius` override (e.g. for component-level demos
 * that want a uniform radius across all shapes in a cycle) wins over
 * the per-shape values. Pass undefined to use per-shape interpolation.
 *
 * Topology count defaults to the LCM of the two side counts.
 */
export function morphShapePath({
  from,
  to,
  t,
  cornerRadius,
  cx,
  cy,
  topologyCount,
}: {
  from: ShapeConfig;
  to: ShapeConfig;
  t: number;
  /** If set, overrides both shapes' per-shape cornerRadius. */
  cornerRadius?: number;
  cx: number;
  cy: number;
  topologyCount?: number;
}): string {
  const N = topologyCount ?? lcm(from.sides, to.sides);
  const a = polygonPerimeterPoints(from, N);
  const b = polygonPerimeterPoints(to, N);
  const interp = lerpPoints(a, b, t);
  const r =
    cornerRadius ??
    (from.cornerRadius ?? 0) +
      ((to.cornerRadius ?? 0) - (from.cornerRadius ?? 0)) * t;
  return pointsToPathD(interp, r, cx, cy);
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}
function lcm(a: number, b: number): number {
  return (a * b) / gcd(a, b);
}
