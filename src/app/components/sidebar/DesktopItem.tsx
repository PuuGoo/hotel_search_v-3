import { memo, useCallback } from "react";
import clsx from "clsx";

import Link from "next/link";

interface DesktopItemProps {
  label: string;
  icon: any;
  href: string;
  onClick?: () => void;
  active?: boolean;
  prefetch?: boolean;
}

const DesktopItem: React.FC<DesktopItemProps> = memo(({ label, href, icon: Icon, active, onClick, prefetch = true }) => {
  const handleClick = useCallback(() => {
    if (onClick) {
      return onClick();
    }
  }, [onClick]);

  return (
    <li onClick={handleClick} key={label} className="relative group">
      <Link
        href={href}
        prefetch={prefetch}
        className={clsx(
          `
            relative
            flex
            items-center
            justify-center
            rounded-xl
            p-3
            text-ink-soft
            transition-all
            duration-150
            hover:text-brand
            hover:bg-brand-soft
            hover:-translate-y-px
            dark:hover:bg-lightgray
            dark:hover:text-gray-100
          `,
          active &&
            "bg-brand-soft text-brand dark:bg-lightgray dark:text-gray-200"
        )}
      >
        {active && (
          <span
            className="absolute -left-2 top-1/2 -translate-y-1/2 h-5 w-1 rounded-full bg-brand"
            aria-hidden="true"
          />
        )}
        <Icon className="h-6 w-6 shrink-0" aria-hidden="true" />
        <span className="sr-only">{label}</span>
      </Link>
      {/* Hover tooltip */}
      <span
        className="
          pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50
          whitespace-nowrap rounded-md bg-ink px-2 py-1 text-xs text-white
          opacity-0 group-hover:opacity-100 transition-opacity
          dark:bg-lightgray
        "
        role="tooltip"
      >
        {label}
      </span>
    </li>
  );
});

DesktopItem.displayName = "DesktopItem";

export default DesktopItem;
