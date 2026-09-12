import { handleError, readJson } from "@/lib/api";
import { runStage, type RunEvent } from "@/lib/engine/run";
import type { Modifier } from "@/lib/engine/harness";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function ndjson(source: AsyncGenerator<RunEvent>): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of source) {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        }
      } catch (error) {
        controller.enqueue(
          encoder.encode(
            `${JSON.stringify({
              type: "error",
              message: error instanceof Error ? error.message : "Stream failed.",
            })}\n`,
          ),
        );
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store, no-transform",
      "x-accel-buffering": "no",
    },
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await readJson<{ stageIndex?: number; modifier?: Modifier }>(request);
    const stageIndex = Math.max(0, Math.round(body.stageIndex ?? 0));
    const modifier: Modifier = (["none", "longer", "shorter", "deeper"] as const).includes(
      body.modifier as Modifier,
    )
      ? (body.modifier as Modifier)
      : "none";
    return ndjson(runStage(id, stageIndex, modifier));
  } catch (error) {
    return handleError(error);
  }
}
