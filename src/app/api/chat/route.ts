import { checkText } from "@/lib/guardrails/checks";
import { projectAddendum, withLockedSystemPrompt } from "@/lib/guardrails/prompt";
import {
  badRequest,
  hasForbiddenOverride,
  MISSING_CHAT_MESSAGE,
  PROVIDER_MESSAGE,
  rateLimited,
  readConversation,
  readProject,
} from "@/lib/api-input";
import { allowRequest } from "@/lib/rate-limit";
import { completeChat, MissingKeyError, openRouterKey, ProviderError } from "@/lib/openrouter";

const GUARDRAIL_REDIRECT =
  "I keep our chats safe for kids. Let\u2019s get back to your project. What is one fact you want to write down?";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest();
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) return badRequest();
  const record = body as Record<string, unknown>;
  if (hasForbiddenOverride(record, ["messages", "project"])) {
    return Response.json({ ok: true, reply: GUARDRAIL_REDIRECT, source: "guardrail" });
  }

  const conversation = readConversation(record.messages);
  if (conversation === "tamper") {
    return Response.json({ ok: true, reply: GUARDRAIL_REDIRECT, source: "guardrail" });
  }
  if (!conversation) return badRequest();
  const latest = conversation[conversation.length - 1];
  if (!latest || latest.role !== "user") return badRequest();

  if (!allowRequest(request, "chat", 20)) return rateLimited();

  const latestCheck = checkText(latest.content, "chat");
  if (!latestCheck.allowed) {
    return Response.json({
      ok: true,
      reply: latestCheck.redirect,
      source: "guardrail",
    });
  }

  const project = readProject(record.project);
  if (project === "blocked") {
    return Response.json({ ok: true, reply: GUARDRAIL_REDIRECT, source: "guardrail" });
  }
  if (!project) return badRequest();

  const history = conversation.filter((message) => checkText(message.content, "chat").allowed);
  if (!openRouterKey()) {
    return Response.json(
      { ok: false, error: "missing_key", message: MISSING_CHAT_MESSAGE },
      { status: 503 },
    );
  }

  try {
    const reply = await completeChat(
      withLockedSystemPrompt(history, projectAddendum(project)),
    );
    const output = checkText(reply, "chat");
    if (!output.allowed) {
      return Response.json({
        ok: true,
        reply: output.redirect,
        source: "guardrail",
      });
    }
    return Response.json({ ok: true, reply, source: "model" });
  } catch (error) {
    if (error instanceof MissingKeyError) {
      return Response.json(
        { ok: false, error: "missing_key", message: MISSING_CHAT_MESSAGE },
        { status: 503 },
      );
    }
    if (error instanceof ProviderError) {
      return Response.json(
        { ok: false, error: "provider", message: PROVIDER_MESSAGE },
        { status: 502 },
      );
    }
    return Response.json(
      { ok: false, error: "provider", message: PROVIDER_MESSAGE },
      { status: 502 },
    );
  }
}
