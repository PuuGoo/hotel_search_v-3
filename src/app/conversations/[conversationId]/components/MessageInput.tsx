"use client";

import { FieldErrors, FieldValues, UseFormRegister } from "react-hook-form";

interface MessageInputProps {
  placeholder?: string;
  id: string;
  type?: string;
  required?: boolean;
  register: UseFormRegister<FieldValues>;
  errors: FieldErrors;
  onPasteFile?: (files: FileList) => void;
}

const MessageInput: React.FC<MessageInputProps> = ({
  placeholder,
  id,
  type,
  required,
  register,
  onPasteFile,
}) => {
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const items = e.clipboardData?.files;
    if (items && items.length > 0 && onPasteFile) {
      e.preventDefault();
      onPasteFile(items);
    }
  };

  return (
    <div className="relative w-full">
      <input
        id={id}
        type={type}
        autoComplete={id}
        {...register(id, { required })}
        onPaste={handlePaste}
        placeholder={placeholder}
        className="
          text-ink
          font-normal
          py-1.5
          px-2
          bg-transparent
          w-full
          border-0
          focus:outline-none
          focus:ring-0
          placeholder:text-ink-soft
          dark:text-white
        "
      />
    </div>
  );
};

export default MessageInput;
