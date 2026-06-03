"use client";

import { useEffect, useState } from "react";
import { IoClose } from "react-icons/io5";

import { shortcuts, shortcutCategories, formatShortcutLabel } from "../libs/shortcuts";

export default function ShortcutsDialog() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const show = () => setIsOpen(true);
    const hide = () => setIsOpen(false);

    window.addEventListener("show-shortcuts", show);
    window.addEventListener("close-modal", hide);
    return () => {
      window.removeEventListener("show-shortcuts", show);
      window.removeEventListener("close-modal", hide);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen]);

  if (!isOpen) return null;

  const grouped = Object.entries(shortcutCategories).map(([key, label]) => ({
    key,
    label,
    items: shortcuts.filter((s) => s.category === key),
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-gray-900 rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">Phím tắt</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <IoClose className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-4 space-y-6 max-h-[60vh] overflow-y-auto">
          {grouped.map(({ key, label, items }) => (
            <div key={key}>
              <h3 className="text-sm font-medium text-gray-400 mb-3">{label}</h3>
              <div className="space-y-2">
                {items.map((shortcut) => (
                  <div
                    key={shortcut.action}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm text-gray-300">
                      {shortcut.description}
                    </span>
                    <div className="flex gap-1">
                      {formatShortcutLabel(shortcut)
                        .split(" + ")
                        .map((part, i) => (
                          <kbd
                            key={i}
                            className="inline-flex items-center justify-center min-w-[24px] px-2 py-0.5 text-xs font-mono text-gray-200 bg-gray-700 rounded"
                          >
                            {part}
                          </kbd>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="px-6 py-3 border-t border-gray-700 text-right">
          <button
            onClick={() => setIsOpen(false)}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
