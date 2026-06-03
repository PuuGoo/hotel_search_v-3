"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { shortcuts } from "../libs/shortcuts";

export default function ShortcutsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    const actionMap: Record<string, () => void> = {
      "focus-search": () => {
        window.dispatchEvent(new CustomEvent("focus-search"));
      },
      "new-conversation": () => {
        router.push("/conversations");
      },
      "go-dashboard": () => {
        router.push("/dashboard");
      },
      "go-messages": () => {
        router.push("/conversations");
      },
      "toggle-sidebar": () => {
        window.dispatchEvent(new CustomEvent("toggle-sidebar"));
      },
      "close-modal": () => {
        window.dispatchEvent(new CustomEvent("close-modal"));
      },
      "show-shortcuts": () => {
        window.dispatchEvent(new CustomEvent("show-shortcuts"));
      },
    };

    const handler = (e: KeyboardEvent) => {
      if (!e.key) return;
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      for (const shortcut of shortcuts) {
        const ctrlMatch = shortcut.ctrl
          ? e.ctrlKey || e.metaKey
          : !(e.ctrlKey || e.metaKey);
        const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;
        const altMatch = shortcut.alt ? e.altKey : !e.altKey;
        const keyMatch = e.key === shortcut.key || e.key.toLowerCase?.() === shortcut.key;

        if (ctrlMatch && shiftMatch && altMatch && keyMatch) {
          if (isInput && shortcut.action !== "close-modal") {
            continue;
          }

          e.preventDefault();
          e.stopPropagation();

          const action = actionMap[shortcut.action];
          if (action) {
            action();
          }
          return;
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [router]);

  return <>{children}</>;
}
