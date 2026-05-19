import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { THEME_INIT_INTEGRITY } from "@/lib/theme-script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "SVG Experiments", template: "%s | SVG Experiments" },
  description:
    "Visual research and prototyping in pure SVG — orbital animation, lighting, multi-shell composition.",
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

/**
 * basePath has to be prepended manually to raw `<script src>` because
 * Next.js only rewrites src for its own components (next/link,
 * next/image, next/script). For a static export deployed to
 * `<user>.github.io/<repo>/`, the theme-init script lives at
 * `${basePath}/theme-init.js`. Read from the public env var the
 * Next config exposes so this stays in lockstep with the config.
 */
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Layer-1 FOUC bootstrap. Static file loaded synchronously before
            paint, integrity-verified via SRI. See zcanon CONTEXT/internal_docs/
            theme.md "FOUC Prevention" for the full rationale. The sync
            attribute is intentional and load-bearing: this script must run
            before paint to apply the .dark class. */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script
          src={`${BASE_PATH}/theme-init.js`}
          integrity={THEME_INIT_INTEGRITY}
          crossOrigin="anonymous"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
