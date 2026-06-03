import { cache } from "react";

import prisma from "../libs/prismadb";
import getSession from "./getSession";

// Per-request memoization via React's cache(): when getCurrentUser() is called
// multiple times within the same server request (e.g. Sidebar + layout both
// call it), the DB lookup runs once and the result is shared. Unlike a
// module-level Map, React's cache is scoped to a single request, so it never
// leaks one user's record into another request — it is reset between requests.
const getCurrentUser = cache(async () => {
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
});

export default getCurrentUser;
