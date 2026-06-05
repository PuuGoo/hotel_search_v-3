"use client";

import axios from "axios";
import { format } from "date-fns";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useConfirm } from "../components/ConfirmDialog";
import {
  FiBell,
  FiBellOff,
  FiRefreshCw,
  FiTrash2,
  FiSearch,
} from "react-icons/fi";

interface PriceAlert {
  id: string;
  hotelName: string;
  targetPrice: number;
  currentPrice: number | null;
  isActive: boolean;
  lastChecked: string | null;
  createdAt: string;
}

const PriceAlertsPage = () => {
  const { confirm, DialogElement } = useConfirm();
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/price-alerts");
      setAlerts(res.data);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Không tải được danh sách cảnh báo");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleActive = useCallback(
    async (alert: PriceAlert) => {
      setBusyId(alert.id);
      try {
        await axios.put("/api/price-alerts", {
          id: alert.id,
          isActive: !alert.isActive,
        });
        setAlerts((prev) =>
          prev.map((a) =>
            a.id === alert.id ? { ...a, isActive: !a.isActive } : a
          )
        );
        toast.success(alert.isActive ? "Đã tạm dừng" : "Đã kích hoạt");
      } catch (error: any) {
        toast.error(error?.response?.data?.error || "Cập nhật thất bại");
      } finally {
        setBusyId(null);
      }
    },
    []
  );

  const remove = useCallback(
    async (alert: PriceAlert) => {
      if (!(await confirm({ message: "Xóa cảnh báo giá này?", title: "Xóa cảnh báo", confirmLabel: "Xóa", variant: "danger" }))) return;
      setBusyId(alert.id);
      try {
        await axios.delete(`/api/price-alerts?id=${alert.id}`);
        setAlerts((prev) => prev.filter((a) => a.id !== alert.id));
        toast.success("Đã xóa");
      } catch (error: any) {
        toast.error(error?.response?.data?.error || "Xóa thất bại");
      } finally {
        setBusyId(null);
      }
    },
    [confirm]
  );

  const getStatusBadge = (alert: PriceAlert) => {
    if (!alert.isActive) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-700 text-gray-300">
          <FiBellOff className="h-3 w-3" />
          Tạm dừng
        </span>
      );
    }
    if (
      alert.currentPrice !== null &&
      alert.currentPrice <= alert.targetPrice
    ) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-sky-500/20 text-sky-400">
          <FiBell className="h-3 w-3" />
          Đã đạt mục tiêu
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
        <FiBell className="h-3 w-3" />
        Đang theo dõi
      </span>
    );
  };

  return (
    <div className="h-full overflow-y-auto bg-gray-900">
      {DialogElement}
      <div className="max-w-5xl mx-auto px-4 py-8">
        <header className="mb-6 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-sky-500/20 text-sky-400">
            <FiBell className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Cảnh báo giá</h1>
            <p className="text-sm text-gray-400">
              {loading
                ? "Đang tải..."
                : `${alerts.length} cảnh báo`}
            </p>
          </div>
        </header>

        {loading ? (
          <p className="text-gray-400 py-12 text-center">Đang tải...</p>
        ) : alerts.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <FiBell className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg">Chưa có cảnh báo giá nào</p>
            <p className="text-sm mt-2">
              Tạo cảnh báo từ trang{" "}
              <Link href="/hotels" className="text-sky-400 underline">
                Tìm kiếm
              </Link>{" "}
              để theo dõi giá khách sạn.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">
                    Tên khách sạn
                  </th>
                  <th className="text-right py-3 px-4 text-gray-400 font-medium">
                    Giá mục tiêu
                  </th>
                  <th className="text-right py-3 px-4 text-gray-400 font-medium">
                    Giá hiện tại
                  </th>
                  <th className="text-center py-3 px-4 text-gray-400 font-medium">
                    Trạng thái
                  </th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">
                    Ngày tạo
                  </th>
                  <th className="text-center py-3 px-4 text-gray-400 font-medium">
                    Hành động
                  </th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((alert) => (
                  <tr
                    key={alert.id}
                    className="border-b border-gray-800 hover:bg-gray-800/50"
                  >
                    <td className="py-3 px-4">
                      <span className="text-white font-medium">
                        {alert.hotelName}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-sky-400 font-medium">
                        {alert.targetPrice.toLocaleString("vi-VN")}₫
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-gray-300">
                        {alert.currentPrice !== null
                          ? `${alert.currentPrice.toLocaleString("vi-VN")}₫`
                          : "—"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {getStatusBadge(alert)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-gray-400 text-xs">
                        {format(new Date(alert.createdAt), "dd/MM/yyyy")}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          disabled={busyId === alert.id}
                          onClick={() => toggleActive(alert)}
                          className={`p-1.5 rounded transition-colors disabled:opacity-50 ${
                            alert.isActive
                              ? "text-gray-400 hover:text-yellow-400"
                              : "text-gray-400 hover:text-green-400"
                          }`}
                          title={alert.isActive ? "Tạm dừng" : "Kích hoạt"}
                        >
                          {alert.isActive ? (
                            <FiBellOff className="h-4 w-4" />
                          ) : (
                            <FiBell className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          disabled={busyId === alert.id}
                          onClick={() => remove(alert)}
                          className="p-1.5 text-gray-400 hover:text-rose-400 transition-colors disabled:opacity-50"
                          title="Xóa"
                        >
                          <FiTrash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PriceAlertsPage;
