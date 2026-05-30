import getConversations from "../actions/getConversations";
import getUsers from "../actions/getUsers";
import Sidebar from "../components/sidebar/Sidebar";
import ConversationList from "./components/ConversationList";

export default async function ConversationsLayout({ children }: { children: React.ReactNode }) {
  // getConversations and getUsers are independent (each self-authorizes), so
  // run them in parallel instead of two serial round-trips, consistent with the
  // Promise.all pattern used elsewhere in the codebase.
  const [conversations, users] = await Promise.all([
    getConversations(),
    getUsers(),
  ]);

  return (
    // @ts-expect-error Server Component
    <Sidebar>
      <div className="h-full">
        <ConversationList initialItems={conversations} users={users} />
        {children}
      </div>
    </Sidebar>
  );
}
