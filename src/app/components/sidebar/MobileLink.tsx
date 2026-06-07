import { memo, useCallback } from "react";
import clsx from "clsx";

import Link from "next/link";

interface MobileItemProps {
  href: string;
  icon: any;
  active?: boolean;
  onClick?: () => void;
  prefetch?: boolean;
}

const MobileLink: React.FC<MobileItemProps> = memo(({ href, icon: Icon, active, onClick, prefetch = true }) => {
  const handleClick = useCallback(() => {
    if (onClick) {
      return onClick();
    }
  }, [onClick]);

  return (
    <Link
      onClick={handleClick}
      href={href}
      prefetch={prefetch}
      className={clsx(
        `
        group
        flex
        gap-x-3
        text-sm
        leading-6
        font-semibold
        w-full
        justify-center
        p-4
        text-ink-soft
        hover:text-brand
        hover:bg-brand-soft
        dark:hover:bg-lightgray
        dark:hover:text-gray-100
      `,
        active && "bg-brand-soft text-brand dark:bg-lightgray dark:text-gray-200"
      )}
    >
      <Icon className="h-6 w-6" />
    </Link>
  );
});

MobileLink.displayName = "MobileLink";

export default MobileLink;
