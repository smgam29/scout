import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { allBriefsDone, briefStatuses, coachLinesForGaps, textHasClue } from "./brief";
import { STARTERS } from "./projects";

describe("textHasClue", () => {
  it("matches any clue", () => {
    assert.equal(textHasClue("How does a sea turtle breathe?", ["turtle", "breathe"]), true);
    assert.equal(textHasClue("Tell me about wind", ["cloud", "rain"]), false);
  });
});

describe("sea animals briefs", () => {
  const project = { ...STARTERS[0], source: "starter" as const, notice: null };

  it("does not complete from pasting the chat question alone", () => {
    const work = {
      project,
      messages: [
        {
          role: "user" as const,
          content: "I need help understanding sea turtle breathing for my notes.",
        },
        {
          role: "assistant" as const,
          content: "Sea turtles have lungs and come to the surface for air.",
          source: "model",
        },
      ],
      learnedHtml: "",
      pictures: [{ dataUrl: "" }, { dataUrl: "" }],
    };
    const turtleAsk = briefStatuses(work).find((status) => status.item.id.endsWith("ask-1"));
    assert.equal(turtleAsk?.done, false);
  });

  it("completes when answer clues are in What I learned", () => {
    const work = {
      project,
      messages: [
        {
          role: "user" as const,
          content: "I need help understanding sea turtle breathing for my notes.",
        },
        {
          role: "assistant" as const,
          content: "Sea turtles have lungs and come to the surface for air.",
          source: "model",
        },
        {
          role: "user" as const,
          content: "Help me choose a deep-ocean animal.",
        },
        {
          role: "assistant" as const,
          content: "Anglerfish live in the dark deep ocean.",
          source: "model",
        },
        {
          role: "user" as const,
          content: "I want to compare sea animal speeds.",
        },
        {
          role: "assistant" as const,
          content: "A sailfish can swim about 68 mph.",
          source: "model",
        },
      ],
      learnedHtml:
        "<p>Turtles use lungs and come up for air.</p>" +
        "<p>Anglerfish live in the dark deep ocean.</p>" +
        "<p>Sailfish are fast, about 68 mph.</p>" +
        "<p>Dolphins are smart sea animals that live in groups.</p>",
      pictures: [
        { dataUrl: "data:image/webp;base64,abc" },
        { dataUrl: "data:image/webp;base64,def" },
      ],
    };
    assert.equal(allBriefsDone(work), true);
  });

  it("coaches missing write step", () => {
    const work = {
      project,
      messages: [
        { role: "user" as const, content: "Help me with sea turtles." },
        {
          role: "assistant" as const,
          content: "They breathe air with lungs at the surface.",
          source: "model",
        },
      ],
      learnedHtml:
        "<p>Turtles use lungs and surface air.</p>" +
        "<p>The deep dark has anglerfish.</p>" +
        "<p>Sailfish speed is about 68 mph.</p>",
      pictures: [
        { dataUrl: "data:image/webp;base64,abc" },
        { dataUrl: "data:image/webp;base64,def" },
      ],
    };
    const lines = coachLinesForGaps(work);
    assert.equal(lines.length >= 1, true);
    assert.match(lines.join(" "), /dolphins/i);
  });
});
