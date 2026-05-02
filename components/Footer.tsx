// components/Footer.tsx
import { Logo } from './Logo';

export default function Footer() {
  const version = process.env.APP_VERSION || "1.0.0";
  const commitHash = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.substring(0, 7) || "dev";
  const year = new Date().getFullYear();

  return (
    <footer className="w-full py-6 pb-10 md:pb-6 border-t border-white/5 bg-black text-zinc-500">
      <div className="max-w-7xl mx-auto px-6 flex flex-col items-center gap-4 md:flex-row md:justify-between">
        
        {/* Branding - Centré sur mobile, à gauche sur desktop */}
        <div className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] italic text-center md:text-left">
          © {year} — <span className="text-white">Paris</span> <span className="text-red-600">Saint-Tropez</span>
          <div className="mt-1 md:inline md:mt-0 md:ml-2 text-zinc-700">by eCoucou digital</div>
        </div>

        {/* Status & Version - Sépare les deux sur très petit écran si besoin */}
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-4 text-[9px] font-mono uppercase tracking-widest">
          {/* Badge System Status */}
          <div className="flex items-center gap-2 bg-zinc-900/50 px-3 py-1 rounded-full border border-white/10">
            <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
            <span className="text-zinc-400 text-[8px] sm:text-[9px]">System Live</span>
          </div>
          {/* Version Number */}
          <span className="opacity-40 hover:opacity-100 transition-opacity cursor-default">
            v{version} <span className="hidden sm:inline">({commitHash})</span>
          </span>
        </div>
      </div>
       <div className="flex flex-col items-center gap-6">
       <Logo className="h-10" />
	   </div>
    </footer>
  );
}
