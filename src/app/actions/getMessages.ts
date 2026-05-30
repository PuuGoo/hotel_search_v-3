import prisma from "../libs/prismadb";
import { sanitizeUser, sanitizeUsers } from "../libs/sanitizeUser";
import getCurrentUser from "./getCurrentUser";

const getMessages = async (conversationId: string) => {
  try {
    // Only members of the conversation may read its messages. Without this
    // check any authenticated user could fetch another conversation's history
    // by id.
    const currentUser = await getCurrentUser();
    if (!currentUser?.id) {
      return [];
    }

    // Single query with the membership check folded into the relation filter:
    // messages are only returned when their conversation includes the current
    // user. A non-member gets an empty list (same as the prior explicit guard)
    // without a separate round-trip.
    const messages = await prisma.message.findMany({
      where: {
        conversationId: conversationId,
        conversation: {
          userIds: { has: currentUser.id },
        },
      },
      include: {
        sender: true,
        seen: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Strip password hashes from embedded user records.
    return messages.map((message) => ({
      ...message,
      sender: sanitizeUser(message.sender),
      seen: sanitizeUsers(message.seen),
    }));
  } catch (error: any) {
    // Log so a failed message fetch is diagnosable in production instead of
    // silently returning an empty list (matches getConversationById).
    console.error("[GET_MESSAGES]", error);
    return [];
  }
};

export default getMessages;
