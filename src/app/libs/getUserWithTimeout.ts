import type { User } from "@prisma/client";
import getCurrentUser from "@/app/actions/getCurrentUser";

/**
 * Resolve the current user but never let a slow/hung session lookup block the
 * request. Returns null on timeout or error.
 *
 * Clears the timer in all paths so it doesn't dangle and keep the event loop
 * alive (or reject unhandled) after getCurrentUser() resolves.
 */
export async function getUserWithTimeout(
  timeoutMs = 5000
): Promise<User | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return (await Promise.race([
      getCurrentUser(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("timeout")), timeoutMs);
      }),
    ])) as User | null;
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
