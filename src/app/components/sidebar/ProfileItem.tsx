"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";

import { User } from "@prisma/client";

import Avatar from "../Avatar";

const SettingsModal = dynamic(() => import("./SettingsModal"), { ssr: false });

interface ProfileItemProps {
  currentUser: User;
}

const ProfileItem: React.FC<ProfileItemProps> = ({ currentUser }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleClose = useCallback(() => setIsOpen(false), []);

  return (
    <>
      <SettingsModal currentUser={currentUser} isOpen={isOpen} onClose={handleClose} />
      <div onClick={() => setIsOpen(true)} className="cursor-pointer hover:opacity-75 transition">
        <Avatar user={currentUser} />
      </div>
    </>
  );
};

export default ProfileItem;
