'use client';

import Link from 'next/link';
import { Film, ImageIcon, UploadCloud, ChevronRight } from 'lucide-react';

export default function MediathequePage() {
  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-20 flex items-center">
      <div className="max-w-5xl mx-auto w-full">

        {/* Header de la page centré */}
        <div className="mb-16 text-center flex flex-col items-center">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-red-600 p-2 rounded-xl shadow-[0_0_20px_rgba(220,38,38,0.4)]">
              <Film size={24} className="text-white" />
            </div>
            <span className="text-red-600 font-black uppercase tracking-[0.3em] text-xs">Médiathèque Privée</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black uppercase italic tracking-tighter">
            PST <span className="text-red-600">TV</span>
          </h1>
          <p className="text-zinc-500 mt-4 max-w-xl font-bold uppercase tracking-widest text-[10px] md:text-xs">
            Revivez les plus beaux moments, parcourez les photos, participez à l&apos;aventure.
          </p>
        </div>

        {/* 3 PAVÉS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <HubTile
            href="/videos/gallery"
            icon={<Film size={32} />}
            title="Vidéos"
            desc="Finales et plus beaux points, saison après saison"
          />
          <HubTile
            href="/videos/photos"
            icon={<ImageIcon size={32} />}
            title="Photos"
            desc="La galerie photo du tournoi"
          />
          <HubTile
            href="/videos/upload"
            icon={<UploadCloud size={32} />}
            title="Contribuez"
            desc="Participez à l'enrichissement pictural !"
            accent
          />
        </div>

      </div>
    </div>
  );
}

function HubTile({ href, icon, title, desc, accent }: { href: string; icon: React.ReactNode; title: string; desc: string; accent?: boolean }) {
  return (
    <Link
      href={href}
      className={`group relative flex flex-col items-center text-center gap-4 p-10 rounded-[2.5rem] border transition-all duration-300 active:scale-95 ${
        accent
          ? 'bg-red-600/10 border-red-600/30 hover:bg-red-600 hover:border-red-600'
          : 'bg-zinc-900/50 border-white/5 hover:border-red-600/50'
      }`}
    >
      <div className={`p-4 rounded-2xl transition-colors ${
        accent
          ? 'bg-red-600 text-white group-hover:bg-white group-hover:text-red-600'
          : 'bg-zinc-800 text-red-600 group-hover:bg-red-600 group-hover:text-white'
      }`}>
        {icon}
      </div>
      <h2 className="text-2xl font-black italic uppercase tracking-tighter">{title}</h2>
      <p className={`text-[10px] font-bold uppercase tracking-widest ${accent ? 'text-red-100 group-hover:text-white' : 'text-zinc-500'}`}>
        {desc}
      </p>
      <ChevronRight size={18} className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-all translate-x-[-6px] group-hover:translate-x-0" />
    </Link>
  );
}
