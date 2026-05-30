import Sidebar from "@/app/components/sidebar/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // @ts-expect-error Async Server Component: Promise<Element> return type is
    // valid in Next.js 13 but not yet recognized by the React 18 JSX types.
    <Sidebar>
      <div className="h-full">{children}</div>
    </Sidebar>
  );
}
