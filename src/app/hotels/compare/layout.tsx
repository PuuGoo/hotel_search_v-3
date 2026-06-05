import { redirect } from "next/navigation";

import getCurrentUser from "@/app/actions/getCurrentUser";
import Sidebar from "@/app/components/sidebar/Sidebar";
import Breadcrumb from "@/app/components/Breadcrumb";

export default async function CompareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/");
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
