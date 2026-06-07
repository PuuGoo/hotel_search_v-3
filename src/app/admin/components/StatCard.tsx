import { IconType } from "react-icons";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: IconType;
  accent?: "sky" | "yellow" | "green" | "purple" | "rose";
  hint?: string;
}

const ACCENTS: Record<NonNullable<StatCardProps["accent"]>, string> = {
  sky: "bg-sky-500/20 text-sky-400",
  yellow: "bg-yellow-500/20 text-yellow-400",
  green: "bg-green-500/20 text-green-400",
  purple: "bg-purple-500/20 text-purple-400",
  rose: "bg-rose-500/20 text-rose-400",
};

const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon: Icon,
  accent = "sky",
  hint,
}) => {
  return (
    <div className="bg-panel rounded-lg p-6">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-lg ${ACCENTS[accent]}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-ink-soft">{label}</p>
          <p className="text-2xl font-bold text-ink">{value}</p>
          {hint ? <p className="text-xs text-ink-soft mt-0.5">{hint}</p> : null}
        </div>
      </div>
    </div>
  );
};

export default StatCard;
