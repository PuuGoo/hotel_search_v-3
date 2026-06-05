import getConversations from "../actions/getConversations";
import getCurrentUser from "../actions/getCurrentUser";
import Breadcrumb from "@/app/components/Breadcrumb";
import Sidebar from "../components/sidebar/Sidebar";
import ConversationList from "./components/ConversationList";

export default async function ConversationsLayout({ children }: { children: React.ReactNode }) {
  const [conversations, currentUser] = await Promise.all([
    getConversations(),
    getCurrentUser(),
  ]);

  return (
    <Sidebar currentUser={currentUser}>
      <div className="h-full">
        <ConversationList initialItems={conversations} />
        {children}
      </div>
    </Sidebar>
  );
}
