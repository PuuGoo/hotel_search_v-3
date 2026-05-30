import { describe, it, expect } from "vitest";

import {
  validateRoleUpdate,
  validatePermissionsUpdate,
} from "./adminUserValidation";

describe("validateRoleUpdate", () => {
  it("accepts the known roles", () => {
    expect(validateRoleUpdate({ role: "user" })).toEqual({
      ok: true,
      role: "user",
    });
    expect(validateRoleUpdate({ role: "admin" })).toEqual({
      ok: true,
      role: "admin",
    });
  });

  it("rejects unknown / mis-cased roles", () => {
    expect(validateRoleUpdate({ role: "superadmin" }).ok).toBe(false);
    expect(validateRoleUpdate({ role: "Admin" }).ok).toBe(false);
    expect(validateRoleUpdate({ role: "" }).ok).toBe(false);
  });

  it("rejects missing / non-string roles", () => {
    expect(validateRoleUpdate({}).ok).toBe(false);
    expect(validateRoleUpdate(null).ok).toBe(false);
    expect(validateRoleUpdate(undefined).ok).toBe(false);
    expect(validateRoleUpdate({ role: 1 }).ok).toBe(false);
    expect(validateRoleUpdate({ role: true }).ok).toBe(false);
    expect(validateRoleUpdate({ role: ["admin"] }).ok).toBe(false);
  });

  it("never derives a role from any field other than `role`", () => {
    // Guards against an escalation where some other key is mistaken for role.
    expect(validateRoleUpdate({ isAdmin: true }).ok).toBe(false);
    expect(validateRoleUpdate({ admin: "admin" }).ok).toBe(false);
  });
});

describe("validatePermissionsUpdate", () => {
  it("accepts an array of valid feature keys (de-duped, ordered)", () => {
    expect(
      validatePermissionsUpdate({ permissions: ["users", "chat", "chat"] })
    ).toEqual({ ok: true, permissions: ["chat", "users"] });
  });

  it("accepts an empty array (unrestricted)", () => {
    expect(validatePermissionsUpdate({ permissions: [] })).toEqual({
      ok: true,
      permissions: [],
    });
  });

  it("drops unknown keys rather than failing", () => {
    expect(
      validatePermissionsUpdate({ permissions: ["chat", "bogus", "admin"] })
    ).toEqual({ ok: true, permissions: ["chat"] });
  });

  it("rejects a non-array permissions value", () => {
    expect(validatePermissionsUpdate({ permissions: "chat" }).ok).toBe(false);
    expect(validatePermissionsUpdate({}).ok).toBe(false);
    expect(validatePermissionsUpdate(null).ok).toBe(false);
  });
});
