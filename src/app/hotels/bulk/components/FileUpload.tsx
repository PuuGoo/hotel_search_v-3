"use client";

import { useCallback, useRef, useState } from "react";
import { FiUpload, FiFile, FiX } from "react-icons/fi";

import { parseExcelFile, validateExcelFile, ExcelRow } from "../utils/excelParser";

interface FileUploadProps {
  onFileLoaded: (rows: ExcelRow[], fileName: string) => void;
  disabled: boolean;
}

export default function FileUpload({ onFileLoaded, disabled }: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      const validationError = validateExcelFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }

      setLoading(true);
      try {
        const parsed = await parseExcelFile(file);
        setFileName(`${parsed.fileName} (${parsed.totalRows} rows)`);
        onFileLoaded(parsed.rows, parsed.fileName);
      } catch (err: any) {
        setError(err.message || "Lỗi đọc file");
      } finally {
        setLoading(false);
      }
    },
    [onFileLoaded]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      if (disabled) return;
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [disabled, handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const clearFile = useCallback(() => {
    setFileName(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  return (
    <div className="space-y-3">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !disabled && inputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${dragActive ? "border-sky-400 bg-sky-900/20" : "border-hairline hover:border-gray-300"}
          ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleChange}
          className="hidden"
          disabled={disabled}
        />

        {loading ? (
          <div className="flex items-center justify-center gap-3">
            <svg className="animate-spin h-6 w-6 text-sky-400" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-ink">Đang đọc file...</span>
          </div>
        ) : fileName ? (
          <div className="flex items-center justify-center gap-3">
            <FiFile className="text-green-400 text-xl" />
            <span className="text-green-400 font-medium">{fileName}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearFile();
              }}
              className="text-ink-soft hover:text-red-400 transition-colors"
            >
              <FiX />
            </button>
          </div>
        ) : (
          <div>
            <FiUpload className="mx-auto text-3xl text-ink-soft mb-3" />
            <p className="text-ink mb-1">
              Kéo thả file Excel vào đây hoặc{" "}
              <span className="text-sky-400 underline">chọn file</span>
            </p>
            <p className="text-ink-soft text-sm">
              Hỗ trợ .xlsx, .xls (tối đa 20MB)
            </p>
            <p className="text-ink-soft text-xs mt-2">
              Cột: No, Hotel Name, Address, URL Type (tùy chọn)
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-lg px-4 py-2">
          {error}
        </div>
      )}
    </div>
  );
}
