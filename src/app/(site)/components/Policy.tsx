"use client";

import { useState } from "react";

import PolicyModal from "@/app/components/modals/PolicyModal";

const Policy = () => {
  const [modalContent, setModalContent] = useState<"privacy" | "terms" | null>(null);
  const [pandaWaved, setPandaWaved] = useState(false);

  const openModal = (type: "privacy" | "terms") => {
    setModalContent(type);
  };

  const closeModal = () => {
    setModalContent(null);
  };

  const handlePandaClick = () => {
    setPandaWaved(true);
    setTimeout(() => setPandaWaved(false), 800);
  };

  return (
    <>
      <div
        className="mt-6 text-center text-xs text-ink-soft dark:text-gray-400"
        style={{
          animation: "policy-area-in 0.5s ease 0.6s both",
        }}
      >
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
          {/* Interactive panda emoji with wave animation */}
          <button
            type="button"
            aria-label="Panda mascot"
            onClick={handlePandaClick}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              lineHeight: 1,
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            <span
              className="auth-policy-panda"
              aria-hidden="true"
              style={{
                display: "inline-block",
                fontSize: "14px",
                ...(pandaWaved
                  ? { animation: "panda-friendly-wiggle 0.7s cubic-bezier(0.34,1.56,0.64,1)" }
                  : {}),
              }}
            >
              🐼
            </span>
          </button>

          <span>Hotel Search By PuuGoo</span>

          {/* Bamboo accent */}
          <span
            aria-hidden="true"
            style={{
              fontSize: "10px",
              opacity: 0.5,
              animation: "float-sway 4s ease-in-out infinite 1s",
              display: "inline-block",
            }}
          >
            🎋
          </span>
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
