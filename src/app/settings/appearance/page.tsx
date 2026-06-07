"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import {
  FiMonitor,
  FiSun,
  FiMoon,
  FiRefreshCw,
  FiMessageSquare,
  FiSearch,
  FiGlobe,
  FiHardDrive,
  FiLayout,
} from "react-icons/fi";
import {
  getFeatureTheme,
  setFeatureTheme,
  getAllFeatureThemes,
  resetFeatureThemes,
  FeatureTheme,
} from "@/app/libs/theme";

type ThemeValue = "light" | "dark" | "system";

const FEATURES: { key: string; label: string; icon: React.ReactNode }[] = [
  { key: "chat", label: "Chat", icon: <FiMessageSquare className="h-5 w-5" /> },
  { key: "search", label: "Tìm kiếm", icon: <FiSearch className="h-5 w-5" /> },
  { key: "finder", label: "URL Finder", icon: <FiGlobe className="h-5 w-5" /> },
  { key: "drive", label: "Drive", icon: <FiHardDrive className="h-5 w-5" /> },
  { key: "dashboard", label: "Dashboard", icon: <FiLayout className="h-5 w-5" /> },
];

const THEME_OPTIONS: { value: ThemeValue; label: string; icon: React.ReactNode }[] = [
  { value: "system", label: "Hệ thống", icon: <FiMonitor className="h-4 w-4" /> },
  { value: "light", label: "Sáng", icon: <FiSun className="h-4 w-4" /> },
  { value: "dark", label: "Tối", icon: <FiMoon className="h-4 w-4" /> },
];

export default function AppearancePage() {
  const { resolvedTheme, setTheme } = useTheme();
  const [globalTheme, setGlobalTheme] = useState<ThemeValue>("system");
  const [featureThemes, setFeatureThemes] = useState<FeatureTheme[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setGlobalTheme((resolvedTheme as ThemeValue) || "system");
    setFeatureThemes(getAllFeatureThemes());
    setMounted(true);
  }, [resolvedTheme]);

  const handleGlobalTheme = (theme: ThemeValue) => {
    setTheme(theme);
    setGlobalTheme(theme);
  };

  const handleFeatureTheme = (feature: string, theme: ThemeValue) => {
    setFeatureTheme(feature, theme);
    setFeatureThemes(getAllFeatureThemes());
  };

  const handleReset = () => {
    resetFeatureThemes();
    setFeatureThemes(getAllFeatureThemes());
  };

  if (!mounted) return null;

  const previewBg = resolvedTheme === "dark" ? "bg-panel" : "bg-gray-100";
  const previewText = resolvedTheme === "dark" ? "text-white" : "text-gray-900";
  const previewMuted = resolvedTheme === "dark" ? "text-ink-soft" : "text-ink-soft";

  return (
    <div className="h-full bg-canvas px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center gap-3 mb-8">
          <FiMonitor className="h-8 w-8 text-blue-500" />
          <div>
            <h1 className="text-2xl font-bold text-ink">Giao diện</h1>
            <p className="text-sm text-ink-soft">Tùy chỉnh giao diện ứng dụng</p>
          </div>
        </div>

        <div className="rounded-lg border border-hairline bg-panel p-6 mb-6">
          <h2 className="text-lg font-semibold text-ink mb-4">Chế độ toàn cục</h2>
          <p className="text-sm text-ink-soft mb-4">
            Chọn giao diện mặc định cho toàn bộ ứng dụng
          </p>
          <div className="flex gap-3">
            {THEME_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleGlobalTheme(opt.value)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  globalTheme === opt.value
                    ? "bg-blue-600 text-white"
                    : "bg-panel text-ink hover:bg-fill hover:text-ink"
                }`}
              >
                {opt.icon}
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-hairline bg-panel p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-ink">Giao diện theo tính năng</h2>
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-ink-soft hover:text-ink bg-panel hover:bg-fill rounded-lg transition-colors"
            >
              <FiRefreshCw className="h-4 w-4" />
              Đặt lại về mặc định
            </button>
          </div>
          <p className="text-sm text-ink-soft mb-4">
            Ghi đè giao diện cho từng tính năng riêng biệt
          </p>
          <div className="space-y-3">
            {FEATURES.map((feat) => {
              const currentTheme = featureThemes.find((t) => t.feature === feat.key)?.theme || "system";
              return (
                <div
                  key={feat.key}
                  className="flex items-center justify-between p-3 rounded-lg bg-canvas border border-hairline"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-ink-soft">{feat.icon}</span>
                    <span className="text-sm font-medium text-ink">{feat.label}</span>
                  </div>
                  <div className="flex gap-2">
                    {THEME_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => handleFeatureTheme(feat.key, opt.value)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                          currentTheme === opt.value
                            ? "bg-blue-600 text-white"
                            : "bg-panel text-ink-soft hover:text-ink hover:bg-fill"
                        }`}
                      >
                        {opt.icon}
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg border border-hairline bg-panel p-6">
          <h2 className="text-lg font-semibold text-ink mb-4">Xem trước</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className={`${previewBg} rounded-lg p-4`}>
              <div className={`${previewText} text-sm font-medium mb-1`}>Chế độ sáng</div>
              <div className={`${previewMuted} text-xs`}>Nền sáng, chữ tối</div>
              <div className="mt-3 bg-white rounded-md p-3 border border-gray-200">
                <div className="h-3 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-2 bg-gray-200 rounded w-1/2 mb-2" />
                <div className="h-2 bg-gray-200 rounded w-2/3" />
              </div>
            </div>
            <div className="bg-panel rounded-lg p-4">
              <div className="text-white text-sm font-medium mb-1">Chế độ tối</div>
              <div className="text-ink-soft text-xs">Nền tối, chữ sáng</div>
              <div className="mt-3 bg-canvas rounded-md p-3 border border-hairline">
                <div className="h-3 bg-fill rounded w-3/4 mb-2" />
                <div className="h-2 bg-fill rounded w-1/2 mb-2" />
                <div className="h-2 bg-fill rounded w-2/3" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
