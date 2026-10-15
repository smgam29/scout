import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  clampLearnedImageWidthPercent,
  countLearnedImages,
  isAllowedLearnedImageSrc,
  LEARNED_IMAGE_MAX_COUNT,
  learnedImageStyle,
  sanitizeLearnedHtml,
} from "./learned-html";

const tinyJpeg =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGfAP/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAQUCf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQMBAT8Bf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQIBAT8Bf//Z";

describe("learned image sanitize", () => {
  it("keeps safe data-image tags with width percent", () => {
    const html = `<p>Hi</p><img src="${tinyJpeg}" style="width: 40%; height: auto; max-width: 100%;" onclick="alert(1)">`;
    const next = sanitizeLearnedHtml(html);
    assert.match(next, /<img\b/i);
    assert.match(next, /width:\s*40%/i);
    assert.doesNotMatch(next, /onclick/i);
    assert.equal(countLearnedImages(next), 1);
  });

  it("strips remote and scripted images", () => {
    const html = `<img src="https://evil.example/a.png"><img src="${tinyJpeg}">`;
    const next = sanitizeLearnedHtml(html);
    assert.doesNotMatch(next, /https:/i);
    assert.equal(countLearnedImages(next), 1);
  });

  it("caps image count", () => {
    const imgs = Array.from(
      { length: LEARNED_IMAGE_MAX_COUNT + 2 },
      () => `<img src="${tinyJpeg}" style="width: 50%;">`,
    ).join("");
    const next = sanitizeLearnedHtml(imgs);
    assert.equal(countLearnedImages(next), LEARNED_IMAGE_MAX_COUNT);
  });

  it("validates and clamps helpers", () => {
    assert.equal(isAllowedLearnedImageSrc(tinyJpeg), true);
    assert.equal(isAllowedLearnedImageSrc("data:text/html;base64,abc"), false);
    assert.equal(clampLearnedImageWidthPercent(5), 15);
    assert.equal(clampLearnedImageWidthPercent(150), 100);
    assert.match(learnedImageStyle(33), /width:\s*33%/);
  });
});
