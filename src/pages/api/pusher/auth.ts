import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";

import { authOptions } from "../../../app/libs/authOptions";
import prisma from "../../../app/libs/prismadb";
import {
  pusherServer,
  PRESENCE_CHANNEL,
  USER_CHANNEL_PREFIX,
  CONVERSATION_CHANNEL_PREFIX,
  userChannel,
} from "../../../app/libs/pusher";

export default async function handler(request: NextApiRequest, response: NextApiResponse) {
  const session = await getServerSession(request, response, authOptions);

  if (!session?.user?.email) {
    return response.status(401).end();
  }

  const socketId = request.body.socket_id as string;
  const channel = request.body.channel_name as string;

  if (!socketId || !channel) {
    return response.status(400).end();
  }

  const email = session.user.email;

  // Authorize per channel. Without these checks any authenticated user could
  // subscribe to another user's private channel (or any conversation) and
  // receive their real-time messages/updates.
  try {
    // Presence channel: any authenticated user may join (drives online status).
    if (channel === PRESENCE_CHANNEL) {
      const auth = pusherServer.authorizeChannel(socketId, channel, {
        user_id: email,
      });
      return response.send(auth);
    }

    // Per-user channel: only the owner of that email may subscribe. Compare
    // against the derived channel name (the email is sanitized into the name),
    // so the check stays consistent with how clients build the channel.
    if (channel.startsWith(USER_CHANNEL_PREFIX)) {
      if (channel !== userChannel(email)) {
        return response.status(403).end();
      }
      const auth = pusherServer.authorizeChannel(socketId, channel);
      return response.send(auth);
    }

    // Per-conversation channel: only members of the conversation may subscribe.
    if (channel.startsWith(CONVERSATION_CHANNEL_PREFIX)) {
      const conversationId = channel.slice(CONVERSATION_CHANNEL_PREFIX.length);

      const currentUser = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });
      if (!currentUser) {
        return response.status(403).end();
      }

      const membership = await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          userIds: { has: currentUser.id },
        },
        select: { id: true },
      });
      if (!membership) {
        return response.status(403).end();
      }

      const auth = pusherServer.authorizeChannel(socketId, channel);
      return response.send(auth);
    }

    // Unknown / unsupported channel namespace.
    return response.status(403).end();
  } catch (error) {
    console.error("[PUSHER_AUTH]", error);
    return response.status(500).end();
  }
}
