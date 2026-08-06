'use client';

import Link from 'next/link';
import { ArrowLeft, ChevronRight, Users, FileText, KeyRound, Lock } from 'lucide-react';

export default function ResidencePriveHubPage() {
  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-20 flex items-center">
      <div className="max-w-5xl mx-auto w-full">

        <div className="mb-10">
          <Link href="/render" className="inline-flex items-center gap-2 text-white bg-zinc-900 hover:bg-red-600 border border-white/10 hover:border-red-600 transition-all px-5 py-3 rounded-full text-xs font-black uppercase tracking-widest active:scale-95">
            <ArrowLeft size={16} /> Résidence
          </Link>
        </div>

        <div className="mb-16 text-center flex flex-col items-center">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-red-600 p-2 rounded-xl shadow-[0_0_20px_rgba(220,38,38,0.4)]">
              <Lock size={24} className="text-white" />
            </div>
            <span className="text-red-600 font-black uppercase tracking-[0.3em] text-xs">Espace Réservé</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black uppercase italic tracking-tighter">
            RÉSIDENCE <span className="text-red-600">PRIVÉ</span>
          </h1>
          <p className="text-zinc-500 mt-4 max-w-xl font-bold uppercase tracking-widest text-[10px] md:text-xs">
            Conseil syndical, documents et codes d&apos;accès — visible uniquement par les membres &quot;Super&quot;.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <HubTile
            href="/render/prive/contacts"
            icon={<Users size={32} />}
            title="Contacts"
            desc="Conseil syndical, gardien, résidents"
          />
          <HubTile
            href="/render/prive/documents"
            icon={<FileText size={32} />}
            title="Documents"
            desc="PDF, convocations, comptes-rendus"
          />
          <HubTile
            href="/render/prive/codes"
            icon={<KeyRound size={32} />}
            title="Codes"
            desc="Accès portails et digicodes"
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
