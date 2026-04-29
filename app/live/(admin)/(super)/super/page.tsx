'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Trash2, AlertTriangle, Loader2, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SuperAdminPage() {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirmName, setConfirmName] = useState('');

  const handleReset = async () => {
    if (confirmName !== 'RESET') return;
    
    setLoading(true);
    try {
      // APPEL DU RPC
      const { error } = await supabase.rpc('reset_tournament');
      
      if (error) throw error;

      alert('Le tournoi a été réinitialisé avec succès.');
      router.push('/live/admin');
    } catch (error) {
      console.error(error);
      alert('Erreur lors du reset.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-8 flex items-center justify-center">
      <div className="max-w-md w-full bg-zinc-900 border border-red-900/50 p-8 rounded-3xl shadow-2xl">
        <div className="flex flex-col items-center text-center gap-4 mb-8">
          <div className="bg-red-600/20 p-4 rounded-full">
            <AlertTriangle size={40} className="text-red-600" />
          </div>
          <h1 className="text-3xl font-black uppercase italic">Zone Dangereuse</h1>
          <p className="text-zinc-400 text-sm">
            Cette action va supprimer **définitivement** tous les matchs, les équipes et les sélections.
          </p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-[10px] font-black uppercase text-zinc-500 mb-2 ml-1">
              Tapez "RESET" pour confirmer
            </label>
            <input 
              type="text"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              className="w-full bg-black border border-zinc-800 p-4 rounded-xl text-center font-bold tracking-widest focus:border-red-600 outline-none transition-colors"
              placeholder="CONFIRMATION"
            />
          </div>

          <button
            onClick={handleReset}
            disabled={confirmName !== 'RESET' || loading}
            className={`w-full py-4 rounded-xl font-black uppercase italic flex items-center justify-center gap-3 transition-all ${
              confirmName === 'RESET' && !loading 
                ? 'bg-red-600 hover:bg-red-700 text-white' 
                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
            }`}
          >
            {loading ? <Loader2 className="animate-spin" /> : <Trash2 size={18} />}
            Réinitialiser le Tournoi
          </button>

          <button 
            onClick={() => router.back()}
            className="w-full text-zinc-500 font-bold text-xs uppercase hover:text-white transition-colors"
          >
            Annuler et retourner
          </button>
        </div>
      </div>
    </div>
  );
}
