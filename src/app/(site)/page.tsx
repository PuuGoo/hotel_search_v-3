import Image from "next/image";

import Policy from "@/app/(site)/components/Policy";
import AutoScale from "./components/AutoScale";
import AuthForm from "./components/AuthForm";

export default function Home({
  searchParams,
}: {
  searchParams?: { callbackUrl?: string; redirect?: string };
}) {
  const callbackUrl =
    searchParams?.callbackUrl || searchParams?.redirect || "/conversations";

  return (
    <div className="relative h-screen flex overflow-hidden">
      {/* Background video is provided app-wide by the root layout. */}

      {/* ── Floating panda & bamboo decorations (brand side, lg+) ── */}
      {[
        { emoji: "🐼", left: "8%",  top: "18%", dur: "5.5s", delay: "0s",   size: "28px" },
        { emoji: "🎋", left: "82%", top: "12%", dur: "6.2s", delay: "1.3s", size: "22px" },
        { emoji: "🐼", left: "15%", top: "72%", dur: "7.1s", delay: "2.1s", size: "20px" },
        { emoji: "🍃", left: "88%", top: "65%", dur: "4.8s", delay: "0.8s", size: "18px" },
        { emoji: "🎋", left: "50%", top: "8%",  dur: "8s",   delay: "3.5s", size: "16px" },
        { emoji: "🌿", left: "72%", top: "80%", dur: "5.8s", delay: "1.9s", size: "20px" },
      ].map((d, i) => (
        <span
          key={`deco-${i}`}
          className="hidden lg:block"
          aria-hidden="true"
          style={{
            position: "absolute",
            left: d.left,
            top: d.top,
            fontSize: d.size,
            pointerEvents: "none",
            zIndex: 5,
            opacity: 0.55,
            animation: `float-sway ${d.dur} ease-in-out infinite`,
            animationDelay: d.delay,
            filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.2))",
          }}
        >
          {d.emoji}
        </span>
      ))}

      {/* ── Aurora overlay on brand side ── */}
      <div className="auth-aurora" aria-hidden="true" />

      {/* ── Floating bamboo/chat bubbles (brand side decoration) ── */}
      {[
        { size: 12, left: "12%", delay: "0s",  duration: "7s"  },
        { size: 18, left: "28%", delay: "1.8s", duration: "9s"  },
        { size: 9,  left: "45%", delay: "0.6s", duration: "6.5s"},
        { size: 14, left: "62%", delay: "3.1s", duration: "8s"  },
        { size: 10, left: "78%", delay: "2.2s", duration: "7.5s"},
        { size: 7,  left: "90%", delay: "4s",   duration: "6s"  },
      ].map((b, i) => (
        <span
          key={i}
          className="auth-bubble hidden lg:block"
          aria-hidden="true"
          style={{
            width:  b.size,
            height: b.size,
            left:   b.left,
            bottom: "8%",
            animationDelay:    b.delay,
            animationDuration: b.duration,
          }}
        />
      ))}

      {/* ── Brand content (left, over video, hidden on small screens) ── */}
      <div className="relative z-10 hidden lg:flex lg:w-1/2 flex-col justify-between p-12 xl:p-16 text-white">
        {/* Logo row */}
        <div className="flex items-center gap-3 auth-rise auth-rise-1">
          <div className="relative h-11 w-11 grid place-items-center rounded-2xl bg-white/15 backdrop-blur-sm">
            <span className="auth-logo-ring" aria-hidden="true" />
            <Image
              alt="Logo"
              height={28}
              width={28}
              priority
              className="w-7 h-7 object-contain"
              src="/images/logo-new.png"
            />
          </div>
          <span className="text-lg font-extrabold tracking-tight drop-shadow">
            Hotel Search
          </span>
        </div>

        {/* Hero copy */}
        <div className="max-w-md">
          {/* Panda badge */}
          <div className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 text-xs font-semibold text-white/90 auth-rise auth-rise-1">
            <span style={{ animation: "float-sway 3s ease-in-out infinite", display: "inline-block" }}>🐼</span>
            Powered by Hotel Search AI
          </div>
          <h1 className="text-4xl xl:text-5xl font-black leading-[1.1] tracking-tight drop-shadow-lg auth-rise auth-rise-2">
            Tìm, đối chiếu &amp; quản lý khách sạn — trong một nơi.
          </h1>
          <p className="mt-5 text-base xl:text-lg text-white/85 leading-relaxed drop-shadow auth-rise auth-rise-3">
            Tìm kiếm hàng loạt, dò URL tự động, cảnh báo giá và cộng tác
            theo thời gian thực. Đăng nhập để tiếp tục công việc của bạn.
          </p>

          <div className="mt-8 flex flex-wrap gap-2.5 auth-rise auth-rise-4">
            {["Bulk Search", "URL Finder", "Cảnh báo giá", "Realtime chat"].map(
              (chip) => (
                <span
                  key={chip}
                  className="px-3.5 py-1.5 rounded-full text-[13px] font-semibold bg-white/15 backdrop-blur-md border border-white/20 shadow-lg"
                >
                  {chip}
                </span>
              )
            )}
          </div>

          {/* Animated stats */}
          <div className="mt-5 flex flex-wrap gap-4 auth-rise" style={{ animationDelay: "0.45s" }}>
            {[
              { value: "50K+", label: "Khách sạn" },
              { value: "99%", label: "Uptime" },
              { value: "∞", label: "Tìm kiếm" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl font-black text-white drop-shadow">{stat.value}</div>
                <div className="text-xs text-white/65 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-[13px] text-white/70 drop-shadow auth-rise auth-rise-5">
          © {new Date().getFullYear()} Hotel Search · puugoo.io.vn
        </div>
      </div>

      {/* ── Form panel (right, glass card over video) ── */}
      <div className="relative z-10 flex-1 flex flex-col justify-center px-6 py-6 sm:px-12 lg:px-16 xl:px-24">
        {/* Bamboo particles floating around the card */}
        {[
          { left: "8%",  bottom: "18%", delay: "0s",    dur: "3.1s" },
          { left: "92%", bottom: "24%", delay: "1.2s",  dur: "2.6s" },
          { left: "5%",  bottom: "55%", delay: "2.1s",  dur: "3.4s" },
          { left: "95%", bottom: "60%", delay: "0.7s",  dur: "2.9s" },
          { left: "50%", bottom: "5%",  delay: "1.7s",  dur: "3.2s" },
        ].map((p, i) => (
          <span
            key={i}
            className="bamboo-particle hidden lg:block"
            aria-hidden="true"
            style={{
              left:              p.left,
              bottom:            p.bottom,
              animationDelay:    p.delay,
              animationDuration: p.dur,
            }}
          />
        ))}
        <div className="sm:mx-auto sm:w-full sm:max-w-md rounded-3xl bg-white/95 dark:bg-dusk/90 backdrop-blur-xl shadow-2xl shadow-black/40 ring-1 ring-white/40 p-7 sm:p-9">
          <AutoScale>
            {/* Compact logo for mobile */}
            <div className="flex lg:hidden justify-center mb-5 auth-rise auth-rise-1">
              <div className="h-12 w-12 grid place-items-center rounded-2xl bg-brand/10">
                <Image
                  alt="Logo"
                  height={32}
                  width={32}
                  className="w-8 h-8 object-contain"
                  src="/images/logo-new.png"
                />
              </div>
            </div>

            <h2 className="text-center lg:text-left text-2xl sm:text-3xl font-extrabold tracking-tight text-ink dark:text-gray-100 auth-rise auth-rise-2">
              Chào mừng trở lại 🐼
            </h2>
            <p className="mt-2 text-center lg:text-left text-sm text-ink-soft dark:text-gray-400 auth-rise auth-rise-3">
              Đăng nhập vào tài khoản để tiếp tục
            </p>

            <AuthForm callbackUrl={callbackUrl} />
            <Policy />
          </AutoScale>
        </div>
      </div>
    </div>
  );
}
