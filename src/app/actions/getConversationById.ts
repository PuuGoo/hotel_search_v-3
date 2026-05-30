import prisma from "../libs/prismadb";
import { sanitizeUsers } from "../libs/sanitizeUser";
import getCurrentUser from "./getCurrentUser";

const getConversationById = async (conversationId: string) => {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.id) {
      return null;
    }

    // Scope to conversations the user belongs to so a non-member cannot load
    // another conversation (and its members) by guessing the id.
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userIds: { has: currentUser.id },
      },
      include: {
        users: true,
      },
    });

    if (!conversation) {
      return null;
    }

    // Strip password hashes from embedded user records.
    return { ...conversation, users: sanitizeUsers(conversation.users) };
  } catch (error: any) {
    console.error("[GET_CONVERSATION_BY_ID]", error);
    return null;
  }
};

export default getConversationById;
