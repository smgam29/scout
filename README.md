# Scout

Scout is a research helper for a 9-year-old. He gets one school-style project, talks with Scout to learn about it, saves short notes, and makes the pictures the project asks for.

The starter project is: “Research sea animals and create 2 pictures that show what you learned.”

Scout is not a general chatbot. The safety rules live in server code. The browser cannot edit or remove them. Chat and pictures go through OpenRouter. The key stays on the server.

## Run it on your Mac

1. Install [Node.js 20+](https://nodejs.org/) if you do not have it (`node -v` in Terminal).
2. Get this Scout project onto your Mac (clone the repo, or use Cursor’s local/open project flow after you create a real repo).
3. In Terminal:

```bash
cd /path/to/scout
npm install
cp .env.example .env.local
```

4. Open `.env.local` and put your OpenRouter key on the `OPENROUTER_API_KEY=` line. Do not commit that file.
5. Start Scout:

```bash
npm run dev
```

6. Open [http://127.0.0.1:3847](http://127.0.0.1:3847).

`npm run dev` already binds to every address on port 3847. Leave that Terminal window open while you use the app.

For chat to work with Scout’s locked safety prompt, allowlist this exact phrase in OpenRouter → Settings → Privacy → prompt injection allowlist:

`ignore previous instructions`

## Keys

Put these in `.env.local`. Do not commit that file. Do not prefix them with `NEXT_PUBLIC_`.

| Name | Needed for |
| --- | --- |
| `OPENROUTER_API_KEY` | Chat, new project ideas, and pictures |

Optional model overrides are listed in `.env.example`.

If a key is missing, that part of the page says so. The rest still works. Scout will not invent a fake answer and pretend it came from a model.

A new project idea needs the OpenRouter key. Without it, New project picks another starter from the built-in list and says so.

## What stays on this computer

The conversation, notes, and pictures are saved in this browser’s localStorage. There is no account.

## Safety checks

Server routes check chat and picture ideas before any provider is called. Unsafe requests get a short, kind redirect. Picture ideas are rewritten into a child-safe illustration style. There is no web browsing tool, no code execution, and no file upload.

```bash
npm run test:guardrails
```
