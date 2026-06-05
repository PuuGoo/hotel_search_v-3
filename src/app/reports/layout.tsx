import Breadcrumb from "@/app/components/Breadcrumb";
import Sidebar from "@/app/components/sidebar/Sidebar";

export default async function ReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // valid in Next.js 13 but not yet recognized by the React 18 JSX types.
    <Sidebar>
      <div className="h-full">
        <Breadcrumb />
        {children}
      </div>
    </Sidebar>
  );
}
