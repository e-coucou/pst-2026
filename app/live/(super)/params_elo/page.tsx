'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { Loader2, Save, RotateCcw, X, Settings2, Info, CheckCircle2, AlertCircle } from 'lucide-react';

interface Setting {
  key: string;
  value: number;
  label: string;
  init: number;
}

export default function ParamsEloPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  
  const supabase = createClient();
  const router = useRouter();

  // Charger les paramètres depuis la table 'settings'
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .order('key');
    
    if (!error && data) {
      setSettings(data);
    }
    setLoading(false);
  };

  // Mise à jour de l'état local lors de la saisie
  const handleInputChange = (key: string, newValue: string) => {
    setSettings(prev => prev.map(s => 
      s.key === key ? { ...s, value: parseFloat(newValue) || 0 } : s
    ));
  };

  // Sauvegarde dans la base de données
  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    const updates = settings.map(s => ({
      key: s.key,
      value: s.value
    }));

    // On utilise upsert ou une boucle de mises à jour
    const { error } = await supabase.from('settings').upsert(updates);

    if (error) {
      setMessage({ type: 'error', text: "Erreur lors de la sauvegarde" });
    } else {
      setMessage({ type: 'success', text: "Paramètres mis à jour avec succès" });
      setTimeout(() => router.push('/live/super'), 1500);
    }
    setSaving(false);
  };

  // Reset : copie 'init' vers 'value'
  const handleReset = () => {
    if (confirm("Voulez-vous restaurer toutes les valeurs par défaut (init) ?")) {
      setSettings(prev => prev.map(s => ({ ...s, value: s.init })));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="animate-spin text-red-600" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 pb-24">
      {/* Header */}
      <div className="max-w-2xl mx-auto mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black italic tracking-tighter uppercase">
            Configuration <span className="text-red-600">ELO</span>
          </h1>
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Panel Super-Admin</p>
        </div>
        <button 
          onClick={() => router.push('/live/super')}
          className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-colors"
        >
          <X size={24} />
        </button>
      </div>

      <div className="max-w-2xl mx-auto space-y-4">
        {/* Feedback Message */}
        {message && (
          <div className={`p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 ${
            message.type === 'success' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'
          }`}>
            {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            <span className="font-bold text-sm">{message.text}</span>
          </div>
        )}

        {/* Formulaire des paramètres */}
        <div className="bg-zinc-900/50 border border-white/5 rounded-[2.5rem] p-6 space-y-6">
          {settings.map((setting) => (
            <div key={setting.key} className="group flex flex-col gap-2">
              <div className="flex justify-between items-end px-2">
                <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest group-focus-within:text-red-500 transition-colors">
                  {setting.label || setting.key}
                </label>
                <span className="text-[10px] font-medium text-zinc-400">
                  Défaut: {setting.init}
                </span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  value={setting.value}
                  onChange={(e) => handleInputChange(setting.key, e.target.value)}
                  className="w-full bg-zinc-800/50 border border-white/5 focus:border-red-600/50 focus:ring-0 rounded-2xl px-6 py-4 text-xl font-bold transition-all outline-none"
                />
                <Settings2 className="absolute right-6 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
              </div>
            </div>
          ))}
        </div>

        {/* Note d'information */}
        <div className="bg-blue-500/5 border border-blue-500/10 p-4 rounded-2xl flex gap-3">
          <Info className="text-blue-500 shrink-0" size={18} />
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            Ces coefficients impactent le calcul des points après chaque match. Une modification peut altérer radicalement le classement général. Utilisez le bouton reset en cas de doute.
          </p>
        </div>
      </div>

      {/* Barre d'actions flottante - Design St-Tropez */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-2xl">
        <div className="bg-zinc-900/80 backdrop-blur-xl border border-white/10 p-4 rounded-[2rem] shadow-2xl flex gap-3">
          <button
            onClick={handleReset}
            className="flex-1 flex items-center justify-center gap-2 py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-2xl transition-all active:scale-95"
          >
            <RotateCcw size={18} />
            <span className="text-xs uppercase tracking-tighter">Réinitialiser</span>
          </button>
          
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-2 flex items-center justify-center gap-2 py-4 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold rounded-2xl transition-all shadow-lg shadow-red-600/20 active:scale-95"
          >
            {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            <span className="text-xs uppercase tracking-tighter">Enregistrer & Quitter</span>
          </button>
        </div>
      </div>
    </div>
  );
}