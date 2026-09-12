import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { projects as projectsTable } from "@/db/schema";
import { fail, handleError, ok, readJson, requireString } from "@/lib/api";
import { ensureBootstrap } from "@/lib/bootstrap";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureBootstrap();
    const rows = await db.select().from(projectsTable).orderBy(asc(projectsTable.createdAt));
    return ok({ projects: rows });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    await ensureBootstrap();
    const body = await readJson<{ name?: string; description?: string; accent?: string }>(request);
    const [created] = await db
      .insert(projectsTable)
      .values({
        name: requireString(body.name, "Project name", 80),
        description: String(body.description ?? "").slice(0, 400),
        accent: String(body.accent ?? "rose").slice(0, 20),
      })
      .returning();
    return ok({ project: created }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await readJson<{ id?: string; name?: string; description?: string }>(request);
    const id = requireString(body.id, "Project id", 64);
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim().slice(0, 80);
    if (typeof body.description === "string") patch.description = body.description.slice(0, 400);
    const [updated] = await db.update(projectsTable).set(patch).where(eq(projectsTable.id, id)).returning();
    if (!updated) return fail("Project not found.", 404);
    return ok({ project: updated });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return fail("Project id is required.");
    await db.delete(projectsTable).where(eq(projectsTable.id, id));
    return ok({ deleted: true });
  } catch (error) {
    return handleError(error);
  }
}
