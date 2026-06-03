import getConversationById from "../../actions/getConversationById";
import getMessages from "../../actions/getMessages";
import EmptyState from "../../components/EmptyState";
import ConversationContent from "./components/ConversationContent";
import Header from "./components/Header";
import FeatureThemeProvider from "../../components/theme/FeatureThemeProvider";

interface IParams {
  conversationId: string;
}

const ConversationId = async ({ params }: { params: IParams }) => {
  // The conversation lookup and message fetch are independent, so run them in
  // parallel (one combined round-trip) instead of awaiting sequentially. Both
  // are ownership-scoped internally, matching the Promise.all pattern used by
  // the other data-fetching routes in this codebase.
  const [conversation, messages] = await Promise.all([
    getConversationById(params.conversationId),
    getMessages(params.conversationId),
  ]);

  if (!conversation) {
    return (
      <div className="lg:pl-80 h-full">
        <div className="h-full flex flex-col">
          <EmptyState />
        </div>
      </div>
    );
  }

  return (
    <FeatureThemeProvider feature="chat">
      <div className="lg:pl-80 h-full">
        <div className="h-full flex flex-col">
          <Header conversation={conversation} />
          <ConversationContent initialMessages={messages} />
        </div>
      </div>
    </FeatureThemeProvider>
  );
};

export default ConversationId;
