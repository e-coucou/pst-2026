'use client'
import { useState } from 'react';

export default function AdminSettings({ initialSettings }: { initialSettings: any }) {
  const [loading, setLoading] = useState(false);

  const handleRecalculate = async () => {
    setLoading(true);
    const res = await fetch('/api/admin/recompute-elo', { method: 'POST' });
    const data = await res.json();
    setLoading(false);
    if (data.success) alert(`Calcul terminé ! ${data.count} points d'historique créés.`);
  };

  return (
    <div className="p-6 bg-gray-900 text-white rounded-lg">
      <h2 className="text-xl font-bold mb-4">Paramètres du Moteur ELO</h2>
      
      {/* Ici tu pourras boucler sur tes settings pour créer des inputs */}
      
      <button 
        onClick={handleRecalculate}
        disabled={loading}
        className="mt-6 w-full bg-blue-600 hover:bg-blue-700 p-3 rounded font-bold disabled:opacity-50"
      >
        {loading ? 'Calcul en cours...' : '🔄 Recalculer tout l\'historique'}
      </button>
      
      <p className="mt-2 text-sm text-gray-400">
        Attention : Cette action efface et reconstruit toute la table elo_history.
      </p>
    </div>
  );
}
