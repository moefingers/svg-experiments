/**
 * Polyhedron generation: icosahedron, frequency-N geodesic subdivisions,
 * and their Goldberg duals.
 *
 * Data model:
 *   Vec3:      { x, y, z } — a unit-sphere point (normalized).
 *   Mesh:      { vertices: Vec3[], faces: number[][] }
 *              faces are arrays of vertex indices, ordered counter-clockwise
 *              when viewed from outside the sphere.
 *
 * The face winding convention matters for backface culling at render time:
 *   compute the face normal as cross(B-A, C-A); if normal · viewVector > 0
 *   the face is back-facing and can be skipped.
 */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Mesh {
  vertices: Vec3[];
  /**
   * Each face is a list of vertex indices, in CCW order viewed from
   * outside the sphere. Triangles have 3 indices; pentagons 5; hexagons
   * 6. Mixed face counts are fine — that's the Goldberg case.
   */
  faces: number[][];
}

// ─── Vec3 helpers ─────────────────────────────────────────────────

export function v3(x: number, y: number, z: number): Vec3 {
  return { x, y, z };
}

export function add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function scale(a: Vec3, k: number): Vec3 {
  return { x: a.x * k, y: a.y * k, z: a.z * k };
}

export function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

export function length(a: Vec3): number {
  return Math.hypot(a.x, a.y, a.z);
}

export function normalize(a: Vec3): Vec3 {
  const l = length(a);
  if (l === 0) return { x: 0, y: 0, z: 0 };
  return { x: a.x / l, y: a.y / l, z: a.z / l };
}

export function centroid(points: Vec3[]): Vec3 {
  const sum = points.reduce(
    (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y, z: acc.z + p.z }),
    { x: 0, y: 0, z: 0 },
  );
  const n = points.length;
  return { x: sum.x / n, y: sum.y / n, z: sum.z / n };
}

// ─── Icosahedron (frequency-1 geodesic) ───────────────────────────

/**
 * Generate the icosahedron — 12 vertices and 20 equilateral triangular
 * faces inscribed in the unit sphere. Vertices come from the canonical
 * triple (±1, ±φ, 0) cyclic-permuted, then normalized.
 */
export function icosahedron(): Mesh {
  const phi = (1 + Math.sqrt(5)) / 2;
  const raw: Vec3[] = [
    // (±1, ±φ, 0) — three vertices? no, four per cyclic group, twelve total.
    { x: -1, y: phi, z: 0 },
    { x: 1, y: phi, z: 0 },
    { x: -1, y: -phi, z: 0 },
    { x: 1, y: -phi, z: 0 },

    { x: 0, y: -1, z: phi },
    { x: 0, y: 1, z: phi },
    { x: 0, y: -1, z: -phi },
    { x: 0, y: 1, z: -phi },

    { x: phi, y: 0, z: -1 },
    { x: phi, y: 0, z: 1 },
    { x: -phi, y: 0, z: -1 },
    { x: -phi, y: 0, z: 1 },
  ];
  const vertices = raw.map(normalize);

  // Canonical face list — each row is one triangle's three vertex indices.
  // Ordered CCW when viewed from outside.
  const faces: number[][] = [
    // top cap (around vertex 0)
    [0, 11, 5],
    [0, 5, 1],
    [0, 1, 7],
    [0, 7, 10],
    [0, 10, 11],
    // adjacent
    [1, 5, 9],
    [5, 11, 4],
    [11, 10, 2],
    [10, 7, 6],
    [7, 1, 8],
    // bottom adjacent
    [3, 9, 4],
    [3, 4, 2],
    [3, 2, 6],
    [3, 6, 8],
    [3, 8, 9],
    // bottom cap (around vertex 3, indirectly)
    [4, 9, 5],
    [2, 4, 11],
    [6, 2, 10],
    [8, 6, 7],
    [9, 8, 1],
  ];

  return { vertices, faces };
}

// ─── Frequency-N geodesic subdivision ──────────────────────────────

/**
 * Subdivide each triangular face into N² smaller triangles by trisecting
 * the edges into N segments and building a triangular grid. Each new
 * vertex is projected back onto the unit sphere.
 *
 * frequency = 1 returns the input unchanged.
 * frequency = 2 produces 80 triangles from a 20-tri icosahedron.
 * frequency = 3 produces 180 triangles.
 * frequency = 4 produces 320 triangles.
 *
 * Vertices on shared edges between adjacent input faces are deduplicated
 * by spatial hashing — without this, the dual operation produces wrong
 * neighbors.
 */
export function geodesicSubdivide(mesh: Mesh, frequency: number): Mesh {
  if (frequency <= 1) return mesh;

  const newVertices: Vec3[] = [];
  const vertexKey = new Map<string, number>();
  const KEY_PRECISION = 1e-6;

  const addVertex = (v: Vec3): number => {
    // Quantize coordinates for dedupe lookup.
    const k = `${Math.round(v.x / KEY_PRECISION)}|${Math.round(v.y / KEY_PRECISION)}|${Math.round(v.z / KEY_PRECISION)}`;
    const existing = vertexKey.get(k);
    if (existing !== undefined) return existing;
    const idx = newVertices.length;
    newVertices.push(v);
    vertexKey.set(k, idx);
    return idx;
  };

  const newFaces: number[][] = [];

  for (const face of mesh.faces) {
    const [iA, iB, iC] = face as [number, number, number];
    const A = mesh.vertices[iA]!;
    const B = mesh.vertices[iB]!;
    const C = mesh.vertices[iC]!;

    // Build a triangular grid of (frequency+1) rows. Row i has (N - i + 1)
    // points along it, going from (B + i*(A-B)/N) to (C + i*(A-C)/N).
    // The grid is parameterized by (i, j) where i is the row (0 = BC edge,
    // N = vertex A) and j is the column within the row (0 = B side, max = C side).
    const N = frequency;
    const grid: number[][] = [];
    for (let i = 0; i <= N; i++) {
      const row: number[] = [];
      const rowLen = N - i;
      for (let j = 0; j <= rowLen; j++) {
        // Barycentric coordinates: a + b + c = 1
        const a = i / N;
        const b = j === 0 && rowLen === 0 ? 0 : (rowLen - j) / N;
        const c = 1 - a - b;
        const p = normalize({
          x: a * A.x + b * B.x + c * C.x,
          y: a * A.y + b * B.y + c * C.y,
          z: a * A.z + b * B.z + c * C.z,
        });
        row.push(addVertex(p));
      }
      grid.push(row);
    }

    // Emit triangles. Each row i forms (N-i) "upward" triangles and (N-i-1)
    // "downward" triangles with row i+1.
    for (let i = 0; i < N; i++) {
      const rowLen = N - i;
      for (let j = 0; j < rowLen; j++) {
        // Upward triangle: (i,j) (i,j+1) (i+1,j)
        newFaces.push([grid[i]![j]!, grid[i]![j + 1]!, grid[i + 1]![j]!]);
      }
      for (let j = 0; j < rowLen - 1; j++) {
        // Downward triangle: (i,j+1) (i+1,j+1) (i+1,j)
        newFaces.push([
          grid[i]![j + 1]!,
          grid[i + 1]![j + 1]!,
          grid[i + 1]![j]!,
        ]);
      }
    }
  }

  return { vertices: newVertices, faces: newFaces };
}

// ─── Dual (Goldberg from geodesic) ─────────────────────────────────

/**
 * Build the dual polyhedron: each vertex of the input becomes a face,
 * each face becomes a vertex. The dual of a geodesic (triangular)
 * polyhedron is a Goldberg polyhedron (pentagons + hexagons).
 *
 * Construction:
 *   1. For each face F of the input, compute its centroid (projected
 *      back onto the sphere) — these are the dual's vertices.
 *   2. For each vertex V of the input, find every face that contains V.
 *      Those faces' centroids form the dual face around V. The face is
 *      a pentagon if 5 faces meet at V, a hexagon if 6 do.
 *   3. Order the dual face's vertices angularly around V's normal so the
 *      polygon winds correctly (CCW from outside).
 */
export function dual(mesh: Mesh): Mesh {
  // Step 1: dual vertices = original face centroids (projected to sphere)
  const dualVerts: Vec3[] = mesh.faces.map((f) => {
    const ps = f.map((i) => mesh.vertices[i]!);
    return normalize(centroid(ps));
  });

  // Step 2: build vertex → face adjacency. For each input vertex, list the
  // face indices that contain it.
  const vertexFaces: number[][] = mesh.vertices.map(() => []);
  mesh.faces.forEach((face, faceIdx) => {
    for (const vi of face) vertexFaces[vi]!.push(faceIdx);
  });

  // Step 3: for each input vertex, order its surrounding faces angularly.
  // Use the vertex's outward normal as the "up" axis; project each face
  // centroid onto the tangent plane and compute its angle.
  const dualFaces: number[][] = mesh.vertices.map((V, vi) => {
    const faces = vertexFaces[vi]!;
    if (faces.length < 3) return []; // degenerate, skip
    const normal = normalize(V);
    // Build an orthonormal frame (tangent, bitangent) on the plane perpendicular
    // to `normal`. Use Gram-Schmidt against an arbitrary non-parallel axis.
    const axis = Math.abs(normal.x) > 0.9 ? v3(0, 1, 0) : v3(1, 0, 0);
    const tangent = normalize(cross(normal, axis));
    const bitangent = cross(normal, tangent);

    // For each face centroid (in dual coords), project to tangent plane,
    // compute angle.
    const angled = faces.map((faceIdx) => {
      const c = dualVerts[faceIdx]!;
      // Vector from V to c on the unit sphere.
      const d = sub(c, V);
      const u = dot(d, tangent);
      const w = dot(d, bitangent);
      return { faceIdx, angle: Math.atan2(w, u) };
    });
    angled.sort((a, b) => a.angle - b.angle);
    return angled.map((a) => a.faceIdx);
  });

  return { vertices: dualVerts, faces: dualFaces.filter((f) => f.length >= 3) };
}

// ─── Composite constructors ───────────────────────────────────────

/** Frequency-N geodesic icosphere (all triangles). */
export function geodesic(frequency: number): Mesh {
  return geodesicSubdivide(icosahedron(), frequency);
}

/**
 * Goldberg polyhedron GP(m, 0) for now (class I — straightforward dual
 * of frequency-m geodesic).
 *
 * Face counts:
 *   GP(1,0) = dodecahedron, 12 pentagons.
 *   GP(2,0) = 12 pentagons + 30 hexagons = 42 faces.
 *   GP(3,0) = 12 pentagons + 80 hexagons = 92 faces.
 *   GP(4,0) = 12 pentagons + 150 hexagons = 162 faces.
 */
export function goldbergClassI(frequency: number): Mesh {
  return dual(geodesic(frequency));
}

// ─── General (m, n) geodesic subdivision and Goldberg ─────────────

/**
 * General (m, n) geodesic subdivision of a triangular mesh. Each input
 * triangle is replaced by T = m² + mn + n² smaller triangles laid out
 * on a triangular lattice that may be rotated / sheared relative to
 * the input edges:
 *   - (m, 0)        Class I    grid aligned with edges
 *   - (m, m)        Class II   grid rotated 30°
 *   - (m, n), m≠n   Class III  chiral
 *
 * This is a direct port of antitile's general Goldberg-Coxeter construction
 * (brsr/antitile on GitHub):
 *   - `breakdown.py::Breakdown._t`            per-face lattice + half-plane
 *                                             clipping + barycentric matrix
 *   - `breakdown.py::lindex_reorient`         roll/flip lindex for shared edge
 *   - `tiling.py::orient_face`                find roll/flip for shared edge
 *   - `gcopoly.py::_stitch`                   match vertices across one edge
 *   - `gcopoly.py::_find_dupe_verts`          union-find on all edges
 *   - `gcopoly.py::GCOPoly.__init__`          assembly loop
 *
 * The lindex (linear-index) machinery is what makes seam-matching exact
 * for Class III chiral breakdowns. Spatial-hash dedupe is insufficient
 * because buffer points outside the breakdown triangle map to different
 * 3D positions in adjacent faces; lindex dedupe operates on integer
 * coordinates *in the shared-edge frame*, so it matches symbolically.
 */
export function geodesicSubdivideMN(mesh: Mesh, m: number, n: number): Mesh {
  if (m < 0 || n < 0) throw new Error(`Invalid Goldberg index (${m},${n})`);
  if (m === 0 && n === 0) return mesh;
  // Class I fast path — exact via the existing aligned subdivision.
  if (n === 0) return geodesicSubdivide(mesh, m);
  if (m === 0) return geodesicSubdivide(mesh, n);

  return goldbergCoxeter(mesh, m, n);
}

// ─── Breakdown structure (antitile breakdown.py::Breakdown) ────────

/**
 * Per-face triangular breakdown structure. Each entry is a lattice point
 * in `(x, y)` planar coords (translated so the breakdown triangle has
 * corners at `(0,0)`, `(a,b)`, `(-b, a+b)`). The `lindex` is a 3-tuple
 * of integers that uniquely names the point in a coordinate system
 * tied to the breakdown triangle's three edges — this is what makes
 * cross-face vertex matching exact.
 *
 * `group` mirrors antitile's classification:
 *   0       interior point
 *   90-92   one of the three corner vertices (A, B, C)
 *   100-102 on one of the three edges
 *   200-202 outside but adjacent to inside (buffer — survives the filter
 *           because its corresponding point lives in an adjacent face
 *           and will be merged via the lindex stitch)
 */
interface Breakdown {
  freq: [number, number];
  /** Triangulated face list as triples into `lindex`/`coord`. */
  faces: number[][];
  /** Linear-index `(u, v, w)` per vertex — integer, used for stitching. */
  lindex: [number, number, number][];
  /** Barycentric `(a, b, c)` per vertex — used to project to the sphere. */
  coord: [number, number, number][];
  /** Group classification per vertex (see comment above). */
  group: number[];
}

function buildBreakdown(a: number, b: number): Breakdown {
  // Antitile's FlatTiling builds a v×v cube-coord grid with v = a+b+1,
  // then translates `x -= b`. The flat tiling carries two triangles per
  // unit cell:
  //   T1 = (0,0), (1,0), (0,1)
  //   T2 = (0,0), (0,1), (-1,1)
  const v = a + b + 1;

  // Raw vertex list (one entry per `(rawX, rawY)` in [0, v)).
  // We index by `rawX * v + rawY`.
  const idx = (rx: number, ry: number) => rx * v + ry;
  const N = v * v;
  const xs = new Int32Array(N);
  const ys = new Int32Array(N);
  for (let rx = 0; rx < v; rx++) {
    for (let ry = 0; ry < v; ry++) {
      xs[idx(rx, ry)] = rx - b; // translate: x -= b
      ys[idx(rx, ry)] = ry;
    }
  }

  // Build raw face list (two triangles per cell, only where all corners
  // are in-grid).
  const rawFaces: number[][] = [];
  for (let rx = 0; rx < v; rx++) {
    for (let ry = 0; ry < v; ry++) {
      // T1: (rx, ry), (rx+1, ry), (rx, ry+1)
      if (rx + 1 < v && ry + 1 < v) {
        rawFaces.push([idx(rx, ry), idx(rx + 1, ry), idx(rx, ry + 1)]);
      }
      // T2: (rx, ry), (rx, ry+1), (rx-1, ry+1)
      if (rx - 1 >= 0 && ry + 1 < v) {
        rawFaces.push([idx(rx, ry), idx(rx, ry + 1), idx(rx - 1, ry + 1)]);
      }
    }
  }

  // Classify each vertex via antitile's group scheme.
  // Breakdown triangle corners: (0,0), (a,b), (-b, a+b).
  const T = a * a + a * b + b * b;
  const group = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    const x = xs[i]!;
    const y = ys[i]!;
    // Half-plane edge equations:
    const side1 = a * y - b * x;
    const side2 = (a + b) * y + a * x;
    const side3 = (a + b) * x + b * y;
    // Antitile also assigns featural line/segment groups (1, 2, 3, 11..)
    // but they don't affect the final filter — only group >= 222 is
    // outside-and-irrelevant after _shared_group; group < 222 keeps it.
    if (side1 < 0 || side2 > T || side3 < 0) {
      group[i] = 255; // outside
    } else if (side1 === 0) {
      group[i] = 100; // on edge AB
    } else if (side2 === T) {
      group[i] = 101; // on edge BC
    } else if (side3 === 0) {
      group[i] = 102; // on edge CA
    } else {
      group[i] = 0; // interior
    }
    // Corner overrides (last so they win over edge classification).
    if (x === 0 && y === 0) group[i] = 90;
    else if (x === a && y === b) group[i] = 91;
    else if (x === -b && y === a + b) group[i] = 92;
  }

  // _shared_group: any outside vertex that participates in a face whose
  // other vertices include at least one inside (group < 90) point gets
  // promoted from 255 to 250 (still kept). Then the post-pass separates
  // those by which side they lie on (200/201/202) — but for the filter
  // group < 222 it doesn't matter which side; what matters is that
  // 250 < 222 is FALSE so... wait. Antitile keeps `group < cn` where
  // cn = 222 when `remove_outside=True`. 250 >= 222 → drop. 255 → drop.
  // So _shared_group's 250 mark is purely informational (the final
  // pass at 200/201/202 is what survives).
  // After _shared_group: group[(group == 250) & (side1 < 0)] = 200
  //                     group[(group == 250) & (side2 > anorm)] = 201
  //                     group[(group == 250) & (side3 < 0)] = 202
  const isInside = (g: number) => g < 90;
  // Two-pass _shared_group: first mark candidates as 250, then split
  // by side. Build face→vertex incidence on the fly.
  for (const f of rawFaces) {
    let anyInside = false;
    for (const vi of f) if (isInside(group[vi]!)) anyInside = true;
    if (!anyInside) continue;
    for (const vi of f) {
      const gv = group[vi]!;
      if (gv === 255) group[vi] = 250;
    }
  }
  for (let i = 0; i < N; i++) {
    if (group[i] !== 250) continue;
    const x = xs[i]!;
    const y = ys[i]!;
    const side1 = a * y - b * x;
    const side2 = (a + b) * y + a * x;
    const side3 = (a + b) * x + b * y;
    if (side1 < 0) group[i] = 200;
    else if (side2 > T) group[i] = 201;
    else if (side3 < 0) group[i] = 202;
  }

  // Filter: keep group < 222.
  // Build a renumbering map from raw index to compact index.
  const keep = new Int32Array(N);
  let next = 0;
  for (let i = 0; i < N; i++) {
    if (group[i]! < 222) keep[i] = next++;
    else keep[i] = -1;
  }

  // Emit the compact arrays.
  const lindex: [number, number, number][] = [];
  const coord: [number, number, number][] = [];
  const groupOut: number[] = [];
  for (let i = 0; i < N; i++) {
    if (keep[i] === -1) continue;
    const x = xs[i]!;
    const y = ys[i]!;
    // Barycentric coords from antitile's mat:
    //   mat = [[ -a, -b-a, T], [a+b, b, 0], [-b, a, 0]] / T
    // Applied as coords·mat.T with coords=(x, y, 1):
    //   ba = (-a·x + (a+b)·y + (-b)·1)... wait, antitile does coord = coords.dot(mat.T).
    // Let me reread: mat = [[-a,-b-a, T],[a+b, b, 0],[-b, a, 0]] / T.
    // coords[:,2] = 1 then coord = coords.dot(mat.T).
    // mat.T = [[-a, a+b, -b], [-b-a, b, a], [T, 0, 0]] / T.
    // coord = (x, y, 1) · mat.T = ( (-a)x + (-b-a)y + T,  (a+b)x + b·y,  (-b)x + a·y ) / T.
    // So:
    const cA = (-a * x - (a + b) * y + T) / T;
    const cB = ((a + b) * x + b * y) / T;
    const cC = (-b * x + a * y) / T;
    coord.push([cA, cB, cC]);
    // lindex: (u, v, w) = (x+y, a-x, a+b-y).
    lindex.push([x + y, a - x, a + b - y]);
    groupOut.push(group[i]!);
  }

  // Faces — renumber and drop any face touching a removed vertex.
  const faces: number[][] = [];
  for (const f of rawFaces) {
    const r0 = keep[f[0]!]!;
    const r1 = keep[f[1]!]!;
    const r2 = keep[f[2]!]!;
    if (r0 === -1 || r1 === -1 || r2 === -1) continue;
    faces.push([r0, r1, r2]);
  }

  return { freq: [a, b], faces, lindex, coord, group: groupOut };
}

// ─── lindex reorient (antitile breakdown.py::lindex_reorient) ──────

/**
 * Reorient a lindex array under a `(roll, flip)` operation. `roll`
 * rolls the 3-tuple cyclically; `flip` then reflects through the plane
 * with normal `(-b, a+b, -a)` (in the (u,v,w) lindex frame).
 *
 * Reflect_through_origin matrix:
 *   R = I - 2 · n·nᵀ / (n·n)
 * For n = (-b, a+b, -a), n·n = b² + (a+b)² + a² = 2(a² + ab + b²) = 2T.
 */
function lindexReorient(
  lindex: [number, number, number][],
  a: number,
  b: number,
  roll: number,
  flip: boolean,
): [number, number, number][] {
  // Antitile: if flip: n = n - 1. Then n = n % 3.
  let r = roll;
  if (flip) r = r - 1;
  r = ((r % 3) + 3) % 3;

  // Roll: np.roll along the last axis. roll=k means new[i] = old[(i-k) mod 3].
  // For a single 3-tuple (u, v, w), np.roll((u,v,w), 1) = (w, u, v).
  const rolled = lindex.map(([u, v, w]) => {
    const arr = [u, v, w];
    const out: [number, number, number] = [0, 0, 0];
    for (let i = 0; i < 3; i++) {
      out[i] = arr[(((i - r) % 3) + 3) % 3]!;
    }
    return out;
  });

  if (!flip) {
    return rolled.map(([u, v, w]) => [
      Math.round(u),
      Math.round(v),
      Math.round(w),
    ]);
  }

  // Reflection through the plane with normal `(-b, a+b, -a)`.
  const T = a * a + a * b + b * b;
  // R = I - n·nᵀ / T  (since n·n = 2T, the factor of 2 in 2·n·nᵀ / (n·n)
  // becomes n·nᵀ / T).
  // Apply R to each rolled lindex (treating each as a row vector and
  // doing result = rolled · R). In antitile: result.dot(rm).
  // R[i][j] = (i == j ? 1 : 0) - n[i] * n[j] / T
  const nVec: [number, number, number] = [-b, a + b, -a];
  const result: [number, number, number][] = [];
  for (const [u, v, w] of rolled) {
    const vec: [number, number, number] = [u, v, w];
    const out: [number, number, number] = [0, 0, 0];
    for (let j = 0; j < 3; j++) {
      let s = vec[j]!;
      for (let i = 0; i < 3; i++) {
        s -= (vec[i]! * nVec[i]! * nVec[j]!) / T;
      }
      out[j] = Math.round(s);
    }
    result.push(out);
  }
  return result;
}

// ─── orient_face (antitile tiling.py::orient_face) ──────────────────

/**
 * Find the `(roll, flip)` to align a face vertex list with a shared edge.
 *
 * Returns the roll value such that `np.roll(face, roll)[0:2]` matches the
 * edge (possibly reversed; `flip=true` means it matched reversed).
 */
function orientFace(
  face: number[],
  edge: [number, number],
): {
  roll: number;
  flip: boolean;
} {
  const indexes: number[] = [];
  for (let i = 0; i < face.length; i++) {
    if (face[i] === edge[0] || face[i] === edge[1]) indexes.push(i);
  }
  if (indexes.length !== 2)
    throw new Error("orient_face: edge not found in face");
  let roll: number;
  const [i0, i1] = indexes as [number, number];
  if ((i1 + 1) % face.length === i0) {
    roll = 1;
  } else if (i1 === i0 + 1) {
    roll = -i0;
  } else {
    throw new Error("orient_face: edge vertices not adjacent in face");
  }
  // np.roll with shift `roll`: rolled[i] = face[(i - roll) mod n].
  const n = face.length;
  const rolled: number[] = [];
  for (let i = 0; i < n; i++) {
    rolled.push(face[(((i - roll) % n) + n) % n]!);
  }
  if (rolled[0] === edge[0] && rolled[1] === edge[1]) {
    return { roll, flip: false };
  }
  if (rolled[0] === edge[1] && rolled[1] === edge[0]) {
    return { roll, flip: true };
  }
  throw new Error("orient_face: roll did not align edge");
}

// ─── _stitch (antitile gcopoly.py::_stitch) ─────────────────────────

/**
 * Given two triangular base faces sharing an edge, find which breakdown
 * lattice points should be identified across the seam.
 *
 * Returns pairs `[index_in_face0, index_in_face1]` into each face's
 * breakdown vertex list.
 */
function stitchEdge(
  edge: [number, number],
  face0: number[],
  face1: number[],
  bkdn: Breakdown,
): Array<[number, number]> {
  const [a, b] = bkdn.freq;
  // "improper" = symmetric breakdown (a==b: Class II, or b==0: Class I)
  // where the orientation flag matters.
  const improper = a === b || b === 0;
  const o0 = orientFace(face0, edge);
  const o1 = orientFace(face1, edge);
  const flip = o0.flip === o1.flip && improper;
  const li0 = lindexReorient(bkdn.lindex, a, b, o0.roll, flip);
  const li1 = lindexReorient(bkdn.lindex, a, b, o1.roll, false);
  // offset = (a+b, a, 2a+b). flipped = offset - li1.
  const flipped = li1.map(([u, v, w]): [number, number, number] => [
    a + b - u,
    a - v,
    2 * a + b - w,
  ]);
  // Match li0[i] == flipped[j].
  const matches: Array<[number, number]> = [];
  // Build a hash for the inner loop.
  const flippedKey = new Map<string, number[]>();
  for (let j = 0; j < flipped.length; j++) {
    const [u, v, w] = flipped[j]!;
    const k = `${u}|${v}|${w}`;
    let list = flippedKey.get(k);
    if (!list) {
      list = [];
      flippedKey.set(k, list);
    }
    list.push(j);
  }
  for (let i = 0; i < li0.length; i++) {
    const [u, v, w] = li0[i]!;
    const k = `${u}|${v}|${w}`;
    const list = flippedKey.get(k);
    if (!list) continue;
    for (const j of list) matches.push([i, j]);
  }
  return matches;
}

// ─── Union-find dedupe (antitile gcopoly.py::_find_dupe_verts) ──────

class UnionFind {
  parent: number[];
  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i);
  }
  find(x: number): number {
    let r = x;
    while (this.parent[r] !== r) r = this.parent[r]!;
    while (this.parent[x] !== r) {
      const next = this.parent[x]!;
      this.parent[x] = r;
      x = next;
    }
    return r;
  }
  union(x: number, y: number): void {
    const rx = this.find(x);
    const ry = this.find(y);
    if (rx !== ry) this.parent[rx] = ry;
  }
}

// ─── Top-level assembly (antitile gcopoly.py::GCOPoly.__init__) ────

function goldbergCoxeter(mesh: Mesh, m: number, n: number): Mesh {
  const bkdn = buildBreakdown(m, n);
  const nPerFace = bkdn.lindex.length;
  const totalRaw = mesh.faces.length * nPerFace;

  // Per-vertex base-face index, group, and 3D position.
  const baseFace = new Int32Array(totalRaw);
  const groupArr = new Uint8Array(totalRaw);
  const positions: Vec3[] = new Array(totalRaw);
  for (let fi = 0; fi < mesh.faces.length; fi++) {
    const face = mesh.faces[fi]!;
    if (face.length !== 3) {
      throw new Error("goldbergCoxeter: base face must be a triangle");
    }
    const [iA, iB, iC] = face as [number, number, number];
    const A = mesh.vertices[iA]!;
    const B = mesh.vertices[iB]!;
    const C = mesh.vertices[iC]!;
    for (let k = 0; k < nPerFace; k++) {
      const globalIdx = fi * nPerFace + k;
      baseFace[globalIdx] = fi;
      groupArr[globalIdx] = bkdn.group[k]!;
      const [cA, cB, cC] = bkdn.coord[k]!;
      positions[globalIdx] = normalize({
        x: cA * A.x + cB * B.x + cC * C.x,
        y: cA * A.y + cB * B.y + cC * C.y,
        z: cA * A.z + cB * B.z + cC * C.z,
      });
    }
  }

  // Edges shared between base faces. Use sorted (min, max) tuples.
  const edgeKey = (u: number, v: number) => (u < v ? `${u}|${v}` : `${v}|${u}`);
  const edgeFaces = new Map<string, number[]>();
  for (let fi = 0; fi < mesh.faces.length; fi++) {
    const face = mesh.faces[fi]!;
    for (let i = 0; i < face.length; i++) {
      const a = face[i]!;
      const b = face[(i + 1) % face.length]!;
      const k = edgeKey(a, b);
      let list = edgeFaces.get(k);
      if (!list) {
        list = [];
        edgeFaces.set(k, list);
      }
      list.push(fi);
    }
  }

  // Union-find over all raw vertices.
  const uf = new UnionFind(totalRaw);
  for (const [k, faceIds] of edgeFaces) {
    if (faceIds.length < 2) continue;
    if (faceIds.length > 2) {
      // antitile warns and picks the first two; we do the same.
    }
    const [fa, fb] = faceIds as [number, number, ...number[]];
    const [uStr, vStr] = k.split("|") as [string, string];
    const edge: [number, number] = [parseInt(uStr, 10), parseInt(vStr, 10)];
    const matches = stitchEdge(edge, mesh.faces[fa]!, mesh.faces[fb]!, bkdn);
    for (const [iA, iB] of matches) {
      uf.union(fa * nPerFace + iA, fb * nPerFace + iB);
    }
  }

  // For each connected component, pick the canonical representative as
  // the vertex with the lowest group number (antitile uses argsort(gp)
  // and picks component[0]). This ensures corners (group 90+) lose to
  // interior (0) — but cross-face corners *only* merge with other
  // corners, so they merge with each other.
  const componentRep = new Int32Array(totalRaw);
  const componentBestGroup = new Int32Array(totalRaw).fill(256);
  // First pass: for each root, find lowest group.
  for (let i = 0; i < totalRaw; i++) {
    const r = uf.find(i);
    if (groupArr[i]! < componentBestGroup[r]!) {
      componentBestGroup[r] = groupArr[i]!;
      componentRep[r] = i;
    }
  }
  // Second pass: vertex i maps to componentRep[root(i)].
  const repIndex = new Int32Array(totalRaw);
  for (let i = 0; i < totalRaw; i++) {
    repIndex[i] = componentRep[uf.find(i)]!;
  }

  // Renumber: produce a compact vertex list of just the representatives.
  const compact = new Int32Array(totalRaw).fill(-1);
  const newVertices: Vec3[] = [];
  const newGroup: number[] = [];
  const newBaseFace: number[] = [];
  for (let i = 0; i < totalRaw; i++) {
    if (repIndex[i] === i) {
      compact[i] = newVertices.length;
      newVertices.push(positions[i]!);
      newGroup.push(groupArr[i]!);
      newBaseFace.push(baseFace[i]!);
    }
  }
  // Compact lookup for non-reps.
  const finalIdx = (rawI: number): number => compact[repIndex[rawI]!]!;

  // Emit triangulated faces, with per-base-face vertex offset.
  const rawFaces: number[][] = [];
  const faceBase: number[] = [];
  for (let fi = 0; fi < mesh.faces.length; fi++) {
    const offset = fi * nPerFace;
    for (const f of bkdn.faces) {
      const t: number[] = [];
      for (const k of f) t.push(finalIdx(offset + k));
      // Drop degenerate (collapsed) triangles.
      if (t[0] === t[1] || t[1] === t[2] || t[0] === t[2]) continue;
      rawFaces.push(t);
      faceBase.push(fi);
    }
  }

  // Class III / II (b != 0): faces can be duplicated across the seam
  // when a sub-triangle straddles the breakdown boundary. Dedupe by
  // sorted vertex-triple — same triple = same face.
  const seenFaces = new Set<string>();
  const dedupedFaces: number[][] = [];
  for (const f of rawFaces) {
    const sorted = [...f].sort((x, y) => x - y);
    const k = sorted.join("|");
    if (seenFaces.has(k)) continue;
    seenFaces.add(k);
    dedupedFaces.push(f);
  }

  void newGroup;
  void newBaseFace;
  return { vertices: newVertices, faces: dedupedFaces };
}

/**
 * General Goldberg polyhedron GP(m, n). See geodesicSubdivideMN for the
 * implementation status — Class II/III are currently approximated as
 * higher-frequency Class I until the full (m, n) lattice walk lands.
 *
 * Face counts (T = m² + mn + n²):
 *   GP(m, n) has 12 pentagons + 10·(T - 1) hexagons = 12 + 10·(T - 1) faces.
 *   GP(1, 1) → T=3 → 32 faces
 *   GP(2, 1) → T=7 → 72 faces
 *   GP(3, 1) → T=13 → 132 faces
 */
export function goldberg(m: number, n: number): Mesh {
  if (n === 0) return goldbergClassI(m);
  if (m === 0) return goldbergClassI(n);
  return dual(geodesicSubdivideMN(icosahedron(), m, n));
}

/**
 * Expected face count for GP(m, n). Useful as a sanity check on the
 * generator and for UI display. T-number = m² + mn + n².
 */
export function goldbergFaceCount(
  m: number,
  n: number,
): {
  T: number;
  pentagons: number;
  hexagons: number;
  total: number;
} {
  const T = m * m + m * n + n * n;
  const pentagons = 12;
  const hexagons = 10 * (T - 1);
  return { T, pentagons, hexagons, total: pentagons + hexagons };
}

// ─── Stats helper (for UI display) ────────────────────────────────

export interface MeshStats {
  vertices: number;
  faces: number;
  faceShapeCounts: Record<number, number>;
}

export function meshStats(mesh: Mesh): MeshStats {
  const shapeCounts: Record<number, number> = {};
  for (const f of mesh.faces) {
    shapeCounts[f.length] = (shapeCounts[f.length] ?? 0) + 1;
  }
  return {
    vertices: mesh.vertices.length,
    faces: mesh.faces.length,
    faceShapeCounts: shapeCounts,
  };
}
