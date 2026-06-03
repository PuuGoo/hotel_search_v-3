export interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  description: string;
  action: string;
  category: "navigation" | "action" | "system";
}

export const shortcuts: ShortcutConfig[] = [
  {
    key: "k",
    ctrl: true,
    description: "Tìm kiếm",
    action: "focus-search",
    category: "action",
  },
  {
    key: "/",
    description: "Tìm kiếm",
    action: "focus-search",
    category: "action",
  },
  {
    key: "n",
    ctrl: true,
    description: "Cuộc trò chuyện mới",
    action: "new-conversation",
    category: "action",
  },
  {
    key: "d",
    ctrl: true,
    description: "Bảng điều khiển",
    action: "go-dashboard",
    category: "navigation",
  },
  {
    key: "m",
    ctrl: true,
    description: "Tin nhắn",
    action: "go-messages",
    category: "navigation",
  },
  {
    key: "b",
    ctrl: true,
    description: "Ẩn/hiện thanh bên",
    action: "toggle-sidebar",
    category: "system",
  },
  {
    key: "Escape",
    description: "Đóng cửa sổ",
    action: "close-modal",
    category: "system",
  },
  {
    key: "?",
    shift: true,
    description: "Xem phím tắt",
    action: "show-shortcuts",
    category: "system",
  },
];

export const shortcutCategories = {
  navigation: "Điều hướng",
  action: "Hành động",
  system: "Hệ thống",
} as const;

export function formatShortcutLabel(shortcut: ShortcutConfig): string {
  const parts: string[] = [];
  if (shortcut.ctrl) parts.push("Ctrl");
  if (shortcut.shift) parts.push("Shift");
  if (shortcut.alt) parts.push("Alt");
  parts.push(shortcut.key.length === 1 ? shortcut.key.toUpperCase() : shortcut.key);
  return parts.join(" + ");
}
