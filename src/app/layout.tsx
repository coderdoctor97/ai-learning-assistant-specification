import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Learning Studio — structured AI learning engine",
  description:
    "A local-first, model-independent AI learning studio that executes configurable teaching workflows stage by stage.",
};

export const viewport: Viewport = {
  themeColor: "#a5613c",
};

const themeBootstrap = `(function(){try{var t=localStorage.getItem('studio-theme')||'editorial';document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','editorial');}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="editorial" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body className="min-h-screen bg-bg text-ink antialiased">{children}</body>
    </html>
  );
}
