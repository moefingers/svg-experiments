import { goldberg, goldbergFaceCount, meshStats } from "../src/lib/polyhedra";

const cases: Array<[number, number]> = [
  [1, 0],
  [2, 0],
  [3, 0],
  [1, 1],
  [2, 1],
  [2, 2],
  [3, 1],
  [3, 2],
];

let ok = true;
for (const [m, n] of cases) {
  const mesh = goldberg(m, n);
  const stats = meshStats(mesh);
  const expected = goldbergFaceCount(m, n);
  const hex = stats.faceShapeCounts[6] ?? 0;
  const penta = stats.faceShapeCounts[5] ?? 0;
  const pass =
    stats.faces === expected.total &&
    hex === expected.hexagons &&
    penta === expected.pentagons;
  if (!pass) ok = false;
  console.log(
    `GP(${m},${n})  T=${expected.T}  expected=${expected.total} (12p + ${expected.hexagons}h)  got=${stats.faces} (${penta}p + ${hex}h) verts=${stats.vertices}  ${pass ? "PASS" : "FAIL"}`,
  );
}
process.exit(ok ? 0 : 1);
