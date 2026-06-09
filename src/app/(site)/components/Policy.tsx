"use client";

import { useState } from "react";

import PolicyModal from "@/app/components/modals/PolicyModal";

const Policy = () => {
  const [modalContent, setModalContent] = useState<"privacy" | "terms" | null>(null);

  const openModal = (type: "privacy" | "terms") => {
    setModalContent(type);
  };

  const closeModal = () => {
    setModalContent(null);
  };

  return (
    <>
      <div className="mt-6 text-center text-xs text-ink-soft dark:text-gray-400">
        <div className="space-x-4 mb-2">
          <button
            onClick={() => openModal("privacy")}
            className="auth-policy-link underline transition duration-150 ease-in-out"
          >
            Chính sách bảo mật
          </button>
          <button
            onClick={() => openModal("terms")}
            className="auth-policy-link underline transition duration-150 ease-in-out"
          >
            Điều khoản dịch vụ
          </button>
        </div>
        <div className="flex items-center justify-center gap-1 text-ink-soft/70 dark:text-gray-500">
          <span>🐼</span>
          <span>Hotel Search By PuuGoo</span>
        </div>
      </div>
      {modalContent && (
        <PolicyModal
          isOpen={!!modalContent}
          onClose={closeModal}
          policyType={modalContent}
        />
      )}
    </>
  );
};
export default Policy;
