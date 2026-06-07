"use client";

import { useState } from "react";
import { FiGlobe, FiCheckCircle, FiXCircle, FiCopy, FiRefreshCw } from "react-icons/fi";

export default function CDNAdminPage() {
  const [testUrl, setTestUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const cdnUrl = process.env.NEXT_PUBLIC_CDN_BASE_URL || "";
  const isConfigured = cdnUrl.length > 0;

  const exampleEnv = `# Thêm vào file .env:\nCDN_BASE_URL=https://cdn.example.com`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getTestResult = () => {
    if (!testUrl) return null;
    const base = cdnUrl.replace(/\/+$/, "");
    if (!base) return testUrl;
    const cleanPath = testUrl.startsWith("/") ? testUrl : `/${testUrl}`;
    return `${base}${cleanPath}`;
  };

  return (
    <div className="space-y-6">
      <div className="bg-panel rounded-xl p-6 border border-hairline">
        <div className="flex items-center gap-3 mb-4">
          <FiGlobe className="w-6 h-6 text-sky-400" />
          <h2 className="text-xl font-semibold text-ink">Cấu hình CDN</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-canvas rounded-lg">
            <div>
              <p className="text-sm text-ink-soft">Trạng thái</p>
              <div className="flex items-center gap-2 mt-1">
                {isConfigured ? (
                  <FiCheckCircle className="w-5 h-5 text-green-400" />
                ) : (
                  <FiXCircle className="w-5 h-5 text-red-400" />
                )}
                <span className={`font-medium ${isConfigured ? "text-green-400" : "text-red-400"}`}>
                  {isConfigured ? "Đã kích hoạt" : "Chưa kích hoạt"}
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-canvas rounded-lg">
            <p className="text-sm text-ink-soft mb-1">URL cơ sở</p>
            <p className="text-ink font-mono">
              {cdnUrl || "Chưa cấu hình"}
            </p>
          </div>

          <div className="p-4 bg-canvas rounded-lg">
            <p className="text-sm text-ink-soft mb-1">Hỗ trợ CDN</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {["Cloudflare", "AWS CloudFront", "Fastly", "Bunny CDN", "Any Reverse Proxy"].map((name) => (
                <span key={name} className="px-3 py-1 bg-panel text-ink text-sm rounded-full border border-hairline">
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-panel rounded-xl p-6 border border-hairline">
        <h3 className="text-lg font-semibold text-ink mb-4">Kiểm tra URL CDN</h3>
        <div className="flex gap-3">
          <input
            type="text"
            value={testUrl}
            onChange={(e) => setTestUrl(e.target.value)}
            placeholder="/api/drive/file/example.jpg"
            className="flex-1 bg-canvas border border-hairline rounded-lg px-4 py-2 text-ink placeholder-ink-soft focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
          <button
            onClick={() => setTestUrl("/api/drive/file/test.jpg")}
            className="flex items-center gap-2 px-4 py-2 bg-fill hover:bg-hairline text-ink rounded-lg transition-colors"
          >
            <FiRefreshCw className="w-4 h-4" />
            Mẫu
          </button>
        </div>
        {getTestResult() && (
          <div className="mt-3 p-3 bg-canvas rounded-lg flex items-center justify-between">
            <code className="text-sky-400 text-sm break-all">{getTestResult()}</code>
            <button
              onClick={() => copyToClipboard(getTestResult()!)}
              className="ml-3 p-2 hover:bg-panel rounded-lg transition-colors shrink-0"
            >
              <FiCopy className="w-4 h-4 text-ink-soft" />
            </button>
          </div>
        )}
        {copied && (
          <p className="text-green-400 text-sm mt-2">Đã sao chép!</p>
        )}
      </div>

      <div className="bg-panel rounded-xl p-6 border border-hairline">
        <h3 className="text-lg font-semibold text-ink mb-4">Hướng dẫn thiết lập</h3>
        <div className="space-y-4 text-sm text-ink">
          <div className="p-4 bg-canvas rounded-lg">
            <p className="font-medium text-ink mb-2">Bước 1: Cấu hình biến môi trường</p>
            <p>Thêm biến <code className="text-sky-400">CDN_BASE_URL</code> vào file .env:</p>
            <div className="mt-2 p-3 bg-panel rounded-lg relative">
              <pre className="text-sm text-ink">{exampleEnv}</pre>
              <button
                onClick={() => copyToClipboard(exampleEnv)}
                className="absolute top-2 right-2 p-1 hover:bg-fill rounded transition-colors"
              >
                <FiCopy className="w-4 h-4 text-ink-soft" />
              </button>
            </div>
          </div>
          <div className="p-4 bg-canvas rounded-lg">
            <p className="font-medium text-ink mb-2">Bước 2: Thiết lập CDN origin</p>
            <p>CDN của bạn cần trỏ về URL gốc của ứng dụng (ví dụ: <code className="text-sky-400">https://your-app.vercel.app</code>)</p>
          </div>
          <div className="p-4 bg-canvas rounded-lg">
            <p className="font-medium text-ink mb-2">Bước 3: Cấu hình cache</p>
            <p>Đặt thời gian cache tĩnh thành <code className="text-sky-400">max-age=31536000, immutable</code> cho các file tĩnh</p>
          </div>
          <div className="p-4 bg-canvas rounded-lg">
            <p className="font-medium text-ink mb-2">Bước 4: Kiểm tra</p>
            <p>Sử dụng công cụ kiểm tra URL ở trên để xác minh cấu hình CDN hoạt động đúng</p>
          </div>
        </div>
      </div>

      <div className="bg-panel rounded-xl p-6 border border-hairline">
        <h3 className="text-lg font-semibold text-ink mb-4">Tính năng CDN</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { title: "Tối ưu hình ảnh", desc: "Tự động chuyển đổi URL hình ảnh qua CDN" },
            { title: "Cache tĩnh", desc: "Cache files bất biến trong 1 năm" },
            { title: "ETag", desc: "Hỗ trợ request có điều kiện để tiết kiệm băng thông" },
            { title: "CORS", desc: "Hỗ trợ truy cập cross-origin cho CDN" },
          ].map((feature) => (
            <div key={feature.title} className="p-4 bg-canvas rounded-lg">
              <p className="font-medium text-ink">{feature.title}</p>
              <p className="text-sm text-ink-soft mt-1">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
