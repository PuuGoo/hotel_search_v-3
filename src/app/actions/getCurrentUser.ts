import prisma from "../libs/prismadb";
import getSession from "./getSession";

const getCurrentUser = async () => {
  try {
    const session = await getSession();

    if (!session?.user?.email) {
      return null;
    }

    const currentUser = await prisma.user.findUnique({
      where: {
        email: session.user.email as string,
      },
    });

    if (!currentUser) {
      return null;
    }

    return currentUser;
  } catch (error: any) {
    // Intentionally quiet: this runs on every authenticated request (and is
    // timeout-raced in the search route), so logging here would be noisy. A
    // null return is treated as "unauthenticated" by callers.
    return null;
  }
};

export default getCurrentUser;
