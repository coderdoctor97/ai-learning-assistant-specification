import { handleError, readJson, requireString } from "@/lib/api";
import { runQa, type RunEvent } from "@/lib/engine/run";

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
    const body = await readJson<{ stageId?: string; question?: string }>(request);
    const stageId = requireString(body.stageId, "stageId", 64);
    const question = requireString(body.question, "Question", 4000);
    return ndjson(runQa(id, stageId, question));
  } catch (error) {
    return handleError(error);
  }
}
