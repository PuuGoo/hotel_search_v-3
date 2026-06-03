interface StatWidgetProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}

const StatWidget: React.FC<StatWidgetProps> = ({ title, value, icon, color }) => {
  return (
    <div className="flex items-center gap-4">
      <div className={`p-3 rounded-lg ${color}`}>{icon}</div>
      <div>
        <p className="text-sm text-gray-400">{title}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
      </div>
    </div>
  );
};

export default StatWidget;
