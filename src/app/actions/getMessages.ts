import prisma from "../libs/prismadb";
import { publicUserSelect } from "../types";
import getCurrentUser from "./getCurrentUser";

// Upper bound on how many messages we hydrate for the conversation view. The
// chat UI renders newest-at-bottom, so we take the most recent slice rather
// than the entire (unbounded) thread history. Older messages stay reachable via
// search; the common case of opening a long-lived conversation no longer pulls
// thousands of rows (each with sender + seen users) on every open.
const MESSAGE_PAGE_SIZE = 50;

const getMessages = async (conversationId: string) => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser?.id) {
      return [];
    }

    const recent = await prisma.message.findMany({
      where: {
        conversationId: conversationId,
        conversation: {
          userIds: { has: currentUser.id },
        },
      },
      include: {
        sender: { select: publicUserSelect },
        seen: { select: publicUserSelect },
      },
      // Take the newest slice, then reverse to chronological (asc) order for
      // rendering. Ordering asc + take would grab the *oldest* messages.
      orderBy: {
        createdAt: "desc",
      },
      take: MESSAGE_PAGE_SIZE,
    });
    const messages = recent.reverse();

    const replyToIds = messages
      .filter((m) => m.replyToId)
      .map((m) => m.replyToId!);

    let replyToMessages: Record<string, any> = {};
    if (replyToIds.length > 0) {
      const replies = await prisma.message.findMany({
        where: { id: { in: replyToIds } },
        include: { sender: { select: publicUserSelect } },
      });
      for (const r of replies) {
        replyToMessages[r.id] = r;
      }
    }

    return messages.map((message) => ({
      ...message,
      replyTo: message.replyToId ? replyToMessages[message.replyToId] || null : null,
    }));
  } catch (error: any) {
    console.error("[GET_MESSAGES]", error);
    return [];
  }
};

export default getMessages;
