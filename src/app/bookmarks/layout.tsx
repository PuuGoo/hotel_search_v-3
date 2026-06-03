import { redirect } from "next/navigation";

import getCurrentUser from "@/app/actions/getCurrentUser";
import Sidebar from "@/app/components/sidebar/Sidebar";
import { hasFeature } from "@/app/libs/features";

export default async function BookmarksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Bookmarks sit under the "search" feature. Enforce server-side in addition
  // to the middleware gate so a user without it never renders the page.
  const currentUser = await getCurrentUser();
  if (!hasFeature(currentUser, "search")) {
    redirect("/conversations");
  }

  return (
    // @ts-expect-error Async Server Component: Promise<Element> return type is
    // valid in Next.js 13 but not yet recognized by the React 18 JSX types.
    <Sidebar currentUser={currentUser}>
      <div className="h-full">{children}</div>
    </Sidebar>
  );
}
