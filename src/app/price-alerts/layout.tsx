import { redirect } from "next/navigation";

import getCurrentUser from "@/app/actions/getCurrentUser";
import Breadcrumb from "@/app/components/Breadcrumb";
import Sidebar from "@/app/components/sidebar/Sidebar";
import { hasFeature } from "@/app/libs/features";

export default async function PriceAlertsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser = await getCurrentUser();
  if (!hasFeature(currentUser, "search")) {
    redirect("/conversations");
  }

  return (
    // valid in Next.js 13 but not yet recognized by the React 18 JSX types.
    <Sidebar currentUser={currentUser}>
      <div className="h-full">
        <Breadcrumb />
        {children}
      </div>
    </Sidebar>
  );
}
