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

/* Panda mood theo độ mạnh mật khẩu */
const STRENGTH_PANDA = ["", "😟", "😕", "🙂", "😄", "🤩"];

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
  const [mood, setMood] = useState<PandaMood>("greeting");
  const greetingDoneRef = useRef(false);

  // Typing state — panda bobs when user types in email
  const [typing, setTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Error shake state for form card
  const [shaking, setShaking] = useState(false);

  // Password visibility toggle
  const [showPassword, setShowPassword] = useState(false);

  // Caps Lock warning on password field
  const [capsOn, setCapsOn] = useState(false);

  // Mascot tò mò khi hover các nút social
  const [socialHover, setSocialHover] = useState(false);

  // Đếm số lần đăng nhập sai → gợi ý "Quên mật khẩu?"
  const [failCount, setFailCount] = useState(0);

  // Trạng thái mạng — panda báo khi offline
  const [online, setOnline] = useState(true);

  // Easter egg: double-click mascot → lộn nhào
  const [flipping, setFlipping] = useState(false);

  // Mascot cổ vũ khi hover nút đăng nhập
  const [submitHover, setSubmitHover] = useState(false);

  // Màn chuyển cảnh khi đăng nhập thành công
  const [loginSuccess, setLoginSuccess] = useState(false);

  // Easter egg: gõ "panda" trong email → panda vui (1 lần/phiên)
  const pandaEggDoneRef = useRef(false);

  // Thưởng mật khẩu "Rất mạnh" lần đầu (1 lần/phiên REGISTER)
  const strongRewardDoneRef = useRef(false);

  // Lời chào khách quen / khách mới (localStorage)
  const [visitMsg, setVisitMsg] = useState<string | null>(null);

  useEffect(() => {
    try {
      const KEY = "panda-last-visit";
      const last = Number(localStorage.getItem(KEY) || 0);
      const now = Date.now();
      if (!last) setVisitMsg("👋 Chào lần đầu ghé thăm!");
      else if (now - last > 24 * 60 * 60 * 1000)
        setVisitMsg("🐼 Lâu rồi không gặp!");
      localStorage.setItem(KEY, String(now));
    } catch {
      /* localStorage bị chặn — bỏ qua */
    }
    const t = setTimeout(() => setVisitMsg(null), 4000);
    return () => clearTimeout(t);
  }, []);

  // Rời tab → đổi title níu kéo; quay lại → mascot vẫy tay chào
  useEffect(() => {
    const original = document.title;
    let away = false;
    const onVis = () => {
      if (document.hidden) {
        away = true;
        document.title = "🐼 Quay lại nhé!";
      } else {
        document.title = original;
        if (away) {
          away = false;
          setMood("greeting");
          setTimeout(() => setMood("idle"), 1500);
        }
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      document.title = original;
    };
  }, []);

  useEffect(() => {
    setOnline(navigator.onLine);
    const goOn = () => setOnline(true);
    const goOff = () => setOnline(false);
    window.addEventListener("online", goOn);
    window.addEventListener("offline", goOff);
    return () => {
      window.removeEventListener("online", goOn);
      window.removeEventListener("offline", goOff);
    };
  }, []);

  // Success flash on form card
  const [successFlash, setSuccessFlash] = useState(false);

  // Derive loading mood from isLoading state; offline → panda buồn
  const mascotMood: PandaMood = isLoading ? "loading" : !online ? "sad" : mood;

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
  const nameValue = (watch("name") as string) ?? "";
  const lookX = peek ? 0 : Math.min(emailValue.length, 14) * 0.45;
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(emailValue);

  // Tiến độ điền form — panda đi bộ trên thanh tre
  const progressParts =
    variant === "REGISTER"
      ? [nameValue.trim().length > 0, emailValid, passwordValue.length >= 6]
      : [emailValid, passwordValue.length >= 6];
  const progressPct = Math.round(
    (progressParts.filter(Boolean).length / progressParts.length) * 100
  );

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
      // Full-screen confetti rain
      const emojis = ["🎉", "🐼", "🌿", "💚", "🎋", "✨", "🌸", "🎊", "🍀", "⭐"];
      const container = document.querySelector(".panda-mascot-wrapper");
      if (container) {
        const rect = container.getBoundingClientRect();
        // Local burst from mascot
        for (let i = 0; i < 16; i++) {
          const el = document.createElement("span");
          el.textContent = emojis[i % emojis.length];
          const angle = (i / 16) * 360;
          const dist = 55 + Math.random() * 70;
          const rad = (angle * Math.PI) / 180;
          const tx = Math.cos(rad) * dist;
          const ty = Math.sin(rad) * dist - 20;
          el.style.cssText = `
            position:fixed;
            left:${rect.left + rect.width / 2}px;
            top:${rect.top + rect.height / 2}px;
            font-size:${10 + Math.random() * 10}px;
            pointer-events:none;
            z-index:9999;
            animation:confettiBurst 0.85s ease-out forwards;
            --angle:${angle}deg;
            transform:translate(-50%,-50%);
          `;
          document.body.appendChild(el);
          setTimeout(() => el.remove(), 900);
        }
        // Ambient falling confetti from top
        for (let i = 0; i < 20; i++) {
          const el = document.createElement("span");
          el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
          const startX = Math.random() * window.innerWidth;
          const delay = Math.random() * 600;
          el.style.cssText = `
            position:fixed;
            left:${startX}px;
            top:-20px;
            font-size:${8 + Math.random() * 12}px;
            pointer-events:none;
            z-index:9998;
            animation:confetti-fall 1.2s ease-in ${delay}ms forwards;
          `;
          document.body.appendChild(el);
          setTimeout(() => el.remove(), 1900 + delay);
        }
      }
    }
    setTimeout(() => setMood("idle"), next === "happy" ? 1400 : 900);
  }, []);

  // Easter egg: email chứa "panda" → mascot vui (1 lần/phiên)
  useEffect(() => {
    if (!pandaEggDoneRef.current && /panda/i.test(emailValue)) {
      pandaEggDoneRef.current = true;
      flashMood("happy");
    }
  }, [emailValue, flashMood]);

  // Mật khẩu đạt "Rất mạnh" lần đầu → mưa lá tre quanh ô mật khẩu
  useEffect(() => {
    if (strongRewardDoneRef.current || pwStrength?.score !== 5) return;
    strongRewardDoneRef.current = true;
    const track = document.querySelector(".auth-strength-bar-track");
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const leaves = ["🍃", "🌿", "🎋", "✨", "🍀"];
    for (let i = 0; i < 8; i++) {
      const el = document.createElement("span");
      el.textContent = leaves[i % leaves.length];
      const x = rect.left + (rect.width * i) / 7;
      el.style.cssText = `
        position:fixed;
        left:${x}px;
        top:${rect.top}px;
        font-size:${9 + Math.random() * 6}px;
        pointer-events:none;
        z-index:9999;
        animation:confettiBurst 0.8s ease-out ${i * 40}ms forwards;
        --angle:${260 + Math.random() * 20}deg;
      `;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 900 + i * 40);
    }
  }, [pwStrength?.score]);

  // Greeting wave on first render → auto-transition to idle
  useEffect(() => {
    if (greetingDoneRef.current) return;
    greetingDoneRef.current = true;
    const t = setTimeout(() => setMood("idle"), 2200);
    return () => clearTimeout(t);
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

  // ── Panda cursor trail effect (mouse + touch) ─────────────────
  useEffect(() => {
    let lastX = 0, lastY = 0, frameId: number;
    const minDist = 28;
    const paws = ["🐾", "🐼", "🐾"];
    let pawIdx = 0;

    const spawnPaw = (x: number, y: number, isTouchClass = false) => {
      const el = document.createElement("span");
      el.className = isTouchClass ? "panda-touch-paw" : "panda-cursor-paw";
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
          spawnPaw(e.clientX, e.clientY, false);
          lastX = e.clientX;
          lastY = e.clientY;
        }
      });
    };

    // Touch trail for mobile
    let lastTX = 0, lastTY = 0;
    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      const dx = t.clientX - lastTX;
      const dy = t.clientY - lastTY;
      if (Math.sqrt(dx * dx + dy * dy) > 40) {
        spawnPaw(t.clientX, t.clientY, true);
        lastTX = t.clientX;
        lastTY = t.clientY;
      }
    };

    document.addEventListener("mousemove", onMouseMove, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: true });
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("touchmove", onTouchMove);
      cancelAnimationFrame(frameId);
    };
  }, []);

  // ── Card tilt: do CardTilt.tsx (bọc ngoài, V17) đảm nhiệm — tilt cũ
  //    trên cardRef đã gỡ để tránh double-tilt lồng nhau. ──────────

  // ── Mắt panda nhìn theo con trỏ toàn trang (khi không gõ email) ─
  useEffect(() => {
    let frameId = 0;
    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => {
        const panda = document.querySelector<HTMLElement>(".panda-mascot-wrapper .panda");
        if (!panda) return;
        // Đang gõ email / che mắt thì để logic prop điều khiển
        if (panda.classList.contains("panda--peek")) return;
        const r = panda.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height * 0.35; // tâm mắt ~ phần đầu
        const gx = Math.max(-5, Math.min(5, (e.clientX - cx) / 40));
        const gy = Math.max(-2, Math.min(3, (e.clientY - cy) / 60));
        panda.style.setProperty("--look-x", `${gx.toFixed(1)}px`);
        panda.style.setProperty("--look-y", `${gy.toFixed(1)}px`);
      });
    };
    document.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      document.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(frameId);
    };
  }, []);

  const toggleVariant = useCallback(() => {
    prevVariant.current = variant;
    setFormAnimating(true);
    setShowPassword(false);
    setTimeout(() => {
      setVariant((v) => (v === "LOGIN" ? "REGISTER" : "LOGIN"));
      setFormAnimating(false);
      // Mascot vẫy tay chào mừng sang form mới
      setMood("greeting");
      setTimeout(() => setMood("idle"), 1500);
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
            setFailCount((c) => c + 1);
            toast.error("Thông tin đăng nhập không hợp lệ!");
            return;
          }

          if (callback?.ok) {
            flashMood("happy");
            setFailCount(0);
            toast.success("Đã đăng nhập 🐼");
            // Màn chuyển cảnh panda trước khi vào trong
            setLoginSuccess(true);
            setTimeout(() => router.push(callbackUrl), 950);
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

      {/* Màn chuyển cảnh đăng nhập thành công */}
      {loginSuccess && (
        <div className="auth-success-overlay" role="status">
          <span className="auth-success-overlay__panda" aria-hidden="true">🐼</span>
          <p className="auth-success-overlay__text">Chào mừng trở lại!</p>
          <span className="auth-success-overlay__sub">Đang đưa bạn vào trong... 🎋</span>
        </div>
      )}

      {/* Panda mascot — click: vui, double-click: lộn nhào (easter egg) */}
      <div
        className={`panda-mascot-wrapper -mt-2 mb-1 flex justify-center auth-rise auth-rise-3 panda-mascot-clickable${socialHover ? " mascot-curious" : ""}${flipping ? " mascot-flipping" : ""}${submitHover ? " mascot-cheer" : ""}`}
        onClick={() => { if (mood === "idle") flashMood("happy"); }}
        onDoubleClick={() => {
          if (flipping) return;
          setFlipping(true);
          setTimeout(() => setFlipping(false), 900);
        }}
      >
        {/* Khách quen / khách mới */}
        {visitMsg && (
          <span className="auth-visit-tip" role="status">{visitMsg}</span>
        )}
        {/* Mất mạng — panda báo offline */}
        {!online && (
          <span className="auth-offline-tip" role="status">
            📡 Mất kết nối mạng rồi!
          </span>
        )}
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
          {/* Thanh tre tiến độ — panda đi bộ theo % điền form */}
          <div
            className={`auth-progress${progressPct === 100 ? " auth-progress--done" : ""}`}
            aria-hidden="true"
          >
            <div className="auth-progress-track">
              <div
                className="auth-progress-fill"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span
              className="auth-progress-panda"
              style={{ left: `${progressPct}%` }}
            >
              {progressPct === 100 ? "🎍" : "🐼"}
            </span>
          </div>
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
              onFocus={spawnLeaves}
            />
          </div>

          {/* Email field — 🍀 hiện khi email hợp lệ */}
          <div className="auth-email-wrapper">
            <Input
              disabled={isLoading}
              register={register}
              errors={errors}
              required
              id="email"
              label="Địa chỉ email"
              type="email"
              onChange={handleEmailChange}
              onFocus={spawnLeaves}
            />
            {emailValid && (
              <span className="auth-email-check" aria-hidden="true">🍀</span>
            )}
          </div>

          {/* Password field with show/hide toggle + Caps Lock warning */}
          <div
            className="auth-password-wrapper"
            onKeyUp={(e) => setCapsOn(e.getModifierState?.("CapsLock") ?? false)}
            onBlur={() => setCapsOn(false)}
          >
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

            {/* Caps Lock đang bật — panda nhắc nhở */}
            {capsOn && (
              <span className="auth-capslock-tip" role="status">
                🐼 Caps Lock đang bật!
              </span>
            )}

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
                  <span
                    className="auth-strength-panda"
                    key={pwStrength.score}
                    aria-hidden="true"
                  >
                    {STRENGTH_PANDA[pwStrength.score]}
                  </span>{" "}
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
            <div className="flex justify-end items-center gap-2">
              {failCount >= 2 && (
                <span className="auth-forgot-hint" aria-hidden="true">
                  🐼 Thử cái này nè!
                </span>
              )}
              <a
                href="/forgot-password"
                className={`auth-forgot-link${failCount >= 2 ? " auth-forgot-link--attention" : ""}`}
              >
                Quên mật khẩu?
              </a>
            </div>
          </div>

          {/* PandaButton submit — wrapper "hút" theo con trỏ (magnetic).
              Transform đặt trên wrapper vì .panda-svg-btn bị các CSS
              animation fill-both giữ chặt thuộc tính transform. */}
          <div
            style={{ display: "flex", justifyContent: "center", paddingTop: "16px" }}
            className={`panda-btn-magnet${isLoading ? " panda-btn-submitting" : ""}`}
            onMouseMove={(e) => {
              const t = e.currentTarget;
              const r = t.getBoundingClientRect();
              const x = ((e.clientX - r.left) / r.width - 0.5) * 10;
              const y = ((e.clientY - r.top) / r.height - 0.5) * 8;
              t.style.setProperty("--magnet-x", `${x.toFixed(1)}px`);
              t.style.setProperty("--magnet-y", `${y.toFixed(1)}px`);
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.setProperty("--magnet-x", "0px");
              e.currentTarget.style.setProperty("--magnet-y", "0px");
              setSubmitHover(false);
            }}
            onMouseEnter={() => setSubmitHover(true)}
          >
            <PandaButton
              type="submit"
              loading={isLoading}
              disabled={isLoading || !online}
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

        {/* Social buttons — mascot nghiêng đầu tò mò khi hover */}
        <div
          className="mt-4 grid grid-cols-2 gap-3"
          onMouseEnter={() => setSocialHover(true)}
          onMouseLeave={() => setSocialHover(false)}
        >
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
