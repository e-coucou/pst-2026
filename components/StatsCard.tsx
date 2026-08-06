export default function StatsCard({ label, value, color }: { label: string, value: string | number, color: string }) {
  const colors: any = {
    green: "border-green-500/30 text-green-400",
    blue: "border-blue-500/30 text-blue-400",
    orange: "border-orange-500/30 text-orange-400",
    purple: "border-purple-500/30 text-purple-400",
    red: "border-red-500/30 text-red-400",
    zinc: "border-zinc-500/30 text-zinc-400",
    gray: "border-zinc-500/30 text-zinc-400",
  };

  return (
    <div className={`p-4 rounded-xl border bg-zinc-900/50 ${colors[color] || colors.gray}`}>
      <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-1">{label}</p>
      <p className="text-2xl font-black font-mono text-white">{value}</p>
    </div>
  );
}
