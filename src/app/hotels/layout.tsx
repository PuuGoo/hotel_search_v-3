import Sidebar from "@/app/components/sidebar/Sidebar";
import Breadcrumb from "@/app/components/Breadcrumb";
import ScrollToTop from "@/app/components/ScrollToTop";

export default async function HotelsLayout({
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
        <ScrollToTop />
      </div>
    </Sidebar>
  );
}
