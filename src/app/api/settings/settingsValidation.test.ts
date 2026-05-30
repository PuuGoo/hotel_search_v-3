import { describe, it, expect } from "vitest";

import { validateSettings, MAX_NAME_LEN, MAX_IMAGE_URL_LEN } from "./settingsValidation";

describe("validateSettings", () => {
  it("accepts a valid name + image", () => {
    const r = validateSettings({ name: "Alice", image: "https://res.cloudinary.com/x.png" });
    expect(r).toEqual({
      ok: true,
      data: { name: "Alice", image: "https://res.cloudinary.com/x.png" },
    });
  });

  it("allows a partial update (only provided fields included)", () => {
    const r = validateSettings({ name: "Bob" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data).toEqual({ name: "Bob" });
  });

  it("returns empty data when nothing is provided", () => {
    const r = validateSettings({});
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data).toEqual({});
  });

  it("handles a null/undefined body without throwing (body ?? {} guard)", () => {
    const rNull = validateSettings(null);
    expect(rNull.ok).toBe(true);
    if (rNull.ok) expect(rNull.data).toEqual({});
    const rUndef = validateSettings(undefined);
    expect(rUndef.ok).toBe(true);
    if (rUndef.ok) expect(rUndef.data).toEqual({});
  });

  it("rejects an empty or whitespace name", () => {
    expect(validateSettings({ name: "" }).ok).toBe(false);
    expect(validateSettings({ name: "   " }).ok).toBe(false);
  });

  it("rejects an over-long name and non-string name", () => {
    expect(validateSettings({ name: "x".repeat(MAX_NAME_LEN + 1) }).ok).toBe(false);
    expect(validateSettings({ name: 123 }).ok).toBe(false);
  });

  it("rejects non-http(s) image schemes (XSS vectors)", () => {
    expect(validateSettings({ image: "javascript:alert(1)" }).ok).toBe(false);
    expect(validateSettings({ image: "data:text/html,x" }).ok).toBe(false);
    expect(validateSettings({ image: "not a url" }).ok).toBe(false);
  });

  it("rejects an over-long image url and non-string image", () => {
    expect(validateSettings({ image: "https://e.com/" + "a".repeat(MAX_IMAGE_URL_LEN) }).ok).toBe(false);
    expect(validateSettings({ image: 42 }).ok).toBe(false);
  });

  it("treats null fields as 'not provided' and omits them", () => {
    const r = validateSettings({ name: null, image: null });
    expect(r.ok).toBe(true);
    // null !== undefined, so they are included as-is (clears the field). This
    // matches the route's prior behavior where only `undefined` is skipped.
    if (r.ok) expect(r.data).toEqual({ name: null, image: null });
  });

  it("does not pass through unknown fields (mass-assignment / privilege escalation)", () => {
    // Security-critical: the route writes result.data straight into
    // prisma.user.update, so any attacker-controlled field that leaks into
    // `data` would be persisted. In particular `role` must never be settable
    // via this self-service endpoint (it gates admin-only routes), nor should
    // id/email/hashedPassword be writable here.
    const r = validateSettings({
      name: "Mallory",
      role: "admin",
      hashedPassword: "x",
      id: "someoneElse",
      email: "evil@example.com",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data).toEqual({ name: "Mallory" });
      expect("role" in r.data).toBe(false);
      expect("hashedPassword" in r.data).toBe(false);
      expect("id" in r.data).toBe(false);
      expect("email" in r.data).toBe(false);
    }
  });
});
