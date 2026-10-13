import { prepareImagePrompt } from "@/lib/guardrails/image-prompt";
import {
  badRequest,
  MISSING_IMAGE_MESSAGE,
  PROVIDER_MESSAGE,
  rateLimited,
} from "@/lib/api-input";
import { allowRequest } from "@/lib/rate-limit";
import { generateImage, MissingKeyError, openRouterKey, ProviderError } from "@/lib/openrouter";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest();
  }
  if (!body || typeof body !== "object") return badRequest();
  const record = body as Record<string, unknown>;
  if (typeof record.description !== "string" || typeof record.projectTitle !== "string") {
    return badRequest();
  }
  const description = record.description.trim();
  const projectTitle = record.projectTitle.trim();
  if (!description || description.length > 300 || !projectTitle || projectTitle.length > 80) {
    return Response.json(
      {
        ok: false,
        error: "bad_request",
        message: "Write what the picture should show, in a sentence or two.",
      },
      { status: 400 },
    );
  }

  if (!allowRequest(request, "image", 8)) return rateLimited();

  const prepared = prepareImagePrompt(description, projectTitle);
  if (!prepared.ok) {
    return Response.json({ ok: false, error: "blocked", message: prepared.message });
  }

  if (!openRouterKey()) {
    return Response.json(
      { ok: false, error: "missing_key", message: MISSING_IMAGE_MESSAGE },
      { status: 503 },
    );
  }

  try {
    const dataUrl = await generateImage(prepared.prompt);
    return Response.json({ ok: true, dataUrl });
  } catch (error) {
    if (error instanceof MissingKeyError) {
      return Response.json(
        { ok: false, error: "missing_key", message: MISSING_IMAGE_MESSAGE },
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
