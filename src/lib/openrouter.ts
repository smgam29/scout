import "server-only";

import { readSavedOpenRouterKey } from "@/lib/secrets";

export class MissingKeyError extends Error {
  constructor() {
    super("missing_key");
  }
}

export class ProviderError extends Error {
  constructor() {
    super("provider");
  }
}

export function openRouterKey(): string | null {
  const fromEnv = process.env.OPENROUTER_API_KEY?.trim();
  if (fromEnv) return fromEnv;
  return readSavedOpenRouterKey();
}

export function chatModel(): string {
  const raw = process.env.OPENROUTER_CHAT_MODEL?.trim() || "google/gemini-2.5-flash";
  return raw.replace(/:online$/i, "");
}

export function imageModel(): string {
  const raw =
    process.env.OPENROUTER_IMAGE_MODEL?.trim() || "google/gemini-2.5-flash-image";
  return raw.replace(/:online$/i, "");
}

function headers(key: string): HeadersInit {
  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    "HTTP-Referer": "http://localhost:3847",
    "X-Title": "Scout",
  };
}

function textFromContent(content: unknown): string {
  if (typeof content === "string") return content.trim();
  if (!Array.isArray(content)) return "";
  return content
    .map((part) => {
      if (typeof part === "string") return part;
      if (part && typeof part === "object" && "text" in part && typeof part.text === "string") {
        return part.text;
      }
      return "";
    })
    .join("")
    .trim();
}

export async function completeChat(
  messages: { role: string; content: string }[],
): Promise<string> {
  const key = openRouterKey();
  if (!key) throw new MissingKeyError();
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: headers(key),
    cache: "no-store",
    signal: AbortSignal.timeout(45_000),
    body: JSON.stringify({
      model: chatModel(),
      temperature: 0.4,
      max_tokens: 280,
      messages,
    }),
  });
  if (!response.ok) throw new ProviderError();
  const data = (await response.json()) as {
    choices?: { message?: { content?: unknown } }[];
  };
  const text = textFromContent(data.choices?.[0]?.message?.content);
  if (!text) throw new ProviderError();
  return text;
}

function dataUrlFor(base64: string): string {
  if (base64.startsWith("data:image/")) return base64;
  const mime = base64.startsWith("iVBOR")
    ? "image/png"
    : base64.startsWith("/9j/")
      ? "image/jpeg"
      : "image/webp";
  return `data:${mime};base64,${base64}`;
}

export async function generateImage(prompt: string): Promise<string> {
  const key = openRouterKey();
  if (!key) throw new MissingKeyError();
  const response = await fetch("https://openrouter.ai/api/v1/images", {
    method: "POST",
    headers: headers(key),
    cache: "no-store",
    signal: AbortSignal.timeout(60_000),
    body: JSON.stringify({
      model: imageModel(),
      prompt,
      aspect_ratio: "1:1",
      resolution: "1K",
      output_format: "webp",
      n: 1,
    }),
  });
  if (!response.ok) throw new ProviderError();
  const data = (await response.json()) as {
    data?: { b64_json?: string; url?: string }[];
  };
  const image = data.data?.[0];
  if (image?.b64_json) return dataUrlFor(image.b64_json);
  if (image?.url && /^https:\/\//.test(image.url)) {
    const downloaded = await fetch(image.url, {
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });
    if (!downloaded.ok) throw new ProviderError();
    const mime = downloaded.headers.get("content-type") || "image/webp";
    const bytes = Buffer.from(await downloaded.arrayBuffer());
    return `data:${mime};base64,${bytes.toString("base64")}`;
  }
  throw new ProviderError();
}
