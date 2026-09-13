import { execFileSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { brotliDecompressSync } from "node:zlib";
import type { LaunchOptions } from "@playwright/test";

/*
 * Chromium bootstrap for environments where the Playwright browser CDN is
 * unreachable: the npm package @sparticuz/chromium ships a headless chromium
 * build plus its NSS/NSPR shared libraries and a base font set. Everything
 * extracts to a temp cache and is reused across runs. On non-linux hosts —
 * or when PW_USE_BUNDLED_CHROMIUM=0 — Playwright's own browser resolution is
 * used unchanged.
 */

/* Anchor require() to the repo root; test files are transpiled to CJS. */
const require = createRequire(path.join(process.cwd(), "package.json"));

function extract(brPath: string, target: string): void {
  if (existsSync(target)) return;
  const tarPath = `${target}.tar`;
  writeFileSync(tarPath, brotliDecompressSync(readFileSync(brPath)));
  mkdirSync(target, { recursive: true });
  execFileSync("tar", ["-xf", tarPath, "-C", target]);
}

export function bundledChromiumLaunchOptions(): LaunchOptions {
  if (process.platform !== "linux" || process.env.PW_USE_BUNDLED_CHROMIUM === "0") return {};
  try {
    /* The package exports map hides package.json — resolve the JS entry. */
    const entryPath = require.resolve("@sparticuz/chromium");
    const pkgDir = path.resolve(path.dirname(entryPath), "..");
    const binDir = path.join(pkgDir, "bin");
    const cache = path.join(os.tmpdir(), "ls-chromium-cache");
    mkdirSync(cache, { recursive: true });

    const chromiumPath = path.join(cache, "chromium");
    if (!existsSync(chromiumPath)) {
      writeFileSync(chromiumPath, brotliDecompressSync(readFileSync(path.join(binDir, "chromium.br"))));
      chmodSync(chromiumPath, 0o755);
    }

    extract(path.join(binDir, "al2023.tar.br"), path.join(cache, "al2023"));
    extract(path.join(binDir, "fonts.tar.br"), path.join(cache, "fonts"));
    extract(path.join(binDir, "swiftshader.tar.br"), path.join(cache, "swiftshader"));

    const bundled = require("@sparticuz/chromium").default;
    /* The package targets AWS Lambda: its GPU/swiftshader and
       single-process/zygote args CHECK-crash this Chromium build when the
       first page renders under Playwright's sandboxed headless launch.
       Disable rendering acceleration entirely — DOM/layout tests do not
       need a GPU — and keep the rest of the curated Lambda hardening. */
    const lambdaOnlyArgs = new Set([
      "--single-process",
      "--no-zygote",
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
      "--in-process-gpu",
      "--ignore-gpu-blocklist",
      "--enable-features=SharedArrayBuffer",
    ]);
    const bundledArgs = (bundled.args as string[]).filter((arg) => !lambdaOnlyArgs.has(arg));
    return {
      executablePath: chromiumPath,
      args: [
        ...bundledArgs,
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--disable-gpu-compositing",
        "--font-render-hinting=none",
      ],
      env: {
        ...process.env,
        LD_LIBRARY_PATH: [path.join(cache, "al2023", "lib"), path.join(cache, "swiftshader", "lib")]
          .join(":"),
        FONTCONFIG_PATH: path.join(cache, "fonts"),
      },
    };
  } catch {
    // Fall back to Playwright's own browser management.
    return {};
  }
}
