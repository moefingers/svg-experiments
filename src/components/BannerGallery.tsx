"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import styles from "./BannerGallery.module.css";

/**
 * Renders a banner experiment gallery: a grid of <figure> cards, each
 * lazy-mounting its <img> via IntersectionObserver to keep the DOM small.
 *
 * `assetDir` is the public-relative directory the SVGs live under
 * (e.g. "/banner-experiments"). On a static export deployed to a
 * GitHub Pages subpath, Next.js does NOT auto-prepend basePath to raw
 * <img src> strings — only to next/link, next/image, and next/script
 * URLs. So this component prepends NEXT_PUBLIC_BASE_PATH itself to
 * build the final asset URL.
 *
 * The <Link href> for "back to experiments" DOES go through Next, which
 * handles basePath automatically — no manual prefix there.
 */
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function BannerGallery({
  title,
  assetDir,
  files,
}: {
  title: string;
  assetDir: string;
  files: string[];
}) {
  return (
    <div className={styles.shell}>
      <div className={styles.backLink}>
        <Link href="/" className={`text-xs ${styles.backLinkAnchor}`}>
          ← back to experiments
        </Link>
      </div>
      <h1 className={`text-base font-semibold ${styles.title}`}>{title}</h1>
      <p className={`text-xs ${styles.count}`}>
        {files.length} SVGs — only mounted while visible
      </p>
      <div className={styles.grid}>
        {files.map((name) => (
          <GalleryCard key={name} name={name} assetDir={assetDir} />
        ))}
      </div>
    </div>
  );
}

function GalleryCard({ name, assetDir }: { name: string; assetDir: string }) {
  const ref = useRef<HTMLElement | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) setMounted(e.isIntersecting);
      },
      { rootMargin: "200px 0px", threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const href = `${BASE_PATH}${assetDir}/${encodeURI(name)}`;

  return (
    <figure ref={ref} className={styles.card}>
      <div className={styles.preview}>
        {mounted && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={href}
            alt={name}
            loading="lazy"
            decoding="async"
            className={styles.previewImage}
          />
        )}
      </div>
      <figcaption className={`text-xs ${styles.caption}`}>
        <a
          href={href}
          target="_blank"
          rel="noopener"
          className={styles.captionAnchor}
        >
          {name}
        </a>
      </figcaption>
    </figure>
  );
}
