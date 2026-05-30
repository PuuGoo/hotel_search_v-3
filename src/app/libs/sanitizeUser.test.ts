import { describe, it, expect } from "vitest";

import { sanitizeUser, sanitizeUsers } from "./sanitizeUser";

// The sanitizer is the single chokepoint that keeps password hashes from
// crossing the server -> client boundary in the data-fetching actions, so it
// gets explicit coverage.

const baseUser = {
  id: "u1",
  name: "Alice",
  email: "alice@example.com",
  emailVerified: null,
  image: null,
  hashedPassword: "$2b$12$secrethashvalue",
  role: "user",
  createdAt: new Date(),
  updatedAt: new Date(),
  conversationIds: [],
  seenMessageIds: [],
} as any;

describe("sanitizeUser", () => {
  it("nulls the password hash", () => {
    const out = sanitizeUser(baseUser);
    expect(out.hashedPassword).toBeNull();
  });

  it("preserves all other fields", () => {
    const out = sanitizeUser(baseUser);
    expect(out.id).toBe("u1");
    expect(out.name).toBe("Alice");
    expect(out.email).toBe("alice@example.com");
    expect(out.role).toBe("user");
  });

  it("does not mutate the original object", () => {
    const original = { ...baseUser };
    sanitizeUser(baseUser);
    expect(baseUser.hashedPassword).toBe(original.hashedPassword);
  });

  it("sanitizes every user in an array", () => {
    const out = sanitizeUsers([
      { ...baseUser, id: "a" },
      { ...baseUser, id: "b" },
    ]);
    expect(out).toHaveLength(2);
    expect(out.every((u) => u.hashedPassword === null)).toBe(true);
  });

  it("handles an already-null hash", () => {
    const out = sanitizeUser({ ...baseUser, hashedPassword: null });
    expect(out.hashedPassword).toBeNull();
  });
});
