"use client";

import { useState } from "react";
import { toast } from "react-hot-toast";
import { FiDownload, FiLoader } from "react-icons/fi";

interface ExportButtonProps {
  onExport: () => Promise<void>;
  label: string;
  format: string;
  disabled?: boolean;
}

const ExportButton = ({
  onExport,
  label,
  format,
  disabled = false,
}: ExportButtonProps) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await onExport();
      toast.success(`Xuất file ${format.toUpperCase()} thành công`);
    } catch (error: any) {
      const message = error?.message || "Không thể xuất file";
      toast.error(message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={disabled || isExporting}
      className="flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {isExporting ? (
        <>
          <FiLoader className="h-4 w-4 animate-spin" />
          Đang xuất...
        </>
      ) : (
        <>
          <FiDownload className="h-4 w-4" />
          {label}
        </>
      )}
    </button>
  );
};

export default ExportButton;
