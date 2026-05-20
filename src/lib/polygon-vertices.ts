/**
 * Compute the vertex positions of a regular n-gon under a uniform
 * topology of N vertices (N >= n). When N > n, the extra "vertices"
 * are placed on the edges of the n-gon, evenly distributed, so they
 * sit invisibly on a straight segment.
 *
 * This lets the unfold animation use a single fixed vertex count (the
 * final hexagon's 6) while morphing between intermediate shapes (line
 * = 2, triangle = 3, square = 4, ...). Mid-edge vertices live on the
 * polygon's perimeter at the appropriate angular position; promoting
 * a mid-edge vertex to a real corner happens by pulling its target
 * angle to a corner of the higher-n polygon.
 *
 * Special case n=1 ("dot"): all topology vertices collapse onto the
 * centroid (radius=0). Used as the starting state for the unfold —
 * every vertex springs out from a single point.
 */

import { polygonPerimeterPoints, type ShapeConfig } from "./polygon-path";

export function unfoldStageVertices(
  stage: number,
  topologyCount: number,
  radius: number,
  rotation = 0,
): { x: number; y: number }[] {
  if (stage <= 0) {
    // Dot — all vertices collapsed at origin.
    return Array.from({ length: topologyCount }, () => ({ x: 0, y: 0 }));
  }
  if (stage === 1) {
    // Line — two real endpoints on opposite sides, mid-edge slots on
    // the line between them. polygonPerimeterPoints with sides=2 gives
    // a degenerate "polygon" (line) which is exactly what we want: the
    // two corners are at (radius, 0) and (-radius, 0), the rest are
    // interpolated along that segment.
    const config: ShapeConfig = { sides: 2, radius, rotation };
    return polygonPerimeterPoints(config, topologyCount);
  }
  // n-gon under uniform topology for n >= 2.
  const config: ShapeConfig = { sides: stage + 1, radius, rotation };
  return polygonPerimeterPoints(config, topologyCount);
}

/**
 * Stage labels for UI debugging — what shape each stage represents.
 */
export const STAGE_LABELS = [
  "dot",
  "line",
  "triangle",
  "square",
  "pentagon",
  "hexagon",
] as const;

export const FINAL_STAGE = STAGE_LABELS.length - 1; // hexagon, 5
