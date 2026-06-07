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
          {/* Policy Links with onClick handlers */}
          <button
            onClick={() => openModal("privacy")}
            className="
                                text-ink-soft hover:text-gray-600 
                                dark:text-gray-400 dark:hover:text-gray-300 
                                transition duration-150 ease-in-out underline
                            "
          >
            Chính sách bảo mật
          </button>

          <button
            onClick={() => openModal("terms")}
            className="
                                text-ink-soft hover:text-gray-600 
                                dark:text-gray-400 dark:hover:text-gray-300 
                                transition duration-150 ease-in-out underline
                            "
          >
            Điều khoản dịch vụ
          </button>
        </div>
        <div>Hotel Search By PuuGoo</div>
      </div>
      {/* Render the PolicyModal when modalContent is set */}
      {modalContent && (
        <PolicyModal
          isOpen={!!modalContent} // Always true when rendered
          onClose={closeModal}
          policyType={modalContent}
        />
      )}
    </>
  );
};
export default Policy;
