"use client";

import axios from "axios";
import React, { useCallback, useState } from "react";
import { toast } from "react-hot-toast";
import { FiAlertTriangle } from "react-icons/fi";

import { Dialog } from "@headlessui/react";
import { useRouter } from "next/navigation";

import Button from "../../../components/Button";
import Modal from "../../../components/modals/Modal";
import useConversation from "../../../hooks/useConversation";

interface ConfirmModalProps {
  isOpen?: boolean;
  onClose: () => void;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ isOpen, onClose }) => {
  const router = useRouter();
  const { conversationId } = useConversation();
  const [isLoading, setIsLoading] = useState(false);

  const onDelete = useCallback(() => {
    setIsLoading(true);

    axios
      .delete(`/api/conversations/${conversationId}`)
      .then(() => {
        toast.success("Đã xóa cuộc trò chuyện");
        onClose();
        router.push("/conversations");
        router.refresh();
      })
      .catch(() => toast.error("Đã có lỗi xảy ra!"))
      .finally(() => setIsLoading(false));
  }, [router, conversationId, onClose]);

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="sm:flex sm:items-start">
        <div
          className="
            mx-auto 
            flex 
            h-12 
            w-12 
            flex-shrink-0 
            items-center 
            justify-center 
            rounded-full 
            bg-red-100 
            sm:mx-0 
            sm:h-10 
            sm:w-10
          "
        >
          <FiAlertTriangle className="h-6 w-6 text-red-600" aria-hidden="true" />
        </div>
        <div
          className="
            mt-3 
            text-center 
            sm:ml-4 
            sm:mt-0 
            sm:text-left
          "
        >
          <Dialog.Title
            as="h3"
            className="text-base font-semibold leading-6 text-gray-900 dark:text-gray-200"
          >
            Xóa cuộc trò chuyện
          </Dialog.Title>
          <div className="mt-2">
            <p className="text-sm text-ink-soft dark:text-gray-400">
              Bạn có chắc muốn xóa cuộc trò chuyện này? Hành động này không thể hoàn tác.
            </p>
          </div>
        </div>
      </div>
      <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
        <Button disabled={isLoading} danger onClick={onDelete}>
          Xóa
        </Button>
        <Button disabled={isLoading} secondary onClick={onClose}>
          Hủy
        </Button>
      </div>
    </Modal>
  );
};

export default ConfirmModal;
