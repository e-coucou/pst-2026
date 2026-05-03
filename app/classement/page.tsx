'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Trash2, UserPlus, Loader2, ArrowLeft, Camera, AlertCircle } from 'lucide-react';
import imageCompression from 'browser-image-compression';

export default function ManagePlayersPage() {
  const supabase = createClient();
  
  // États pour les données
  const [players, setPlayers] = useState<any[]>([]);
  const [engagedPlayerIds, setEngagedPlayerIds] = useState<Set<number>>(new Set());
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  
  // États de chargement et formulaire
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [newName, setNewName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Récupérer tous les profils
      const { data: profiles, error: pError } = await supabase
        .from('profiles')
        .select('*')
        .order('nom');
      
      if (pError) throw pError;

      // 2. Vérifier qui est engagé (Teams et Live_Teams) pour bloquer le delete
      const [teamsRes, liveTeamsRes] = await Promise.all([
        supabase.from('teams').select('pointeur_id, tireur_id'),
        supabase.from('live_teams').select('pointeur_id, tireur_id')
      ]);

      const engaged = new Set<number>();
      [...(teamsRes.data || []), ...(liveTeamsRes.data || [])].forEach(t => {
        if (t.pointeur_id) engaged.add(t.pointeur_id);
        if (t.tireur_id) engaged.add(t.tireur_id);
      });
      setEngagedPlayerIds(engaged);

      // 3. Gérer les Signed URLs pour les photos
      const filePaths = profiles?.map(p => p.photo_url).filter(Boolean) as string[];
      if (filePaths && filePaths.length > 0) {
        // On extrait juste le nom du fichier du chemin complet si nécessaire
        // (Dépend de comment tu stockes l'url, ici on suppose le path relatif dans le bucket)
        const { data: sData, error: sError } = await supabase.storage
          .from('joueurs_photos')
          .createSignedUrls(filePaths, 3600);

        if (!sError && sData) {
          const urls: Record<string, string> = {};
          sData.forEach(item => {
            if (item.path && item.signedUrl) urls[item.path] = item.signedUrl;
          });
          setSignedUrls(urls);
        }
      }

      setPlayers(profiles || []);
    } catch (error: any) {
      console.error("Erreur fetch:", error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || isUploading) return;

    setIsUploading(true);
    try {
      const nextId = players.length > 0 ? Math.max(...players.map(p => p.id)) + 1 : 1;
      let photoPath = null;

      if (selectedFile) {
        // Compression < 150ko
        const options = { maxSizeMB: 0.15, maxWidthOrHeight: 800, useWebWorker: true };
        const compressedFile = await imageCompression(selectedFile, options);
        
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${nextId}_${newName.trim().toLowerCase().replace(/\s+/g, '_')}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('joueurs_photos')
          .upload(fileName, compressedFile, { upsert: true });

        if (uploadError) throw uploadError;
        photoPath = fileName; // On stocke le path relatif pour créer les Signed URLs plus tard
      }

      const { error: insertError } = await supabase
        .from('profiles')
        .insert([{ id: nextId, nom: newName.trim(), photo_url: photoPath }]);

      if (insertError) throw insertError;

      setNewName('');
      setSelectedFile(null);
      fetchData();
    } catch (err: any) {
      alert("Erreur: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeletePlayer = async (id: number, name: string, photoPath: string | null) => {
    if (engagedPlayerIds.has(id)) {
      alert(`Impossible : ${name} est déjà lié à des matchs.`);
      return;
    }

    if (!confirm(`Supprimer définitivement le profil de ${name} ?`)) return;

    try {
      if (photoPath) {
        await supabase.storage.from('joueurs_photos').remove([photoPath]);
      }
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (err: any) {
      alert("Erreur suppression: " + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-12">
      <div className="max-w-2xl mx-auto">
        <button onClick={() => window.history.back()} className="mb-8 flex items-center gap-2 text-zinc-500 hover:text-white transition-colors">
          <ArrowLeft size={20} /> Retour Admin
        </button>

        <h1 className="text-3xl font-black uppercase italic mb-8">Gestion des <span className="text-red-600">Joueurs</span></h1>

        {/* FORMULAIRE D'AJOUT */}
        <form onSubmit={handleAddPlayer} className="bg-zinc-900 p-6 rounded-3xl border border-white/5 space-y-4 mb-12">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="relative w-24 h-24 bg-zinc-800 rounded-2xl flex items-center justify-center border-2 border-dashed border-zinc-700 hover:border-red-600 transition-all overflow-hidden group">
              {selectedFile ? (
                <img src={URL.createObjectURL(selectedFile)} className="w-full h-full object-cover" alt="Preview" />
              ) : (
                <Camera className="text-zinc-500 group-hover:text-red-600" />
              )}
              <input type="file" accept="image/*" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} className="absolute inset-0 opacity-0 cursor-pointer" />
            </div>

            <div className="flex-1 space-y-4">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nom du joueur..."
                className="w-full bg-zinc-800 border border-transparent rounded-xl px-4 py-3 focus:border-red-600 outline-none transition-all"
              />
              <button 
                type="submit" 
                disabled={isUploading || !newName.trim()}
                className="w-full bg-red-600 hover:bg-red-500 disabled:bg-zinc-700 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
              >
                {isUploading ? <Loader2 className="animate-spin" /> : <UserPlus size={18} />}
                {isUploading ? "Création en cours..." : "Ajouter le joueur"}
              </button>
            </div>
          </div>
        </form>

        {/* LISTE DES JOUEURS */}
        {loading ? (
          <div className="flex justify-center p-12"><Loader2 className="animate-spin text-red-600" /></div>
        ) : (
          <div className="space-y-3">
            {players.map(player => {
              const isEngaged = engagedPlayerIds.has(player.id);
              const imageUrl = player.photo_url ? signedUrls[player.photo_url] : null;

              return (
                <div key={player.id} className="flex items-center justify-between p-4 bg-zinc-900/50 border border-white/5 rounded-2xl group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-zinc-800 border border-white/10 overflow-hidden">
                      {imageUrl ? (
                        <img src={imageUrl} className="w-full h-full object-cover" alt={player.nom} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-600 uppercase">PST</div>
                      )}
                    </div>
                    <div>
                      <div className="font-bold uppercase leading-tight">{player.nom}</div>
                      <div className="text-[10px] text-zinc-500 italic">ID: {player.id}</div>
                    </div>
                  </div>
                  
                  {isEngaged ? (
                    <div className="flex items-center gap-1.5 text-zinc-600 text-[10px] font-black uppercase tracking-wider bg-zinc-800/50 px-3 py-1.5 rounded-full">
                      <AlertCircle size={12} /> Joueur Engagé
                    </div>
                  ) : (
                    <button
                      onClick={() => handleDeletePlayer(player.id, player.nom, player.photo_url)}
                      className="text-zinc-600 hover:text-red-600 p-2 transition-colors"
                    >
                      <Trash2 size={20} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

