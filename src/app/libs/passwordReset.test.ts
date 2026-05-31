import { describe, it, expect } from "vitest";

import {
  generateResetToken,
  hashResetToken,
  resetTokenExpiry,
  isTokenExpired,
  validateNewPassword,
  RESET_TOKEN_TTL_MS,
  MIN_PASSWORD_LEN,
  MAX_PASSWORD_LEN,
} from "./passwordReset";

describe("generateResetToken", () => {
  it("produces a long, unique, url-safe token each call", () => {
    const a = generateResetToken();
    const b = generateResetToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(40);
    // base64url alphabet only (no +, /, =).
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});

describe("hashResetToken", () => {
  it("is deterministic and not the raw token", () => {
    const token = "some-token";
    const h1 = hashResetToken(token);
    const h2 = hashResetToken(token);
    expect(h1).toBe(h2);
    expect(h1).not.toBe(token);
    expect(h1).toMatch(/^[0-9a-f]{64}$/); // sha-256 hex
  });

  it("differs for different tokens", () => {
    expect(hashResetToken("a")).not.toBe(hashResetToken("b"));
  });
});

describe("resetTokenExpiry / isTokenExpired", () => {
  it("expiry is TTL in the future", () => {
    const now = 1_000_000;
    expect(resetTokenExpiry(now).getTime()).toBe(now + RESET_TOKEN_TTL_MS);
  });

  it("detects expired vs valid tokens", () => {
    const now = 1_000_000;
    const future = new Date(now + 1000);
    const past = new Date(now - 1000);
    expect(isTokenExpired(future, now)).toBe(false);
    expect(isTokenExpired(past, now)).toBe(true);
    // exactly-now counts as expired (<=).
    expect(isTokenExpired(new Date(now), now)).toBe(true);
  });
});

describe("validateNewPassword", () => {
  it("accepts a password within bounds", () => {
    expect(validateNewPassword("a".repeat(MIN_PASSWORD_LEN))).toEqual({
      ok: true,
      password: "a".repeat(MIN_PASSWORD_LEN),
    });
    expect(validateNewPassword("a".repeat(MAX_PASSWORD_LEN)).ok).toBe(true);
  });

  it("rejects too short / too long / non-string", () => {
    expect(validateNewPassword("a".repeat(MIN_PASSWORD_LEN - 1)).ok).toBe(false);
    expect(validateNewPassword("a".repeat(MAX_PASSWORD_LEN + 1)).ok).toBe(false);
    expect(validateNewPassword(123).ok).toBe(false);
    expect(validateNewPassword(null).ok).toBe(false);
    expect(validateNewPassword(undefined).ok).toBe(false);
  });
});
