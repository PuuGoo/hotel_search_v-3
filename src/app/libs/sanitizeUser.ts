import { User } from "@prisma/client";

// Strip the password hash before user records cross the server -> client
// boundary. The Prisma User type marks hashedPassword as nullable, so setting
// it to null keeps the existing `User` type intact (no downstream type
// changes) while ensuring the secret never reaches the browser.
export function sanitizeUser<T extends Pick<User, "hashedPassword">>(user: T): T {
  return { ...user, hashedPassword: null };
}

export function sanitizeUsers<T extends Pick<User, "hashedPassword">>(users: T[]): T[] {
  return users.map(sanitizeUser);
}
