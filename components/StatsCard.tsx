export default function StatsCard({ label, value, color }: { label: string, value: string | number, color: string }) {
  const colors: any = {
    green: "border-green-500/30 text-green-400",
    blue: "border-blue-500/30 text-blue-400",
    orange: "border-orange-500/30 text-orange-400",
    purple: "border-purple-500/30 text-purple-400",
    gray: "border-gray-500/30 text-gray-400",
  };

  return (
    <div className={`bg-gray-900 border ${colors[color]} p-4 rounded-xl text-center`}>
      <p className="text-xs uppercase tracking-wider mb-1 opacity-70">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  );
}
