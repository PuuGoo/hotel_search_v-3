import { redirect } from "next/navigation";

import getCurrentUser from "@/app/actions/getCurrentUser";
import { isAdmin } from "@/app/libs/authz";

export default async function RateLimitsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser = await getCurrentUser();
  if (!isAdmin(currentUser)) {
    redirect("/conversations");
  }

  return <>{children}</>;
}
