import getCurrentUser from "../../actions/getCurrentUser";
import { sanitizeUser } from "../../libs/sanitizeUser";
import DesktopSidebar from "./DesktopSidebar";
import MobileFooter from "./MobileFooter";

async function Sidebar({ children }: { children: React.ReactNode }) {
  const currentUser = await getCurrentUser();
  // Strip the password hash before the user record is handed to client
  // components (it would otherwise serialize into the page payload).
  const safeUser = currentUser ? sanitizeUser(currentUser) : currentUser;

  return (
    <div className="h-full">
      <DesktopSidebar currentUser={safeUser!} />
      <MobileFooter currentUser={safeUser!} />
      <main className="lg:pl-20 h-full">{children}</main>
    </div>
  );
}

export default Sidebar;
