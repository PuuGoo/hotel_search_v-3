import { describe, it, expect } from "vitest";

import {
  validateRegistration,
  MAX_EMAIL_LEN,
  MAX_NAME_LEN,
  MIN_PASSWORD_LEN,
  MAX_PASSWORD_LEN,
} from "./registerValidation";

const valid = {
  email: "alice@example.com",
  name: "Alice",
  password: "supersecret",
};

describe("validateRegistration", () => {
  it("accepts and normalizes a valid payload", () => {
    const r = validateRegistration({ email: "  Alice@Example.com  ", name: "  Alice  ", password: "supersecret" });
    expect(r).toEqual({
      ok: true,
      email: "Alice@Example.com", // trimmed, case preserved
      name: "Alice",
      password: "supersecret",
    });
  });

  it("rejects missing fields", () => {
    expect(validateRegistration({}).ok).toBe(false);
    expect(validateRegistration({ email: "a@b.co", name: "A" }).ok).toBe(false);
    expect(validateRegistration(null).ok).toBe(false);
  });

  it("rejects non-string fields", () => {
    const r = validateRegistration({ ...valid, email: 123 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("Thông tin không hợp lệ");
  });

  it("rejects malformed emails", () => {
    for (const email of ["no-at", "a@b", "a b@c.com", "@c.com", "a@.com"]) {
      const r = validateRegistration({ ...valid, email });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toBe("Email không hợp lệ");
    }
  });

  it("rejects an over-long email", () => {
    const longEmail = "a".repeat(MAX_EMAIL_LEN) + "@example.com";
    expect(validateRegistration({ ...valid, email: longEmail }).ok).toBe(false);
  });

  it("rejects empty or over-long names", () => {
    expect(validateRegistration({ ...valid, name: "   " }).ok).toBe(false);
    expect(validateRegistration({ ...valid, name: "x".repeat(MAX_NAME_LEN + 1) }).ok).toBe(false);
  });

  it("enforces password length bounds", () => {
    expect(validateRegistration({ ...valid, password: "a".repeat(MIN_PASSWORD_LEN - 1) }).ok).toBe(false);
    expect(validateRegistration({ ...valid, password: "a".repeat(MAX_PASSWORD_LEN + 1) }).ok).toBe(false);
    expect(validateRegistration({ ...valid, password: "a".repeat(MIN_PASSWORD_LEN) }).ok).toBe(true);
    expect(validateRegistration({ ...valid, password: "a".repeat(MAX_PASSWORD_LEN) }).ok).toBe(true);
  });
});
