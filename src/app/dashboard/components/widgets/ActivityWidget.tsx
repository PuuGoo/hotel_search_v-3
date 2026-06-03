"use client";

import { format } from "date-fns";
import { FiClock } from "react-icons/fi";

interface ActivityItem {
  id: string;
  query: string;
  engine: string;
  resultCount: number;
  createdAt: Date;
}

interface ActivityWidgetProps {
  items: ActivityItem[];
}

const ActivityWidget: React.FC<ActivityWidgetProps> = ({ items }) => {
  const displayItems = items.slice(0, 5);

  if (displayItems.length === 0) {
    return (
      <div className="text-center py-6">
        <FiClock className="h-8 w-8 text-gray-500 mx-auto mb-2" />
        <p className="text-gray-400">Chưa có hoạt động nào</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {displayItems.map((item) => (
        <div
          key={item.id}
          className="flex items-center justify-between p-2 bg-gray-700 rounded-lg"
        >
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm truncate">{item.query}</p>
            <p className="text-xs text-gray-400">
              {item.engine.toUpperCase()} • {item.resultCount} kết quả
            </p>
          </div>
          <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
            {format(new Date(item.createdAt), "HH:mm dd/MM")}
          </span>
        </div>
      ))}
    </div>
  );
};

export default ActivityWidget;
