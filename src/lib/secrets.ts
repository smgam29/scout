import "server-only";

import { mkdir, unlink, writeFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const KEY_FILENAME = "openrouter-key";

function secretsDir(): string {
  const override = process.env.SCOUT_DATA_DIR?.trim();
  if (override) return path.resolve(override);
  return path.join(process.cwd(), ".scout");
}

function keyPath(): string {
  return path.join(secretsDir(), KEY_FILENAME);
}

export function looksLikeOpenRouterKey(key: string): boolean {
  const trimmed = key.trim();
  if (trimmed.length < 20 || trimmed.length > 512) return false;
  return /^sk-or-[A-Za-z0-9_-]+$/.test(trimmed);
}

/** Sync read for request-time key resolution. Never log the return value. */
export function readSavedOpenRouterKey(): string | null {
  try {
    const file = keyPath();
    if (!existsSync(file)) return null;
    const key = readFileSync(file, "utf8").trim();
    return key || null;
  } catch {
    return null;
  }
}

export async function saveOpenRouterKey(key: string): Promise<void> {
  const trimmed = key.trim();
  if (!looksLikeOpenRouterKey(trimmed)) {
    throw new Error("invalid_key");
  }
  const dir = secretsDir();
  await mkdir(dir, { recursive: true, mode: 0o700 });
  await writeFile(keyPath(), `${trimmed}\n`, { encoding: "utf8", mode: 0o600 });
}

export async function clearOpenRouterKey(): Promise<void> {
  try {
    await unlink(keyPath());
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") throw error;
  }
}
