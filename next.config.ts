import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Live preview is proxied from {port}-{sandboxId}.e2b.app. Without this,
  // Next.js 16 blocks /_next/* and HMR, so client-only routes (Studio) never hydrate.
  allowedDevOrigins: [
    "3000-iuwrlvw2vffrra1kfrypv.e2b.app",
    "*.e2b.app",
    "localhost",
    "127.0.0.1",
  ],
};

export default nextConfig;
