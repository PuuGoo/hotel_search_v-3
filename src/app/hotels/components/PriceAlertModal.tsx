"use client";

import axios from "axios";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { FiX, FiBell, FiLoader } from "react-icons/fi";

interface PriceAlertModalProps {
  hotelName: string;
  hotelUrl?: string;
  isOpen: boolean;
  onClose: () => void;
}

const PriceAlertModal: React.FC<PriceAlertModalProps> = ({
  hotelName,
  isOpen,
  onClose,
}) => {
  const [targetPrice, setTargetPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [existingAlert, setExistingAlert] = useState<any>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (isOpen && hotelName) {
      setTargetPrice("");
      setExistingAlert(null);
      setChecking(true);
      axios
        .get("/api/price-alerts")
        .then((res) => {
          const found = res.data.find(
            (a: any) => a.hotelName === hotelName
          );
          if (found) setExistingAlert(found);
        })
        .catch(() => {})
        .finally(() => setChecking(false));
    }
  }, [isOpen, hotelName]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(targetPrice);
    if (!Number.isFinite(price) || price <= 0) {
      toast.error("Vui lòng nhập giá hợp lệ");
      return;
    }

    setLoading(true);
    try {
      if (existingAlert) {
        await axios.put("/api/price-alerts", {
          id: existingAlert.id,
          targetPrice: price,
          isActive: true,
        });
        toast.success("Đã cập nhật cảnh báo giá");
      } else {
        await axios.post("/api/price-alerts", {
          hotelName,
          targetPrice: price,
        });
        toast.success("Đã tạo cảnh báo giá");
      }
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          <FiX className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-sky-500/20">
            <FiBell className="h-5 w-5 text-sky-400" />
          </div>
          <h2 className="text-lg font-semibold text-white">Theo dõi giá</h2>
        </div>

        <p className="text-sm text-gray-400 mb-4">
          Khách sạn: <span className="text-white">{hotelName}</span>
        </p>

        {checking ? (
          <div className="flex items-center justify-center py-8 text-gray-400">
            <FiLoader className="animate-spin h-5 w-5 mr-2" />
            Đang kiểm tra...
          </div>
        ) : existingAlert ? (
          <div className="space-y-4">
            <div className="bg-gray-700/50 rounded-lg p-4">
              <p className="text-sm text-gray-400">
                Đã có cảnh báo giá cho khách sạn này.
              </p>
              <p className="text-sm text-white mt-1">
                Giá mục tiêu hiện tại:{" "}
                <span className="text-sky-400 font-medium">
                  {existingAlert.targetPrice.toLocaleString("vi-VN")}₫
                </span>
              </p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Giá mục tiêu mới (₫)
                </label>
                <input
                  type="number"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  placeholder="Nhập giá mục tiêu"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-sky-500"
                  min="0"
                  step="1000"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-sky-500 text-white rounded-lg hover:bg-sky-600 disabled:opacity-50 transition-colors"
              >
                {loading ? "Đang cập nhật..." : "Cập nhật giá mục tiêu"}
              </button>
            </form>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Giá mục tiêu (₫)
              </label>
              <input
                type="number"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                placeholder="Nhập giá bạn muốn theo dõi"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-sky-500"
                min="0"
                step="1000"
                autoFocus
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-sky-500 text-white rounded-lg hover:bg-sky-600 disabled:opacity-50 transition-colors"
            >
              {loading ? "Đang lưu..." : "Theo dõi giá"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default PriceAlertModal;
