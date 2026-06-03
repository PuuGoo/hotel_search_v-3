"use client";

import { useEffect, useState, useCallback } from "react";
import { useTheme } from "next-themes";
import { getFeatureTheme } from "@/app/libs/theme";

interface FeatureThemeProviderProps {
  feature: string;
  children: React.ReactNode;
}

export default function FeatureThemeProvider({
  feature,
  children,
}: FeatureThemeProviderProps) {
  const { resolvedTheme: globalTheme } = useTheme();
  const [featureTheme, setFeatureThemeState] = useState<"light" | "dark" | "system">("system");
  const [mounted, setMounted] = useState(false);

  const refreshTheme = useCallback(() => {
    setFeatureThemeState(getFeatureTheme(feature));
  }, [feature]);

  useEffect(() => {
    refreshTheme();
    setMounted(true);

    const onStorage = (e: StorageEvent) => {
      if (e.key === "feature-themes") refreshTheme();
    };
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("storage", onStorage);
    };
  }, [refreshTheme]);

  if (!mounted) return <>{children}</>;

  const resolved =
    featureTheme === "system" ? globalTheme : featureTheme;

  return (
    <div className={resolved === "dark" ? "dark" : ""}>
      {children}
    </div>
  );
}
