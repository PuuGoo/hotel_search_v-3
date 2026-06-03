import PusherClient from "pusher-js";

export { pusherEvents, PRESENCE_CHANNEL, USER_CHANNEL_PREFIX, CONVERSATION_CHANNEL_PREFIX, userChannel, conversationChannel } from "./pusherChannels";

export const pusherClient = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_APP_KEY!, {
  channelAuthorization: {
    endpoint: "/api/pusher/auth",
    transport: "ajax",
  },
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
});
