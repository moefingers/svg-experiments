import Link from "next/link";
import {
  geodesic,
  goldbergClassI,
  icosahedron,
  meshStats,
} from "@/lib/polyhedra";
import { Polyhedron } from "./Polyhedron";
import styles from "./page.module.css";

/**
 * Polyhedra comparison page. Renders five candidate sphere structures
 * for the UNLV museum at full width (capped by min(100vh, 100vw)):
 *
 *   1. Icosahedron               — 20 triangles (baseline)
 *   2. Frequency-2 geodesic      — 80 triangles (icosphere sub-1)
 *   3. Goldberg GP(1,0)          — dodecahedron, 12 pentagons
 *   4. Goldberg GP(2,0)          — 42 faces (12 penta + 30 hexa)
 *   5. Goldberg GP(3,0)          — 92 faces (12 penta + 80 hexa) — recommended
 *
 * Each polyhedron auto-rotates so all sides are visible over time. Faces
 * are tinted by camera-facing-ness (back faces dimmer, front faces brighter);
 * pentagonal faces in the Goldberg variants get an accent color so the
 * 12-pentagon constraint is legible at a glance.
 */
export default function PolyhedraPage() {
  const variants = [
    {
      title: "Icosahedron",
      subtitle: "frequency-1 geodesic — 20 triangles",
      mesh: icosahedron(),
      pentaAccent: false,
    },
    {
      title: "Icosphere sub-1",
      subtitle: "frequency-2 geodesic — 80 triangles",
      mesh: geodesic(2),
      pentaAccent: false,
    },
    {
      title: "Dodecahedron",
      subtitle: "Goldberg GP(1,0) — 12 pentagons",
      mesh: goldbergClassI(1),
      pentaAccent: true,
    },
    {
      title: "Goldberg GP(2,0)",
      subtitle: "42 faces — 12 pentagons + 30 hexagons",
      mesh: goldbergClassI(2),
      pentaAccent: true,
    },
    {
      title: "Goldberg GP(3,0)",
      subtitle:
        "92 faces — 12 pentagons + 80 hexagons (recommended for museum)",
      mesh: goldbergClassI(3),
      pentaAccent: true,
    },
  ];

  return (
    <div className={styles.shell}>
      <div className={styles.header}>
        <Link href="/" className={styles.backLink}>
          ← back to experiments
        </Link>
        <h1 className={styles.title}>Polyhedra</h1>
        <p className={styles.intro}>
          Candidate sphere structures for the UNLV museum. Each polyhedron is
          rendered full-width (capped at <code>min(100vh, 100vw)</code> per the
          brief) and auto-rotates so all sides are visible. Pentagons in the
          Goldberg variants are accented so the 12-pentagon constraint is
          legible.
        </p>
      </div>

      {variants.map((v) => {
        const stats = meshStats(v.mesh);
        return (
          <section key={v.title} className={styles.variant}>
            <div className={styles.variantHeader}>
              <h2 className={styles.variantTitle}>{v.title}</h2>
              <p className={styles.variantSubtitle}>{v.subtitle}</p>
              <p className={styles.variantStats}>
                {stats.vertices} vertices · {stats.faces} faces ·{" "}
                {Object.entries(stats.faceShapeCounts)
                  .map(([sides, count]) => `${count}× ${sides}-gon`)
                  .join(" · ")}
              </p>
            </div>
            <div className={styles.canvas}>
              <Polyhedron mesh={v.mesh} highlightPentagons={v.pentaAccent} />
            </div>
          </section>
        );
      })}
    </div>
  );
}
