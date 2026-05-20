"use client";

import { useEffect, useMemo, useState } from "react";
import {
  cross,
  dot,
  normalize,
  sub,
  type Mesh,
  type Vec3,
} from "@/lib/polyhedra";
import styles from "./Polyhedron.module.css";

/**
 * Renders a polyhedron as a flat SVG, projected from 3D with a simple
 * perspective camera. Auto-rotates around the Y axis (and tilts on X)
 * so visitors see all sides over time.
 *
 * Rendering pipeline per frame:
 *   1. Compute current rotation matrix (Y * X) from elapsed time.
 *   2. Transform every vertex by the rotation.
 *   3. For each face: compute centroid Z (for painter's-algorithm sort)
 *      and face normal (for backface culling).
 *   4. Skip backfacing faces — those where the face normal points
 *      away from the camera.
 *   5. Project remaining face vertices to 2D using perspective division.
 *   6. Sort faces back-to-front by centroid Z so closer faces draw last.
 *   7. Render each face as an SVG <polygon>.
 *
 * The viewBox is centered on (0, 0); the polyhedron sits at the origin
 * with its bounding sphere inside the viewBox.
 */
export function Polyhedron({
  mesh,
  size = 600,
  rotationDuration = 24,
  axialTilt = 18,
  faceFill = "rgba(180, 180, 200, 0.18)",
  faceFillFront = "rgba(180, 180, 200, 0.42)",
  edgeColor = "rgba(60, 60, 80, 0.7)",
  edgeWidth = 0.6,
  pentagonAccent = "rgba(245, 158, 11, 0.55)",
  highlightPentagons = false,
}: {
  mesh: Mesh;
  /** SVG viewBox edge (also the displayed size in pixels at 1:1). */
  size?: number;
  /** Seconds for one full Y rotation. */
  rotationDuration?: number;
  /** X-axis tilt in degrees (sphere leans toward viewer at top). */
  axialTilt?: number;
  /** Fill color for faces in the back (further from camera). */
  faceFill?: string;
  /** Fill color for faces directly facing the camera. */
  faceFillFront?: string;
  /** Edge stroke color. */
  edgeColor?: string;
  /** Edge stroke width in viewBox units. */
  edgeWidth?: number;
  /**
   * When true, pentagonal faces get a distinguishing accent fill so the
   * Goldberg structure is legible.
   */
  highlightPentagons?: boolean;
  /** Accent fill applied to pentagons when highlightPentagons is true. */
  pentagonAccent?: string;
}) {
  const [t, setT] = useState(0);

  // Drive `t` (in seconds) via rAF. We accumulate elapsed time and rely
  // on React to throttle paints; setting state on every frame is fine
  // at <300 vertices.
  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const tick = (now: number) => {
      setT((now - start) / 1000);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Compute rotation matrices.
  const angleY = (t / rotationDuration) * Math.PI * 2;
  const angleX = (axialTilt * Math.PI) / 180;

  // Camera distance — large enough that perspective is gentle, not fisheye.
  const cameraZ = 4;
  // Projection scale — maps unit-sphere radius to a fraction of viewBox.
  const scale = size * 0.4;
  const cx = size / 2;
  const cy = size / 2;

  // Rotate + project all vertices once. Memoized so face iteration below
  // doesn't redo work per face.
  const projected = useMemo(() => {
    const cosY = Math.cos(angleY);
    const sinY = Math.sin(angleY);
    const cosX = Math.cos(angleX);
    const sinX = Math.sin(angleX);
    return mesh.vertices.map((v) => {
      // Rotate around Y, then around X.
      const x1 = v.x * cosY + v.z * sinY;
      const z1 = -v.x * sinY + v.z * cosY;
      const y2 = v.y * cosX - z1 * sinX;
      const z2 = v.y * sinX + z1 * cosX;
      const x = x1;
      const y = y2;
      const z = z2;
      // Perspective projection: x' = x * cameraZ / (cameraZ - z)
      const persp = cameraZ / (cameraZ - z);
      return {
        x: x * persp * scale + cx,
        y: -y * persp * scale + cy, // flip Y so up is up
        z, // keep camera-space z for sorting
        world: { x, y, z } satisfies Vec3,
      };
    });
  }, [mesh.vertices, angleX, angleY, cameraZ, scale, cx, cy]);

  // Process faces: compute centroid Z, normal, backface-cull, project.
  const faceRecords = useMemo(() => {
    const records: {
      idx: number;
      points: { x: number; y: number }[];
      centroidZ: number;
      sides: number;
      facingCamera: number; // 0 = edge-on, 1 = directly toward camera
    }[] = [];

    for (let i = 0; i < mesh.faces.length; i++) {
      const face = mesh.faces[i]!;
      const pts = face.map((vi) => projected[vi]!);

      // Compute face normal in world space (rotated). Use first three
      // vertices; for non-triangle faces this is an approximation but
      // accurate for convex regular polygons centered on the sphere.
      const A = pts[0]!.world;
      const B = pts[1]!.world;
      const C = pts[2]!.world;
      const edge1 = sub(B, A);
      const edge2 = sub(C, A);
      const normal = normalize(cross(edge1, edge2));

      // Camera looks down -Z; camera-to-face vector at the centroid is roughly
      // the world-space centroid (since camera is at +Z far away).
      // Backface = normal points away from camera = normal.z < 0.
      // We pre-cull edge-on and back-facing to skip work.
      if (normal.z < -0.05) continue;

      // Centroid Z for painter's sort.
      let cz = 0;
      for (const p of pts) cz += p.z;
      cz /= pts.length;

      records.push({
        idx: i,
        points: pts.map((p) => ({ x: p.x, y: p.y })),
        centroidZ: cz,
        sides: face.length,
        facingCamera: Math.max(0, normal.z),
      });
    }

    // Painter's algorithm: draw back (smaller z) first, front (larger z) last.
    records.sort((a, b) => a.centroidZ - b.centroidZ);
    return records;
  }, [mesh.faces, projected]);

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className={styles.svg}>
      {faceRecords.map((face) => {
        const isPenta = face.sides === 5;
        // Faces directly facing the camera get a brighter fill so the
        // viewer can see "this is the front." Interpolate between back
        // and front fill by facingCamera (0..1).
        const fill =
          isPenta && highlightPentagons
            ? pentagonAccent
            : interpolateFill(faceFill, faceFillFront, face.facingCamera);
        return (
          <polygon
            key={face.idx}
            points={face.points
              .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
              .join(" ")}
            fill={fill}
            stroke={edgeColor}
            strokeWidth={edgeWidth}
            strokeLinejoin="round"
          />
        );
      })}
    </svg>
  );
}

/**
 * Linearly blend two rgba() strings by parameter t in [0, 1]. Simple
 * and tolerant — assumes both inputs are rgba(r, g, b, a).
 */
function interpolateFill(a: string, b: string, t: number): string {
  const pa = parseRgba(a);
  const pb = parseRgba(b);
  if (!pa || !pb) return a;
  const r = pa.r + (pb.r - pa.r) * t;
  const g = pa.g + (pb.g - pa.g) * t;
  const bl = pa.b + (pb.b - pa.b) * t;
  const al = pa.a + (pb.a - pa.a) * t;
  return `rgba(${r.toFixed(0)}, ${g.toFixed(0)}, ${bl.toFixed(0)}, ${al.toFixed(3)})`;
}

function parseRgba(
  s: string,
): { r: number; g: number; b: number; a: number } | null {
  const m = s.match(
    /rgba?\s*\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+))?\s*\)/,
  );
  if (!m) return null;
  return {
    r: parseFloat(m[1]!),
    g: parseFloat(m[2]!),
    b: parseFloat(m[3]!),
    a: m[4] !== undefined ? parseFloat(m[4]) : 1,
  };
}
