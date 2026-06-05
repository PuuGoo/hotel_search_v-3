import { redirect } from "next/navigation";

import getCurrentUser from "@/app/actions/getCurrentUser";
import Breadcrumb from "@/app/components/Breadcrumb";
import Sidebar from "@/app/components/sidebar/Sidebar";

export default async function NotificationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/conversations");
  }

  return (
    <Sidebar currentUser={currentUser}>
      <div className="h-full">
        <Breadcrumb />
        {children}
      </div>
    </Sidebar>
  );
}
