"use client";

import axios from "axios";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import toast from "react-hot-toast";

import Button from "@/app/components/Button";
import Input from "@/app/components/inputs/Input";

const ResetPasswordForm = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get("token") ?? "";
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FieldValues>({ defaultValues: { password: "", confirm: "" } });

  const onSubmit: SubmitHandler<FieldValues> = (data) => {
    if (!token) {
      toast.error("Liên kết đặt lại không hợp lệ");
      return;
    }
    if (data.password !== data.confirm) {
      toast.error("Mật khẩu xác nhận không khớp");
      return;
    }

    setIsLoading(true);
    axios
      .post("/api/auth/reset-password", { token, password: data.password })
      .then(() => {
        toast.success("Đặt lại mật khẩu thành công. Vui lòng đăng nhập.");
        router.push("/");
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
        {!token ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-red-500">
              Liên kết đặt lại không hợp lệ hoặc thiếu mã. Vui lòng yêu cầu lại.
            </p>
            <Link
              href="/forgot-password"
              className="inline-block text-sm text-sky-600 underline"
            >
              Yêu cầu liên kết mới
            </Link>
          </div>
        ) : (
          <>
            <p className="mb-6 text-sm text-gray-600 dark:text-gray-300">
              Nhập mật khẩu mới cho tài khoản của bạn.
            </p>
            <form className="space-y-6" method="post" onSubmit={handleSubmit(onSubmit)}>
              <Input
                disabled={isLoading}
                register={register}
                errors={errors}
                required
                id="password"
                label="Mật khẩu mới"
                type="password"
              />
              <Input
                disabled={isLoading}
                register={register}
                errors={errors}
                required
                id="confirm"
                label="Xác nhận mật khẩu"
                type="password"
              />
              <Button disabled={isLoading} fullWidth type="submit">
                Đặt lại mật khẩu
              </Button>
            </form>
            <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
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

export default ResetPasswordForm;
