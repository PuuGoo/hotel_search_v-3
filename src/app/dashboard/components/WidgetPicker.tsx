"use client";

import { useState, useEffect } from "react";
import {
  FiX,
  FiBarChart2,
  FiActivity,
  FiMessageSquare,
  FiSearch,
  FiZap,
} from "react-icons/fi";

interface WidgetOption {
  type: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  size: "small" | "medium" | "large";
}

interface WidgetPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (widget: Omit<WidgetOption, "description" | "icon">) => void;
  existingWidgetTypes: string[];
}

const AVAILABLE_WIDGETS: WidgetOption[] = [
  {
    type: "stat-overview",
    title: "Thống kê tổng quan",
    description: "Hiển thị tổng quan các chỉ số tìm kiếm",
    icon: <FiBarChart2 className="h-8 w-8 text-sky-400" />,
    size: "small",
  },
  {
    type: "activity-feed",
    title: "Hoạt động gần đây",
    description: "Liệt kê các tìm kiếm và hoạt động mới nhất",
    icon: <FiActivity className="h-8 w-8 text-green-400" />,
    size: "medium",
  },
  {
    type: "quick-search",
    title: "Tìm kiếm nhanh",
    description: "Thanh tìm kiếm便捷 để truy cập nhanh",
    icon: <FiSearch className="h-8 w-8 text-purple-400" />,
    size: "small",
  },
  {
    type: "popular-search",
    title: "Tìm kiếm phổ biến",
    description: "Hiển thị các từ khóa tìm kiếm được dùng nhiều nhất",
    icon: <FiZap className="h-8 w-8 text-yellow-400" />,
    size: "medium",
  },
  {
    type: "messages",
    title: "Tin nhắn mới",
    description: "Thông báo tin nhắn và phản hồi mới",
    icon: <FiMessageSquare className="h-8 w-8 text-pink-400" />,
    size: "small",
  },
];

const WidgetPicker: React.FC<WidgetPickerProps> = ({
  isOpen,
  onClose,
  onAdd,
  existingWidgetTypes,
}) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted || !isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-panel rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-hairline">
          <h3 className="text-lg font-semibold text-ink">Thêm widget</h3>
          <button
            onClick={onClose}
            className="p-2 text-ink-soft hover:text-ink hover:bg-fill rounded-lg transition-colors"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto">
          {AVAILABLE_WIDGETS.map((widget) => {
            const isAdded = existingWidgetTypes.includes(widget.type);
            return (
              <div
                key={widget.type}
                className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${
                  isAdded
                    ? "border-hairline bg-fill opacity-50"
                    : "border-hairline bg-fill hover:border-sky-500"
                }`}
              >
                <div className="flex-shrink-0">{widget.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-ink">{widget.title}</p>
                  <p className="text-sm text-ink-soft truncate">
                    {widget.description}
                  </p>
                </div>
                <button
                  onClick={() =>
                    !isAdded &&
                    onAdd({
                      type: widget.type,
                      title: widget.title,
                      size: widget.size,
                    })
                  }
                  disabled={isAdded}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isAdded
                      ? "bg-fill text-ink-soft cursor-not-allowed"
                      : "bg-sky-500 text-white hover:bg-sky-600"
                  }`}
                >
                  {isAdded ? "Đã thêm" : "Thêm"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default WidgetPicker;
