import crypto from "crypto";

// Password reset token helpers. The raw token is a 32-byte URL-safe random
// string handed to the user via the reset link; only its SHA-256 hash is
// persisted, so a DB leak can't be replayed to reset accounts. Kept dependency
// free and side-effect free (no Prisma) so the rules are unit-testable.

// How long a reset link stays valid. Short enough to limit exposure, long
// enough for a user to act on an email.
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

export const MIN_PASSWORD_LEN = 8;
export const MAX_PASSWORD_LEN = 72; // bcrypt truncates beyond 72 bytes.

export function generateResetToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

// Deterministic hash used both when storing (issue) and looking up (verify).
export function hashResetToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function resetTokenExpiry(now: number = Date.now()): Date {
  return new Date(now + RESET_TOKEN_TTL_MS);
}

export function isTokenExpired(expiresAt: Date, now: number = Date.now()): boolean {
  return expiresAt.getTime() <= now;
}

export type PasswordCheck =
  | { ok: true; password: string }
  | { ok: false; error: string };

// Mirrors the registration password rule so reset can't set a weaker password.
export function validateNewPassword(password: unknown): PasswordCheck {
  if (typeof password !== "string") {
    return { ok: false, error: "Mật khẩu không hợp lệ" };
  }
  if (password.length < MIN_PASSWORD_LEN || password.length > MAX_PASSWORD_LEN) {
    return {
      ok: false,
      error: `Mật khẩu phải có ${MIN_PASSWORD_LEN}-${MAX_PASSWORD_LEN} ký tự`,
    };
  }
  return { ok: true, password };
}
