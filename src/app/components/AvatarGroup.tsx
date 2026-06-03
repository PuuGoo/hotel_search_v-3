"use client";

import { PublicUser } from "../types";
import Image from "next/image";

interface AvatarGroupProps {
  users?: PublicUser[];
}

const AvatarGroup: React.FC<AvatarGroupProps> = ({ users = [] }) => {
  const slicedUsers = users.slice(0, 3);

  const positionMap = {
    0: "top-0 left-[8px] md:left-[12px]",
    1: "bottom-0",
    2: "bottom-0 right-0",
  };

  return (
    <div className="relative h-9 w-9 md:h-11 md:w-11">
      {slicedUsers.map((user, index) => (
        <div
          key={user.id}
          className={`
            absolute
            inline-block 
            rounded-full 
            overflow-hidden
            h-[21px]
            w-[21px]
            ${positionMap[index as keyof typeof positionMap]}
          `}
        >
          <Image
            className="object-cover"
            fill
            sizes="21px"
            src={user?.image || "/images/avatar-placeholder.png"}
            alt="Ảnh đại diện"
          />
        </div>
      ))}
    </div>
  );
};

export default AvatarGroup;
