# Scout

Scout is a research helper for a 9-year-old. He gets one school-style project, talks with Scout to learn about it, saves short notes, and makes the pictures the project asks for.

The starter project is: “Research sea animals and create 3 images that show what you learned.”

Scout is not a general chatbot. The safety rules live in server code. The browser cannot edit or remove them. Chat, pictures, and the hear button all go through OpenRouter. The key stays on the server.

## Run it locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://127.0.0.1:3847](http://127.0.0.1:3847).

The dev server in this project is meant to listen on `0.0.0.0:3847`:

```bash
npm run dev -- --hostname 0.0.0.0 --port 3847
```

## Keys

Put these in `.env.local`. Do not commit that file. Do not prefix them with `NEXT_PUBLIC_`.

| Name | Needed for |
| --- | --- |
| `OPENROUTER_API_KEY` | Chat, new project ideas, pictures, and Hear this |

Optional model overrides are listed in `.env.example`.

If a key is missing, that part of the page says so. The rest still works. Scout will not invent a fake answer and pretend it came from a model.

A new project idea needs the OpenRouter key. Without it, New project picks another starter from the built-in list and says so.

## What stays on this computer

The conversation, notes, and pictures are saved in this browser’s localStorage. There is no account.

## Safety checks

Server routes check chat, picture ideas, and speech text before any provider is called. Unsafe requests get a short, kind redirect. Picture ideas are rewritten into a child-safe illustration style. There is no web browsing tool, no code execution, and no file upload.

```bash
npm run test:guardrails
```
