"use client";

import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import {
  FiCalendar,
  FiCheck,
  FiClock,
  FiPlay,
  FiPlus,
  FiPower,
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
}

interface ScheduledJob {
  id: string;
  name: string;
  templateId: string | null;
  template: FinderTemplate | null;
  cronExpression: string;
  isActive: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  createdAt: string;
}

interface ScheduleManagerProps {
  onRunNow?: (job: ScheduledJob) => void;
}

const CRON_PRESETS = [
  { label: "Hàng ngày lúc 8h", value: "0 8 * * *" },
  { label: "Hàng tuần thứ 2", value: "0 8 * * 1" },
  { label: "Hàng tháng ngày 1", value: "0 8 1 * *" },
  { label: "Tùy chỉnh", value: "custom" },
];

function describeCron(cron: string): string {
  const parts = cron.split(/\s+/);
  if (parts.length < 5) return cron;
  const [min, hour, dom, , dow] = parts;

  if (dom === "*" && dow === "*") {
    if (hour === "*" && min === "*") return "Mỗi phút";
    if (min === "0" && hour !== "*") return `Hàng ngày lúc ${hour}h`;
    return `Hàng ngày lúc ${hour}:${min.padStart(2, "0")}`;
  }
  if (dom === "*" && dow !== "*") {
    const days = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
    const dayName = days[parseInt(dow, 10)] || `T${dow}`;
    return `Hàng tuần ${dayName} lúc ${hour}:${min.padStart(2, "0")}`;
  }
  if (dom !== "*" && dow === "*") {
    return `Hàng tháng ngày ${dom} lúc ${hour}:${min.padStart(2, "0")}`;
  }
  return cron;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Chưa chạy";
  const d = new Date(dateStr);
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ScheduleManager({ onRunNow }: ScheduleManagerProps) {
  const [jobs, setJobs] = useState<ScheduledJob[]>([]);
  const [templates, setTemplates] = useState<FinderTemplate[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newTemplateId, setNewTemplateId] = useState("");
  const [cronPreset, setCronPreset] = useState("0 8 * * *");
  const [customCron, setCustomCron] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [jobsRes, templatesRes] = await Promise.all([
        axios.get("/api/finder/scheduled"),
        axios.get("/api/finder/templates"),
      ]);
      setJobs(jobsRes.data);
      setTemplates(templatesRes.data);
    } catch {
      toast.error("Không thể tải dữ liệu");
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreate = useCallback(async () => {
    if (!newName.trim()) {
      toast.error("Vui lòng nhập tên lịch");
      return;
    }
    const cron = cronPreset === "custom" ? customCron.trim() : cronPreset;
    if (!cron) {
      toast.error("Vui lòng chọn lịch trình");
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post("/api/finder/scheduled", {
        name: newName.trim(),
        templateId: newTemplateId || null,
        cronExpression: cron,
      });
      setJobs((prev) => [res.data, ...prev]);
      setShowForm(false);
      setNewName("");
      setNewTemplateId("");
      setCronPreset("0 8 * * *");
      setCustomCron("");
      toast.success("Đã tạo lịch chạy tự động");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Không thể tạo lịch");
    } finally {
      setLoading(false);
    }
  }, [newName, newTemplateId, cronPreset, customCron]);

  const handleToggle = useCallback(async (job: ScheduledJob) => {
    try {
      const res = await axios.put("/api/finder/scheduled", {
        id: job.id,
        isActive: !job.isActive,
      });
      setJobs((prev) => prev.map((j) => (j.id === job.id ? res.data : j)));
      toast.success(job.isActive ? "Đã tạm dừng" : "Đã kích hoạt");
    } catch {
      toast.error("Không thể cập nhật");
    }
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await axios.delete(`/api/finder/scheduled?id=${id}`);
      setJobs((prev) => prev.filter((j) => j.id !== id));
      toast.success("Đã xóa lịch");
    } catch {
      toast.error("Không thể xóa lịch");
    }
  }, []);

  const handleRunNow = useCallback(
    (job: ScheduledJob) => {
      if (onRunNow) {
        onRunNow(job);
      }
      toast.success(`Đang chạy "${job.name}"...`);
    },
    [onRunNow]
  );

  const selectedCron = cronPreset === "custom" ? customCron : cronPreset;

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-ink flex items-center gap-2">
          <FiCalendar className="text-sky-400" />
          Lịch chạy tự động
        </h3>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-ink hover:text-ink bg-fill hover:bg-hairline rounded-lg transition-colors"
        >
          <FiPlus size={14} />
          Tạo lịch mới
        </button>
      </div>

      {jobs.length === 0 && !showForm && (
        <p className="text-xs text-ink-soft text-center py-4">
          Chưa có lịch chạy tự động nào
        </p>
      )}

      {jobs.length > 0 && (
        <div className="space-y-2">
          {jobs.map((job) => (
            <div
              key={job.id}
              className={`flex items-center gap-3 rounded-lg p-3 transition-colors ${
                job.isActive
                  ? "bg-fill/50"
                  : "bg-fill/20 opacity-60"
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full shrink-0 ${
                  job.isActive ? "bg-green-400" : "bg-gray-500"
                }`}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-ink truncate">{job.name}</span>
                  {job.template && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-sky-900/50 text-sky-400 rounded shrink-0">
                      {job.template.name}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-[11px] text-ink-soft">
                  <span className="flex items-center gap-1">
                    <FiClock size={10} />
                    {describeCron(job.cronExpression)}
                  </span>
                  <span>Lần chạy: {formatDate(job.lastRunAt)}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleRunNow(job)}
                  className="p-1.5 text-ink-soft hover:text-green-400 transition-colors"
                  title="Chạy ngay"
                >
                  <FiPlay size={14} />
                </button>
                <button
                  onClick={() => handleToggle(job)}
                  className={`p-1.5 transition-colors ${
                    job.isActive
                      ? "text-ink-soft hover:text-yellow-400"
                      : "text-ink-soft hover:text-green-400"
                  }`}
                  title={job.isActive ? "Tạm dừng" : "Kích hoạt"}
                >
                  <FiPower size={14} />
                </button>
                <button
                  onClick={() => handleDelete(job.id)}
                  className="p-1.5 text-ink-soft hover:text-red-400 transition-colors"
                  title="Xóa"
                >
                  <FiTrash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="mt-3 p-4 bg-fill/30 rounded-lg border border-hairline">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-ink">Tạo lịch mới</span>
            <button
              onClick={() => {
                setShowForm(false);
                setNewName("");
                setNewTemplateId("");
                setCronPreset("0 8 * * *");
                setCustomCron("");
              }}
              className="text-ink-soft hover:text-ink"
            >
              <FiX size={16} />
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs text-ink-soft mb-1">Tên lịch</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="VD: Tìm URL hàng tuần"
                className="w-full px-3 py-2 bg-fill border border-gray-300 rounded-lg text-ink text-sm placeholder-ink-soft"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs text-ink-soft mb-1">Mẫu cấu hình</label>
              <select
                value={newTemplateId}
                onChange={(e) => setNewTemplateId(e.target.value)}
                className="w-full px-3 py-2 bg-fill border border-gray-300 rounded-lg text-ink text-sm"
              >
                <option value="">Không dùng mẫu</option>
                {templates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-ink-soft mb-1">Lịch trình</label>
              <div className="grid grid-cols-2 gap-2 mb-2">
                {CRON_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => setCronPreset(preset.value)}
                    className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                      cronPreset === preset.value
                        ? "bg-sky-600 border-sky-500 text-white"
                        : "bg-fill border-gray-300 text-ink hover:bg-gray-500"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              {cronPreset === "custom" && (
                <input
                  type="text"
                  value={customCron}
                  onChange={(e) => setCustomCron(e.target.value)}
                  placeholder="VD: 0 8 * * 1-5"
                  className="w-full px-3 py-2 bg-fill border border-gray-300 rounded-lg text-ink text-sm placeholder-ink-soft font-mono text-xs"
                />
              )}
              {selectedCron && (
                <p className="text-[11px] text-ink-soft mt-1">
                  Cron: <code className="text-sky-400">{selectedCron}</code>
                  {" → "}
                  {describeCron(selectedCron)}
                </p>
              )}
            </div>

            <button
              onClick={handleCreate}
              disabled={loading || !newName.trim()}
              className="w-full px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Đang tạo..." : "Tạo lịch"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
