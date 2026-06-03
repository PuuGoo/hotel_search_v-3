"use client";

import { useState, useRef } from "react";
import { FiX, FiMenu } from "react-icons/fi";

export interface Widget {
  id: string;
  type: string;
  title: string;
  size: "small" | "medium" | "large";
  visible: boolean;
}

interface WidgetContainerProps {
  widgets: Widget[];
  onReorder: (widgets: Widget[]) => void;
  onRemove: (id: string) => void;
  renderWidget: (widget: Widget) => React.ReactNode;
}

const WidgetContainer: React.FC<WidgetContainerProps> = ({
  widgets,
  onReorder,
  onRemove,
  renderWidget,
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);

    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }

    const newWidgets = [...widgets];
    const draggedWidget = newWidgets[draggedIndex];
    newWidgets.splice(draggedIndex, 1);
    newWidgets.splice(dropIndex, 0, draggedWidget);
    onReorder(newWidgets);
    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const getWidgetSizeClass = (size: string) => {
    switch (size) {
      case "small":
        return "col-span-1";
      case "medium":
        return "col-span-1 md:col-span-2";
      case "large":
        return "col-span-1 md:col-span-2 lg:col-span-3";
      default:
        return "col-span-1";
    }
  };

  return (
    <div
      ref={containerRef}
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
    >
      {widgets.map((widget, index) => (
        <div
          key={widget.id}
          draggable
          onDragStart={(e) => handleDragStart(e, index)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, index)}
          onDragEnd={handleDragEnd}
          className={`
            ${getWidgetSizeClass(widget.size)}
            bg-gray-800 rounded-lg overflow-hidden transition-all
            ${draggedIndex === index ? "opacity-50" : ""}
            ${dragOverIndex === index ? "ring-2 ring-sky-500" : ""}
          `}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
            <div className="flex items-center gap-2">
              <FiMenu className="h-4 w-4 text-gray-400 cursor-grab active:cursor-grabbing" />
              <span className="text-sm font-medium text-white">
                {widget.title}
              </span>
            </div>
            <button
              onClick={() => onRemove(widget.id)}
              className="p-1 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded transition-colors"
            >
              <FiX className="h-4 w-4" />
            </button>
          </div>
          <div className="p-4">{renderWidget(widget)}</div>
        </div>
      ))}
    </div>
  );
};

export default WidgetContainer;
