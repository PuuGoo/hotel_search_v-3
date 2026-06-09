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
        </div>

        {/* Footer */}
        <div className="text-[13px] text-white/70 drop-shadow auth-rise auth-rise-5">
          © {new Date().getFullYear()} Hotel Search · puugoo.io.vn
        </div>
      </div>

      {/* ── Form panel (right, glass card over video) ── */}
      <div className="relative z-10 flex-1 flex flex-col justify-center px-6 py-6 sm:px-12 lg:px-16 xl:px-24">
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
              Chào mừng trở lại
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
