"use client";

import axios from "axios";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import { HiPaperAirplane, HiPhoto } from "react-icons/hi2";

import { CldUploadButton } from "next-cloudinary";

import useConversation from "../../../hooks/useConversation";
import MessageInput from "./MessageInput";

const Form = () => {
  const { conversationId } = useConversation();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FieldValues>({
    defaultValues: {
      message: "",
    },
  });

  const onSubmit: SubmitHandler<FieldValues> = async (data) => {
    const message = data.message;
    // Optimistically clear the input, but restore it on failure so the user
    // doesn't lose their text when a send is rejected (e.g. 403/400/500).
    setValue("message", "", { shouldValidate: true });
    try {
      await axios.post("/api/messages", {
        ...data,
        conversationId,
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

  return (
    <div
      className="
        py-4 
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
      "
    >
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
          required
          placeholder="Viết tin nhắn"
        />
        <button
          type="submit"
          className="
            rounded-full 
            p-2 
            bg-sky-500 
            cursor-pointer 
            hover:bg-sky-600 
            transition
          "
        >
          <HiPaperAirplane size={18} className="text-white" />
        </button>
      </form>
    </div>
  );
};

export default Form;
