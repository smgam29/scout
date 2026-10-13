import { connection } from "next/server";

import { elevenLabsKey } from "@/lib/elevenlabs";
import { openRouterKey } from "@/lib/openrouter";

export async function GET() {
  await connection();
  const chat = Boolean(openRouterKey());
  return Response.json({
    chat,
    images: chat,
    speech: Boolean(elevenLabsKey()),
  });
}
