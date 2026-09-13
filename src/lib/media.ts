/** Shared metadata only: safe to import from client and server. */
export const AUDIO_FORMATS = [
  { format: "mp3", mime: "audio/mpeg" },
  { format: "wav", mime: "audio/wav" },
  { format: "m4a", mime: "audio/mp4" },
  { format: "ogg", mime: "audio/ogg" },
  { format: "webm", mime: "audio/webm" },
  { format: "flac", mime: "audio/flac" },
] as const;

/** PDFs only have a binary representation on the Messages shape. */
export function usesDocumentBlocks(kind: string | undefined, model: string | undefined, hasAudio: boolean): boolean {
  return kind === "anthropic" || (kind === "abhibots" && !hasAudio && !/^(gpt-|o)/i.test(model ?? ""));
}
