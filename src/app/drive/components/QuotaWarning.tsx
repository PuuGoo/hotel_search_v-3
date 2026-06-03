"use client";

import axios from "axios";
import { useEffect, useState } from "react";
import { FiAlertTriangle, FiX } from "react-icons/fi";

interface QuotaWarningProps {
  refreshTrigger?: number;
}

export default function QuotaWarning({ refreshTrigger }: QuotaWarningProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    axios
      .get("/api/drive/quota")
      .then((res) => {
        if (res.data.percentage > 90) {
          setVisible(true);
        } else {
          setVisible(false);
        }
      })
      .catch(() => {});
  }, [refreshTrigger]);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => setVisible(false), 10000);
    return () => clearTimeout(timer);
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="mb-4 flex items-center gap-3 rounded-lg border border-yellow-700/50 bg-yellow-900/30 px-4 py-3 text-sm text-yellow-200">
      <FiAlertTriangle className="h-5 w-5 shrink-0 text-yellow-400" />
      <span className="flex-1">
        Dung lượng sắp hết! Hãy xóa bớt file hoặc nâng cấp dung lượng.
      </span>
      <button
        onClick={() => setVisible(false)}
        className="shrink-0 text-yellow-400 hover:text-yellow-200"
      >
        <FiX size={16} />
      </button>
    </div>
  );
}
