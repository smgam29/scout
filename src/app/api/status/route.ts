import { connection } from "next/server";

import { openRouterKey } from "@/lib/openrouter";

export async function GET() {
  await connection();
  const ready = Boolean(openRouterKey());
  return Response.json({
    chat: ready,
    images: ready,
    speech: ready,
  });
}
