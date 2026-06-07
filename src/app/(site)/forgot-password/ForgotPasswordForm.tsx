"use client";

import axios from "axios";
import Link from "next/link";
import { useState } from "react";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import toast from "react-hot-toast";

import Button from "@/app/components/Button";
import Input from "@/app/components/inputs/Input";

const ForgotPasswordForm = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [devUrl, setDevUrl] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FieldValues>({ defaultValues: { email: "" } });

  const onSubmit: SubmitHandler<FieldValues> = (data) => {
    setIsLoading(true);
    axios
      .post("/api/auth/forgot-password", data)
      .then((res) => {
        setSent(true);
        // Dev-only convenience: backend returns the link when not in production.
        if (res.data?.devResetUrl) {
          setDevUrl(res.data.devResetUrl);
        }
        toast.success("Đã gửi yêu cầu đặt lại mật khẩu");
      })
      .catch((error) => {
        const message =
          typeof error?.response?.data?.error === "string"
            ? error.response.data.error
            : "Đã có lỗi xảy ra!";
        toast.error(message);
      })
      .finally(() => setIsLoading(false));
  };

  return (
    <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
      <div className="bg-white px-4 py-8 shadow sm:rounded-lg sm:px-10 dark:bg-dusk dark:sm:border-2 dark:border-lightgray">
        {sent ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Nếu email tồn tại trong hệ thống, chúng tôi đã gửi liên kết đặt lại
              mật khẩu. Vui lòng kiểm tra hộp thư của bạn.
            </p>
            {devUrl ? (
              <div className="rounded-md bg-yellow-50 dark:bg-lightgray p-3 text-xs break-all">
                <p className="font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Liên kết (chỉ hiển thị ở môi trường dev):
                </p>
                <Link href={devUrl} className="text-sky-600 underline">
                  {devUrl}
                </Link>
              </div>
            ) : null}
            <Link href="/" className="inline-block text-sm text-sky-600 underline">
              Quay lại đăng nhập
            </Link>
          </div>
        ) : (
          <>
            <p className="mb-6 text-sm text-gray-600 dark:text-gray-300">
              Nhập email của bạn, chúng tôi sẽ gửi liên kết để đặt lại mật khẩu.
            </p>
            <form className="space-y-6" method="post" onSubmit={handleSubmit(onSubmit)}>
              <Input
                disabled={isLoading}
                register={register}
                errors={errors}
                required
                id="email"
                label="Địa chỉ email"
                type="email"
              />
              <Button disabled={isLoading} fullWidth type="submit">
                Gửi liên kết đặt lại
              </Button>
            </form>
            <div className="mt-6 text-center text-sm text-ink-soft dark:text-gray-400">
              <Link href="/" className="underline">
                Quay lại đăng nhập
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordForm;
