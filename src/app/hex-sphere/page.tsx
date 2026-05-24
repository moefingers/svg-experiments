import Link from "next/link";
import { goldbergClassI } from "@/lib/polyhedra";
import { HexSphere } from "./HexSphere";
import styles from "./page.module.css";

/**
 * Hex-sphere prototypes — exploration for the Infinite Syndicate homepage.
 *
 * Same underlying mesh in every variant: Goldberg GP(3,0) — 92 faces
 * (12 pentagons + 80 hexagons), the smallest hex-sphere that *reads* as
 * a hex sphere rather than a soccer ball. 12 pentagons are a geometric
 * necessity (any sphere tiled with hexagons needs exactly 12 pentagons
 * to handle Gaussian curvature — same constraint that gives soccer
 * balls and fullerenes their pentagons).
 *
 * Variants differ in camera position and atmosphere only:
 *   - Exterior calm: standard distance, gentle parallax, you're observing the sphere
 *   - Exterior wide: pulled back further, sphere smaller, more "world" around it
 *   - Interior: camera moved inside the sphere; you're looking at the inner surface
 *   - Ambiguous: edge-of-sphere placement where inside/outside reading flips
 *
 * Parallax model: cursor controls a target tilt (capped at TILT_RANGE
 * degrees). Each frame, current tilt lerps toward target with a
 * damping factor so motion feels weighty, not snappy. When cursor has
 * been idle for IDLE_MS, a slow autonomous drift takes over so the
 * sphere always feels alive.
 *
 * 5 labeled hexagons are highlighted on each sphere as the
 * "navigable cluster" — placeholder content for what would become the
 * homepage's 5 offerings (Web Presence, Custom Software, etc).
 */
export default function HexSpherePage() {
  // GP(3,0): 92 faces total. 12 pentagons + 80 hexagons.
  const mesh = goldbergClassI(3);

  const variants = [
    {
      title: "Exterior — calm",
      subtitle: "standard camera distance, gentle parallax around the sphere",
      cameraZ: 4,
      cameraInside: false,
      atmosphere: 0.35,
    },
    {
      title: "Exterior — wide",
      subtitle: "pulled back; the sphere sits in a wider field of view",
      cameraZ: 6,
      cameraInside: false,
      atmosphere: 0.5,
    },
    {
      title: "Interior — surrounded",
      subtitle:
        "camera moved inside the shell; you're looking at the inner surface",
      cameraZ: 0.4,
      cameraInside: true,
      atmosphere: 0.2,
    },
    {
      title: "Ambiguous — at the edge",
      subtitle:
        "camera just outside the surface; inside/outside reading flips on parallax",
      cameraZ: 1.15,
      cameraInside: false,
      atmosphere: 0.3,
    },
  ];

  return (
    <div className={styles.shell}>
      <div className={styles.header}>
        <Link href="/" className={styles.backLink}>
          ← back to experiments
        </Link>
        <h1 className={styles.title}>Hex sphere</h1>
        <p className={styles.intro}>
          A Goldberg GP(3,0) — 92 faces, 12 pentagons + 80 hexagons — explored
          as candidate geometry for the Infinite Syndicate homepage. Move the
          cursor over each canvas to tilt the sphere; if you leave it idle for a
          moment it drifts on its own. The five labeled cells are the would-be
          navigation slots. Move the cursor outside the canvas to let it settle;
          bring it back in to take control again.
        </p>
      </div>

      {variants.map((v) => (
        <section key={v.title} className={styles.variant}>
          <div className={styles.variantHeader}>
            <h2 className={styles.variantTitle}>{v.title}</h2>
            <p className={styles.variantSubtitle}>{v.subtitle}</p>
            <p className={styles.variantStats}>
              cameraZ={v.cameraZ} · {v.cameraInside ? "inside" : "outside"} ·
              atmosphere={v.atmosphere}
            </p>
          </div>
          <div className={styles.canvas}>
            <HexSphere
              mesh={mesh}
              cameraZ={v.cameraZ}
              cameraInside={v.cameraInside}
              atmosphere={v.atmosphere}
            />
          </div>
        </section>
      ))}
    </div>
  );
}
