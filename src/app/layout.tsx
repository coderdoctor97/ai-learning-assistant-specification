import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { t } from "@/lib/i18n";
import { TooltipProvider } from "@/components/ui/Tooltip";
import "./globals.css";

/*
 * Theme + reveal bootstrap: runs before first paint so the correct palette
 * applies with no flash, and scroll reveals are armed only when the visitor
 * has not asked for reduced motion.
 */
const themeBootstrap = `(function(){try{var t=localStorage.getItem('studio-theme')||'editorial';document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','editorial');}try{if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches){document.documentElement.setAttribute('data-reveal-ready','true');}}catch(e){}})();`;

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "Learning Studio — structured AI learning engine",
    template: "%s · Learning Studio",
  },
  description:
    "A local-first, model-independent AI learning studio that executes configurable teaching workflows stage by stage.",
  applicationName: "Learning Studio",
  keywords: ["learning", "AI tutor", "study engine", "local-first", "spaced learning", "methodologies"],
  authors: [{ name: "Learning Studio" }],
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    siteName: "Learning Studio",
    title: "Learning Studio — structured AI learning engine",
    description:
      "Pick a teaching methodology, hand the engine a topic, and it runs the workflow one stage at a time — fully on your machine.",
    url: "/",
    locale: "en",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Learning Studio" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Learning Studio — structured AI learning engine",
    description:
      "A local-first, model-independent AI learning studio that executes configurable teaching workflows stage by stage.",
    images: ["/og.png"],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#a5613c" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0d10" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="editorial" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body className="min-h-dvh bg-bg text-ink antialiased">
        <a href="#main-content" className="skip-link">
          {t("app.skipToContent")}
        </a>
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
