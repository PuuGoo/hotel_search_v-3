// Pure validation/normalization for the registration payload, extracted from
// the route so the rules (required fields, email shape, name + password length)
// can be unit-tested without Next.js or bcrypt. The route handles hashing and
// persistence; this only validates and normalizes the input.

export const MAX_EMAIL_LEN = 254;
export const MAX_NAME_LEN = 100;
export const MIN_PASSWORD_LEN = 8;
// bcrypt silently truncates input beyond 72 bytes, so cap there too.
export const MAX_PASSWORD_LEN = 72;

// Basic email shape check. Not RFC-perfect, but rejects obvious garbage so we
// don't persist unusable login identifiers. Case is preserved to stay
// backward-compatible with existing mixed-case accounts (login doesn't
// lowercase either).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type RegistrationResult =
  | { ok: true; email: string; name: string; password: string }
  | { ok: false; error: string };

export function validateRegistration(body: unknown): RegistrationResult {
  const b = body as Record<string, unknown> | null | undefined;
  const { email, name, password } = (b ?? {}) as Record<string, unknown>;

  if (!email || !name || !password) {
    return { ok: false, error: "Thiếu thông tin" };
  }
  if (typeof email !== "string" || typeof name !== "string" || typeof password !== "string") {
    return { ok: false, error: "Thông tin không hợp lệ" };
  }

  const normalizedEmail = email.trim();
  const trimmedName = name.trim();

  if (!EMAIL_RE.test(normalizedEmail) || normalizedEmail.length > MAX_EMAIL_LEN) {
    return { ok: false, error: "Email không hợp lệ" };
  }
  if (trimmedName.length === 0 || trimmedName.length > MAX_NAME_LEN) {
    return { ok: false, error: "Tên không hợp lệ" };
  }
  if (password.length < MIN_PASSWORD_LEN || password.length > MAX_PASSWORD_LEN) {
    return { ok: false, error: `Mật khẩu phải có ${MIN_PASSWORD_LEN}-${MAX_PASSWORD_LEN} ký tự` };
  }

  return { ok: true, email: normalizedEmail, name: trimmedName, password };
}
