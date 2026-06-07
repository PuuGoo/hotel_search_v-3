// Pure validation for the message payload, extracted from the route so it can
// be unit-tested without Next.js. A message must carry text, an image, or a
// file; empty payloads are rejected and the body length is capped so a single
// request can't store an unbounded blob.

export const MAX_MESSAGE_LEN = 10000;

export type MessageResult =
  | { ok: true; hasText: boolean; hasImage: boolean; hasFile: boolean }
  | { ok: false; error: string };

export function validateMessage(body: unknown): MessageResult {
  const b = body as Record<string, unknown> | null | undefined;
  const { message, image, fileUrl, conversationId } = (b ?? {}) as Record<string, unknown>;

  if (!conversationId || typeof conversationId !== "string") {
    return { ok: false, error: "conversationId không hợp lệ" };
  }

  const hasText = typeof message === "string" && message.trim().length > 0;
  const hasImage = typeof image === "string" && image.length > 0;
  const hasFile = typeof fileUrl === "string" && fileUrl.length > 0;

  if (!hasText && !hasImage && !hasFile) {
    return { ok: false, error: "Tin nhắn trống" };
  }
  if (hasText && message.length > MAX_MESSAGE_LEN) {
    return { ok: false, error: "Tin nhắn quá dài" };
  }

  return { ok: true, hasText, hasImage, hasFile };
}
