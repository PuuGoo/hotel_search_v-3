import { describe, it, expect } from "vitest";

import {
  FEATURES,
  isFeature,
  sanitizePermissions,
  hasFeature,
  featureForPath,
  firstAllowedFeature,
} from "./features";

describe("isFeature", () => {
  it("accepts known feature keys", () => {
    expect(FEATURES.every((f) => isFeature(f))).toBe(true);
  });
  it("rejects unknown / non-string values", () => {
    expect(isFeature("admin")).toBe(false);
    expect(isFeature("")).toBe(false);
    expect(isFeature(null)).toBe(false);
    expect(isFeature(1)).toBe(false);
  });
});

describe("sanitizePermissions", () => {
  it("keeps only valid keys, de-duplicated, in catalog order", () => {
    expect(sanitizePermissions(["users", "chat", "chat", "bogus"])).toEqual([
      "chat",
      "users",
    ]);
  });
  it("returns [] for non-arrays or all-invalid input", () => {
    expect(sanitizePermissions(null)).toEqual([]);
    expect(sanitizePermissions("chat")).toEqual([]);
    expect(sanitizePermissions(["nope", 5, {}])).toEqual([]);
  });
});

describe("hasFeature", () => {
  it("denies a null user", () => {
    expect(hasFeature(null, "chat")).toBe(false);
  });

  it("grants admins everything regardless of permissions", () => {
    expect(hasFeature({ role: "admin", permissions: [] }, "search")).toBe(true);
    expect(hasFeature({ role: "admin", permissions: ["chat"] }, "users")).toBe(
      true
    );
  });

  it("treats empty/missing permissions as unrestricted (full access)", () => {
    expect(hasFeature({ role: "user", permissions: [] }, "search")).toBe(true);
    expect(hasFeature({ role: "user" }, "finder")).toBe(true);
    expect(hasFeature({ role: "user", permissions: null }, "bulk")).toBe(true);
  });

  it("enforces a non-empty list as a strict allow-list", () => {
    const u = { role: "user", permissions: ["chat", "search"] };
    expect(hasFeature(u, "chat")).toBe(true);
    expect(hasFeature(u, "search")).toBe(true);
    expect(hasFeature(u, "bulk")).toBe(false);
    expect(hasFeature(u, "users")).toBe(false);
  });
});

describe("featureForPath", () => {
  it("maps most-specific prefixes first", () => {
    expect(featureForPath("/hotels/bulk")).toBe("bulk");
    expect(featureForPath("/hotels/finder")).toBe("finder");
    expect(featureForPath("/hotels")).toBe("search");
    expect(featureForPath("/hotels/anything-else")).toBe("search");
    expect(featureForPath("/conversations/123")).toBe("chat");
    expect(featureForPath("/dashboard")).toBe("dashboard");
    expect(featureForPath("/users")).toBe("users");
  });
  it("returns null for non-feature paths", () => {
    expect(featureForPath("/admin")).toBeNull();
    expect(featureForPath("/")).toBeNull();
  });
});

describe("firstAllowedFeature", () => {
  it("returns the first catalog feature the user can access", () => {
    expect(
      firstAllowedFeature({ role: "user", permissions: ["dashboard", "users"] })
    ).toBe("dashboard");
  });
  it("returns the catalog head for unrestricted users", () => {
    expect(firstAllowedFeature({ role: "user", permissions: [] })).toBe("chat");
  });
  it("returns null when nothing is allowed", () => {
    // A non-admin with a list that contains no valid features is fully locked
    // out (this should not happen post-sanitize, but the guard must be safe).
    expect(
      firstAllowedFeature({ role: "user", permissions: ["__none__"] })
    ).toBeNull();
  });
});
