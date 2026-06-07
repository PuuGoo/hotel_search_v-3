"use client";

import axios from "axios";
import { useEffect, useState, Fragment } from "react";
import { toast } from "react-hot-toast";
import { FiX, FiBell, FiLoader } from "react-icons/fi";
import { Dialog, Transition } from "@headlessui/react";
import { safeHref } from "../../libs/safeUrl";

interface PriceAlertModalProps {
  hotelName: string;
  hotelUrl?: string;
  isOpen: boolean;
  onClose: () => void;
}

interface AlertData {
  id: string;
  hotelName: string;
  hotelUrl?: string;
  targetPrice: number;
  currentPrice: number | null;
  isActive: boolean;
  lastChecked: string | null;
  createdAt: string;
}

const PriceAlertModal: React.FC<PriceAlertModalProps> = ({
  hotelName,
  hotelUrl,
  isOpen,
  onClose,
}) => {
  const [targetPrice, setTargetPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [existingAlert, setExistingAlert] = useState<AlertData | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (isOpen && hotelName) {
      setTargetPrice("");
      setExistingAlert(null);
      setChecking(true);
      const controller = new AbortController();
      axios
        .get("/api/price-alerts", { params: { hotelName, hotelUrl }, signal: controller.signal })
        .then((res) => {
          const found = res.data.find(
            (a: AlertData) =>
              a.hotelName === hotelName &&
              (!hotelUrl || !a.hotelUrl || a.hotelUrl === hotelUrl)
          );
          if (found) setExistingAlert(found);
        })
        .catch(() => {})
        .finally(() => setChecking(false));
      return () => controller.abort();
    }
  }, [isOpen, hotelName, hotelUrl]);

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
          hotelUrl: hotelUrl || undefined,
          targetPrice: price,
        });
        toast.success("Đã tạo cảnh báo giá");
      }
      onClose();
    } catch (error: unknown) {
      const axiosErr = error as { response?: { data?: { error?: string } } };
      toast.error(axiosErr.response?.data?.error || "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform rounded-xl bg-panel p-6 shadow-xl transition-all">
                <Dialog.Title as="div" className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-lg bg-sky-500/20">
                    <FiBell className="h-5 w-5 text-sky-400" />
                  </div>
                  <h2 className="text-lg font-semibold text-ink">Theo dõi giá</h2>
                  <button
                    onClick={onClose}
                    className="ml-auto text-ink-soft hover:text-ink"
                    aria-label="Đóng"
                  >
                    <FiX className="h-5 w-5" />
                  </button>
                </Dialog.Title>

                <p className="text-sm text-ink-soft mb-4">
                  Khách sạn: <span className="text-ink">{hotelName}</span>
                  {hotelUrl && (
                    <span className="block text-xs text-sky-400 truncate mt-0.5">
                      {safeHref(hotelUrl) ? (
                        <a
                          href={safeHref(hotelUrl)!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline"
                        >
                          {hotelUrl}
                        </a>
                      ) : (
                        hotelUrl
                      )}
                    </span>
                  )}
                </p>

                {checking ? (
                  <div className="flex items-center justify-center py-8 text-ink-soft">
                    <FiLoader className="animate-spin h-5 w-5 mr-2" />
                    Đang kiểm tra...
                  </div>
                ) : existingAlert ? (
                  <div className="space-y-4">
                    <div className="bg-fill/50 rounded-lg p-4">
                      <p className="text-sm text-ink-soft">
                        Đã có cảnh báo giá cho khách sạn này.
                      </p>
                      <p className="text-sm text-ink mt-1">
                        Giá mục tiêu hiện tại:{" "}
                        <span className="text-sky-400 font-medium">
                          {existingAlert.targetPrice.toLocaleString("vi-VN")}₫
                        </span>
                      </p>
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <label htmlFor="update-target-price" className="block text-sm font-medium text-ink mb-1">
                          Giá mục tiêu mới (₫)
                        </label>
                        <input
                          id="update-target-price"
                          type="number"
                          inputMode="numeric"
                          value={targetPrice}
                          onChange={(e) => setTargetPrice(e.target.value)}
                          placeholder="Nhập giá mục tiêu"
                          className="w-full px-3 py-2 bg-fill border border-hairline rounded-lg text-ink placeholder-ink-soft focus:outline-none focus:border-sky-500"
                          min="0"
                          step="1000"
                          aria-describedby="update-price-hint"
                          required
                        />
                        <p id="update-price-hint" className="text-xs text-ink-soft mt-1">Nhập giá bằng VNĐ, ví dụ: 1000000</p>
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
                      <label htmlFor="new-target-price" className="block text-sm font-medium text-ink mb-1">
                        Giá mục tiêu (₫)
                      </label>
                      <input
                        id="new-target-price"
                        type="number"
                        inputMode="numeric"
                        value={targetPrice}
                        onChange={(e) => setTargetPrice(e.target.value)}
                        placeholder="Nhập giá bạn muốn theo dõi"
                        className="w-full px-3 py-2 bg-fill border border-hairline rounded-lg text-ink placeholder-ink-soft focus:outline-none focus:border-sky-500"
                        min="0"
                        step="1000"
                        aria-describedby="new-price-hint"
                        autoFocus
                        required
                      />
                      <p id="new-price-hint" className="text-xs text-ink-soft mt-1">Nhập giá bằng VNĐ, ví dụ: 1000000</p>
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
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default PriceAlertModal;
