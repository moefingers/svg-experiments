"use client";

import { useState } from "react";
import Link from "next/link";
import { UnfoldingBillboard } from "./UnfoldingBillboard";
import styles from "./page.module.css";

/**
 * Tuning sandbox for the dot → hexagon unfold animation.
 *
 * A grid of 8 variants, each with different spring stiffness/damping
 * and stageDelay. A single "play" button cycles all of them through
 * a full open → close cycle simultaneously so you can compare side
 * by side. Individual variants can be re-triggered by clicking them.
 *
 * Each variant card includes a sample of placeholder content — a
 * project title + year + a short description — so the glass-billboard
 * styling can be evaluated for legibility as well as motion.
 */

interface Variant {
  label: string;
  stiffness: number;
  damping: number;
  stageDelay: number;
}

const VARIANTS: Variant[] = [
  { label: "Default", stiffness: 280, damping: 16, stageDelay: 80 },
  { label: "Snappy", stiffness: 380, damping: 22, stageDelay: 60 },
  { label: "Loose", stiffness: 220, damping: 12, stageDelay: 100 },
  { label: "Rubber", stiffness: 180, damping: 10, stageDelay: 110 },
  { label: "Heavy", stiffness: 320, damping: 26, stageDelay: 90 },
  { label: "Fast cascade", stiffness: 300, damping: 18, stageDelay: 40 },
  { label: "Slow cascade", stiffness: 260, damping: 17, stageDelay: 140 },
  { label: "Wild bounce", stiffness: 360, damping: 8, stageDelay: 80 },
  // Aggressive stagger — each stage fully settles before the next
  // kicks off. Each shape gets its own discrete pop with full bounce
  // visible before the topology updates again. Total entry duration
  // ~5 × stageDelay = 1.5s, but the cascade reads as distinct beats
  // rather than a continuous unfolding flow.
  { label: "Aggressive stagger", stiffness: 280, damping: 14, stageDelay: 280 },
  // Loose + aggressive — bigger overshoot per beat, beats spaced wide
  // so you can really see each bounce settle. Most theatrical variant.
  { label: "Theatrical", stiffness: 200, damping: 9, stageDelay: 320 },
];

const SAMPLE_PROJECT = {
  title: "Music Search",
  year: "Mar 2024",
  desc: "iTunes search SPA. React Router, query/results/album-detail.",
};

export default function UnfoldPage() {
  // Global open state — flipping it triggers all cards together.
  // Per-card overrides handled in the card component (it accepts an
  // `openOverride` toggle counter and re-syncs).
  const [allOpen, setAllOpen] = useState(true);
  // Increments on each click of the global "replay" button; cards
  // listen to this and reset their open state.
  const [replayNonce, setReplayNonce] = useState(0);

  return (
    <div className={styles.shell}>
      <div className={styles.header}>
        <Link href="/" className={styles.backLink}>
          ← back to experiments
        </Link>
        <h1 className={styles.title}>Unfolding billboard</h1>
        <p className={styles.intro}>
          Spring-bounce cascade from dot → line → triangle → square → pentagon →
          hexagon. Each shape transition fires a target-update on per-vertex (x,
          y) springs; the spring physics handle motion with overshoot
          proportional to the damping ratio. Stages are staggered by
          <code> stageDelay</code> ms so the unfold reads as a cascade rather
          than discrete steps.
        </p>
        <div className={styles.toolbar}>
          <button
            type="button"
            onClick={() => {
              setAllOpen(false);
              setTimeout(() => {
                setAllOpen(true);
                setReplayNonce((n) => n + 1);
              }, 600);
            }}
            className={styles.replayButton}
          >
            replay all
          </button>
          <button
            type="button"
            onClick={() => setAllOpen((v) => !v)}
            className={styles.toggleButton}
          >
            {allOpen ? "fold all" : "unfold all"}
          </button>
        </div>
      </div>

      <div className={styles.grid}>
        {VARIANTS.map((v) => (
          <VariantCard
            key={v.label}
            variant={v}
            globalOpen={allOpen}
            replayNonce={replayNonce}
          />
        ))}
      </div>
    </div>
  );
}

function VariantCard({
  variant,
  globalOpen,
  replayNonce,
}: {
  variant: Variant;
  globalOpen: boolean;
  replayNonce: number;
}) {
  // Local open state shadows global open. Clicking the card flips it
  // independently. Replay/global toggles reset it via the "store the
  // previous prop and compare during render" pattern — React 19's
  // recommended way to reset state in response to a prop change
  // without using an effect.
  const [open, setOpen] = useState(globalOpen);
  const [prevGlobalOpen, setPrevGlobalOpen] = useState(globalOpen);
  const [prevReplay, setPrevReplay] = useState(replayNonce);
  if (prevGlobalOpen !== globalOpen || prevReplay !== replayNonce) {
    setPrevGlobalOpen(globalOpen);
    setPrevReplay(replayNonce);
    setOpen(globalOpen);
  }

  return (
    <button
      type="button"
      className={styles.card}
      onClick={() => setOpen((v) => !v)}
    >
      <div className={styles.cardLabel}>
        <strong>{variant.label}</strong>
        <span className={styles.cardMeta}>
          k={variant.stiffness} d={variant.damping} stage={variant.stageDelay}ms
        </span>
      </div>
      <div className={styles.cardStage}>
        <UnfoldingBillboard
          open={open}
          radius={90}
          spring={{ stiffness: variant.stiffness, damping: variant.damping }}
          stageDelay={variant.stageDelay}
          showDebug={true}
        >
          <div className={styles.billboardContent}>
            <p className={styles.billboardTitle}>{SAMPLE_PROJECT.title}</p>
            <p className={styles.billboardYear}>{SAMPLE_PROJECT.year}</p>
            <p className={styles.billboardDesc}>{SAMPLE_PROJECT.desc}</p>
          </div>
        </UnfoldingBillboard>
      </div>
    </button>
  );
}
