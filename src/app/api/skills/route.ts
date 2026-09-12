import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { skills as skillsTable } from "@/db/schema";
import { fail, handleError, ok, readJson, requireString } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SKILL_FILES = ["SKILL.md", "skill.md", "AGENT.md", "AGENTS.md", "README.md", "readme.md", "prompt.md"];
const MAX_SKILL_CHARS = 20000;

/** Strip anything that tries to behave like an instruction override. */
function sanitizeSkill(raw: string): string {
  return raw
    .replace(/```[\s\S]*?```/g, (block) => (block.length > 2500 ? "```\n[large code block omitted on import]\n```" : block))
    .replace(/^\s*(system\s*prompt|ignore (all|previous)[^\n]*|you are chatgpt)[^\n]*$/gim, "[removed on import]")
    .replace(/<\/?(script|iframe|object)[^>]*>/gi, "")
    .slice(0, MAX_SKILL_CHARS)
    .trim();
}

function parseRepo(url: string): { owner: string; repo: string; branch?: string; path?: string } | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "github.com" && parsed.hostname !== "raw.githubusercontent.com") return null;
    const segments = parsed.pathname.split("/").filter(Boolean);
    if (segments.length < 2) return null;
    const [owner, repo, maybeTree, maybeBranch, ...rest] = segments;
    if (maybeTree === "tree" || maybeTree === "blob") {
      return { owner, repo: repo.replace(/\.git$/, ""), branch: maybeBranch, path: rest.join("/") };
    }
    return { owner, repo: repo.replace(/\.git$/, "") };
  } catch {
    return null;
  }
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: { "user-agent": "LearningStudio/1.0", accept: "text/plain" },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) return null;
    const text = await response.text();
    return text.length > 300000 ? text.slice(0, 300000) : text;
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const rows = await db.select().from(skillsTable).orderBy(desc(skillsTable.createdAt));
    return ok({ skills: rows });
  } catch (error) {
    return handleError(error);
  }
}

/**
 * GitHub import. The repository is untrusted input: we only ever read a single
 * Markdown definition file, sanitise it, and store it as reference guidance.
 * Nothing from the repository is ever executed.
 */
export async function POST(request: Request) {
  try {
    const body = await readJson<{ url?: string; preview?: boolean; name?: string }>(request);
    const url = requireString(body.url, "GitHub URL", 400);
    const repo = parseRepo(url);
    if (!repo) return fail("Provide a github.com repository URL.");

    const branches = repo.branch ? [repo.branch] : ["main", "master"];
    const candidates: string[] = [];
    for (const branch of branches) {
      const prefix = `https://raw.githubusercontent.com/${repo.owner}/${repo.repo}/${branch}`;
      if (repo.path) {
        candidates.push(repo.path.endsWith(".md") ? `${prefix}/${repo.path}` : `${prefix}/${repo.path}/SKILL.md`);
        for (const file of SKILL_FILES) candidates.push(`${prefix}/${repo.path}/${file}`);
      }
      for (const file of SKILL_FILES) candidates.push(`${prefix}/${file}`);
    }

    let content: string | null = null;
    let sourceFile = "";
    for (const candidate of candidates) {
      content = await fetchText(candidate);
      if (content && content.trim().length > 40) {
        sourceFile = candidate;
        break;
      }
      content = null;
    }
    if (!content) {
      return fail("No skill definition found. Expected SKILL.md, AGENT.md or README.md in that repository.", 404);
    }

    const cleaned = sanitizeSkill(content);
    const titleMatch = /^#\s+(.+)$/m.exec(cleaned);
    const name = (body.name?.trim() || titleMatch?.[1] || `${repo.owner}/${repo.repo}`).slice(0, 100);
    const description = (cleaned.split("\n").find((line) => line.trim() && !line.startsWith("#")) ?? "").slice(0, 300);

    if (body.preview) {
      return ok({
        preview: { name, description, sourceFile, instructions: cleaned.slice(0, 4000), length: cleaned.length },
      });
    }

    const [created] = await db
      .insert(skillsTable)
      .values({ name, repoUrl: url, description, instructions: cleaned, sourceFile, enabled: false })
      .returning();
    return ok({ skill: created }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await readJson<{ id?: string; enabled?: boolean; name?: string }>(request);
    const id = requireString(body.id, "Skill id", 64);
    const patch: Record<string, unknown> = {};
    if (typeof body.enabled === "boolean") patch.enabled = body.enabled;
    if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim().slice(0, 100);
    const [updated] = await db.update(skillsTable).set(patch).where(eq(skillsTable.id, id)).returning();
    if (!updated) return fail("Skill not found.", 404);
    return ok({ skill: updated });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return fail("Skill id is required.");
    await db.delete(skillsTable).where(eq(skillsTable.id, id));
    return ok({ deleted: true });
  } catch (error) {
    return handleError(error);
  }
}
