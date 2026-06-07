"use client";

// Chat appearance: density + accent label color, persisted to localStorage and
// applied as data-attributes on the chat wrapper so CSS can react. Theme
// (light/dark) stays in the existing feature-theme system (libs/theme.ts).

const KEY = "chat-appearance";

export type ChatDensity = "cozy" | "compact";
export type ChatAccent = "blue" | "purple" | "sky" | "green" | "pink";

export interface ChatAppearance {
  density: ChatDensity;
  accent: ChatAccent;
}

const DEFAULTS: ChatAppearance = { density: "cozy", accent: "blue" };

export function getChatAppearance(): ChatAppearance {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw);
    return {
      density: parsed.density === "compact" ? "compact" : "cozy",
      accent: ["blue", "purple", "sky", "green", "pink"].includes(parsed.accent)
        ? parsed.accent
        : "blue",
    };
  } catch {
    return DEFAULTS;
  }
}

export function setChatAppearance(next: Partial<ChatAppearance>): ChatAppearance {
  const merged = { ...getChatAppearance(), ...next };
  if (typeof window !== "undefined") {
    localStorage.setItem(KEY, JSON.stringify(merged));
    window.dispatchEvent(new CustomEvent("chat-appearance-change"));
  }
  return merged;
}
