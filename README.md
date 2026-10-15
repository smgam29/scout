# Scout

Scout is a research helper for a 9-year-old. He gets one school-style project, talks with Scout to learn about it, saves short notes, and makes the pictures the project asks for.

The starter project is: “Research sea animals and create 2 pictures that show what you learned.”

Scout is not a general chatbot. The safety rules live in server code. The browser cannot edit or remove them. Chat and pictures go through OpenRouter. The key stays on the server.

## Parent setup (once) on the family Mac

1. Install [Node.js 20 LTS](https://nodejs.org/) (`node -v` in Terminal).
2. Put this Scout folder on the Mac (clone, download, or Cursor project).
3. In Terminal:

```bash
cd /path/to/scout
npm install
```

4. Add the OpenRouter key in **one** of these ways (do not commit real keys):

   - **Preferred for a child’s limited account:** start Scout, open **Parent settings** in the header, paste the key, Save. Scout stores it in a local gitignored file (`.scout/openrouter-key`), not in the browser.
   - **Or** copy `.env.example` to `.env.local` and set `OPENROUTER_API_KEY=` there.

5. For chat to work with Scout’s locked safety prompt, allowlist this exact phrase in OpenRouter → Settings → Privacy → prompt injection allowlist:

   `ignore previous instructions`

## Child launch (folder)

Double-click **Start Scout.command** in the Scout folder. It starts the server and opens [http://127.0.0.1:3847](http://127.0.0.1:3847).

Double-click **Stop Scout.command** when finished.

Or from Terminal:

```bash
npm run dev
```

Leave the server running while you use the app.

## Optional: Scout.app on the Desktop

On the parent’s Mac (this must be built on macOS; cloud Linux cannot make the `.app`):

```bash
cd /path/to/scout
chmod +x macos/build-scout-app.sh
./macos/build-scout-app.sh
```

That builds an unsigned `~/Desktop/Scout.app` with a standalone Next server. It does **not** bake in the API key.

1. Move `Scout.app` where the child can open it (Desktop or Applications).
2. First open: right-click → **Open** (Gatekeeper).
3. Parent opens **Parent settings** once and pastes the OpenRouter key.
4. The key is stored under `~/Library/Application Support/Scout/`, not inside the `.app` and not in git.

Private / family use only — not for the App Store or public distribution.

## Keys

Never prefix keys with `NEXT_PUBLIC_`. Never put real keys in git or README examples.

| Source | Needed for |
| --- | --- |
| Parent settings (`.scout/openrouter-key`) or `OPENROUTER_API_KEY` in `.env.local` | Chat, new project ideas, and pictures |

Resolution order: environment variable, then the Parent settings file.

Optional model overrides are listed in `.env.example`.

If a key is missing, that part of the page says so and points parents to Parent settings. The rest still works. Scout will not invent a fake answer and pretend it came from a model.

A new project idea needs the OpenRouter key. Without it, New project picks another starter from the built-in list and says so.

## What stays on this computer

The conversation, notes, and pictures are saved in this browser’s localStorage. There is no account.

## Safety checks

Server routes check chat and picture ideas before any provider is called. Unsafe requests get a short, kind redirect. Picture ideas are rewritten into a child-safe illustration style. There is no web browsing tool, no code execution, and no file upload.

```bash
npm run test:guardrails
```
