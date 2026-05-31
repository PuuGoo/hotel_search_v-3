import { Metadata } from "next";
import Image from "next/image";

import ForgotPasswordForm from "./ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Quên mật khẩu - Hotel Search",
};

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-full flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gray-100 dark:bg-dusk">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Image
          alt="Logo"
          height="48"
          width="48"
          className="mx-auto w-auto"
          src="/images/logo-new.png"
        />
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-200">
          Quên mật khẩu
        </h2>
      </div>
      <ForgotPasswordForm />
    </div>
  );
}
