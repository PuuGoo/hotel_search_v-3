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

      {/* ── Brand content (left, over video, hidden on small screens) ── */}
      <div className="relative z-10 hidden lg:flex lg:w-1/2 flex-col justify-between p-12 xl:p-16 text-white">
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

        <div className="text-[13px] text-white/70 drop-shadow auth-rise auth-rise-5">
          © {new Date().getFullYear()} Hotel Search · puugoo.io.vn
        </div>
      </div>

      {/* ── Form panel (right, glass card over video) ── */}
      <div className="relative z-10 flex-1 flex flex-col justify-center px-6 py-6 sm:px-12 lg:px-16 xl:px-24">
        <div className="sm:mx-auto sm:w-full sm:max-w-md rounded-3xl bg-white/95 dark:bg-dusk/90 backdrop-blur-xl shadow-2xl shadow-black/40 ring-1 ring-white/40 p-7 sm:p-9">
          <AutoScale>
            {/* Compact logo for mobile (brand text is hidden) */}
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
