"use client";

import { useState } from "react";
import { FiPrinter, FiLoader } from "react-icons/fi";

interface PDFExportButtonProps {
  onGenerate: () => string;
  filename: string;
  label?: string;
}

const PDFExportButton = ({ onGenerate, filename, label = "Xuất PDF" }: PDFExportButtonProps) => {
  const [generating, setGenerating] = useState(false);

  const handleExport = async () => {
    setGenerating(true);
    try {
      const html = onGenerate();
      const printWindow = window.open("", "_blank", "width=1100,height=800");
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 500);
      }
    } finally {
      setGenerating(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={generating}
      className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-gray-950 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {generating ? (
        <FiLoader className="h-4 w-4 animate-spin" />
      ) : (
        <FiPrinter className="h-4 w-4" />
      )}
      {generating ? "Đang tạo..." : label}
    </button>
  );
};

export default PDFExportButton;
