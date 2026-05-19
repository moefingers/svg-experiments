import Link from "next/link";
import styles from "./page.module.css";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

interface Gallery {
  title: string;
  href: string;
  sample: string;
}

/**
 * Landing page — index of all four SVG experiment galleries. Each card
 * shows a representative sample SVG and links to the gallery route.
 *
 * Sample URLs include NEXT_PUBLIC_BASE_PATH because they're rendered
 * as <img src> (raw HTML, not next/image). Gallery links use <Link>,
 * which prepends basePath automatically.
 */
const GALLERIES: Gallery[] = [
  {
    title: "Banner experiments",
    href: "/banner-experiments",
    sample: "/banner-experiments/15-multi-300x140x9_150x50x6.svg",
  },
  {
    title: "Banner experiments — v2",
    href: "/banner-experiments-v2",
    sample: "/banner-experiments-v2/step5b-primitive-precess.svg",
  },
  {
    title: "Banner experiments — v3",
    href: "/banner-experiments-v3",
    sample:
      "/banner-experiments-v3/v3-300x140x9-staticx1_150x80x6-staticx-1@24s_60x35x4-precess@12s.svg",
  },
  {
    title: "Verified banner experiments",
    href: "/verified-banner-experiments",
    sample: "/verified-banner-experiments/11.1-globe-spin-y-axis.svg",
  },
];

export default function Home() {
  return (
    <div className={styles.shell}>
      <h1 className={`text-2xl font-semibold ${styles.title}`}>
        SVG Experiments
      </h1>
      <p className={styles.intro}>
        Visual research and prototyping in pure SVG — orbital animation,
        lighting, multi-shell composition. Each gallery lazy-mounts items as
        they scroll into view.
      </p>
      <ul className={styles.list}>
        {GALLERIES.map((g) => (
          <li key={g.href}>
            <Link href={g.href} className={styles.cardLink}>
              <div className={styles.preview}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`${BASE_PATH}${g.sample}`}
                  alt=""
                  className={styles.previewImg}
                />
              </div>
              <div className={styles.caption}>
                <h2 className="font-medium">{g.title}</h2>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
