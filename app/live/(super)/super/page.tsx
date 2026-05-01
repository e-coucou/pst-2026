"use client";

import { useState } from 'react';

export default function AdminControlPanel() {
  const [status, setStatus] = useState({ loading: false, action: '' });

  // 1. Recalculer ELO Live (Table live_history)
  const triggerRecomputeLive = async () => {
    if (!confirm("Recalculer tout l'historique ELO Live ?")) return;
    executeAction('live', '/api/admin/live-elo');
  };

  // 2. Recalculer ELO Global (Depuis l'origine)
  const triggerRecomputeAll = async () => {
    if (!confirm("Recalculer tout l'historique ELO Depuis l'Origine ? (Action Lourde)")) return;
    executeAction('all', '/api/admin/recompute-elo');
  };


  const triggerResetLive = () => {
    window.location.href = '/live/reset';
  };

  // Fonction générique pour éviter la répétition de code
  const executeAction = async (label: string, url: string) => {
    setStatus({ loading: true, action: label });
    try {
      const res = await fetch(url, { method: 'POST' });
      const data = await res.json();

      if (data.success) {
        alert(`✅ Succès : ${data.message}`);
        window.location.reload();
      } else {
        alert(`❌ Erreur : ${data.error}`);
      }
    } catch (err) {
      alert("❌ Erreur réseau");
    } finally {
      setStatus({ loading: false, action: '' });
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 border border-zinc-800 rounded-2xl bg-zinc-900/50">
      <h2 className="text-xl font-bold text-white mb-2">Panel Super Administrateur</h2>

      {/* BOUTON ELO LIVE */}
      <button
        onClick={triggerRecomputeLive}
        disabled={status.loading}
        className={`px-4 py-3 rounded-lg font-bold text-white shadow-lg transition-all
          ${status.loading && status.action === 'live'
            ? 'bg-zinc-600 cursor-not-allowed' 
            : 'bg-red-600 hover:bg-red-500 active:scale-95'}  hover:bg-white hover:text-red-600`}
      >
        {status.loading && status.action === 'live' ? "🔄 Calcul Live..." : "🚀 Recalculer ELO Live"}
      </button>

      {/* BOUTON ELO TOUT (HISTORIQUE) */}
      <button
        onClick={triggerRecomputeAll}
        disabled={status.loading}
        className={`px-4 py-3 rounded-lg font-bold text-white shadow-lg transition-all
          ${status.loading && status.action === 'all'
            ? 'bg-zinc-600 cursor-not-allowed' 
            : 'bg-orange-600 hover:bg-orange-500 active:scale-95'}  hover:bg-white hover:text-red-600`}
      >
        {status.loading && status.action === 'all' ? "🔄 Calcul Global..." : "🌍 Recalculer ELO Origine"}
      </button>

      {/* BOUTON RESET LIVE */}
	  <button
	    onClick={triggerResetLive}
	    className="px-4 py-3 rounded-lg font-bold text-white shadow-lg transition-all border-2 border-red-600 bg-transparent hover:bg-red-600/10 active:scale-95 hover:bg-white hover:text-red-600"
	  >
	    ⚠️  RESET du LIVE
      </button>
    </div>
  );
}
