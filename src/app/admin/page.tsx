import { Metadata } from "next";
import {
  FiUsers,
  FiShield,
  FiSearch,
  FiBookmark,
  FiMessageSquare,
  FiUserPlus,
} from "react-icons/fi";

import getAdminOverview from "@/app/actions/getAdminOverview";

import StatCard from "./components/StatCard";

export const metadata: Metadata = {
  title: "Admin - Tổng quan",
};

// Always render fresh counts rather than a cached snapshot.
export const dynamic = "force-dynamic";

const AdminOverviewPage = async () => {
  const overview = await getAdminOverview();

  if (!overview) {
    return (
      <p className="text-ink-soft">Bạn không có quyền truy cập dữ liệu này.</p>
    );
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-semibold text-ink mb-4">Người dùng</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            label="Tổng người dùng"
            value={overview.totalUsers}
            icon={FiUsers}
            accent="sky"
          />
          <StatCard
            label="Quản trị viên"
            value={overview.totalAdmins}
            icon={FiShield}
            accent="purple"
          />
          <StatCard
            label="Người dùng thường"
            value={overview.totalRegularUsers}
            icon={FiUsers}
            accent="green"
          />
          <StatCard
            label="Mới (7 ngày)"
            value={overview.newUsers7d}
            icon={FiUserPlus}
            accent="yellow"
          />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ink mb-4">Hoạt động</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            label="Tổng tìm kiếm"
            value={overview.totalSearches}
            icon={FiSearch}
            accent="sky"
            hint={`${overview.searches7d} trong 7 ngày`}
          />
          <StatCard
            label="Bookmark"
            value={overview.totalBookmarks}
            icon={FiBookmark}
            accent="yellow"
          />
          <StatCard
            label="Cuộc trò chuyện"
            value={overview.totalConversations}
            icon={FiMessageSquare}
            accent="green"
          />
          <StatCard
            label="Tin nhắn"
            value={overview.totalMessages}
            icon={FiMessageSquare}
            accent="rose"
          />
        </div>
      </section>
    </div>
  );
};

export default AdminOverviewPage;
