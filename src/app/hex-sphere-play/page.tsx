"use client";

import Link from "next/link";
import { useState } from "react";
import { goldberg, goldbergFaceCount } from "@/lib/polyhedra";
import { HexSphere } from "../hex-sphere/HexSphere";
import styles from "./page.module.css";

/**
 * Hex-sphere playground — every knob exposed so you can dial in the
 * specific feel for the Infinite Syndicate homepage. Same component
 * as /hex-sphere, controlled by sliders/toggles instead of fixed presets.
 *
 * Mesh frequencies higher than 4 get expensive (face count grows
 * quadratically); we cap at 4 to keep interaction snappy.
 */
export default function HexSpherePlayPage() {
  // ── Geometry knobs ───────────────────────────────────────────────
  const [gpM, setGpM] = useState(3);
  const [gpN, setGpN] = useState(0);
  // ── Camera knobs ─────────────────────────────────────────────────
  const [cameraZ, setCameraZ] = useState(4);
  const [zoom, setZoom] = useState(1);
  const [cameraInside, setCameraInside] = useState(false);
  // ── Parallax knobs ───────────────────────────────────────────────
  const [tiltRange, setTiltRange] = useState(10);
  const [invertX, setInvertX] = useState(true);
  const [invertY, setInvertY] = useState(false);
  const [lerpRate, setLerpRate] = useState(0.08);
  // ── Drift knobs ──────────────────────────────────────────────────
  const [idleDriftEnabled, setIdleDriftEnabled] = useState(true);
  const [driftAmplitude, setDriftAmplitude] = useState(6);
  const [driftPeriod, setDriftPeriod] = useState(14);
  const [idleMs, setIdleMs] = useState(1500);
  // ── Visual knobs ─────────────────────────────────────────────────
  const [atmosphere, setAtmosphere] = useState(0.35);
  const [showLabels, setShowLabels] = useState(true);
  const [highlightPentagons, setHighlightPentagons] = useState(true);
  const [labeledOnly, setLabeledOnly] = useState(false);
  const [faceInset, setFaceInset] = useState(0);
  const [jitter, setJitter] = useState(0);

  const mesh = goldberg(gpM, gpN);
  const totalFaces = mesh.faces.length;
  const hexCount = mesh.faces.filter((f) => f.length === 6).length;
  const expected = goldbergFaceCount(gpM, gpN);

  return (
    <div className={styles.shell}>
      <div className={styles.header}>
        <Link href="/" className={styles.backLink}>
          ← back to experiments
        </Link>
        <h1 className={styles.title}>Hex sphere — playground</h1>
        <p className={styles.intro}>
          Same hex-sphere component as the comparison page, but every knob is
          exposed. Drag sliders, toggle modes, watch the sphere respond live.
          Cursor over the sphere drives parallax; cursor outside lets idle drift
          take over.
        </p>
      </div>

      <div className={styles.workspace}>
        <div className={styles.canvas}>
          <HexSphere
            mesh={mesh}
            cameraZ={cameraZ}
            zoom={zoom}
            cameraInside={cameraInside}
            atmosphere={atmosphere}
            tiltRange={tiltRange}
            invertX={invertX}
            invertY={invertY}
            lerpRate={lerpRate}
            idleDriftEnabled={idleDriftEnabled}
            driftAmplitude={driftAmplitude}
            driftPeriod={driftPeriod}
            idleMs={idleMs}
            showLabels={showLabels}
            highlightPentagons={highlightPentagons}
            labeledOnly={labeledOnly}
            faceInset={faceInset}
            jitter={jitter}
          />
        </div>

        <aside className={styles.controls}>
          <Section title="Geometry">
            <Slider
              label="GP m"
              value={gpM}
              min={1}
              max={5}
              step={1}
              onChange={setGpM}
              format={(v) => v.toString()}
            />
            <Slider
              label="GP n (Class II/III)"
              value={gpN}
              min={0}
              max={5}
              step={1}
              onChange={setGpN}
              format={(v) => v.toString()}
            />
            <Readout
              label="Symbol"
              value={`GP(${gpM},${gpN}) · T=${expected.T}`}
            />
            <Readout
              label="Faces"
              value={`${totalFaces} total · ${hexCount} hex · 12 penta`}
            />
          </Section>

          <Section title="Camera">
            <Slider
              label="Distance (cameraZ)"
              value={cameraZ}
              min={0.2}
              max={8}
              step={0.05}
              onChange={setCameraZ}
              format={(v) => v.toFixed(2)}
            />
            <Slider
              label="Zoom (apparent size)"
              value={zoom}
              min={0.2}
              max={4}
              step={0.05}
              onChange={setZoom}
              format={(v) => `${v.toFixed(2)}×`}
            />
            <Toggle
              label="Camera inside sphere"
              value={cameraInside}
              onChange={setCameraInside}
            />
          </Section>

          <Section title="Parallax">
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
              label="Invert X (horizontal)"
              value={invertX}
              onChange={setInvertX}
            />
            <Toggle
              label="Invert Y (vertical)"
              value={invertY}
              onChange={setInvertY}
            />
            <Slider
              label="Damping (lerp rate)"
              value={lerpRate}
              min={0.01}
              max={0.5}
              step={0.01}
              onChange={setLerpRate}
              format={(v) => v.toFixed(2)}
            />
          </Section>

          <Section title="Idle drift">
            <Toggle
              label="Enabled"
              value={idleDriftEnabled}
              onChange={setIdleDriftEnabled}
            />
            <Slider
              label="Amplitude (deg)"
              value={driftAmplitude}
              min={0}
              max={20}
              step={0.5}
              onChange={setDriftAmplitude}
              format={(v) => `${v}°`}
            />
            <Slider
              label="Period (s)"
              value={driftPeriod}
              min={2}
              max={40}
              step={0.5}
              onChange={setDriftPeriod}
              format={(v) => `${v}s`}
            />
            <Slider
              label="Idle threshold (ms)"
              value={idleMs}
              min={0}
              max={5000}
              step={100}
              onChange={setIdleMs}
              format={(v) => `${v}ms`}
            />
          </Section>

          <Section title="Visuals">
            <Slider
              label="Atmosphere"
              value={atmosphere}
              min={0}
              max={1}
              step={0.01}
              onChange={setAtmosphere}
              format={(v) => v.toFixed(2)}
            />
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
            <Toggle
              label="Labeled cells only"
              value={labeledOnly}
              onChange={setLabeledOnly}
            />
            <Slider
              label="Face inset (gap)"
              value={faceInset}
              min={0}
              max={0.5}
              step={0.01}
              onChange={setFaceInset}
              format={(v) => v.toFixed(2)}
            />
            <Slider
              label="Vertex jitter"
              value={jitter}
              min={0}
              max={0.15}
              step={0.005}
              onChange={setJitter}
              format={(v) => v.toFixed(3)}
            />
          </Section>
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
