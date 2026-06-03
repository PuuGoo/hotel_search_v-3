"use client";

import { useRouter } from "next/navigation";
import { FiArrowLeft } from "react-icons/fi";

interface MobileHeaderProps {
  title: string;
  onBack?: () => void;
  actions?: React.ReactNode;
}

const MobileHeader: React.FC<MobileHeaderProps> = ({
  title,
  onBack,
  actions,
}) => {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <div
      className="
        fixed
        top-0
        left-0
        right-0
        z-30
        flex
        items-center
        justify-between
        h-14
        px-4
        bg-white
        border-b
        dark:bg-dusk
        dark:border-lightgray
        safe-area-top
        lg:hidden
      "
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {onBack !== undefined && (
          <button
            onClick={handleBack}
            className="
              touch-target
              flex
              items-center
              justify-center
              w-10
              h-10
              -ml-2
              text-gray-600
              dark:text-gray-300
              rounded-full
              hover:bg-gray-100
              dark:hover:bg-gray-800
              transition-colors
            "
          >
            <FiArrowLeft size={20} />
          </button>
        )}
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
          {title}
        </h1>
      </div>
      {actions && (
        <div className="flex items-center gap-1 flex-shrink-0">{actions}</div>
      )}
    </div>
  );
};

export default MobileHeader;
