import "server-only";

import { MissingKeyError, ProviderError } from "@/lib/openrouter";

export function elevenLabsKey(): string | null {
  const key = process.env.ELEVENLABS_API_KEY?.trim();
  return key ? key : null;
}

export async function speak(text: string): Promise<ArrayBuffer> {
  const key = elevenLabsKey();
  if (!key) throw new MissingKeyError();
  const voice = process.env.ELEVENLABS_VOICE_ID?.trim() || "21m00Tcm4TlvDq8ikWAM";
  const model = process.env.ELEVENLABS_MODEL_ID?.trim() || "eleven_flash_v2_5";
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice)}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": key,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
      body: JSON.stringify({
        text,
        model_id: model,
        voice_settings: {
          stability: 0.45,
          similarity_boost: 0.75,
        },
      }),
    },
  );
  if (!response.ok) throw new ProviderError();
  return response.arrayBuffer();
}
