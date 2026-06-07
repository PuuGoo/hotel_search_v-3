"use client";

import { memo, useMemo, useState, useCallback, useRef, useEffect } from "react";
import { HiEllipsisHorizontal } from "react-icons/hi2";
import useConversation from "@/app/hooks/useConversation";
import useRoutes from "@/app/hooks/useRoutes";
import { User } from "@prisma/client";

import ThemeToggle from "../theme/ThemeToggle";
import MobileItem from "./MobileItem";
import MobileLink from "./MobileLink";
import ProfileItem from "./ProfileItem";

const MAX_VISIBLE = 5;

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

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const visibleRoutes = routes.slice(0, MAX_VISIBLE);
  const overflowRoutes = routes.slice(MAX_VISIBLE);

  const toggleMenu = useCallback(() => setMenuOpen((v) => !v), []);

  // Close on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

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
        bg-panel 
        border-t-[1px] 
        border-hairline
        lg:hidden
        dark:bg-dusk
        dark:border-lightgray
      "
      >
        {visibleRoutes.map((route) => (
          <MobileLink
            key={route.href}
            href={route.href}
            active={route.active}
            icon={route.icon}
            onClick={route.onClick}
            prefetch={!route.onClick}
          />
        ))}

        {/* Overflow menu */}
        {overflowRoutes.length > 0 && (
          <div className="relative" ref={menuRef}>
            <MobileItem>
              <button
                onClick={toggleMenu}
                className="
                  flex items-center justify-center p-2
                  text-ink-soft hover:text-black
                  dark:hover:text-gray-100
                  transition-colors
                "
                aria-label="Thêm"
              >
                <HiEllipsisHorizontal className="h-6 w-6" />
              </button>
            </MobileItem>

            {menuOpen && (
              <div
                className="
                  absolute bottom-full right-0 mb-2
                  bg-white dark:bg-dusk
                  border border-gray-200 dark:border-lightgray
                  rounded-lg shadow-lg
                  py-2 min-w-[180px]
                  z-50
                "
              >
                {overflowRoutes.map((route) => (
                  <MobileLink
                    key={route.href}
                    href={route.href}
                    active={route.active}
                    icon={route.icon}
                    onClick={() => {
                      route.onClick?.();
                      setMenuOpen(false);
                    }}
                    prefetch={!route.onClick}
                  />
                ))}
              </div>
            )}
          </div>
        )}

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
