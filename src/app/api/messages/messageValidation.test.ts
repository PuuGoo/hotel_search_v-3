import { describe, it, expect } from "vitest";

import { validateMessage, MAX_MESSAGE_LEN } from "./messageValidation";

const conversationId = "507f1f77bcf86cd799439011";

describe("validateMessage", () => {
  it("accepts a text-only message", () => {
    const r = validateMessage({ message: "hello", conversationId });
    expect(r).toEqual({ ok: true, hasText: true, hasImage: false });
  });

  it("accepts an image-only message", () => {
    const r = validateMessage({ image: "https://x.com/a.png", conversationId });
    expect(r).toEqual({ ok: true, hasText: false, hasImage: true });
  });

  it("accepts text + image together", () => {
    const r = validateMessage({ message: "hi", image: "https://x.com/a.png", conversationId });
    expect(r).toEqual({ ok: true, hasText: true, hasImage: true });
  });

  it("rejects a missing or non-string conversationId", () => {
    expect(validateMessage({ message: "hi" }).ok).toBe(false);
    expect(validateMessage({ message: "hi", conversationId: 123 }).ok).toBe(false);
    const r = validateMessage({ message: "hi", conversationId: "" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("Invalid conversationId");
  });

  it("rejects a null/undefined body without throwing (body ?? {} guard)", () => {
    expect(validateMessage(null).ok).toBe(false);
    expect(validateMessage(undefined).ok).toBe(false);
  });

  it("rejects an empty payload (no text, no image)", () => {
    const r = validateMessage({ conversationId });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("Empty message");
  });

  it("treats whitespace-only text as empty", () => {
    const r = validateMessage({ message: "   ", conversationId });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("Empty message");
  });

  it("rejects an over-long message", () => {
    const r = validateMessage({ message: "a".repeat(MAX_MESSAGE_LEN + 1), conversationId });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("Message too long");
  });

  it("accepts a message exactly at the max length", () => {
    expect(validateMessage({ message: "a".repeat(MAX_MESSAGE_LEN), conversationId }).ok).toBe(true);
  });
});
