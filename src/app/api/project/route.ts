import { checkText } from "@/lib/guardrails/checks";
import { newProjectInstruction, withLockedSystemPrompt } from "@/lib/guardrails/prompt";
import { rateLimited } from "@/lib/api-input";
import { instanceFromStarter, nextStarter, type Project } from "@/lib/projects";
import { allowRequest } from "@/lib/rate-limit";
import { completeChat, openRouterKey } from "@/lib/openrouter";

const STARTER_NOTICE =
  "This one is from Scout\u2019s starter list. A brand-new idea needs an OpenRouter key.";

const FALLBACK_NOTICE =
  "That idea wasn\u2019t a fit, so here is a starter project instead.";

function starterResponse(currentTitle: string, notice: string) {
  const project: Project = instanceFromStarter(nextStarter(currentTitle), notice);
  return Response.json({ ok: true, project });
}

function parseIdea(raw: string): { title: string; task: string; prompts: string[] } | null {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const value = JSON.parse(match[0]) as Record<string, unknown>;
    if (typeof value.title !== "string" || typeof value.task !== "string") return null;
    if (!Array.isArray(value.prompts)) return null;
    const title = value.title.trim();
    const task = value.task.trim();
    const prompts = value.prompts
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 4);
    if (title.length < 2 || title.length > 60) return null;
    if (task.length < 10 || task.length > 280) return null;
    if (prompts.length < 3) return null;
    if (!/\b3\b/.test(task) || !/image|picture/i.test(task)) return null;
    return { title, task, prompts };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  let currentTitle = "";
  try {
    const body = (await request.json()) as { currentTitle?: unknown };
    if (typeof body.currentTitle === "string") {
      currentTitle = body.currentTitle.trim().slice(0, 80);
    }
  } catch {
    currentTitle = "";
  }

  if (!allowRequest(request, "project", 6)) return rateLimited();

  if (currentTitle && !checkText(currentTitle, "project").allowed) {
    currentTitle = "Sea animals";
  }

  if (!openRouterKey()) {
    return starterResponse(currentTitle, STARTER_NOTICE);
  }

  try {
    const raw = await completeChat(
      withLockedSystemPrompt(
        [{ role: "user", content: newProjectInstruction(currentTitle || "Sea animals") }],
      ),
    );
    if (!checkText(raw, "project").allowed) {
      return starterResponse(currentTitle, FALLBACK_NOTICE);
    }
    const idea = parseIdea(raw);
    if (!idea) return starterResponse(currentTitle, FALLBACK_NOTICE);
    const fields = [idea.title, idea.task, ...idea.prompts];
    if (fields.some((field) => !checkText(field, "project").allowed)) {
      return starterResponse(currentTitle, FALLBACK_NOTICE);
    }
    const project: Project = {
      id: crypto.randomUUID(),
      title: idea.title,
      task: idea.task,
      imageCount: 3,
      prompts: idea.prompts,
      hints: [],
      source: "model",
      notice: null,
    };
    return Response.json({ ok: true, project });
  } catch {
    return starterResponse(
      currentTitle,
      "Scout couldn\u2019t make a new idea just now, so here is a starter project.",
    );
  }
}
