import Link from "next/link";
import { ShapeMorph } from "./ShapeMorph";
import styles from "./page.module.css";

/**
 * Shape-morph sandbox. Each card runs an isolated <ShapeMorph> with a
 * specific combination of:
 *   - shape cycle (e.g. tri ↔ hex, or tri ↔ rect ↔ hex)
 *   - cornerRadius (0 = sharp, >0 = Bézier-arc rounding)
 *   - strokeRoundCap (false / true — the "rounded silhouette via thick
 *     stroke with linejoin=round + linecap=round" trick)
 *
 * The grid lets you compare techniques side-by-side without context-
 * switching between routes. Built for the museum's sphere-face shape
 * decision (see CONTEXT in unlv-museum repo).
 */

// All shapes use the same `radius` so they share a visual size envelope
// during the morph. Rotation aligns 12-o'clock peaks.
const TRI = { sides: 3, radius: 55, rotation: 0 } as const;
const RECT = { sides: 4, radius: 55, rotation: 45 } as const;
const HEX = { sides: 6, radius: 55, rotation: 0 } as const;

// Rounded variants — per-shape cornerRadius drives Bézier rounding when
// `cornerRadius` prop on <ShapeMorph> is left undefined. The morph then
// interpolates radius alongside position.
const TRI_ROUND = {
  sides: 3,
  radius: 55,
  rotation: 0,
  cornerRadius: 12,
} as const;
const RECT_ROUND = {
  sides: 4,
  radius: 55,
  rotation: 45,
  cornerRadius: 12,
} as const;
const HEX_ROUND = {
  sides: 6,
  radius: 55,
  rotation: 0,
  cornerRadius: 10,
} as const;

export default function ShapeMorphsPage() {
  return (
    <div className={styles.shell}>
      <div className={styles.header}>
        <Link href="/" className={styles.backLink}>
          ← back to experiments
        </Link>
        <h1 className={styles.title}>Shape morphs</h1>
        <p className={styles.intro}>
          Interactive sandbox for triangle/rectangle/hexagon morphs. Each
          variant tests a different combination of geometric corner rounding
          (Bézier arcs at each vertex) and the thick-stroke round-cap trick
          (sharp geometry, rounded silhouette).
        </p>
      </div>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Mixed rounding within a cycle</h2>
        <p className={styles.sectionIntro}>
          Each shape carries its own <code>cornerRadius</code>, so the morph
          interpolates roundness alongside position. A sharp-cornered triangle
          that morphs into a rounded hexagon visibly inflates its corners during
          the same motion that pulls new vertices outward. This is the
          museum&rsquo;s &ldquo;crispy sphere face → rounded card&rdquo;
          transition writ small.
        </p>
        <div className={styles.grid}>
          <ShapeMorph
            title="sharp tri ↔ rounded hex"
            shapes={[TRI, HEX_ROUND]}
          />
          <ShapeMorph
            title="sharp tri ↔ rounded rect (card)"
            shapes={[TRI, RECT_ROUND]}
          />
          <ShapeMorph
            title="sharp hex ↔ rounded rect (card)"
            shapes={[HEX, RECT_ROUND]}
          />
          <ShapeMorph
            title="rounded tri ↔ sharp hex"
            shapes={[TRI_ROUND, HEX]}
          />
          <ShapeMorph
            title="sharp tri → sharp rect → rounded hex"
            shapes={[TRI, RECT, HEX_ROUND]}
          />
          <ShapeMorph
            title="sharp tri → rounded rect → rounded hex → rounded tri"
            shapes={[TRI, RECT_ROUND, HEX_ROUND, TRI_ROUND]}
          />
          <ShapeMorph
            title="hollow: sharp tri ↔ rounded hex"
            shapes={[TRI, HEX_ROUND]}
            hollow={true}
          />
          <ShapeMorph
            title="hollow + round-cap: sharp tri ↔ rounded hex"
            shapes={[TRI, HEX_ROUND]}
            strokeRoundCap={true}
            hollow={true}
          />
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Uniform rounding — Triangle ↔ Hexagon
        </h2>
        <p className={styles.sectionIntro}>
          A single <code>cornerRadius</code> applied to all shapes in the cycle
          (override mode). Useful baseline for comparing techniques.
        </p>
        <div className={styles.grid}>
          <ShapeMorph
            title="sharp, no stroke cap"
            shapes={[TRI, HEX]}
            cornerRadius={0}
            strokeRoundCap={false}
          />
          <ShapeMorph
            title="rounded corners (Bézier)"
            shapes={[TRI, HEX]}
            cornerRadius={10}
            strokeRoundCap={false}
          />
          <ShapeMorph
            title="sharp + stroke round-cap"
            shapes={[TRI, HEX]}
            cornerRadius={0}
            strokeRoundCap={true}
          />
          <ShapeMorph
            title="rounded + stroke round-cap"
            shapes={[TRI, HEX]}
            cornerRadius={10}
            strokeRoundCap={true}
          />
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Uniform rounding — Triangle ↔ Rectangle ↔ Hexagon
        </h2>
        <div className={styles.grid}>
          <ShapeMorph
            title="sharp, no stroke cap"
            shapes={[TRI, RECT, HEX]}
            cornerRadius={0}
            strokeRoundCap={false}
          />
          <ShapeMorph
            title="rounded corners (Bézier)"
            shapes={[TRI, RECT, HEX]}
            cornerRadius={10}
            strokeRoundCap={false}
          />
          <ShapeMorph
            title="sharp + stroke round-cap"
            shapes={[TRI, RECT, HEX]}
            cornerRadius={0}
            strokeRoundCap={true}
          />
          <ShapeMorph
            title="rounded + stroke round-cap"
            shapes={[TRI, RECT, HEX]}
            cornerRadius={10}
            strokeRoundCap={true}
          />
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Hollow — Triangle ↔ Hexagon</h2>
        <p className={styles.sectionIntro}>
          Same shapes, same techniques, but <code>fill=&quot;none&quot;</code>.
          Lets you see the actual path geometry. The thin-outline variants also
          render every topology point as a small dot so you can watch mid-edge
          synthetic points migrate to corners during morph.
        </p>
        <div className={styles.grid}>
          <ShapeMorph
            title="sharp outline + vertex dots"
            shapes={[TRI, HEX]}
            cornerRadius={0}
            strokeRoundCap={false}
            hollow={true}
          />
          <ShapeMorph
            title="rounded outline + vertex dots"
            shapes={[TRI, HEX]}
            cornerRadius={10}
            strokeRoundCap={false}
            hollow={true}
          />
          <ShapeMorph
            title="sharp, fat round-cap stroke"
            shapes={[TRI, HEX]}
            cornerRadius={0}
            strokeRoundCap={true}
            hollow={true}
          />
          <ShapeMorph
            title="rounded, fat round-cap stroke"
            shapes={[TRI, HEX]}
            cornerRadius={10}
            strokeRoundCap={true}
            hollow={true}
          />
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Hollow — Triangle ↔ Rectangle ↔ Hexagon
        </h2>
        <div className={styles.grid}>
          <ShapeMorph
            title="sharp outline + vertex dots"
            shapes={[TRI, RECT, HEX]}
            cornerRadius={0}
            strokeRoundCap={false}
            hollow={true}
          />
          <ShapeMorph
            title="rounded outline + vertex dots"
            shapes={[TRI, RECT, HEX]}
            cornerRadius={10}
            strokeRoundCap={false}
            hollow={true}
          />
          <ShapeMorph
            title="sharp, fat round-cap stroke"
            shapes={[TRI, RECT, HEX]}
            cornerRadius={0}
            strokeRoundCap={true}
            hollow={true}
          />
          <ShapeMorph
            title="rounded, fat round-cap stroke"
            shapes={[TRI, RECT, HEX]}
            cornerRadius={10}
            strokeRoundCap={true}
            hollow={true}
          />
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Notes</h2>
        <ul className={styles.notes}>
          <li>
            All shapes share a topology of <code>lcm(sides)</code> path points
            so the morph is a clean linear interpolation. For a triangle in a
            6-point topology, the 3 &ldquo;missing&rdquo; corners sit at the
            midpoints of the triangle&rsquo;s edges (visually invisible). When
            morphing to the hexagon, those midpoint markers pull outward to
            become the hexagon&rsquo;s corners.
          </li>
          <li>
            <strong>Sharp</strong>: path uses only <code>M/L/Z</code> commands.
            Corners are pointy. Lowest visual cost; most crystalline.
          </li>
          <li>
            <strong>Rounded corners (Bézier)</strong>: each vertex emits a{" "}
            <code>Q</code> arc instead of going straight through. Corner radius
            is capped to half the adjacent edge length to prevent overlap on
            small shapes.
          </li>
          <li>
            <strong>Stroke round-cap</strong>: path stays sharp, but a thick
            stroke is rendered <em>behind</em> the fill via{" "}
            <code>paint-order: stroke fill</code> with{" "}
            <code>stroke-linejoin: round</code> and{" "}
            <code>stroke-linecap: round</code>. The result is a rounded
            silhouette around the geometric polygon. Cheap, doesn&rsquo;t
            require Bézier authoring, but the rounding radius is hostage to{" "}
            <code>stroke-width</code>.
          </li>
          <li>
            <strong>Rounded + stroke round-cap</strong>: both at once. Stacks
            visually — the stroke softens the already-rounded edges further. Can
            over-round on small shapes.
          </li>
        </ul>
      </section>
    </div>
  );
}
