"use client";

import { useCallback, useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";

import type { AutoSaveSettings, FinderRow } from "./useFinderSession";

export function useFinderAutoSave(
  autoSaveSettings: AutoSaveSettings,
  lastAutoSaveRef: React.MutableRefObject<number>
) {
  const autoSaveRef = useRef<{ fileId?: string; fileName?: string }>({});
  const [autoSaveCount, setAutoSaveCount] = useState(0);

  const autoSaveToDrive = useCallback(
    async (rowsToSave: FinderRow[]) => {
      if (!autoSaveSettings.enabled || rowsToSave.length === 0) return;

      try {
        const XLSX = await import("xlsx");

        const displayName = `finder-auto-results.xlsx`;

        const wsData = rowsToSave.map((r, idx) => ({
          "#": idx + 1,
          No: r.no,
          "Hotel Name": r.hotel_name,
          Address: r.hotel_address,
          Status: r.status,
          URL: r.url || "",
          Score: r.score || 0,
          Images: r.img_count || 0,
          Explanation: r.explanation || "",
        }));

        const ws = XLSX.utils.json_to_sheet(wsData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Results");

        const xlsxBuffer = XLSX.write(wb, { type: "array", bookType: "xlsx" });
        const blob = new Blob([xlsxBuffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });

        const formData = new FormData();
        const fileObj = new File([blob], displayName, {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        formData.append("file", fileObj);

        const uploadRes = await axios.post("/api/messages/upload", formData);
        const { fileUrl } = uploadRes.data;

        const serverName = fileUrl.split("/").pop() || displayName;

        if (autoSaveRef.current.fileId) {
          try {
            await axios.delete(`/api/drive/${autoSaveRef.current.fileId}`);
          } catch (err) {
            console.warn('[FinderAutoSave] Failed to delete previous auto-save file:', err);
          }
        }

        const driveRes = await axios.post("/api/drive", {
          fileName: serverName,
          originalName: displayName,
          filePath: fileUrl,
          fileSize: blob.size,
          mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          folder: autoSaveSettings.folder,
        });

        if (driveRes.data?.id) {
          autoSaveRef.current = { fileId: driveRes.data.id, fileName: displayName };
        }

        setAutoSaveCount((prev) => prev + 1);
        toast.success(`Đã tự động lưu ${rowsToSave.length} dòng vào Drive (XLSX)`);
      } catch (err) {
        console.error("Auto-save error:", err);
      }
    },
    [autoSaveSettings, lastAutoSaveRef]
  );

  const resetAutoSave = useCallback(() => {
    setAutoSaveCount(0);
    lastAutoSaveRef.current = 0;
    autoSaveRef.current = {};
  }, [lastAutoSaveRef]);

  return {
    autoSaveToDrive,
    autoSaveCount,
    autoSaveRef,
    resetAutoSave,
  };
}
