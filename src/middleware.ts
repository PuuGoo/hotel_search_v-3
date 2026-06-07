import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

import { ADMIN_ROLE } from "@/app/libs/authz";
import {
  featureForPath,
  hasFeature,
  firstAllowedFeature,
  FEATURE_HOME,
} from "@/app/libs/features";

// withAuth runs after the JWT is decoded. We gate three things:
//   1. Authentication for all matched routes (redirect anon users to "/").
//   2. Authorization for /admin: only admin tokens pass; others go to a page
//      they can use (defense-in-depth alongside per-page/per-API checks).
//   3. Feature authorization for the gated pages: a user whose permission list
//      excludes the page's feature is redirected to their first allowed page.
//      Redirect targets are themselves allowed pages, so this cannot loop.
export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth?.token;
    const role = token?.role;

    // Admin area.
    if (pathname.startsWith("/admin")) {
      if (role !== ADMIN_ROLE) {
        return NextResponse.redirect(new URL("/conversations", req.url));
      }
      return NextResponse.next();
    }

    // Feature-gated pages. `tokenUser` carries role + permissions for hasFeature.
    const feature = featureForPath(pathname);
    if (feature) {
      const tokenUser = {
        role: role as string | undefined,
        permissions: (token?.permissions as string[] | undefined) ?? [],
      };
      if (!hasFeature(tokenUser, feature)) {
        const fallback = firstAllowedFeature(tokenUser);
        // If the user can use at least one other feature, send them there;
        // otherwise they have no usable page, so sign-out via "/" is the only
        // sensible destination.
        const dest = fallback ? FEATURE_HOME[fallback] : "/";
        return NextResponse.redirect(new URL(dest, req.url));
      }
    }

    return NextResponse.next();
  },
  {
    pages: {
      signIn: "/",
    },
  }
);

export const config = {
  matcher: [
    "/users/:path*",
    "/conversations/:path*",
    "/hotels/:path*",
    "/bookmarks/:path*",
    "/dashboard/:path*",
    "/admin/:path*",
    "/drive/:path*",
    "/reports/:path*",
    "/price-alerts/:path*",
    "/notifications/:path*",
    "/settings/:path*",
  ],
};
