import "server-only";

import { checkText } from "@/lib/guardrails/checks";

export type ClientProject = {
  title: string;
  task: string;
  imageCount: number;
};

export type ClientMessage = {
  role: "user" | "assistant";
  content: string;
};

const FORBIDDEN_KEYS = ["systemPrompt", "system", "tools", "model", "messages"];

export function jsonBody(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function hasForbiddenOverride(
  body: Record<string, unknown>,
  allowed: string[],
): boolean {
  return Object.keys(body).some((key) => !allowed.includes(key) && FORBIDDEN_KEYS.includes(key));
}

export function readProject(value: unknown): ClientProject | "blocked" | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (typeof record.title !== "string" || typeof record.task !== "string") return null;
  const title = record.title.trim();
  const task = record.task.trim();
  if (!title || !task || title.length > 80 || task.length > 400) return null;
  if (!checkText(title, "project").allowed || !checkText(task, "project").allowed) {
    return "blocked";
  }
  return { title, task, imageCount: 3 };
}

export function readConversation(
  value: unknown,
): ClientMessage[] | "tamper" | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 40) return null;
  const messages: ClientMessage[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const record = item as Record<string, unknown>;
    if (record.role === "system" || record.role === "developer" || record.role === "tool") {
      return "tamper";
    }
    if (record.role !== "user" && record.role !== "assistant") return null;
    if (typeof record.content !== "string") return null;
    const content = record.content.trim();
    if (!content || content.length > 2000) return null;
    messages.push({ role: record.role, content });
  }
  return messages.slice(-12);
}

export const RATE_LIMIT_MESSAGE =
  "Scout needs a short rest. Wait a minute, then try again.";

export const MISSING_CHAT_MESSAGE =
  "Answers need a setup key from a parent. You can still read your project. Nothing here is a made-up answer.";

export const MISSING_IMAGE_MESSAGE =
  "Pictures need a setup key from a parent (OpenRouter). This box stays empty until then.";

export const MISSING_SPEECH_MESSAGE =
  "Voice needs a setup key from a parent (ElevenLabs).";

export const PROVIDER_MESSAGE =
  "Scout couldn\u2019t finish that just now. Try again in a moment.";

export function rateLimited() {
  return Response.json(
    { ok: false, error: "rate_limit", message: RATE_LIMIT_MESSAGE },
    { status: 429 },
  );
}

export function badRequest() {
  return Response.json(
    { ok: false, error: "bad_request", message: "Send a question about your project." },
    { status: 400 },
  );
}
