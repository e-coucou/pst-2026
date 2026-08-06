// components/Footer.tsx
import { Logo } from './Logo';
import { QrCode } from 'lucide-react';
import Link from 'next/link';

export default function Footer() {
  const version = process.env.APP_VERSION || "1.0.0";
  const commitHash = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.substring(0, 7) || "dev";
  const year = new Date().getFullYear();

  return (
    <footer className="w-full py-8 border-t border-white/5 bg-black text-zinc-400 px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        
        {/* GAUCHE : Logo */}
        <div className="flex-1 flex justify-start">
          <Logo className="h-8 opacity-50 hover:opacity-100 transition-opacity" />
        </div>

        {/* CENTRE : Copyright & Status */}
        <div className="flex-[2] flex flex-col items-center gap-2">
          <div className="text-[10px] font-black uppercase tracking-[0.3em] italic text-center">
            © {year} — <span className="text-white">Paris</span> <span className="text-red-600">Saint-Tropez</span>
            <div className="text-zinc-400 mt-1">by eCoucou digital</div>
          </div>
          
          <div className="flex items-center gap-4 text-[9px] font-mono text-zinc-300">
             <div className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-red-600 animate-pulse" />
                <span>System Live</span>
             </div>
             <span>v{version} ({commitHash})</span>
          </div>
        </div>

        {/* DROITE : Bouton Partager */}
        <div className="flex-1 flex justify-end">
          <Link 
            href="/share" 
            className="group flex flex-col items-center gap-1 text-zinc-400 hover:text-white transition-colors"
          >
            <div className="p-3 rounded-xl bg-zinc-900 border border-white/5 group-hover:border-red-600/50 group-active:scale-95 transition-all">
              <QrCode size={24} />
            </div>
            <span className="text-[8px] font-black uppercase tracking-widest">Partager</span>
          </Link>
        </div>
      </div>
    </footer>
  );
}