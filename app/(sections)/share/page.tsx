// app/share/page.tsx
'use client';

import { X, Smartphone } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SharePage() {
  const router = useRouter();

  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center p-6">
      {/* Bouton Fermer */}
      <button 
        onClick={() => router.back()}
        className="absolute top-6 right-6 p-4 text-black hover:bg-zinc-100 rounded-full transition-colors"
      >
        <X size={32} />
      </button>

      {/* Message d'aide */}
      <div className="mb-8 text-center">
        <h2 className="text-black text-2xl font-black uppercase italic leading-none">Scannez pour rejoindre</h2>
        <div className="flex items-center justify-center gap-2 mt-2 text-zinc-500 font-bold text-xs uppercase tracking-widest">
          <Smartphone size={14} />
          <span>Luminosité conseillée au max</span>
        </div>
      </div>

      {/* Le QR Code */}
      <div className="relative w-full max-w-sm aspect-square bg-white shadow-[0_0_60px_rgba(0,0,0,0.1)] rounded-[3rem] p-8 flex items-center justify-center">
        <img 
          src="/QR-login.gif" 
          alt="Partager l'app"
          className="w-full h-full object-contain"
        />
      </div>

      <p className="mt-12 text-[10px] text-zinc-400 font-black uppercase tracking-[0.4em]">
        Paris — Saint-Tropez
      </p>
    </div>
  );
}