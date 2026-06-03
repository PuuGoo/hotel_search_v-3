"use client";

import axios from "axios";
import { Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import { HiPaperAirplane, HiPhoto, HiPaperClip, HiXMark, HiMicrophone } from "react-icons/hi2";
import { CldUploadButton } from "next-cloudinary";
import { useSession } from "next-auth/react";

import useConversation from "../../../hooks/useConversation";
import { pusherEvents } from "../../../libs/pusherChannels";
import { FullMessageType } from "../../../types";
import MessageInput from "./MessageInput";

const VoiceRecorder = lazy(() => import("./VoiceRecorder"));

interface PendingFile {
  file: File;
  preview?: string;
}

interface FormProps {
  replyTo?: FullMessageType | null;
  onClearReply?: () => void;
}

const Form: React.FC<FormProps> = ({ replyTo, onClearReply }) => {
  const { conversationId } = useConversation();
  const session = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<PendingFile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FieldValues>({
    defaultValues: {
      message: "",
    },
  });

  const messageValue = watch("message");

  const emitTypingStart = useCallback(() => {
    if (isTypingRef.current || !conversationId || !session.data?.user) return;
    isTypingRef.current = true;
    fetch("/api/conversations/typing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId, event: pusherEvents.TYPING_START }),
    }).catch(() => {});
  }, [conversationId, session.data?.user]);

  const emitTypingStop = useCallback(() => {
    if (!isTypingRef.current || !conversationId || !session.data?.user) return;
    isTypingRef.current = false;
    fetch("/api/conversations/typing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId, event: pusherEvents.TYPING_STOP }),
    }).catch(() => {});
  }, [conversationId, session.data?.user]);

  useEffect(() => {
    if (messageValue && messageValue.length > 0) {
      emitTypingStart();

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        emitTypingStop();
      }, 2000);
    } else {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      emitTypingStop();
    }

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [messageValue, emitTypingStart, emitTypingStop]);

  useEffect(() => {
    return () => {
      emitTypingStop();
    };
  }, [emitTypingStop]);

  const onSubmit: SubmitHandler<FieldValues> = async (data) => {
    const message = data.message;
    const currentReplyTo = replyTo;
    setValue("message", "", { shouldValidate: true });
    emitTypingStop();
    onClearReply?.();

    if (pendingFile) {
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", pendingFile.file);

        const uploadRes = await axios.post("/api/messages/upload", formData);
        const { fileUrl, fileName, fileSize, fileType } = uploadRes.data;

        await axios.post("/api/messages", {
          message: message || undefined,
          fileUrl,
          fileName,
          fileSize,
          fileType,
          conversationId,
          replyToId: currentReplyTo?.id || null,
        });

        setPendingFile(null);
      } catch (error) {
        setValue("message", message);
        toast.error("Không thể gửi file");
      } finally {
        setUploading(false);
      }
      return;
    }

    try {
      await axios.post("/api/messages", {
        ...data,
        conversationId,
        replyToId: currentReplyTo?.id || null,
      });
    } catch (error) {
      setValue("message", message);
      toast.error("Không thể gửi tin nhắn");
    }
  };

  const handleUpload = async (result: any) => {
    try {
      await axios.post("/api/messages", {
        image: result.info.secure_url,
        conversationId: conversationId,
      });
    } catch (error) {
      toast.error("Không thể gửi ảnh");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;

    if (f.size > 50 * 1024 * 1024) {
      toast.error("File quá lớn (tối đa 50MB)");
      return;
    }

    setPendingFile({ file: f });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removePendingFile = () => {
    setPendingFile(null);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const handleVoiceSend = async (blob: Blob) => {
    setUploading(true);
    try {
      const formData = new FormData();
      const fileName = `voice-${Date.now()}.webm`;
      formData.append("file", blob, fileName);

      const uploadRes = await axios.post("/api/messages/upload", formData);
      const { fileUrl, fileType } = uploadRes.data;

      await axios.post("/api/messages", {
        message: undefined,
        fileUrl,
        fileName,
        fileSize: blob.size,
        fileType: fileType || "audio/webm",
        conversationId,
        replyToId: null,
      });

      setShowVoiceRecorder(false);
      toast.success("Đã gửi tin nhắn thoại");
    } catch {
      toast.error("Không thể gửi tin nhắn thoại");
    } finally {
      setUploading(false);
    }
  };

  const messageInputRef = useRef<HTMLInputElement>(null);

  // Handle clipboard paste: if the user has a file on their system clipboard
  // (Ctrl+C a file in Explorer) and pastes into the chat input, pick it up as
  // a pending attachment instead of ignoring it.
  const handlePasteFile = useCallback((files: FileList) => {
    const f = files[0];
    if (!f) return;

    if (f.size > 50 * 1024 * 1024) {
      toast.error("File quá lớn (tối đa 50MB)");
      return;
    }

    setPendingFile({ file: f });
    toast.success(`Đã đính kèm: ${f.name}`);
  }, []);

  const handleInputFocus = () => {
    if (window.visualViewport) {
      setTimeout(() => {
        messageInputRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      }, 300);
    }
  };

  return (
    <div className="w-full">
      {replyTo && (
        <div className="px-4 py-2 bg-neutral-50 dark:bg-gray-800 border-t dark:border-lightgray">
          <div className="flex items-center gap-2 bg-sky-50 dark:bg-sky-900/30 rounded-lg px-3 py-2 max-w-xs border-l-2 border-sky-500">
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-semibold text-sky-600 dark:text-sky-400">
                Trả lời {replyTo.sender.name}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {replyTo.body
                  ? replyTo.body.length > 50
                    ? replyTo.body.slice(0, 50) + "..."
                    : replyTo.body
                  : replyTo.image
                  ? "Hình ảnh"
                  : replyTo.fileName || "File đính kèm"}
              </div>
            </div>
            <button
              onClick={onClearReply}
              className="text-gray-400 hover:text-red-500 transition-colors touch-target"
            >
              <HiXMark size={16} />
            </button>
          </div>
        </div>
      )}
      {pendingFile && (
        <div className="px-4 py-2 bg-neutral-50 dark:bg-gray-800 border-t dark:border-lightgray">
          <div className="flex items-center gap-2 bg-white dark:bg-gray-700 rounded-lg px-3 py-2 max-w-xs">
            <HiPaperClip className="text-sky-500 flex-shrink-0" size={16} />
            <div className="flex-1 min-w-0">
              <div className="text-sm text-black dark:text-white truncate">
                {pendingFile.file.name}
              </div>
              <div className="text-xs text-gray-400">
                {formatFileSize(pendingFile.file.size)}
              </div>
            </div>
            <button
              onClick={removePendingFile}
              className="text-gray-400 hover:text-red-500 transition-colors touch-target"
            >
              <HiXMark size={16} />
            </button>
          </div>
        </div>
      )}
      <div
        className="
          fixed
          bottom-0
          left-0
          right-0
          z-30
          py-3
          px-4
          bg-white
          border-t
          flex
          items-center
          gap-2
          lg:gap-4
          w-full
          dark:bg-dusk
          dark:border-lightgray
          safe-area-bottom
          lg:static
          lg:bottom-auto
          lg:left-auto
          lg:right-auto
          lg:z-auto
          lg:py-4
        "
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileSelect}
          accept="*/*"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="text-sky-500 hover:text-sky-600 transition-colors"
          title="Đính kèm file"
        >
          <HiPaperClip size={28} />
        </button>
        <button
          type="button"
          onClick={() => setShowVoiceRecorder(!showVoiceRecorder)}
          className={`transition-colors ${showVoiceRecorder ? "text-sky-500" : "text-sky-500 hover:text-sky-600"}`}
          title="Ghi âm"
        >
          <HiMicrophone size={28} />
        </button>
        <CldUploadButton
          options={{ maxFiles: 1 }}
          onUpload={handleUpload}
          uploadPreset={process.env.NEXT_PUBLIC_CLOUDINARY_PRESET_NAME}
        >
          <HiPhoto size={30} className="text-sky-500" />
        </CldUploadButton>
        <form onSubmit={handleSubmit(onSubmit)} className="flex items-center gap-2 lg:gap-4 w-full">
          <MessageInput
            id="message"
            register={register}
            errors={errors}
            required={!pendingFile}
            placeholder={pendingFile ? "Thêm tin nhắn (tùy chọn)" : "Viết tin nhắn"}
            onPasteFile={handlePasteFile}
          />
          <button
            type="submit"
            disabled={uploading}
            className="
              rounded-full 
              p-2 
              bg-sky-500 
              cursor-pointer 
              hover:bg-sky-600 
              transition
              disabled:opacity-50
              disabled:cursor-not-allowed
            "
          >
            <HiPaperAirplane size={18} className="text-white" />
          </button>
        </form>
      </div>
      <div className="h-20 lg:hidden safe-area-bottom" />
    </div>
  );
};

export default Form;
