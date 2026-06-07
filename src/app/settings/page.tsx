"use client";

import axios from "axios";
import React, { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { FiShield, FiCheck, FiX, FiCopy, FiBell, FiChevronRight, FiKey, FiMonitor } from "react-icons/fi";
import Link from "next/link";

const SettingsPage = () => {
  const router = useRouter();
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [secret, setSecret] = useState("");
  const [otpauthUri, setOtpauthUri] = useState("");
  const [token, setToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<"idle" | "setup" | "verify" | "disable">("idle");

  useEffect(() => {
    fetchTwoFactorStatus();
  }, []);

  const fetchTwoFactorStatus = async () => {
    try {
      const res = await axios.get("/api/settings/2fa");
      setTwoFactorEnabled(res.data.twoFactorEnabled);
    } catch {
      setTwoFactorEnabled(false);
    }
  };

  const handleGenerateSecret = async () => {
    setIsLoading(true);
    try {
      const res = await axios.post("/api/settings/2fa");
      setSecret(res.data.secret);
      setOtpauthUri(res.data.otpauthUri);
      setStep("setup");
    } catch (error: any) {
      const message =
        typeof error?.response?.data === "string"
          ? error.response.data
          : "Đã có lỗi xảy ra!";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnable = async () => {
    if (!token || token.length !== 6) {
      toast.error("Vui lòng nhập mã 6 chữ số");
      return;
    }
    setIsLoading(true);
    try {
      await axios.put("/api/settings/2fa", { token });
      setTwoFactorEnabled(true);
      setStep("idle");
      setToken("");
      setSecret("");
      setOtpauthUri("");
      toast.success("Đã bật xác thực hai yếu tố");
      router.refresh();
    } catch (error: any) {
      const message =
        typeof error?.response?.data === "string"
          ? error.response.data
          : "Đã có lỗi xảy ra!";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisable = async () => {
    if (!token || token.length !== 6) {
      toast.error("Vui lòng nhập mã 6 chữ số");
      return;
    }
    setIsLoading(true);
    try {
      await axios.delete("/api/settings/2fa", { data: { token } });
      setTwoFactorEnabled(false);
      setStep("idle");
      setToken("");
      toast.success("Đã tắt xác thực hai yếu tố");
      router.refresh();
    } catch (error: any) {
      const message =
        typeof error?.response?.data === "string"
          ? error.response.data
          : "Đã có lỗi xảy ra!";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopySecret = useCallback(() => {
    navigator.clipboard.writeText(secret);
    toast.success("Đã sao chép mã bí mật");
  }, [secret]);

  return (
    <div className="h-full bg-canvas px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center gap-3 mb-8">
          <FiShield className="h-8 w-8 text-blue-500" />
          <h1 className="text-2xl font-bold text-ink">Cài đặt</h1>
        </div>

        <Link
          href="/notifications/preferences"
          className="
            mb-6 flex items-center justify-between rounded-lg border border-hairline
            bg-panel p-6 transition-colors hover:border-hairline hover:bg-canvas
          "
        >
          <div className="flex items-center gap-3">
            <FiBell className="h-6 w-6 text-blue-500" />
            <div>
              <h2 className="text-lg font-semibold text-ink">
                Tùy chọn thông báo
              </h2>
              <p className="mt-1 text-sm text-ink-soft">
                Quản lý cách bạn nhận thông báo
              </p>
            </div>
          </div>
          <FiChevronRight className="h-5 w-5 text-ink-soft" />
        </Link>

        <Link
          href="/settings/appearance"
          className="
            mb-6 flex items-center justify-between rounded-lg border border-hairline
            bg-panel p-6 transition-colors hover:border-hairline hover:bg-canvas
          "
        >
          <div className="flex items-center gap-3">
            <FiMonitor className="h-6 w-6 text-blue-500" />
            <div>
              <h2 className="text-lg font-semibold text-ink">
                Giao diện
              </h2>
              <p className="mt-1 text-sm text-ink-soft">
                Tùy chỉnh giao diện toàn cục và theo từng tính năng
              </p>
            </div>
          </div>
          <FiChevronRight className="h-5 w-5 text-ink-soft" />
        </Link>

        <Link
          href="/settings/api-keys"
          className="
            mb-6 flex items-center justify-between rounded-lg border border-hairline
            bg-panel p-6 transition-colors hover:border-hairline hover:bg-canvas
          "
        >
          <div className="flex items-center gap-3">
            <FiKey className="h-6 w-6 text-blue-500" />
            <div>
              <h2 className="text-lg font-semibold text-ink">
                Quản lý API Keys
              </h2>
              <p className="mt-1 text-sm text-ink-soft">
                Tạo và quản lý API key cho ứng dụng của bạn
              </p>
            </div>
          </div>
          <FiChevronRight className="h-5 w-5 text-ink-soft" />
        </Link>

        <div className="rounded-lg border border-hairline bg-panel p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-ink">
                Xác thực hai yếu tố
              </h2>
              <p className="mt-1 text-sm text-ink-soft">
                Thêm lớp bảo mật cho tài khoản của bạn
              </p>
            </div>
            <span
              className={`
                inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium
                ${
                  twoFactorEnabled
                    ? "bg-green-500/10 text-green-400 ring-1 ring-inset ring-green-500/20"
                    : "bg-red-500/10 text-red-400 ring-1 ring-inset ring-red-500/20"
                }
              `}
            >
              {twoFactorEnabled ? (
                <>
                  <FiCheck className="h-3 w-3" />
                  Đã bật
                </>
              ) : (
                <>
                  <FiX className="h-3 w-3" />
                  Chưa bật
                </>
              )}
            </span>
          </div>

          {!twoFactorEnabled && step === "idle" && (
            <button
              onClick={handleGenerateSecret}
              disabled={isLoading}
              className="
                rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white
                hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500
                focus:ring-offset-2 focus:ring-offset-white disabled:opacity-50
                disabled:cursor-not-allowed
              "
            >
              {isLoading ? "Đang tải..." : "Bật 2FA"}
            </button>
          )}

          {!twoFactorEnabled && step === "setup" && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-ink mb-3">
                  Bước 1: Quét mã QR hoặc nhập thủ công khóa bí mật vào ứng
                  dụng xác thực (Google Authenticator, Authy, ...)
                </p>
                <div className="rounded-lg bg-panel p-4">
                  <p className="text-xs text-ink-soft mb-2">Khóa bí mật:</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded bg-canvas px-3 py-2 text-sm text-green-400 break-all">
                      {secret}
                    </code>
                    <button
                      onClick={handleCopySecret}
                      className="rounded-lg bg-fill p-2 text-ink hover:bg-hairline hover:text-ink"
                      title="Sao chép"
                    >
                      <FiCopy className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-3 rounded-lg bg-panel p-4">
                  <p className="text-xs text-ink-soft mb-2">
                    URIotpauth (dùng để tạo QR code):
                  </p>
                  <code className="text-xs text-blue-400 break-all block">
                    {otpauthUri}
                  </code>
                </div>
              </div>

              <div>
                <p className="text-sm text-ink mb-3">
                  Bước 2: Nhập mã xác nhận 6 chữ số từ ứng dụng
                </p>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={token}
                    onChange={(e) => setToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    className="
                      w-36 rounded-lg border border-hairline bg-panel px-4 py-2.5
                      text-center text-lg font-mono text-ink tracking-widest
                      placeholder:text-ink-soft focus:border-blue-500 focus:outline-none
                      focus:ring-1 focus:ring-blue-500
                    "
                  />
                  <button
                    onClick={handleEnable}
                    disabled={isLoading || token.length !== 6}
                    className="
                      rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white
                      hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-green-500
                      focus:ring-offset-2 focus:ring-offset-white disabled:opacity-50
                      disabled:cursor-not-allowed
                    "
                  >
                    {isLoading ? "Đang xác minh..." : "Xác nhận & Bật"}
                  </button>
                  <button
                    onClick={() => {
                      setStep("idle");
                      setSecret("");
                      setOtpauthUri("");
                      setToken("");
                    }}
                    className="
                      rounded-lg bg-fill px-4 py-2.5 text-sm font-medium text-ink
                      hover:bg-hairline hover:text-ink
                    "
                  >
                    Hủy
                  </button>
                </div>
              </div>
            </div>
          )}

          {twoFactorEnabled && step === "idle" && (
            <div className="space-y-4">
              <p className="text-sm text-ink">
                Xác thực hai yếu tố đã được kích hoạt. Nhập mã xác nhận từ
                ứng dụng để tắt.
              </p>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  className="
                    w-36 rounded-lg border border-hairline bg-panel px-4 py-2.5
                    text-center text-lg font-mono text-ink tracking-widest
                    placeholder:text-ink-soft focus:border-red-500 focus:outline-none
                    focus:ring-1 focus:ring-red-500
                  "
                />
                <button
                  onClick={() => setStep("disable")}
                  disabled={isLoading || token.length !== 6}
                  className="
                    rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white
                    hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-500
                    focus:ring-offset-2 focus:ring-offset-white disabled:opacity-50
                    disabled:cursor-not-allowed
                  "
                >
                  {isLoading ? "Đang xác minh..." : "Tắt 2FA"}
                </button>
              </div>
            </div>
          )}

          {twoFactorEnabled && step === "disable" && (
            <div className="space-y-4">
              <p className="text-sm text-red-400">
                Bạn có chắc chắn muốn tắt xác thực hai yếu tố? Tài khoản của
                bạn sẽ kém an toàn hơn.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleDisable}
                  disabled={isLoading}
                  className="
                    rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white
                    hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-500
                    focus:ring-offset-2 focus:ring-offset-white disabled:opacity-50
                    disabled:cursor-not-allowed
                  "
                >
                  {isLoading ? "Đang xác minh..." : "Xác nhận tắt"}
                </button>
                <button
                  onClick={() => {
                    setStep("idle");
                    setToken("");
                  }}
                  className="
                    rounded-lg bg-fill px-4 py-2.5 text-sm font-medium text-ink
                    hover:bg-hairline hover:text-ink
                  "
                >
                  Hủy
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
