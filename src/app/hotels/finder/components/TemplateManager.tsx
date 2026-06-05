"use client";

import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import {
  FiCheck,
  FiChevronDown,
  FiEdit2,
  FiPlus,
  FiSave,
  FiSettings,
  FiStar,
  FiTrash2,
  FiX,
} from "react-icons/fi";

interface FinderTemplate {
  id: string;
  name: string;
  workers: number;
  template: string;
  autoSaveEnabled: boolean;
  autoSaveLines: number;
  autoSaveFolder: string;
  isDefault: boolean;
  createdAt: string;
}

interface TemplateManagerProps {
  workers: number;
  template: string;
  autoSaveEnabled: boolean;
  autoSaveLines: number;
  autoSaveFolder: string;
  isRunning: boolean;
  saveTrigger?: number;
  onApply: (tpl: {
    workers: number;
    template: string;
    autoSaveEnabled: boolean;
    autoSaveLines: number;
    autoSaveFolder: string;
  }) => void;
}

export default function TemplateManager({
  workers,
  template,
  autoSaveEnabled,
  autoSaveLines,
  autoSaveFolder,
  isRunning,
  saveTrigger,
  onApply,
}: TemplateManagerProps) {
  const [templates, setTemplates] = useState<FinderTemplate[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [showManager, setShowManager] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await axios.get("/api/finder/templates");
      setTemplates(res.data);
    } catch {
      toast.error("Không thể tải danh sách mẫu");
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  useEffect(() => {
    if (saveTrigger && saveTrigger > 0) {
      setShowSaveDialog(true);
    }
  }, [saveTrigger]);

  const handleSelect = useCallback(
    (tpl: FinderTemplate) => {
      setSelectedId(tpl.id);
      setShowDropdown(false);
      onApply({
        workers: tpl.workers,
        template: tpl.template,
        autoSaveEnabled: tpl.autoSaveEnabled,
        autoSaveLines: tpl.autoSaveLines,
        autoSaveFolder: tpl.autoSaveFolder,
      });
      toast.success(`Đã áp dụng mẫu "${tpl.name}"`);
    },
    [onApply]
  );

  const handleSave = useCallback(async () => {
    if (!newName.trim()) {
      toast.error("Vui lòng nhập tên mẫu");
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post("/api/finder/templates", {
        name: newName.trim(),
        workers,
        template,
        autoSaveEnabled,
        autoSaveLines,
        autoSaveFolder,
      });
      setTemplates((prev) => [res.data, ...prev]);
      setSelectedId(res.data.id);
      setShowSaveDialog(false);
      setNewName("");
      toast.success("Đã lưu mẫu thành công");
    } catch {
      toast.error("Không thể lưu mẫu");
    } finally {
      setLoading(false);
    }
  }, [newName, workers, template, autoSaveEnabled, autoSaveLines, autoSaveFolder]);

  const handleRename = useCallback(async (id: string) => {
    if (!editName.trim()) return;
    try {
      const res = await axios.put("/api/finder/templates", { id, name: editName.trim() });
      setTemplates((prev) =>
        prev.map((t) => (t.id === id ? { ...t, name: res.data.name } : t))
      );
      setEditingId(null);
      setEditName("");
      toast.success("Đã đổi tên");
    } catch {
      toast.error("Không thể đổi tên");
    }
  }, [editName]);

  const handleSetDefault = useCallback(async (id: string) => {
    try {
      await axios.put("/api/finder/templates", { id, isDefault: true });
      setTemplates((prev) =>
        prev.map((t) => ({ ...t, isDefault: t.id === id }))
      );
      toast.success("Đã đặt làm mặc định");
    } catch {
      toast.error("Không thể đặt mặc định");
    }
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      const tpl = templates.find((t) => t.id === id);
      if (tpl?.isDefault) {
        toast.error("Không thể xóa mẫu mặc định");
        return;
      }
      try {
        await axios.delete(`/api/finder/templates?id=${id}`);
        setTemplates((prev) => prev.filter((t) => t.id !== id));
        if (selectedId === id) setSelectedId("");
        toast.success("Đã xóa mẫu");
      } catch {
        toast.error("Không thể xóa mẫu");
      }
    },
    [templates, selectedId]
  );

  const selectedTemplate = templates.find((t) => t.id === selectedId);

  return (
    <>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <button
            type="button"
            onClick={() => setShowDropdown(!showDropdown)}
            disabled={isRunning}
            className="w-full flex items-center justify-between px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm disabled:opacity-50"
          >
            <span className="truncate">
              {selectedTemplate ? selectedTemplate.name : "Chọn mẫu..."}
            </span>
            <FiChevronDown size={14} className="ml-2 shrink-0" />
          </button>
          {showDropdown && (
            <div className="absolute z-50 top-full mt-1 w-full bg-gray-700 border border-gray-600 rounded-lg shadow-xl max-h-48 overflow-y-auto">
              {templates.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-400">
                  Chưa có mẫu nào
                </div>
              ) : (
                templates.map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => handleSelect(tpl)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-200 hover:bg-gray-600 transition-colors"
                  >
                    <FiStar
                      size={12}
                      className={tpl.isDefault ? "text-yellow-400 fill-yellow-400" : "text-gray-500"}
                    />
                    <span className="truncate">{tpl.name}</span>
                    {tpl.id === selectedId && (
                      <FiCheck size={14} className="ml-auto text-sky-400" />
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <button
          onClick={() => setShowSaveDialog(true)}
          disabled={isRunning}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
          title="Lưu cấu hình hiện tại"
        >
          <FiSave size={14} />
          Lưu mẫu
        </button>

        <button
          onClick={() => setShowManager(true)}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          title="Quản lý mẫu"
        >
          <FiSettings size={14} />
          Quản lý mẫu
        </button>
      </div>

      {showDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowDropdown(false)}
        />
      )}

      {showSaveDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Lưu mẫu cấu hình</h3>
              <button
                onClick={() => { setShowSaveDialog(false); setNewName(""); }}
                className="text-gray-400 hover:text-white"
              >
                <FiX size={20} />
              </button>
            </div>
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-1">Tên mẫu</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="VD: Cấu hình nhanh"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500"
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
              />
            </div>
            <div className="mb-4 text-xs text-gray-400 bg-gray-700/50 rounded-lg p-3">
              <div>Số luồng: {workers}</div>
              <div>Mẫu xuất: {template}</div>
              <div>Tự động lưu: {autoSaveEnabled ? "Bật" : "Tắt"}</div>
              {autoSaveEnabled && (
                <>
                  <div>Số dòng: {autoSaveLines}</div>
                  <div>Thư mục: {autoSaveFolder}</div>
                </>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setShowSaveDialog(false); setNewName(""); }}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleSave}
                disabled={loading || !newName.trim()}
                className="px-4 py-2 text-sm bg-sky-600 hover:bg-sky-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? "Đang lưu..." : "Lưu"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-gray-800 border border-gray-700 rounded-xl w-full max-w-lg shadow-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-6 pb-4">
              <h3 className="text-lg font-semibold text-white">Quản lý mẫu</h3>
              <button
                onClick={() => setShowManager(false)}
                className="text-gray-400 hover:text-white"
              >
                <FiX size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 pb-6">
              {templates.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  Chưa có mẫu nào. Hãy lưu cấu hình hiện tại làm mẫu.
                </div>
              ) : (
                <div className="space-y-2">
                  {templates.map((tpl) => (
                    <div
                      key={tpl.id}
                      className="flex items-center gap-3 bg-gray-700/50 rounded-lg p-3"
                    >
                      <FiStar
                        size={14}
                        className={tpl.isDefault ? "text-yellow-400 fill-yellow-400" : "text-gray-500 shrink-0"}
                      />
                      <div className="flex-1 min-w-0">
                        {editingId === tpl.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="flex-1 px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleRename(tpl.id);
                                if (e.key === "Escape") setEditingId(null);
                              }}
                            />
                            <button
                              onClick={() => handleRename(tpl.id)}
                              className="text-green-400 hover:text-green-300"
                            >
                              <FiCheck size={14} />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="text-gray-400 hover:text-white"
                            >
                              <FiX size={14} />
                            </button>
                          </div>
                        ) : (
                          <div className="truncate text-sm text-white">{tpl.name}</div>
                        )}
                        <div className="text-xs text-gray-400 mt-0.5">
                          {tpl.workers} luồng · {tpl.template} · Tự động lưu: {tpl.autoSaveEnabled ? "Bật" : "Tắt"}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {!tpl.isDefault && (
                          <button
                            onClick={() => handleSetDefault(tpl.id)}
                            className="p-1.5 text-gray-400 hover:text-yellow-400 transition-colors"
                            title="Đặt làm mặc định"
                          >
                            <FiStar size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setEditingId(tpl.id);
                            setEditName(tpl.name);
                          }}
                          className="p-1.5 text-gray-400 hover:text-sky-400 transition-colors"
                          title="Đổi tên"
                        >
                          <FiEdit2 size={14} />
                        </button>
                        {!tpl.isDefault && (
                          <button
                            onClick={() => handleDelete(tpl.id)}
                            className="p-1.5 text-gray-400 hover:text-red-400 transition-colors"
                            title="Xóa mẫu"
                          >
                            <FiTrash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
