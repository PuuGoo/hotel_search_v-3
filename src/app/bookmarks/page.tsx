import { Metadata } from "next";

import BookmarksClient from "./components/BookmarksClient";

export const metadata: Metadata = {
  title: "Đã lưu - Hotel Search",
  description: "Quản lý các khách sạn và liên kết bạn đã lưu",
};

// Bookmarks are fetched client-side via /api/bookmarks (paginated, filterable),
// so the page itself is a thin shell around the client component.
const BookmarksPage = () => {
  return <BookmarksClient />;
};

export default BookmarksPage;
