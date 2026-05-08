"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { 
  Users, 
  Search, 
  UserCircle2, 
  ArrowRightLeft, 
  Save, 
  History,
  CheckCircle2,
  AlertCircle,
  Loader2, X
} from 'lucide-react';

const supabase = createClient();

export default function AdminTeamsPage() {
  const [teams, setTeams] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    // 1. Récupérer les équipes avec leurs membres actuels
    const { data: teamsData } = await supabase
      .from('teams')
      .select(`
        id, nom, year, tireur_id, pointeur_id,
        tireur:profiles!teams_tireur_id_fkey(nom),
        pointeur:profiles!teams_pointeur_id_fkey(nom)
      `)
      .order('year', { ascending: false })
      .order('nom', { ascending: true });

    // 2. Récupérer tous les profils pour les menus déroulants
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, nom')
      .order('nom');

    if (teamsData) setTeams(teamsData);
    if (profilesData) setProfiles(profilesData);
    setLoading(false);
  }

  const handleUpdateMember = async (teamId: number, field: string, newId: string) => {
    setMessage({ type: '', text: '' });
    
    const { error } = await supabase
      .from('teams')
      .update({ [field]: newId })
      .eq('id', teamId);

    if (error) {
      setMessage({ type: 'error', text: "Erreur lors de la mise à jour" });
    } else {
      setMessage({ type: 'success', text: "Équipe mise à jour !" });
      setEditingId(null);
      fetchData(); // Rafraîchir la liste
    }
  };

  const filteredTeams = teams.filter(t => 
    t.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.year.toString().includes(searchTerm)
  );

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8 flex flex-cols justify-between items-center gap-4">
        <h1 className="text-2xl font-black uppercase italic mb-8 tracking-tight">
            <span className="text-red-600" />
            Gestion des <span className="text-red-600">Équipes</span>
        </h1>
        <button 
          onClick={() => router.push('/live/super')}
          className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-colors"
        >
        <X size={24} />
        </button>
     </div>
        <div className="flex flex-cols relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <input 
            type="text"
            placeholder="Rechercher une équipe ou année..."
            className="bg-zinc-900 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm w-full md:w-64 focus:ring-2 focus:ring-red-600 outline-none transition-all"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      

      {/* Message Feedback */}
      {message.text && (
        <div className={`max-w-6xl mx-auto mb-6 p-4 rounded-xl flex items-center gap-3 font-bold text-sm animate-in fade-in slide-in-from-top-2
          ${message.type === 'success' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
          {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          {message.text}
        </div>
      )}

      {/* Table des équipes */}
      <div className="max-w-6xl mx-auto bg-zinc-900/30 border border-white/5 rounded-[2rem] overflow-hidden backdrop-blur-md">
        {loading ? (
          <div className="p-20 flex flex-col items-center justify-center gap-4 text-zinc-500">
            <Loader2 className="animate-spin" size={40} />
            <p className="font-bold uppercase tracking-tighter italic">Chargement de l'historique...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                  <th className="px-2 py-5">Équipe</th>
                  <th className="px-2 py-5">Année</th>
                  <th className="px-6 py-5 text-orange-600"><div className="flex items-center gap-2"><History size={14}/> Tireur</div></th>
                  <th className="px-6 py-5 text-purple-500"><div className="flex items-center gap-2"><ArrowRightLeft size={14}/> Pointeur</div></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredTeams.map((team) => (
                  <tr key={team.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-2 py-4 font-black italic uppercase text-lg">{team.nom}</td>
                    <td className="px-2 py-4">
                      <span className="px-3 py-1 bg-zinc-800 rounded-full text-[10px] font-bold text-zinc-400 border border-white/5">
                        {team.year}
                      </span>
                    </td>
                    
                    {/* Colonne TIREUR */}
                    <td className="px-6 py-4">
                      <select 
                        value={team.tireur_id}
                        onChange={(e) => handleUpdateMember(team.id, 'tireur_id', e.target.value)}
                        className="bg-transparent border-none text-sm font-bold focus:ring-0 cursor-pointer hover:text-orange-500 transition-colors outline-none"
                      >
                        {profiles.map(p => (
                          <option key={p.id} value={p.id} className="bg-zinc-900">{p.nom}</option>
                        ))}
                      </select>
                    </td>

                    {/* Colonne POINTEUR */}
                    <td className="px-6 py-4">
                      <select 
                        value={team.pointeur_id}
                        onChange={(e) => handleUpdateMember(team.id, 'pointeur_id', e.target.value)}
                        className="bg-transparent border-none text-sm font-bold focus:ring-0 cursor-pointer hover:text-purple-500 transition-colors outline-none"
                      >
                        {profiles.map(p => (
                          <option key={p.id} value={p.id} className="bg-zinc-900">{p.nom}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}