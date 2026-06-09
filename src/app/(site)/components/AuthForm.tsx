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
import PandaMascot, { PandaMood } from "./PandaMascot";
import PandaButton from "./PandaButton";

type Variant = "LOGIN" | "REGISTER";

interface AuthFormProps {
  callbackUrl?: string;
}

const AuthForm: React.FC<AuthFormProps> = ({ callbackUrl = "/conversations" }) => {
  const session = useSession();
  const router = useRouter();
  const [variant, setVariant] = useState<Variant>("LOGIN");
  const [isLoading, setIsLoading] = useState(false);

  // Mascot reactions: `peek` covers the eyes while typing a password; `mood`
  // cheers on success / droops on error then settles back to idle.
  const [peek, setPeek] = useState(false);
  const [mood, setMood] = useState<PandaMood>("idle");

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FieldValues>({
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  // Eyes track the email as it's typed: shift the pupils right as it grows,
  // clamped so they never leave the eye whites.
  const emailValue = (watch("email") as string) ?? "";
  const lookX = peek ? 0 : Math.min(emailValue.length, 14) * 0.45;

  const flashMood = useCallback((next: PandaMood) => {
    setMood(next);
    setTimeout(() => setMood("idle"), next === "happy" ? 1200 : 700);
  }, []);

  useEffect(() => {
    if (session?.status === "authenticated") {
      window.location.href = callbackUrl;
    }
  }, [session?.status, callbackUrl]);

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
            flashMood("sad");
            toast.error("Thông tin đăng nhập không hợp lệ!");
            return;
          }

          if (callback?.ok) {
            flashMood("happy");
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
          flashMood("sad");
          toast.error("Thông tin đăng nhập không hợp lệ!");
          return;
        }

        if (callback?.ok) {
          flashMood("happy");
          toast.success("Đã đăng nhập");
        }
      })
      .finally(() => setIsLoading(false));
  };

  return (
    <>
      {session?.status === "loading" && <LoadingModal />}

      {/* Panda mascot */}
      <div className="-mt-2 mb-1 flex justify-center auth-rise auth-rise-3">
        <PandaMascot mood={mood} peek={peek} lookX={lookX} />
      </div>

      <div className="auth-rise auth-rise-4">
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
            onFocus={() => setPeek(true)}
            onBlur={() => setPeek(false)}
          />
          {variant === "LOGIN" && (
            <div className="flex justify-end">
              <a
                href="/forgot-password"
                className="auth-forgot-link"
              >
                Quên mật khẩu?
              </a>
            </div>
          )}

          {/* PandaButton submit */}
          <div style={{ display: "flex", justifyContent: "center", paddingTop: "16px" }}>
            <PandaButton
              type="submit"
              loading={isLoading}
              disabled={isLoading}
              labelStyle={
                variant === "REGISTER"
                  ? { background: "#007aff", boxShadow: "0 2px 0 #0051d5" }
                  : undefined
              }
            >
              {variant === "LOGIN" ? "Đăng nhập" : "Đăng ký"}
            </PandaButton>
          </div>
        </form>

        {/* Divider */}
        <div className="auth-divider">
          <div className="auth-divider__line" />
          <span className="auth-divider__text">Hoặc tiếp tục với</span>
          <div className="auth-divider__line" />
        </div>

        {/* Social buttons */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <AuthSocialButton
            icon={BsGithub}
            label="GitHub"
            onClick={() => socialAction("github")}
            disabled={isLoading}
          />
          <AuthSocialButton
            icon={BsGoogle}
            label="Google"
            onClick={() => socialAction("google")}
            disabled={isLoading}
          />
        </div>

        {/* Toggle login / register */}
        <div className="mt-5 flex justify-center gap-2 px-2 text-sm text-ink-soft dark:text-gray-400">
          <span>
            {variant === "LOGIN" ? "Bạn mới biết đến Hotel Search?" : "Đã có tài khoản?"}
          </span>
          <button
            type="button"
            onClick={toggleVariant}
            className="auth-toggle-link"
          >
            {variant === "LOGIN" ? "Tạo tài khoản" : "Đăng nhập"}
          </button>
        </div>
      </div>
    </>
  );
};

export default AuthForm;
