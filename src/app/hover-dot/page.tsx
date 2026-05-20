import Link from "next/link";
import { HoverDot } from "./HoverDot";
import styles from "./page.module.css";

/**
 * Tuning sandbox for the hover-to-type dot interaction.
 *
 * Each card hosts one or more glowing dots inside an isolated SVG
 * stage. Hovering a dot types its title below it, with the dot's
 * glow growing as the title appears. Cards differ in their tuning
 * (type duration, grace period, glow expansion ratio, text-shadow
 * stack) so the variants can be compared side-by-side.
 */

interface Variant {
  label: string;
  typeDuration: number;
  graceMs: number;
  idleGlowRadius: number;
  expandedGlowRadius: number;
  /** Optional text-shadow stack override. */
  textShadow?: string;
  /** Sample titles to show on the stage. */
  dots: { title: string; x: number; y: number }[];
  /** Delay before typing begins after hover (ms). */
  startDelay?: number;
  /** Title font size override (px). */
  titleFontSize?: number;
  /** Show blinking caret while active. */
  showCaret?: boolean;
  /** Font family override. */
  titleFontFamily?: string;
}

const SAMPLE_TITLES = ["Music Search", "MilestO-W-N", "JavaScript & DOM"];

const VARIANTS: Variant[] = [
  {
    label: "Default",
    typeDuration: 400,
    graceMs: 800,
    idleGlowRadius: 6,
    expandedGlowRadius: 14,
    dots: [
      { title: "Music Search", x: 70, y: 90 },
      { title: "MilestO-W-N", x: 220, y: 60 },
      { title: "JavaScript & DOM", x: 150, y: 150 },
    ],
  },
  {
    label: "Snappy (250ms type)",
    typeDuration: 250,
    graceMs: 600,
    idleGlowRadius: 6,
    expandedGlowRadius: 14,
    dots: [{ title: "Music Search", x: 150, y: 100 }],
  },
  {
    label: "Slow (800ms type)",
    typeDuration: 800,
    graceMs: 1200,
    idleGlowRadius: 6,
    expandedGlowRadius: 14,
    dots: [{ title: "Music Search", x: 150, y: 100 }],
  },
  {
    label: "Big glow expansion",
    typeDuration: 400,
    graceMs: 800,
    idleGlowRadius: 5,
    expandedGlowRadius: 22,
    dots: [{ title: "Music Search", x: 150, y: 100 }],
  },
  {
    label: "Tight glow",
    typeDuration: 400,
    graceMs: 800,
    idleGlowRadius: 8,
    expandedGlowRadius: 10,
    dots: [{ title: "Music Search", x: 150, y: 100 }],
  },
  {
    label: "Warm shadow",
    typeDuration: 400,
    graceMs: 800,
    idleGlowRadius: 6,
    expandedGlowRadius: 14,
    textShadow: [
      "0 0 4px rgba(255, 220, 180, 0.95)",
      "0 0 10px rgba(255, 180, 120, 0.7)",
      "0 0 24px rgba(240, 140, 80, 0.45)",
      "0 0 48px rgba(220, 100, 60, 0.25)",
    ].join(", "),
    dots: [{ title: "Music Search", x: 150, y: 100 }],
  },
  {
    label: "White shadow",
    typeDuration: 400,
    graceMs: 800,
    idleGlowRadius: 6,
    expandedGlowRadius: 14,
    textShadow: [
      "0 0 4px rgba(255, 255, 255, 0.95)",
      "0 0 10px rgba(255, 255, 255, 0.7)",
      "0 0 24px rgba(255, 255, 255, 0.45)",
    ].join(", "),
    dots: [{ title: "Music Search", x: 150, y: 100 }],
  },
  {
    label: "Long grace (2s)",
    typeDuration: 400,
    graceMs: 2000,
    idleGlowRadius: 6,
    expandedGlowRadius: 14,
    dots: [{ title: "Move off then back in 2s", x: 150, y: 100 }],
  },
  {
    label: "Short grace (300ms)",
    typeDuration: 400,
    graceMs: 300,
    idleGlowRadius: 6,
    expandedGlowRadius: 14,
    dots: [{ title: "Quick dismiss", x: 150, y: 100 }],
  },
  // ─── Slow + tight derivations (selected favorites) ─────────────
  // Slow typing + tight glow expansion = the deliberate / restrained
  // posture. Derivatives below push along that axis or add a small
  // variation to see if it enhances the calm vibe.
  {
    label: "Slow + tight (baseline)",
    typeDuration: 800,
    graceMs: 1200,
    idleGlowRadius: 8,
    expandedGlowRadius: 10,
    dots: [{ title: "Music Search", x: 150, y: 100 }],
  },
  {
    label: "Slow + tight + 150ms start delay",
    typeDuration: 800,
    graceMs: 1200,
    idleGlowRadius: 8,
    expandedGlowRadius: 10,
    startDelay: 150,
    dots: [{ title: "Music Search", x: 150, y: 100 }],
  },
  {
    label: "Slow + tight + 300ms start delay",
    typeDuration: 800,
    graceMs: 1200,
    idleGlowRadius: 8,
    expandedGlowRadius: 10,
    startDelay: 300,
    dots: [{ title: "Music Search", x: 150, y: 100 }],
  },
  {
    label: "Slow + tight + larger font (15px)",
    typeDuration: 800,
    graceMs: 1200,
    idleGlowRadius: 8,
    expandedGlowRadius: 10,
    titleFontSize: 15,
    dots: [{ title: "Music Search", x: 150, y: 100 }],
  },
  {
    label: "Slow + tight + blinking caret",
    typeDuration: 800,
    graceMs: 1200,
    idleGlowRadius: 8,
    expandedGlowRadius: 10,
    showCaret: true,
    dots: [{ title: "Music Search", x: 150, y: 100 }],
  },
  {
    label: "Slow + tight + monospace",
    typeDuration: 800,
    graceMs: 1200,
    idleGlowRadius: 8,
    expandedGlowRadius: 10,
    titleFontFamily:
      'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
    dots: [{ title: "Music Search", x: 150, y: 100 }],
  },
  {
    label: "Slow + tight + caret + mono",
    typeDuration: 800,
    graceMs: 1200,
    idleGlowRadius: 8,
    expandedGlowRadius: 10,
    showCaret: true,
    titleFontFamily:
      'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
    dots: [{ title: "Music Search", x: 150, y: 100 }],
  },
  {
    label: "Slow + tight (3 dots)",
    typeDuration: 800,
    graceMs: 1200,
    idleGlowRadius: 8,
    expandedGlowRadius: 10,
    dots: [
      { title: "Music Search", x: 70, y: 90 },
      { title: "MilestO-W-N", x: 220, y: 60 },
      { title: "JavaScript & DOM", x: 150, y: 150 },
    ],
  },
  {
    label: "Very slow + very tight (1200ms / 8→9)",
    typeDuration: 1200,
    graceMs: 1500,
    idleGlowRadius: 8,
    expandedGlowRadius: 9,
    dots: [{ title: "Music Search", x: 150, y: 100 }],
  },
];

const STAGE_WIDTH = 300;
const STAGE_HEIGHT = 220;

export default function HoverDotPage() {
  return (
    <div className={styles.shell}>
      <div className={styles.header}>
        <Link href="/" className={styles.backLink}>
          ← back to experiments
        </Link>
        <h1 className={styles.title}>Hover-to-type dot</h1>
        <p className={styles.intro}>
          A vertex hover interaction for the museum&apos;s polyhedron sphere.
          Hover a dot to type its title; the dot&apos;s glow expands as the
          title appears. After leaving the dot, a grace-period timer determines
          when the title contracts and the glow shrinks back.
        </p>
      </div>

      <div className={styles.grid}>
        {VARIANTS.map((variant) => (
          <div key={variant.label} className={styles.card}>
            <div className={styles.cardLabel}>
              <strong>{variant.label}</strong>
              <span className={styles.cardMeta}>
                type={variant.typeDuration}ms grace={variant.graceMs}ms glow=
                {variant.idleGlowRadius}→{variant.expandedGlowRadius}
              </span>
            </div>
            <svg
              viewBox={`0 0 ${STAGE_WIDTH} ${STAGE_HEIGHT}`}
              className={styles.stage}
              style={{ width: STAGE_WIDTH, height: STAGE_HEIGHT }}
            >
              <defs>
                {/* Single radial-gradient definition reused by every dot
                    in this card's SVG. Bright pinpoint, soft falloff. */}
                <radialGradient id="hover-dot-glow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="rgba(220, 235, 255, 0.95)" />
                  <stop offset="40%" stopColor="rgba(140, 180, 255, 0.55)" />
                  <stop offset="100%" stopColor="rgba(80, 140, 220, 0)" />
                </radialGradient>
              </defs>
              {variant.dots.map((d, i) => (
                <HoverDot
                  key={i}
                  title={d.title}
                  x={d.x}
                  y={d.y}
                  typeDuration={variant.typeDuration}
                  graceMs={variant.graceMs}
                  idleGlowRadius={variant.idleGlowRadius}
                  expandedGlowRadius={variant.expandedGlowRadius}
                  textShadow={variant.textShadow}
                  startDelay={variant.startDelay}
                  titleFontSize={variant.titleFontSize}
                  showCaret={variant.showCaret}
                  titleFontFamily={variant.titleFontFamily}
                />
              ))}
            </svg>
          </div>
        ))}
      </div>

      <div className={styles.notes}>
        <h2 className={styles.notesTitle}>What to evaluate</h2>
        <ul>
          <li>
            <strong>Type duration</strong> — is 400ms too fast? Too slow? Try
            the Snappy and Slow variants.
          </li>
          <li>
            <strong>Glow expansion ratio</strong> — Big-glow vs Tight-glow. How
            much should the dot grow as text appears?
          </li>
          <li>
            <strong>Text shadow color</strong> — Default (cool blue), Warm,
            White. Which integrates best with a future moody sphere?
          </li>
          <li>
            <strong>Grace period</strong> — Short (300ms) vs Long (2s). After
            mouse-leave, how long should you wait before dismissing?
            Hover-back-in within grace should not re-type.
          </li>
          <li>
            <strong>Blink + contract</strong> — when grace expires, watch for
            the brief brightness flash followed by accelerated untype.
          </li>
        </ul>
      </div>
    </div>
  );
}
