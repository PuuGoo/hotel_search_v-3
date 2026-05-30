import prisma from "../libs/prismadb";
import { sanitizeUser, sanitizeUsers } from "../libs/sanitizeUser";
import getCurrentUser from "./getCurrentUser";

const getConversations = async () => {
  const currentUser = await getCurrentUser();

  if (!currentUser?.id) {
    return [];
  }

  try {
    const conversations = await prisma.conversation.findMany({
      orderBy: {
        lastMessageAt: "desc",
      },
      where: {
        userIds: {
          has: currentUser.id,
        },
      },
      include: {
        users: true,
        // The sidebar (ConversationBox) only renders the last message as a
        // preview; the conversation detail view loads full history separately
        // via getMessages. Fetch just the newest message (with its sender/seen
        // for the "seen" indicator) instead of the entire history for every
        // conversation, which was a large overfetch on each sidebar render.
        messages: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
          include: {
            sender: true,
            seen: true,
          },
        },
      },
    });

    // Strip password hashes from every embedded user record before this
    // crosses to the client.
    return conversations.map((conversation) => ({
      ...conversation,
      users: sanitizeUsers(conversation.users),
      messages: conversation.messages.map((message) => ({
        ...message,
        sender: sanitizeUser(message.sender),
        seen: sanitizeUsers(message.seen),
      })),
    }));
  } catch (error: any) {
    // Log so a failed conversation fetch is diagnosable in production instead
    // of silently returning an empty list (matches getConversationById).
    console.error("[GET_CONVERSATIONS]", error);
    return [];
  }
};

export default getConversations;
