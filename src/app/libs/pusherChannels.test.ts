import { describe, it, expect } from "vitest";

import {
  PRESENCE_CHANNEL,
  USER_CHANNEL_PREFIX,
  CONVERSATION_CHANNEL_PREFIX,
  userChannel,
  conversationChannel,
} from "./pusherChannels";

// These helpers are security-relevant: the /api/pusher/auth handler authorizes
// subscriptions by matching the derived channel names, so their format and the
// character sanitization must stay stable and consistent.

describe("pusher channel helpers", () => {
  it("uses the private- prefixes required for authorized channels", () => {
    expect(USER_CHANNEL_PREFIX.startsWith("private-")).toBe(true);
    expect(CONVERSATION_CHANNEL_PREFIX.startsWith("private-")).toBe(true);
    expect(PRESENCE_CHANNEL.startsWith("presence-")).toBe(true);
  });

  it("builds a user channel from a plain email", () => {
    expect(userChannel("alice@example.com")).toBe("private-user-alice@example.com");
  });

  it("sanitizes characters Pusher disallows in channel names", () => {
    // "+" is not in Pusher's allowed set and must be replaced.
    expect(userChannel("user+tag@example.com")).toBe("private-user-user_tag@example.com");
    // Spaces and other disallowed chars also become "_".
    expect(userChannel("a b/c")).toBe("private-user-a_b_c");
  });

  it("only allows Pusher's permitted channel characters in the output", () => {
    const name = userChannel("weird name!#$%^&*()");
    // Strip the known-good prefix, the remainder must contain only allowed chars.
    const segment = name.slice(USER_CHANNEL_PREFIX.length);
    expect(/^[a-zA-Z0-9_\-=@,.;]*$/.test(segment)).toBe(true);
  });

  it("builds a conversation channel from an id", () => {
    expect(conversationChannel("507f1f77bcf86cd799439011")).toBe(
      "private-conversation-507f1f77bcf86cd799439011"
    );
  });

  it("is deterministic so auth-side and client-side names match", () => {
    expect(userChannel("x+y@z.com")).toBe(userChannel("x+y@z.com"));
    expect(conversationChannel("abc")).toBe(conversationChannel("abc"));
  });
});
