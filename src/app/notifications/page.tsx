import { Metadata } from "next";

import NotificationList from "../components/notifications/NotificationList";

export const metadata: Metadata = {
  title: "Thông báo - Hotel Search",
  description: "Quản lý thông báo của bạn",
};

const NotificationsPage = () => {
  return (
    <div className="h-full px-4 py-6 sm:px-6 lg:px-8 lg:py-4">
      <h1 className="text-2xl font-bold text-neutral-800 dark:text-gray-200 mb-4">
        Thông báo
      </h1>
      <NotificationList />
    </div>
  );
};

export default NotificationsPage;
