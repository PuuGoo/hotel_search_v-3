// Pure validation for the settings (profile) update payload, extracted from
// the route so it can be unit-tested without Next.js. `name` is rendered across
// the UI and `image` is used as an <img> src, so we cap lengths and require the
// image to be an http(s) URL to avoid storing oversized values or
// javascript:/data: XSS vectors. Only provided fields are returned so a partial
// update never blanks out existing values.

export const MAX_NAME_LEN = 100;
export const MAX_IMAGE_URL_LEN = 2048;

function isValidImageUrl(image: string): boolean {
  if (image.length > MAX_IMAGE_URL_LEN) return false;
  try {
    const u = new URL(image);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export type SettingsResult =
  | { ok: true; data: { name?: string; image?: string } }
  | { ok: false; error: string };

export function validateSettings(body: any): SettingsResult {
  const { name, image } = body ?? {};

  if (name != null && (typeof name !== "string" || name.trim().length === 0 || name.length > MAX_NAME_LEN)) {
    return { ok: false, error: "Tên không hợp lệ" };
  }
  if (image != null) {
    if (typeof image !== "string" || !isValidImageUrl(image)) {
      return { ok: false, error: "Ảnh không hợp lệ" };
    }
  }

  // Only include fields that were actually provided (not undefined) so a
  // partial update does not overwrite existing values with undefined.
  const data: { name?: string; image?: string } = {};
  if (name !== undefined) data.name = name;
  if (image !== undefined) data.image = image;

  return { ok: true, data };
}
