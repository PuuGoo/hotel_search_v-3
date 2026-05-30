import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcrypt";
import { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GithubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";

import prisma from "./prismadb";
import { normalizeRole } from "./authz";
import { sanitizePermissions } from "./features";

// NextAuth config lives here (not in the route file) because Next.js 13 App
// Router route modules may only export HTTP handlers and a small set of known
// config keys. Exporting `authOptions` from the route triggers TS2344.
export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID as string,
      clientSecret: process.env.GITHUB_SECRET as string,
      // GitHub's OAuth (unlike Google) has no parameter to force an account
      // chooser or re-login. While the user is signed in at github.com it will
      // silently re-authorize. We still send prompt=consent so GitHub at least
      // re-shows the authorization screen; the reliable cross-provider fix is
      // the hard-redirect signOut (clears this app's session) plus, for a true
      // account switch, signing out of github.com.
      authorization: {
        params: {
          prompt: "consent",
        },
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      // Force Google's account chooser on every sign-in. signOut() only clears
      // this app's session, not the Google session in the browser, so without
      // this Google silently re-selects the still-logged-in account and the
      // user is logged straight back into the previous account.
      authorization: {
        params: {
          prompt: "select_account",
        },
      },
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "email", type: "text" },
        password: { label: "password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        // Trim to match how emails are stored at registration. Case is
        // preserved (not lowercased) for backward compatibility with existing
        // mixed-case accounts created before validation was added.
        const email = credentials.email.trim();

        const user = await prisma.user.findUnique({
          where: {
            email,
          },
        });

        if (!user || !user?.hashedPassword) {
          throw new Error("Invalid credentials");
        }

        const isCorrectPassword = await bcrypt.compare(credentials.password, user.hashedPassword);

        if (!isCorrectPassword) {
          throw new Error("Invalid credentials");
        }

        return user;
      },
    }),
  ],
  debug: process.env.NODE_ENV === "development",
  session: {
    strategy: "jwt",
  },
  callbacks: {
    // Persist the user's role (and id) into the JWT. The `user` arg is only
    // present on initial sign-in; on subsequent requests we re-read the role
    // from the DB so an admin demotion/promotion takes effect on the next
    // request rather than lingering until the token expires.
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = normalizeRole((user as { role?: string | null }).role);
        token.permissions = sanitizePermissions(
          (user as { permissions?: string[] | null }).permissions
        );
        return token;
      }

      if (token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
          select: { id: true, role: true, permissions: true },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.role = normalizeRole(dbUser.role);
          token.permissions = sanitizePermissions(dbUser.permissions);
        }
      }

      return token;
    },
    // Expose id + role + permissions on the client/server session so UI gating
    // and the middleware can authorize without an extra DB round-trip.
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = normalizeRole(token.role as string | null | undefined);
        session.user.permissions = sanitizePermissions(token.permissions);
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
