"use client";

import { useEffect, useState, useCallback } from "react";
import {
  FiMessageSquare,
  FiSearch,
  FiBookmark,
  FiUserPlus,
  FiLoader,
} from "react-icons/fi";
import { pusherClient } from "@/app/libs/pusherClient";
import { DASHBOARD_CHANNEL, pusherEvents } from "@/app/libs/pusherChannels";

interface ActivityUser {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
}

interface ActivityItem {
  id: string;
  type: "message" | "search" | "bookmark" | "user";
  description: string;
  user: ActivityUser | null;
  timestamp: string;
}

interface ActivityFeedProps {
  initialActivities: ActivityItem[];
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "vừa xong";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return `${days} ngày trước`;
}

const typeConfig: Record<
  string,
  { icon: React.ReactNode; colorClass: string }
> = {
  message: {
    icon: <FiMessageSquare className="h-4 w-4 text-green-400" />,
    colorClass: "bg-green-500/20",
  },
  search: {
    icon: <FiSearch className="h-4 w-4 text-sky-400" />,
    colorClass: "bg-sky-500/20",
  },
  bookmark: {
    icon: <FiBookmark className="h-4 w-4 text-yellow-400" />,
    colorClass: "bg-yellow-500/20",
  },
  user: {
    icon: <FiUserPlus className="h-4 w-4 text-purple-400" />,
    colorClass: "bg-purple-500/20",
  },
};

const ActivityFeed: React.FC<ActivityFeedProps> = ({ initialActivities }) => {
  const [activities, setActivities] = useState<ActivityItem[]>(initialActivities);

  const handleNewActivity = useCallback((activity: ActivityItem) => {
    setActivities((prev) => {
      const exists = prev.some((a) => a.id === activity.id);
      if (exists) return prev;
      return [activity, ...prev].slice(0, 50);
    });
  }, []);

  useEffect(() => {
    const channel = pusherClient.subscribe(DASHBOARD_CHANNEL);

    channel.bind(pusherEvents.DASHBOARD_ACTIVITY, (data: ActivityItem) => {
      handleNewActivity(data);
    });

    return () => {
      pusherClient.unsubscribe(DASHBOARD_CHANNEL);
    };
  }, [handleNewActivity]);

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-xl font-semibold text-white mb-4">
        Hoạt động gần đây
      </h2>

      {activities.length === 0 ? (
        <div className="text-center py-8">
          <FiLoader className="h-8 w-8 text-gray-500 mx-auto mb-3 animate-spin" />
          <p className="text-gray-400">Không có hoạt động gần đây</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1 scrollbar-thin">
          {activities.map((activity) => {
            const config = typeConfig[activity.type] || typeConfig.message;
            return (
              <div
                key={activity.id}
                className="flex items-start gap-3 p-3 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <div className={`p-2 rounded-lg flex-shrink-0 ${config.colorClass}`}>
                  {config.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-200 line-clamp-2">
                    {activity.description}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {activity.user && (
                      <span className="text-xs text-gray-400">
                        {activity.user.name || activity.user.email}
                      </span>
                    )}
                    <span className="text-xs text-gray-500">
                      {timeAgo(activity.timestamp)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ActivityFeed;
