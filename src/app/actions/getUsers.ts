import prisma from "@/app/libs/prismadb";

import { sanitizeUsers } from "../libs/sanitizeUser";
import getSession from "./getSession";

const getUsers = async () => {
  const session = await getSession();

  if (!session?.user?.email) {
    return [];
  }

  try {
    const users = await prisma.user.findMany({
      orderBy: {
        createdAt: "desc",
      },
      where: {
        NOT: {
          email: session.user.email,
        },
      },
    });

    // Never expose password hashes to the client.
    return sanitizeUsers(users);
  } catch (error: any) {
    // Log so a failed user lookup is diagnosable in production instead of
    // silently returning an empty list (matches getConversationById).
    console.error("[GET_USERS]", error);
    return [];
  }
};

export default getUsers;
