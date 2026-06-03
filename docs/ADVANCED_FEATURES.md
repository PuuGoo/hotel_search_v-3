# Kế hoạch Nâng cao Dự án Hotel Search

## Trạng thái hiện tại

Dự án đã hoàn thành các tính năng cơ bản:
- Chat 1:1 và nhóm với tin nhắn văn bản + ảnh
- Tìm kiếm khách sạn (Tavily, Google, DuckDuckGo)
- Bulk search từ file Excel
- URL Finder (Playwright + DuckDuckGo)
- Drive storage cho file đính kèm chat
- Auto-save cho URL Finder

---

## Tính năng Nâng cao Đề xuất

### 1. Chat Nâng cao

#### 1.1 Typing Indicator
- **Mô tả**: Hiển thị "Đang nhập..." khi đối phương đang gõ tin nhắn
- **Triển khai**: Pusher event `typing` trên conversation channel
- **Ưu tiên**: Cao

#### 1.2 Message Reactions
- **Mô tả**: Cho phép thả reaction (emoji) lên tin nhắn
- **Triển khai**: Thêm trường `reactions` vào Message model, Pusher event update
- **Ưu tiên**: Trung bình

#### 1.3 Message Reply
- **Mô tả**: Trả lời tin nhắn cụ thể (quote reply)
- **Triển khai**: Thêm trường `replyToId` vào Message model
- **Ưu tiên**: Cao

#### 1.4 Voice Messages
- **Mô tả**: Ghi và gửi tin nhắn thoại
- **Triển khai**: Web Audio API + Cloudinary upload
- **Ưu tiên**: Thấp

#### 1.5 Message Search
- **Mô tả**: Tìm kiếm tin nhắn trong cuộc trò chuyện
- **Triển khai**: MongoDB text index trên Message.body
- **Ưu tiên**: Trung bình

---

### 2. Drive Storage Nâng cao

#### 2.1 Drive File Manager UI
- **Mô tả**: Trang `/drive` với giao diện quản lý file (grid/list view, sort, filter)
- **Triển khai**: Component DriveManager với sidebar folder tree
- **Ưu tiên**: Cao

#### 2.2 Folder Management
- **Mô tả**: Tạo/sửa/xóa thư mục, di chuyển file giữa thư mục
- **Triển khai**: API CRUD cho folders, drag-and-drop UI
- **Ưu tiên**: Cao

#### 2.3 File Preview
- **Mô tả**: Xem trước file trong trình duyệt (PDF, ảnh, video, Excel)
- **Triển khai**: File viewer component với modal
- **Ưu tiên**: Trung bình

#### 2.4 File Sharing
- **Mô tả**: Chia sẻ file giữa các user qua link hoặc trực tiếp
- **Triển khai**: ShareLink model, permission system
- **Ưu tiên**: Trung bình

#### 2.5 Storage Quota
- **Mô tả**: Giới hạn dung lượng storage per user
- **Triển khai**: Theo dõi dung lượng trong DriveFile model
- **Ưu tiên**: Thấp

#### 2.6 File Versioning
- **Mô tả**: Lưu phiên bản cũ khi upload file trùng tên
- **Triển khai**: Version field trong DriveFile, backup directory
- **Ưu tiên**: Thấp

---

### 3. URL Finder Nâng cao

#### 3.1 Bulk Auto-save với Multiple Formats
- **Mô tả**: Auto-save hỗ trợ nhiều định dạng (JSON, CSV, XLSX)
- **Triển khai**:扩展 AutoSaveSettings với format field
- **Ưu tiên**: Trung bình

#### 3.2 Scheduled Finder Jobs
- **Mô tả**: Lịch chạy finder tự động (hàng ngày/tuần)
- **Triển khai**: Cron job scheduler + notification
- **Ưu tiên**: Thấp

#### 3.3 Finder Templates
- **Mô tả**: Lưu cấu hình finder như template để tái sử dụng
- **Triển khai**: FinderTemplate model trong DB
- **Ưu tiên**: Trung bình

#### 3.4 Result Comparison
- **Mô tả**: So sánh kết quả giữa các lần chạy
- **Triển khai**: Diff view, highlight thay đổi
- **Ưu tiên**: Thấp

#### 3.5 Multi-Source Search
- **Mô tả**: Tìm kiếm URL từ nhiều nguồn (Google, Bing, Yahoo)
- **Triển khai**: Plugin architecture cho search engines
- **Ưu tiên**: Thấp

---

### 4. Search Nâng cao

#### 4.1 Search Filters
- **Mô tả**: Bộ lọc nâng cao (khoảng giá, đánh giá, vị trí)
- **Triển khai**: Filter sidebar với dynamic query builder
- **Ưu tiên**: Cao

#### 4.2 Search History & Suggestions
- **Mô tả**: Lịch sử tìm kiếm và gợi ý tự động
- **Triển khai**: Redis cache cho recent searches
- **Ưu tiên**: Trung bình

#### 4.3 Hotel Comparison
- **Mô tả**: So sánh tối đa 3-4 khách sạn side-by-side
- **Triển khai**: Comparison table component
- **Ưu tiên**: Trung bình

#### 4.4 Price Tracking
- **Mô tả**: Theo dõi giá và thông báo khi giảm giá
- **Triển khai**:扩展 PriceAlert model + email notification
- **Ưu tiên**: Thấp

---

### 5. Dashboard Nâng cao

#### 5.1 Real-time Analytics
- **Mô tả**: Biểu đồ realtime (Pusher-powered)
- **Triển khai**: Chart.js + Pusher events
- **Ưu tiên**: Trung bình

#### 5.2 Export Reports
- **Mô tả**: Xuất báo cáo PDF/Excel
- **Triển khai**: Server-side PDF generation
- **Ưu tiên**: Trung bình

#### 5.3 Custom Dashboard
- **Mô tả**: Tùy chỉnh layout dashboard (drag-and-drop widgets)
- **Triển khai**: Grid layout system
- **Ưu tiên**: Thấp

---

### 6. UX/UI Nâng cao

#### 6.1 Keyboard Shortcuts
- **Mô tả**: Phím tắt cho các hành động phổ biến
- **Triển khai**: Hotkey library (e.g., hotkeys-js)
- **Ưu tiên**: Thấp

#### 6.2 Dark/Light Mode per Feature
- **Mô tả**: Cho phép设置 riêng cho từng trang
- **Triển khai**: Theme context với page-level override
- **Ưu tiên**: Thấp

#### 6.3 Mobile Optimization
- **Mô tả**: Tối ưu trải nghiệm mobile (gesture, swipe)
- **Triển khai**: Touch event handlers, responsive breakpoints
- **Ưu tiên**: Cao

#### 6.4 Notification System
- **Mô tả**: Thông báo push + in-app notifications
- **Triển khai**: Service Worker + Notification API
- **Ưu tiên**: Trung bình

---

### 7. Security Nâng cao

#### 7.1 Two-Factor Authentication
- **Mô tả**: Xác thực 2 yếu tố (TOTP/SMS)
- **Triển khai**: speakeasy library + QR code
- **Ưu tiên**: Cao

#### 7.2 Audit Log UI
- **Mô tả**: Giao diện xem audit logs cho admin
- **Triển khai**: Admin page với filter/search
- **Ưu tiên**: Trung bình

#### 7.3 Rate Limiting Dashboard
- **Mô tả**: Theo dõi và quản lý rate limits
- **Triển khai**: Redis-based metrics + admin UI
- **Ưu tiên**: Thấp

#### 7.4 API Key Management
- **Mô tả**: Quản lý API keys cho external integrations
- **Triển khai**: APIKey model + rotation
- **Ưu tiên**: Thấp

---

### 8. Performance Nâng cao

#### 8.1 Caching Strategy
- **Mô tả**: Redis caching cho search results, user sessions
- **Triển khai**: Next.js revalidation + Redis
- **Ưu tiên**: Cao

#### 8.2 Image Optimization
- **Mô tả**: Tối ưu hình ảnh (WebP, lazy load, responsive)
- **Triển khai**: Sharp + next/image optimization
- **Ưu tiên**: Trung bình

#### 8.3 Database Indexing
- **Mô tả**: Tối ưu index cho queries phổ biến
- **Triển khai**: MongoDB profiler + index analysis
- **Ưu tiên**: Trung bình

#### 8.4 CDN Integration
- **Mô tả**: CDN cho static assets và uploaded files
- **Triển khai**: Cloudflare/AWS CloudFront
- **Ưu tiên**: Thấp

---

## Ưu tiên thực hiện

### Phase 1 (Ưu tiên cao - 2-3 tuần)
1. Typing Indicator cho Chat
2. Message Reply
3. Drive File Manager UI
4. Folder Management
5. Search Filters
6. Mobile Optimization
7. Two-Factor Authentication
8. Caching Strategy

### Phase 2 (Ưu tiên trung bình - 3-4 tuần)
1. Message Reactions
2. Message Search
3. File Preview
4. File Sharing
5. Finder Templates
6. Search History & Suggestions
7. Hotel Comparison
8. Real-time Analytics
9. Export Reports
10. Notification System
11. Audit Log UI
12. Image Optimization
13. Database Indexing

### Phase 3 (Ưu tiên thấp - 4-6 tuần)
1. Voice Messages
2. Storage Quota
3. File Versioning
4. Scheduled Finder Jobs
5. Result Comparison
6. Multi-Source Search
7. Price Tracking
8. Custom Dashboard
9. Keyboard Shortcuts
10. Dark/Light Mode per Feature
11. Rate Limiting Dashboard
12. API Key Management
13. CDN Integration

---

## Kỹ thuật cần thiết

### Frontend
- React 18+ hooks (useTransition, useDeferredValue)
- React Query / SWR cho data fetching
- Framer Motion cho animations
- React DnD cho drag-and-drop

### Backend
- Bull/BullMQ cho job queues
- Redis cho caching + pub/sub
- Sharp cho image processing
- Socket.io (backup cho Pusher)

### DevOps
- Docker cho deployment
- GitHub Actions cho CI/CD
- Prometheus + Grafana cho monitoring
- Sentry cho error tracking

---

## Ước tính thời gian

| Phase | Thời gian | Team |
|-------|-----------|------|
| Phase 1 | 2-3 tuần | 1-2 developers |
| Phase 2 | 3-4 tuần | 1-2 developers |
| Phase 3 | 4-6 tuần | 1-2 developers |
| **Tổng** | **9-13 tuần** | **1-2 developers** |

---

## Ghi chú

- Ưu tiên cao = Tính năng quan trọng, nên làm sớm
- Ưu tiên trung bình = Tính năng hữu ích, làm khi có thời gian
- Ưu tiên thấp = Tính năng nice-to-have, làm cuối cùng
- Thời gian ước tính cho 1 developer full-time
