import { redirect } from "next/navigation";

import getCurrentUser from "@/app/actions/getCurrentUser";
import Sidebar from "@/app/components/sidebar/Sidebar";

export default async function ApiKeysLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/conversations");
  }

  return (
    <Sidebar>
      <div className="h-full">{children}</div>
    </Sidebar>
  );
}
