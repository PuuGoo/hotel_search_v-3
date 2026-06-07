"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { Popover, Transition } from "@headlessui/react";
import { HiAdjustmentsHorizontal } from "react-icons/hi2";

import {
  getFeatureTheme,
  setFeatureTheme,
} from "@/app/libs/theme";
import {
  getChatAppearance,
  setChatAppearance,
  ChatAccent,
  ChatDensity,
} from "@/app/libs/chatAppearance";

const ACCENTS: { key: ChatAccent; color: string }[] = [
  { key: "blue", color: "#007aff" },
  { key: "purple", color: "#7c5fe0" },
  { key: "sky", color: "#22b8ff" },
  { key: "green", color: "#34c759" },
  { key: "pink", color: "#ff5a87" },
];

interface SegProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

const Seg: React.FC<SegProps> = ({ active, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex-1 py-2 rounded-xl text-[13px] font-bold transition-all ${
      active
        ? "bg-brand text-white shadow-[0_6px_16px_-8px_rgba(0,122,255,0.8)]"
        : "bg-fill text-ink-soft hover:text-ink dark:bg-lightgray dark:text-gray-300"
    }`}
  >
    {children}
  </button>
);

const AppearanceSettings: React.FC = () => {
  const [theme, setThemeState] = useState<"light" | "dark">("light");
  const [density, setDensity] = useState<ChatDensity>("cozy");
  const [accent, setAccent] = useState<ChatAccent>("blue");

  // Load persisted state on mount.
  useEffect(() => {
    const ft = getFeatureTheme("chat");
    setThemeState(ft === "dark" ? "dark" : "light");
    const ap = getChatAppearance();
    setDensity(ap.density);
    setAccent(ap.accent);
  }, []);

  const applyTheme = (t: "light" | "dark") => {
    setThemeState(t);
    setFeatureTheme("chat", t);
    // Trigger FeatureThemeProvider (it listens to the storage event).
    window.dispatchEvent(new StorageEvent("storage", { key: "feature-themes" }));
  };

  const applyDensity = (d: ChatDensity) => {
    setDensity(d);
    setChatAppearance({ density: d });
  };

  const applyAccent = (a: ChatAccent) => {
    setAccent(a);
    setChatAppearance({ accent: a });
  };

  return (
    <Popover className="fixed bottom-24 right-6 lg:bottom-8 lg:right-8 z-40">
      {() => (
        <>
          <Popover.Button
            className="
              flex items-center justify-center w-12 h-12 rounded-full
              bg-panel border border-hairline shadow-card text-ink-soft
              transition-all duration-150 hover:text-brand hover:-translate-y-0.5
              hover:shadow-lg dark:bg-dusk dark:border-lightgray dark:text-gray-300
            "
            title="Tinh chỉnh giao diện"
            aria-label="Tinh chỉnh giao diện"
          >
            <HiAdjustmentsHorizontal size={22} />
          </Popover.Button>
          <Transition
            as={Fragment}
            enter="transition ease-out duration-150"
            enterFrom="opacity-0 translate-y-2 scale-95"
            enterTo="opacity-100 translate-y-0 scale-100"
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100 translate-y-0 scale-100"
            leaveTo="opacity-0 translate-y-2 scale-95"
          >
            <Popover.Panel className="absolute bottom-12 right-0 z-50 w-72 origin-bottom-right">
              <div className="ms-panel p-4 shadow-2xl">
                <h3 className="text-sm font-extrabold text-ink dark:text-gray-100 mb-3 tracking-tight">
                  Tinh chỉnh giao diện
                </h3>

                {/* Mode */}
                <div className="mb-3.5">
                  <div className="text-[11px] font-bold text-ink-soft dark:text-gray-400 uppercase tracking-wide mb-1.5">
                    Chế độ
                  </div>
                  <div className="flex gap-2">
                    <Seg active={theme === "light"} onClick={() => applyTheme("light")}>
                      ☀ Sáng
                    </Seg>
                    <Seg active={theme === "dark"} onClick={() => applyTheme("dark")}>
                      ☾ Tối
                    </Seg>
                  </div>
                </div>

                {/* Density */}
                <div className="mb-3.5">
                  <div className="text-[11px] font-bold text-ink-soft dark:text-gray-400 uppercase tracking-wide mb-1.5">
                    Mật độ
                  </div>
                  <div className="flex gap-2">
                    <Seg active={density === "cozy"} onClick={() => applyDensity("cozy")}>
                      Thoáng
                    </Seg>
                    <Seg active={density === "compact"} onClick={() => applyDensity("compact")}>
                      Gọn
                    </Seg>
                  </div>
                </div>

                {/* Accent */}
                <div>
                  <div className="text-[11px] font-bold text-ink-soft dark:text-gray-400 uppercase tracking-wide mb-1.5">
                    Màu nhãn
                  </div>
                  <div className="flex gap-3 items-center">
                    {ACCENTS.map((a) => (
                      <button
                        key={a.key}
                        type="button"
                        onClick={() => applyAccent(a.key)}
                        aria-label={a.key}
                        className={`w-7 h-7 rounded-full transition-transform hover:scale-110 ${
                          accent === a.key
                            ? "ring-2 ring-offset-2 ring-ink/40 dark:ring-offset-dusk scale-110"
                            : ""
                        }`}
                        style={{ backgroundColor: a.color }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </Popover.Panel>
          </Transition>
        </>
      )}
    </Popover>
  );
};

export default AppearanceSettings;
