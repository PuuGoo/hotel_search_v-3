import getCurrentUser from "../../actions/getCurrentUser";
import { sanitizeUser } from "../../libs/sanitizeUser";
import DesktopSidebar from "./DesktopSidebar";
import MobileFooter from "./MobileFooter";

async function Sidebar({
  children,
  currentUser: initialUser,
}: {
  children: React.ReactNode;
  currentUser?: any;
}) {
  // If the parent layout already fetched the user, reuse it instead of hitting
  // the DB again. This eliminates the redundant getCurrentUser call in every
  // layout that wraps Sidebar.
  const rawUser = initialUser ?? (await getCurrentUser());
  const safeUser = rawUser ? sanitizeUser(rawUser) : null;

  // During prerendering or when user is not authenticated, skip sidebar
  if (!safeUser) {
    return (
      <div className="h-full">
        <main className="h-full">{children}</main>
      </div>
    );
  }

  return (
    <div className="h-full">
      <DesktopSidebar currentUser={safeUser} />
      <MobileFooter currentUser={safeUser} />
      <main className="lg:pl-20 h-full">{children}</main>
    </div>
  );
}

export default Sidebar;
