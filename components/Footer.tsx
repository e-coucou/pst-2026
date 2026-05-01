// components/Footer.tsx
export default function Footer() {
  const version = process.env.APP_VERSION || "1.0.0";
  const commitHash = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.substring(0, 7) || "dev";
  const year = new Date().getFullYear();

  return (
    <footer className="w-full py-8 border-t border-white/5 bg-black text-zinc-500">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
        {/* Copyright & Branding */}
        <div className="text-[10px] font-black uppercase tracking-[0.3em] italic">
          © {year} — <span className="text-white">Paris</span> <span className="text-red-600">Saint-Tropez</span>
          <span className="ml-2 text-zinc-700">by eCoucou</span>
        </div>

        {/* Version & Status */}
        <div className="flex items-center gap-4 text-[9px] font-mono uppercase tracking-widest">
          <div className="flex items-center gap-2 bg-zinc-900 px-3 py-1 rounded-full border border-white/5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
            <span className="text-zinc-400">System Live</span>
          </div>
          <span className="opacity-50">
            v{version} ({commitHash})
          </span>
        </div>
      </div>
    </footer>
  );
}
