"use client";

import axios from "axios";
import { useCallback, useEffect, useRef, useState } from "react";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { BsGithub, BsGoogle } from "react-icons/bs";
import { HiEye, HiEyeOff } from "react-icons/hi";

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

// Password strength calculator
function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: "", color: "" };
  let score = 0;
  if (pw.length >= 8)  score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { score: 1, label: "Yếu", color: "#ef4444" };
  if (score === 2) return { score: 2, label: "Trung bình", color: "#f97316" };
  if (score === 3) return { score: 3, label: "Khá mạnh", color: "#eab308" };
  if (score === 4) return { score: 4, label: "Mạnh", color: "#22c55e" };
  return { score: 5, label: "Rất mạnh 🐼", color: "#16a34a" };
}

const AuthForm: React.FC<AuthFormProps> = ({ callbackUrl = "/conversations" }) => {
  const session = useSession();
  const router = useRouter();
  const [variant, setVariant] = useState<Variant>("LOGIN");
  const [isLoading, setIsLoading] = useState(false);
  const prevVariant = useRef<Variant>("LOGIN");
  const cardRef = useRef<HTMLDivElement>(null);

  // Variant flip animation state
  const [formAnimating, setFormAnimating] = useState(false);

  // Mascot reactions
  const [peek, setPeek] = useState(false);
  const [mood, setMood] = useState<PandaMood>("idle");

  // Typing state — panda bobs when user types in email
  const [typing, setTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Error shake state for form card
  const [shaking, setShaking] = useState(false);

  // Password visibility toggle
  const [showPassword, setShowPassword] = useState(false);

  // Success flash on form card
  const [successFlash, setSuccessFlash] = useState(false);

  // Derive loading mood from isLoading state
  const mascotMood: PandaMood = isLoading ? "loading" : mood;

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

  // Eyes track the email as it's typed
  const emailValue = (watch("email") as string) ?? "";
  const passwordValue = (watch("password") as string) ?? "";
  const lookX = peek ? 0 : Math.min(emailValue.length, 14) * 0.45;

  // Password strength (only shown in REGISTER mode)
  const pwStrength = variant === "REGISTER" ? getPasswordStrength(passwordValue) : null;

  // Detect typing activity
  const handleEmailChange = useCallback(() => {
    setTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => setTyping(false), 800);
  }, []);

  const flashMood = useCallback((next: PandaMood) => {
    setMood(next);
    if (next === "sad") {
      setShaking(true);
      setTimeout(() => setShaking(false), 600);
    }
    if (next === "happy") {
      setSuccessFlash(true);
      setTimeout(() => setSuccessFlash(false), 1200);
      // Confetti burst from mascot area
      const emojis = ["🎉", "🐼", "🌿", "💚", "🎋", "✨", "🌸"];
      const container = document.querySelector(".panda-mascot-wrapper");
      if (container) {
        const rect = container.getBoundingClientRect();
        for (let i = 0; i < 12; i++) {
          const el = document.createElement("span");
          el.textContent = emojis[i % emojis.length];
          const angle = (i / 12) * 360;
          const dist = 50 + Math.random() * 60;
          const rad = (angle * Math.PI) / 180;
          const tx = Math.cos(rad) * dist;
          const ty = Math.sin(rad) * dist - 20;
          el.style.cssText = `
            position:fixed;
            left:${rect.left + rect.width / 2}px;
            top:${rect.top + rect.height / 2}px;
            font-size:${12 + Math.random() * 8}px;
            pointer-events:none;
            z-index:9999;
            animation:confettiBurst 0.75s ease-out forwards;
            --angle:${angle}deg;
            transform:translate(-50%,-50%);
          `;
          document.body.appendChild(el);
          setTimeout(() => el.remove(), 800);
        }
      }
    }
    setTimeout(() => setMood("idle"), next === "happy" ? 1400 : 900);
  }, []);

  useEffect(() => {
    if (session?.status === "authenticated") {
      window.location.href = callbackUrl;
    }
  }, [session?.status, callbackUrl]);

  // Cleanup typing timeout
  useEffect(() => () => {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  }, []);

  // ── Panda cursor trail effect ──────────────────────────────────
  useEffect(() => {
    let lastX = 0, lastY = 0, frameId: number;
    const minDist = 28;
    const paws = ["🐾", "🐼", "🐾"];
    let pawIdx = 0;

    const spawnPaw = (x: number, y: number) => {
      const el = document.createElement("span");
      el.className = "panda-cursor-paw";
      el.textContent = paws[pawIdx % paws.length];
      pawIdx++;
      const rot = -20 + Math.random() * 40;
      el.style.cssText = `left:${x - 8}px;top:${y - 8}px;--paw-rot:${rot}deg;`;
      document.body.appendChild(el);
      el.addEventListener("animationend", () => el.remove());
    };

    const onMouseMove = (e: MouseEvent) => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => {
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        if (Math.sqrt(dx * dx + dy * dy) > minDist) {
          spawnPaw(e.clientX, e.clientY);
          lastX = e.clientX;
          lastY = e.clientY;
        }
      });
    };

    document.addEventListener("mousemove", onMouseMove, { passive: true });
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      cancelAnimationFrame(frameId);
    };
  }, []);

  // ── Card parallax tilt on mouse move ──────────────────────────
  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const onMove = (e: MouseEvent) => {
      const rect = card.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const rx = ((e.clientY - cy) / rect.height) * -6;
      const ry = ((e.clientX - cx) / rect.width) * 6;
      card.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg)`;
    };
    const onLeave = () => {
      card.style.transform = "perspective(800px) rotateX(0deg) rotateY(0deg)";
      card.style.transition = "transform 0.5s ease";
      setTimeout(() => { if (card) card.style.transition = ""; }, 500);
    };
    card.addEventListener("mousemove", onMove);
    card.addEventListener("mouseleave", onLeave);
    return () => {
      card.removeEventListener("mousemove", onMove);
      card.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  const toggleVariant = useCallback(() => {
    prevVariant.current = variant;
    setFormAnimating(true);
    setShowPassword(false);
    setTimeout(() => {
      setVariant((v) => (v === "LOGIN" ? "REGISTER" : "LOGIN"));
      setFormAnimating(false);
    }, 180);
  }, [variant]);

  // ── Input focus: leaf burst particles ─────────────────────────
  const spawnLeaves = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const leaves = ["🍃", "🌿", "🎋"];
    for (let i = 0; i < 3; i++) {
      const leaf = document.createElement("span");
      leaf.className = "input-leaf-particle";
      leaf.textContent = leaves[i];
      const lx = -15 + Math.random() * 30;
      const ly = -10 - Math.random() * 18;
      const lr = -30 + Math.random() * 60;
      leaf.style.cssText = `left:${rect.left + rect.width * 0.1 + i * (rect.width * 0.35)}px;top:${rect.top - 4}px;position:fixed;--lx:${lx}px;--ly:${ly}px;--lr:${lr}deg;`;
      document.body.appendChild(leaf);
      leaf.addEventListener("animationend", () => leaf.remove());
    }
  }, []);

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
          flashMood("sad");
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
            toast.success("Đã đăng nhập 🐼");
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
          toast.success("Đã đăng nhập 🐼");
        }
      })
      .finally(() => setIsLoading(false));
  };

  return (
    <div ref={cardRef}>
      {session?.status === "loading" && <LoadingModal />}

      {/* Panda mascot */}
      <div className="panda-mascot-wrapper -mt-2 mb-1 flex justify-center auth-rise auth-rise-3">
        <PandaMascot
          mood={mascotMood}
          peek={peek}
          lookX={lookX}
          typing={typing && !peek}
        />
      </div>

      {/* Form body — animates on variant switch + shakes on error */}
      <div
        className={[
          "auth-rise auth-rise-4",
          shaking      ? "panda-form-shake"  : "",
          mood === "happy" ? "panda-card--happy" : "",
          mood === "sad"   ? "panda-card--sad"   : "",
          successFlash ? "auth-success-flash"    : "",
        ].filter(Boolean).join(" ")}
        style={{
          transition: "opacity 0.18s ease, transform 0.18s ease",
          opacity: formAnimating ? 0 : 1,
          transform: formAnimating
            ? "translateY(-6px) scale(0.98)"
            : "translateY(0) scale(1)",
        }}
      >
        <form
          className="space-y-4"
          method="post"
          onSubmit={handleSubmit(onSubmit)}
        >
          {/* Name field slides in for REGISTER */}
          <div
            style={{
              overflow: "hidden",
              maxHeight: variant === "REGISTER" ? "100px" : "0",
              opacity: variant === "REGISTER" ? 1 : 0,
              transform: variant === "REGISTER" ? "translateY(0)" : "translateY(-8px)",
              transition: "max-height 0.32s cubic-bezier(0.4,0,0.2,1), opacity 0.28s ease, transform 0.28s ease",
            }}
          >
            <Input
              disabled={isLoading}
              register={register}
              errors={errors}
              required={variant === "REGISTER"}
              id="name"
              label="Tên"
            />
          </div>

          <Input
            disabled={isLoading}
            register={register}
            errors={errors}
            required
            id="email"
            label="Địa chỉ email"
            type="email"
            onChange={handleEmailChange}
            onFocus={(e: any) => spawnLeaves(e)}
          />

          {/* Password field with show/hide toggle */}
          <div className="auth-password-wrapper">
            <Input
              disabled={isLoading}
              register={register}
              errors={errors}
              required
              id="password"
              label="Mật khẩu"
              type={showPassword ? "text" : "password"}
              onFocus={(e) => { spawnLeaves(e); if (!showPassword) setPeek(true); }}
              onBlur={() => setPeek(false)}
            />
            <button
              type="button"
              className="auth-eye-toggle"
              aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              tabIndex={-1}
              onClick={() => {
                setShowPassword((v) => !v);
                // Panda peeks when password is shown
                if (!showPassword) {
                  setPeek(false);
                  setMood("happy");
                  setTimeout(() => setMood("idle"), 700);
                } else {
                  setPeek(true);
                }
              }}
            >
              <span className={`auth-eye-icon${showPassword ? " auth-eye-icon--open" : ""}`}>
                {showPassword ? <HiEye /> : <HiEyeOff />}
              </span>
            </button>

            {/* Password strength bar — only in REGISTER mode */}
            <div
              className="auth-strength-bar-wrap"
              style={{
                maxHeight: variant === "REGISTER" && passwordValue ? "48px" : "0",
                opacity: variant === "REGISTER" && passwordValue ? 1 : 0,
                transition: "max-height 0.3s ease, opacity 0.25s ease",
                overflow: "hidden",
              }}
            >
              <div className="auth-strength-bar-track">
                {[1, 2, 3, 4, 5].map((seg) => (
                  <div
                    key={seg}
                    className="auth-strength-bar-seg"
                    style={{
                      background: pwStrength && pwStrength.score >= seg
                        ? pwStrength.color
                        : undefined,
                      transform: pwStrength && pwStrength.score >= seg
                        ? "scaleX(1)"
                        : "scaleX(0)",
                      transitionDelay: `${(seg - 1) * 0.05}s`,
                    }}
                  />
                ))}
              </div>
              {pwStrength && (
                <span
                  className="auth-strength-label"
                  style={{ color: pwStrength.color }}
                >
                  {pwStrength.label}
                </span>
              )}
            </div>
          </div>

          {/* Forgot password — fades out on REGISTER */}
          <div
            style={{
              overflow: "hidden",
              maxHeight: variant === "LOGIN" ? "40px" : "0",
              opacity: variant === "LOGIN" ? 1 : 0,
              transition: "max-height 0.28s ease, opacity 0.22s ease",
            }}
          >
            <div className="flex justify-end">
              <a href="/forgot-password" className="auth-forgot-link">
                Quên mật khẩu?
              </a>
            </div>
          </div>

          {/* PandaButton submit */}
          <div
            style={{ display: "flex", justifyContent: "center", paddingTop: "16px" }}
            className={isLoading ? "panda-btn-submitting" : ""}
          >
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
            provider="github"
            onClick={() => socialAction("github")}
            disabled={isLoading}
          />
          <AuthSocialButton
            icon={BsGoogle}
            label="Google"
            provider="google"
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
    </div>
  );
};

export default AuthForm;
