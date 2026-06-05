"use client";

import { FiCheckSquare, FiSquare, FiZap } from "react-icons/fi";

export interface EngineInfo {
  id: string;
  name: string;
  available: boolean;
  description: string;
}

interface EngineSelectorProps {
  selected: string[];
  onChange: (engines: string[]) => void;
  available: EngineInfo[];
}

const EngineSelector = ({ selected, onChange, available }: EngineSelectorProps) => {
  const allSelected = available.length > 0 && available.every((e) => selected.includes(e.id));

  const toggleAll = () => {
    if (allSelected) {
      // Keep only the first available engine selected (don't allow 0)
      const firstAvailable = available.find((e) => e.available);
      onChange(firstAvailable ? [firstAvailable.id] : []);
    } else {
      onChange(available.filter((e) => e.available).map((e) => e.id));
    }
  };

  const toggleEngine = (id: string) => {
    if (selected.includes(id)) {
      // Prevent deselecting the last engine
      if (selected.length <= 1) return;
      onChange(selected.filter((e) => e !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-300">
          <FiZap className="w-4 h-4 text-sky-400" />
          Nguồn tìm kiếm
        </div>
        <button
          type="button"
          onClick={toggleAll}
          className="text-xs text-sky-400 hover:text-sky-300 transition-colors"
        >
          {allSelected ? "Chọn 1" : "Chọn tất cả"}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {available.map((engine) => (
          <label
            key={engine.id}
            className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
              selected.includes(engine.id)
                ? "bg-sky-500/10 border-sky-500/50"
                : "bg-gray-800/50 border-gray-700 hover:border-gray-600"
            } ${!engine.available ? "opacity-50 cursor-not-allowed" : ""} ${
              selected.includes(engine.id) && selected.length <= 1 ? "ring-1 ring-sky-500/30" : ""
            }`}
          >
            <div className="mt-0.5">
              {selected.includes(engine.id) ? (
                <FiCheckSquare className="w-5 h-5 text-sky-400" />
              ) : (
                <FiSquare className="w-5 h-5 text-gray-500" />
              )}
            </div>
            <input
              type="checkbox"
              checked={selected.includes(engine.id)}
              onChange={() => engine.available && toggleEngine(engine.id)}
              disabled={!engine.available}
              className="sr-only"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-white">{engine.name}</span>
                {!engine.available && (
                  <span className="text-xs px-1.5 py-0.5 bg-gray-700 text-gray-400 rounded">
                    Không khả dụng
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">{engine.description}</p>
            </div>
          </label>
        ))}
      </div>

      {selected.length > 0 && (
        <p className="text-xs text-gray-500">
          Đã chọn {selected.length} nguồn
        </p>
      )}
    </div>
  );
};

export default EngineSelector;
