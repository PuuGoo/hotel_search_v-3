// Augment NextAuth's default types so the `id` and `role` we attach in the
// jwt/session callbacks (see src/app/libs/authOptions.ts) are statically typed
// everywhere `useSession`, `getServerSession`, and `getToken` are consumed.
import { DefaultSession } from "next-auth";

import type { Role } from "@/app/libs/authz";
import type { Feature } from "@/app/libs/features";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      permissions: Feature[];
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: Role;
    permissions?: Feature[];
  }
}
