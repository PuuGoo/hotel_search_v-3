"use client";

import { useState } from "react";

import { User } from "@prisma/client";

import SearchInput from "./SearchInput";
import UserBox from "./UserBox";

interface UserListProps {
  items: User[];
}

const UserList: React.FC<UserListProps> = ({ items }) => {
  const [searchBy, setSearchBy] = useState("");

  const filterBySearch = (user: User) => {
    if (searchBy) {
      const lowerCaseSearch = searchBy.toLocaleLowerCase();
      // Lowercase both sides: the search term was already lowercased but the
      // email/name were compared raw, so a search for "alice" failed to match a
      // user named "Alice" (case-insensitive search was effectively broken).
      const email = (user.email || "").toLocaleLowerCase();
      const name = (user.name || "").toLocaleLowerCase();
      return email.includes(lowerCaseSearch) || name.includes(lowerCaseSearch);
    }
    return true;
  };

  return (
    <aside
      className="
        fixed 
        inset-y-0 
        pb-20
        lg:pb-0
        lg:left-20 
        lg:w-80 
        lg:block
        overflow-y-auto 
        border-r 
        border-gray-200
        block w-full left-0
        dark:border-lightgray
      "
    >
      <div className="px-5">
        <div className="flex-col">
          <div
            className="
              text-2xl 
              font-bold 
              text-neutral-800 
              py-4
              dark:text-gray-200
            "
          >
            Mọi người
          </div>
        </div>
        <SearchInput
          id="search"
          placeholder="tìm theo tên, email ..."
          setSearchBy={setSearchBy}
        />
        {items.filter(filterBySearch).map((item) => (
          <UserBox key={item.id} data={item} />
        ))}
      </div>
    </aside>
  );
};

export default UserList;
