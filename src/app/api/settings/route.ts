import { connection } from "next/server";

import {
  clearOpenRouterKey,
  looksLikeOpenRouterKey,
  saveOpenRouterKey,
} from "@/lib/secrets";
import { openRouterKey } from "@/lib/openrouter";

export async function GET() {
  await connection();
  return Response.json({ hasKey: Boolean(openRouterKey()) });
}

export async function PUT(request: Request) {
  await connection();
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { ok: false, error: "bad_request", message: "Send a key in the request body." },
      { status: 400 },
    );
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return Response.json(
      { ok: false, error: "bad_request", message: "Send a key in the request body." },
      { status: 400 },
    );
  }
  const key = (body as Record<string, unknown>).key;
  if (typeof key !== "string" || !key.trim()) {
    return Response.json(
      { ok: false, error: "bad_request", message: "Paste a non-empty OpenRouter API key." },
      { status: 400 },
    );
  }
  if (!looksLikeOpenRouterKey(key)) {
    return Response.json(
      {
        ok: false,
        error: "bad_request",
        message: "That does not look like an OpenRouter key (it usually starts with sk-or-).",
      },
      { status: 400 },
    );
  }
  try {
    await saveOpenRouterKey(key);
  } catch {
    return Response.json(
      { ok: false, error: "write_failed", message: "Could not save the key on this Mac." },
      { status: 500 },
    );
  }
  return Response.json({ ok: true, hasKey: true });
}

export async function DELETE() {
  await connection();
  try {
    await clearOpenRouterKey();
  } catch {
    return Response.json(
      { ok: false, error: "write_failed", message: "Could not clear the saved key." },
      { status: 500 },
    );
  }
  return Response.json({ ok: true, hasKey: Boolean(openRouterKey()) });
}
