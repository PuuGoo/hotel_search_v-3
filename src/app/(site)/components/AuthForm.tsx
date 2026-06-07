"use client";

import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { BsGithub, BsGoogle } from "react-icons/bs";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

import Input from "../../components/inputs/Input";
import LoadingModal from "../../components/modals/LoadingModal";
import AuthSocialButton from "./AuthSocialButton";

type Variant = "LOGIN" | "REGISTER";

interface AuthFormProps {
  callbackUrl?: string;
}

const AuthForm: React.FC<AuthFormProps> = ({ callbackUrl = "/conversations" }) => {
  const session = useSession();
  const router = useRouter();
  const [variant, setVariant] = useState<Variant>("LOGIN");
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FieldValues>({
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    if (session?.status === "authenticated") {
      router.push(callbackUrl);
    }
  }, [session?.status, router, callbackUrl]);

  const toggleVariant = useCallback(() => {
    if (variant === "LOGIN") {
      setVariant("REGISTER");
    } else {
      setVariant("LOGIN");
    }
  }, [variant]);

  const onSubmit: SubmitHandler<FieldValues> = (data) => {
    setIsLoading(true);

    if (variant === "REGISTER") {
      axios
        .post("/api/register", data)
        .then(() => signIn("credentials", data))
        .catch((error) => {
          // Surface the specific server-side reason (e.g. invalid email,
          // weak password, email already in use) instead of a generic message.
          const message =
            typeof error?.response?.data === "string"
              ? error.response.data
              : "Đã có lỗi xảy ra!";
          toast.error(message);
        })
        .finally(() => setIsLoading(false));
    }

    if (variant === "LOGIN") {
      signIn("credentials", {
        ...data,
        redirect: false,
      })
        .then((callback) => {
          if (callback?.error) {
            toast.error("Thông tin đăng nhập không hợp lệ!");
            return;
          }

          if (callback?.ok) {
            toast.success("Đã đăng nhập");
            router.push(callbackUrl);
          }
        })
        .finally(() => setIsLoading(false));
    }
  };

  const socialAction = (action: string) => {
    setIsLoading(true);

    signIn(action, { redirect: false })
      .then((callback) => {
        if (callback?.error) {
          toast.error("Thông tin đăng nhập không hợp lệ!");
          return;
        }

        if (callback?.ok) {
          toast.success("Đã đăng nhập");
        }
      })
      .finally(() => setIsLoading(false));
  };

  return (
    <>
      {session?.status === "loading" && <LoadingModal />}
      <div className="auth-rise auth-rise-4">
        <div>
          <form
            className="space-y-4"
            method="post"
            onSubmit={handleSubmit(onSubmit)}
          >
            {variant === "REGISTER" && (
              <Input
                disabled={isLoading}
                register={register}
                errors={errors}
                required
                id="name"
                label="Tên"
              />
            )}
            <Input
              disabled={isLoading}
              register={register}
              errors={errors}
              required
              id="email"
              label="Địa chỉ email"
              type="email"
            />
            <Input
              disabled={isLoading}
              register={register}
              errors={errors}
              required
              id="password"
              label="Mật khẩu"
              type="password"
            />
            {variant === "LOGIN" && (
              <div className="flex justify-end">
                <a
                  href="/forgot-password"
                  className="text-sm text-sky-600 hover:underline dark:text-sky-400"
                >
                  Quên mật khẩu?
                </a>
              </div>
            )}
            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="auth-shimmer-btn w-full flex justify-center items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-brand to-accent hover:from-brand-dark hover:to-accent-dark shadow-bubble transition-all hover:shadow-card active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-50 disabled:cursor-default"
              >
                {isLoading && (
                  <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                )}
                {variant === "LOGIN" ? "Đăng nhập" : "Đăng ký"}
              </button>
            </div>
          </form>
          <div className="mt-5">
            <div className="relative">
              <div
                className="
                absolute 
                inset-0 
                flex 
                items-center
              "
              >
                <div className="w-full border-t border-gray-300 dark:border-t-2 dark:border-lightgray" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-2 text-ink-soft dark:bg-dusk dark:text-gray-200">
                  Hoặc tiếp tục với
                </span>
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <AuthSocialButton icon={BsGithub} onClick={() => socialAction("github")} disabled={isLoading} />
              <AuthSocialButton icon={BsGoogle} onClick={() => socialAction("google")} disabled={isLoading} />
            </div>
          </div>
          <div
            className="
            mt-5 
            flex 
            justify-center 
            gap-2 
            px-2 
            text-sm 
            text-ink-soft
            dark:text-gray-400
          "
          >
            <div>{variant === "LOGIN" ? "Bạn mới biết đến Hotel Search?" : "Đã có tài khoản?"}</div>
            <button type="button" onClick={toggleVariant} className="cursor-pointer underline bg-transparent border-none p-0 text-sm text-sky-600 dark:text-sky-400">
              {variant === "LOGIN" ? "Tạo tài khoản" : "Đăng nhập"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default AuthForm;
