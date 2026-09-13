import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";

/** Syntactic guard also used for URLs delegated to an upstream image reader. */
export function safeUrl(raw: string): URL | null {
  try {
    const url = new URL(raw);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return null;
    const host = url.hostname.replace(/^\[|\]$/g, "").replace(/\.$/, "").toLowerCase();
    if (host === "localhost" || /\.(localhost|local|internal|lan)$/.test(host) || !host.includes(".") && !isIP(host)) return null;
    if (isIP(host) === 4) {
      const [a, b] = host.split(".").map(Number);
      if (a === 0 || a === 10 || a === 127 || a >= 224 ||
          (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
          (a === 192 && (b === 168 || b === 0)) || (a === 100 && b >= 64 && b <= 127) ||
          (a === 198 && (b === 18 || b === 19))) return null;
    }
    // Allow global unicast only. Blocks loopback, link-local, unique-local,
    // unspecified, multicast and IPv4-mapped forms (including hex encodings).
    if (isIP(host) === 6 && (!/^[23][0-9a-f]{3}:/.test(host) || /^(2001:(db8|0):|2002:)/.test(host))) return null;
    return url;
  } catch {
    return null;
  }
}

/** Resolve, validate, then PIN the address used by the socket (no DNS rebinding).
 * Redirects re-enter the same guard; response bytes and total time are bounded.
 */
export async function fetchPublicUrl(raw: string, signal: AbortSignal, redirects = 0): Promise<Response> {
  const url = safeUrl(raw);
  if (!url || redirects > 4) throw new Error("Unsafe URL or too many redirects.");
  signal.throwIfAborted();
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(host) ? [{ address: host, family: isIP(host) }] : await lookup(host, { all: true });
  signal.throwIfAborted();
  if (!addresses.length || addresses.some(({ address, family }) => !safeUrl(`http://${family === 6 ? `[${address}]` : address}/`))) {
    throw new Error("URL resolves to a non-public address.");
  }
  const selected = addresses[0];
  const response = await new Promise<Response>((resolve, reject) => {
    const request = (url.protocol === "https:" ? httpsRequest : httpRequest)(url, {
      signal,
      headers: { "user-agent": "Mozilla/5.0 (compatible; LearningStudio/1.0)", accept: "text/html,text/plain,*/*", "accept-encoding": "identity" },
      lookup: (_hostname, options, callback) => {
        if (options.all) callback(null, [selected]);
        else callback(null, selected.address, selected.family);
      },
    }, (incoming) => {
      const headers = new Headers();
      for (const [name, value] of Object.entries(incoming.headers)) {
        if (value !== undefined) headers.set(name, Array.isArray(value) ? value.join(", ") : value);
      }
      const status = incoming.statusCode ?? 502;
      if ([301, 302, 303, 307, 308].includes(status)) {
        incoming.resume();
        resolve(new Response(null, { status, headers }));
        return;
      }
      const chunks: Buffer[] = [];
      let size = 0;
      incoming.on("data", (chunk: Buffer) => {
        size += chunk.length;
        if (size > 400000) incoming.destroy(new Error("Page exceeds retrieval size limit."));
        else chunks.push(chunk);
      });
      incoming.on("error", reject);
      incoming.on("end", () => resolve(new Response([204, 205, 304].includes(status) ? null : Buffer.concat(chunks), { status, headers })));
    });
    request.on("error", reject);
    request.end();
  });
  if ([301, 302, 303, 307, 308].includes(response.status)) {
    const location = response.headers.get("location");
    if (!location) throw new Error("Redirect without a destination.");
    return fetchPublicUrl(new URL(location, url).toString(), signal, redirects + 1);
  }
  return response;
}
