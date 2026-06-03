import { Conversation, Message } from "@prisma/client";

// Public-facing user shape: exactly the fields the chat UI renders. Embedded
// user records (conversation members, message senders, "seen" lists) are
// queried with `publicUserSelect` so secrets (hashedPassword, twoFactorSecret)
// and large columns (notificationPrefs JSON, storage counters) are never read
// out of the database or shipped to the client. This replaces the older pattern
// of fetching the full User row and stripping the hash afterwards.
export const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  image: true,
  createdAt: true,
} as const;

export type PublicUser = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  createdAt: Date;
};

export type FullMessageType = Message & {
  sender: PublicUser;
  seen: PublicUser[];
  replyTo?: FullMessageType | null;
};

export type FullConversationType = Conversation & {
  users: PublicUser[];
  messages: FullMessageType[];
};
