// Pure, side-effect-free channel naming + event constants. Kept separate from
// pusher.ts (which instantiates the Pusher server/client SDKs at import time)
// so these can be imported and unit-tested without requiring runtime env vars
// like the Pusher cluster.

export const pusherEvents = {
  NEW_MESSAGE: "messages:new",
  UPDATE_MESSAGE: "message:update",
  NEW_CONVERSATION: "conversation:new",
  UPDATE_CONVERSATION: "conversation:update",
  DELETE_CONVERSATION: "conversation:remove",
  TYPING_START: "typing:start",
  TYPING_STOP: "typing:stop",
  REACTION_UPDATE: "message:reaction",
  DASHBOARD_ACTIVITY: "dashboard:activity",
};

// Channel naming. All real-time channels are private/presence so the
// /api/pusher/auth endpoint can enforce who may subscribe:
//  - presence channel: any authenticated user (drives online status)
//  - private-user-<email>: only that user (per-user conversation updates)
//  - private-conversation-<id>: only members of that conversation
// Previously these were PUBLIC channels keyed by raw email / conversationId,
// so anyone who guessed the name could receive another user's events.
export const PRESENCE_CHANNEL = "presence-messenger";
export const USER_CHANNEL_PREFIX = "private-user-";
export const CONVERSATION_CHANNEL_PREFIX = "private-conversation-";
export const DASHBOARD_CHANNEL = "private-dashboard";

// Pusher only permits a-z A-Z 0-9 _ - = @ , . ; in channel names. An email
// can contain other characters (notably "+"), which would make Pusher reject
// the channel. Replace any disallowed character with "_" so the derived
// channel name is always valid. Applied consistently on subscribe, authorize
// and trigger so the three always agree.
const toSafeChannelSegment = (value: string) => value.replace(/[^a-zA-Z0-9_\-=@,.;]/g, "_");

export const userChannel = (email: string) =>
  `${USER_CHANNEL_PREFIX}${toSafeChannelSegment(email)}`;
export const conversationChannel = (conversationId: string) =>
  `${CONVERSATION_CHANNEL_PREFIX}${toSafeChannelSegment(conversationId)}`;
