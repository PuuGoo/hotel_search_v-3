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
        <FiClock className="h-8 w-8 text-ink-soft mx-auto mb-2" />
        <p className="text-ink-soft">Chưa có hoạt động nào</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {displayItems.map((item) => (
        <div
          key={item.id}
          className="flex items-center justify-between p-2 bg-fill rounded-lg"
        >
          <div className="flex-1 min-w-0">
            <p className="text-ink text-sm truncate">{item.query}</p>
            <p className="text-xs text-ink-soft">
              {item.engine.toUpperCase()} • {item.resultCount} kết quả
            </p>
          </div>
          <span className="text-xs text-ink-soft ml-2 flex-shrink-0">
            {format(new Date(item.createdAt), "HH:mm dd/MM")}
          </span>
        </div>
      ))}
    </div>
  );
};

export default ActivityWidget;
