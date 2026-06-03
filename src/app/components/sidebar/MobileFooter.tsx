"use client";

import { memo, useMemo } from "react";
import useConversation from "@/app/hooks/useConversation";
import useRoutes from "@/app/hooks/useRoutes";
import { User } from "@prisma/client";

import ThemeToggle from "../theme/ThemeToggle";
import MobileItem from "./MobileItem";
import MobileLink from "./MobileLink";
import ProfileItem from "./ProfileItem";

interface MobileFooterProps {
  currentUser: User;
}

const MobileFooter: React.FC<MobileFooterProps> = memo(({ currentUser }) => {
  const stableUser = useMemo(
    () => ({ role: currentUser.role, permissions: currentUser.permissions }),
    [currentUser.role, currentUser.permissions]
  );
  const routes = useRoutes(stableUser);
  const { isOpen } = useConversation();

  if (isOpen) {
    return null;
  }

  return (
    <>
      <div
        className="
        fixed 
        justify-between 
        w-full 
        bottom-0 
        z-40 
        flex 
        items-center 
        bg-white 
        border-t-[1px] 
        lg:hidden
        dark:bg-dusk
        dark:border-lightgray
      "
      >
        {routes.map((route) => (
          <MobileLink
            key={route.href}
            href={route.href}
            active={route.active}
            icon={route.icon}
            onClick={route.onClick}
            prefetch={!route.onClick}
          />
        ))}
        <MobileItem>
          <ThemeToggle />
        </MobileItem>
        <MobileItem>
          <ProfileItem currentUser={currentUser} />
        </MobileItem>
      </div>
    </>
  );
});

MobileFooter.displayName = "MobileFooter";

export default MobileFooter;
