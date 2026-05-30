import { useEffect } from "react";

import { useSession } from "next-auth/react";
import { Members } from "pusher-js";

import { pusherClient, PRESENCE_CHANNEL } from "../libs/pusher";
import useActiveList from "./useActiveList";

const useActiveChannel = () => {
  const session = useSession();

  const { set, add, remove } = useActiveList();

  useEffect(() => {
    // Only subscribe after login so the presence status updates in real time.
    if (session?.status !== "authenticated") {
      return;
    }

    const channel = pusherClient.subscribe(PRESENCE_CHANNEL);

    const onSucceeded = (members: Members) => {
      const initialMembers: string[] = [];
      members.each((member: Record<string, any>) => initialMembers.push(member.id));
      set(initialMembers);
    };
    const onAdded = (member: Record<string, any>) => add(member.id);
    const onRemoved = (member: Record<string, any>) => remove(member.id);

    channel.bind("pusher:subscription_succeeded", onSucceeded);
    channel.bind("pusher:member_added", onAdded);
    channel.bind("pusher:member_removed", onRemoved);

    // Unbind the exact handler references and unsubscribe on cleanup. The
    // previous version kept `activeChannel` in state, which re-ran this effect
    // and re-bound new inline handlers on every render (duplicate-listener
    // leak), and never unbound them at all.
    return () => {
      channel.unbind("pusher:subscription_succeeded", onSucceeded);
      channel.unbind("pusher:member_added", onAdded);
      channel.unbind("pusher:member_removed", onRemoved);
      pusherClient.unsubscribe(PRESENCE_CHANNEL);
    };
  }, [set, add, remove, session?.status]);
};

export default useActiveChannel;
