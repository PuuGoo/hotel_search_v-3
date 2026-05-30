import PusherServer from "pusher";
import PusherClient from "pusher-js";

// Re-export the pure channel naming + event constants so existing imports from
// "./pusher" keep working. The definitions live in pusherChannels.ts (no SDK
// side-effects) so they can be unit-tested without the Pusher cluster env.
export {
  pusherEvents,
  PRESENCE_CHANNEL,
  USER_CHANNEL_PREFIX,
  CONVERSATION_CHANNEL_PREFIX,
  userChannel,
  conversationChannel,
} from "./pusherChannels";

export const pusherServer = new PusherServer({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_APP_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true,
});

export const pusherClient = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_APP_KEY!, {
  channelAuthorization: {
    endpoint: "/api/pusher/auth",
    transport: "ajax",
  },
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
});
