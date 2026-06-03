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
          text-black
          font-light
          py-2
          px-4
          bg-neutral-100
          dark:bg-lightgray
          w-full
          rounded-full
          focus:outline-none
          dark:text-white
        "
      />
    </div>
  );
};

export default MessageInput;
