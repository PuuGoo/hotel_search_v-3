const STORAGE_KEY = "feature-themes";

export interface FeatureTheme {
  feature: string;
  theme: "light" | "dark" | "system";
}

const DEFAULT_FEATURES: FeatureTheme[] = [
  { feature: "chat", theme: "system" },
  { feature: "search", theme: "system" },
  { feature: "finder", theme: "system" },
  { feature: "drive", theme: "system" },
  { feature: "dashboard", theme: "system" },
];

function loadThemes(): FeatureTheme[] {
  if (typeof window === "undefined") return DEFAULT_FEATURES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_FEATURES;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_FEATURES;
    return DEFAULT_FEATURES.map((d) => {
      const found = parsed.find((p: FeatureTheme) => p.feature === d.feature);
      return found ? { ...d, theme: found.theme } : d;
    });
  } catch {
    return DEFAULT_FEATURES;
  }
}

function saveThemes(themes: FeatureTheme[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(themes));
}

export function getFeatureTheme(feature: string): "light" | "dark" | "system" {
  const themes = loadThemes();
  const found = themes.find((t) => t.feature === feature);
  return found?.theme ?? "system";
}

export function setFeatureTheme(
  feature: string,
  theme: "light" | "dark" | "system"
): void {
  const themes = loadThemes();
  const idx = themes.findIndex((t) => t.feature === feature);
  if (idx >= 0) {
    themes[idx].theme = theme;
  } else {
    themes.push({ feature, theme });
  }
  saveThemes(themes);
}

export function getAllFeatureThemes(): FeatureTheme[] {
  return loadThemes();
}

export function resetFeatureThemes(): void {
  saveThemes(DEFAULT_FEATURES);
}
