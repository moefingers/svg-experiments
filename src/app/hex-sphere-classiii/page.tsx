"use client";

import Link from "next/link";
import { useState } from "react";
import { goldberg, goldbergFaceCount } from "@/lib/polyhedra";
import { HexSphere } from "../hex-sphere/HexSphere";
import styles from "./page.module.css";

/**
 * Focused Class II/III Goldberg explorer. Uses the full antitile
 * breakdown + edge-stitching machinery in `polyhedra.ts`, so every
 * GP(m, n) is the exact polyhedron (not a Class I approximation).
 *
 * Class I (m, 0)   aligned grid                12 penta + 10(T-1) hex
 * Class II (m, m)  30°-rotated achiral grid    same count, twin chirality
 * Class III (m, n) m ≠ n, n > 0, chiral        non-mirror-symmetric
 *
 * Verified face counts:
 *   GP(1,1) T=3   →   32 faces  ✓
 *   GP(2,1) T=7   →   72 faces  ✓
 *   GP(2,2) T=12  →  122 faces  ✓
 *   GP(3,1) T=13  →  132 faces  ✓
 *   GP(3,2) T=19  →  192 faces  ✓
 */
export default function HexSphereClassIIIPage() {
  const [m, setM] = useState(2);
  const [n, setN] = useState(1);
  const [cameraZ, setCameraZ] = useState(3.2);
  const [zoom, setZoom] = useState(1);
  const [cameraInside, setCameraInside] = useState(false);
  const [tiltRange, setTiltRange] = useState(14);
  const [showLabels, setShowLabels] = useState(false);
  const [highlightPentagons, setHighlightPentagons] = useState(true);

  const mesh = goldberg(m, n);
  const expected = goldbergFaceCount(m, n);
  const hexCount = mesh.faces.filter((f) => f.length === 6).length;
  const pentaCount = mesh.faces.filter((f) => f.length === 5).length;

  const classLabel =
    n === 0 || m === 0
      ? "Class I (aligned)"
      : m === n
        ? "Class II (achiral)"
        : "Class III (chiral)";

  return (
    <div className={styles.shell}>
      <div className={styles.header}>
        <Link href="/" className={styles.backLink}>
          ← back to experiments
        </Link>
        <h1 className={styles.title}>Hex sphere — Class II/III</h1>
        <p className={styles.intro}>
          Exact GP(m, n) construction via antitile&apos;s breakdown lattice +
          per-edge stitch. The m and n sliders parameterize the Goldberg
          breakdown directly — when m ≠ n and both are nonzero you get a true
          chiral sphere with no mirror plane.
        </p>
      </div>

      <div className={styles.workspace}>
        <div className={styles.canvas}>
          <HexSphere
            mesh={mesh}
            cameraZ={cameraZ}
            zoom={zoom}
            cameraInside={cameraInside}
            tiltRange={tiltRange}
            showLabels={showLabels}
            highlightPentagons={highlightPentagons}
          />
        </div>

        <aside className={styles.controls}>
          <Section title="Breakdown">
            <Slider
              label="GP m"
              value={m}
              min={1}
              max={5}
              step={1}
              onChange={setM}
              format={(v) => v.toString()}
            />
            <Slider
              label="GP n"
              value={n}
              min={0}
              max={5}
              step={1}
              onChange={setN}
              format={(v) => v.toString()}
            />
            <Readout label="Symbol" value={`GP(${m},${n})`} />
            <Readout label="Class" value={classLabel} />
            <Readout label="T-number" value={`T = ${expected.T}`} />
            <Readout
              label="Faces"
              value={`${mesh.faces.length} (${pentaCount}p + ${hexCount}h) · expected ${expected.total}`}
            />
            <Readout label="Vertices" value={`${mesh.vertices.length}`} />
          </Section>

          <Section title="Camera">
            <Slider
              label="Distance (cameraZ)"
              value={cameraZ}
              min={0.5}
              max={8}
              step={0.05}
              onChange={setCameraZ}
              format={(v) => v.toFixed(2)}
            />
            <Slider
              label="Zoom"
              value={zoom}
              min={0.3}
              max={3}
              step={0.05}
              onChange={setZoom}
              format={(v) => `${v.toFixed(2)}×`}
            />
            <Slider
              label="Tilt range (deg)"
              value={tiltRange}
              min={0}
              max={45}
              step={1}
              onChange={setTiltRange}
              format={(v) => `${v}°`}
            />
            <Toggle
              label="Camera inside sphere"
              value={cameraInside}
              onChange={setCameraInside}
            />
          </Section>

          <Section title="Display">
            <Toggle
              label="Show labels"
              value={showLabels}
              onChange={setShowLabels}
            />
            <Toggle
              label="Accent pentagons"
              value={highlightPentagons}
              onChange={setHighlightPentagons}
            />
          </Section>

          <p className={styles.help}>
            Try GP(2, 1) and GP(3, 1) to feel the chirality — the hex shells
            spiral one direction and don&apos;t superimpose on their mirror
            image. GP(m, m) is the achiral Class II; GP(1, 1) is the truncated
            icosahedron (soccer ball).
          </p>
        </aside>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className={styles.section}>
      <h3 className={styles.sectionTitle}>{title}</h3>
      <div className={styles.sectionBody}>{children}</div>
    </section>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format: (v: number) => string;
}) {
  return (
    <label className={styles.slider}>
      <span className={styles.sliderLabel}>{label}</span>
      <span className={styles.sliderValue}>{format(value)}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className={styles.sliderInput}
      />
    </label>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className={styles.toggle}>
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

function Readout({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.readout}>
      <span className={styles.readoutLabel}>{label}</span>
      <span className={styles.readoutValue}>{value}</span>
    </div>
  );
}
