import { describe, it, expect } from "vitest";

import {
  isAdmin,
  isValidRole,
  normalizeRole,
  ADMIN_ROLE,
  USER_ROLE,
  ROLES,
} from "./authz";

describe("isAdmin", () => {
  it("returns true for a user with the admin role", () => {
    expect(isAdmin({ role: ADMIN_ROLE })).toBe(true);
    expect(isAdmin({ role: "admin" })).toBe(true);
  });

  it("returns false for the default user role", () => {
    expect(isAdmin({ role: "user" })).toBe(false);
  });

  it("returns false for null/undefined users", () => {
    expect(isAdmin(null)).toBe(false);
    expect(isAdmin(undefined)).toBe(false);
  });

  it("returns false when role is missing or null", () => {
    expect(isAdmin({})).toBe(false);
    expect(isAdmin({ role: null })).toBe(false);
  });

  it("is case-sensitive (does not accept 'Admin' or 'ADMIN')", () => {
    expect(isAdmin({ role: "Admin" })).toBe(false);
    expect(isAdmin({ role: "ADMIN" })).toBe(false);
  });
});

describe("isValidRole", () => {
  it("accepts only the exact known role strings", () => {
    expect(isValidRole(USER_ROLE)).toBe(true);
    expect(isValidRole(ADMIN_ROLE)).toBe(true);
    expect(ROLES.every((r) => isValidRole(r))).toBe(true);
  });

  it("rejects unknown, mis-cased, or non-string values", () => {
    expect(isValidRole("superadmin")).toBe(false);
    expect(isValidRole("Admin")).toBe(false);
    expect(isValidRole("")).toBe(false);
    expect(isValidRole(null)).toBe(false);
    expect(isValidRole(undefined)).toBe(false);
    expect(isValidRole(1)).toBe(false);
    expect(isValidRole({ role: "admin" })).toBe(false);
  });
});

describe("normalizeRole", () => {
  it("preserves the admin role", () => {
    expect(normalizeRole(ADMIN_ROLE)).toBe(ADMIN_ROLE);
  });

  it("falls back to the user role for anything else", () => {
    expect(normalizeRole(USER_ROLE)).toBe(USER_ROLE);
    expect(normalizeRole(null)).toBe(USER_ROLE);
    expect(normalizeRole(undefined)).toBe(USER_ROLE);
    expect(normalizeRole("Admin")).toBe(USER_ROLE);
    expect(normalizeRole("something")).toBe(USER_ROLE);
  });
});
