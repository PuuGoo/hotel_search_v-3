import prisma from "../libs/prismadb";
import { publicUserSelect } from "../types";
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
        // Public fields only — never read secrets/large columns for members
        // we only render as avatar/name.
        users: { select: publicUserSelect },
      },
    });

    if (!conversation) {
      return null;
    }

    return conversation;
  } catch (error: any) {
    console.error("[GET_CONVERSATION_BY_ID]", error);
    return null;
  }
};

export default getConversationById;
