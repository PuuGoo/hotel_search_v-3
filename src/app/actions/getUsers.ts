import prisma from "@/app/libs/prismadb";

import { publicUserSelect } from "../types";
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
      // The people-picker renders avatar + name only; select just the public
      // fields so password hashes and other columns never leave the DB.
      select: publicUserSelect,
    });

    return users;
  } catch (error: any) {
    // Log so a failed user lookup is diagnosable in production instead of
    // silently returning an empty list (matches getConversationById).
    console.error("[GET_USERS]", error);
    return [];
  }
};

export default getUsers;
