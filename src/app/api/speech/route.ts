import { checkText } from "@/lib/guardrails/checks";
import { badRequest, MISSING_SPEECH_MESSAGE, PROVIDER_MESSAGE, rateLimited } from "@/lib/api-input";
import { allowRequest } from "@/lib/rate-limit";
import { MissingKeyError, openRouterKey, ProviderError, speak } from "@/lib/openrouter";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest();
  }
  if (!body || typeof body !== "object") return badRequest();
  const text = (body as Record<string, unknown>).text;
  if (typeof text !== "string" || !text.trim()) return badRequest();
  const spoken = text.trim();
  if (spoken.length > 2000) {
    return Response.json(
      {
        ok: false,
        error: "bad_request",
        message: "That reply is too long to read aloud. Save a shorter note.",
      },
      { status: 400 },
    );
  }

  if (!allowRequest(request, "speech", 12)) return rateLimited();

  const verdict = checkText(spoken, "speech");
  if (!verdict.allowed) {
    return Response.json({ ok: false, error: "blocked", message: verdict.redirect });
  }

  if (!openRouterKey()) {
    return Response.json(
      { ok: false, error: "missing_key", message: MISSING_SPEECH_MESSAGE },
      { status: 503 },
    );
  }

  try {
    const audio = await speak(spoken);
    return new Response(audio.bytes, {
      status: 200,
      headers: {
        "Content-Type": audio.contentType,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof MissingKeyError) {
      return Response.json(
        { ok: false, error: "missing_key", message: MISSING_SPEECH_MESSAGE },
        { status: 503 },
      );
    }
    if (error instanceof ProviderError || error instanceof Error) {
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
