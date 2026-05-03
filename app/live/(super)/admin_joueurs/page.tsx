'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Trash2, UserPlus, Loader2, ArrowLeft, Camera, AlertCircle, Upload } from 'lucide-react';
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
      const { data: profiles, error: pError } = await supabase
        .from('profiles')
        .select('*')
        .order('nom');
      
      if (pError) throw pError;

      const [teamsRes, liveTeamsRes] = await Promise.all([
        supabase.from('teams').select('pointeur_id, tireur_id'),
        supabase.from('live_teams').select('pointeur_id, tireur_id')
      ]);

      const engaged = new Set<number>();
      
      teamsRes.data?.forEach(t => {
        if (t.pointeur_id) engaged.add(Number(t.pointeur_id));
        if (t.tireur_id) engaged.add(Number(t.tireur_id));
      });

      liveTeamsRes.data?.forEach(t => {
        if (t.pointeur_id) engaged.add(Number(t.pointeur_id));
        if (t.tireur_id) engaged.add(Number(t.tireur_id));
      });

      setEngagedPlayerIds(engaged);

      const filePaths = profiles?.map(p => p.photo_url).filter(Boolean) as string[];
      
      if (filePaths && filePaths.length > 0) {
        const { data: sData, error: sError } = await supabase.storage
          .from('joueurs_photos')
          .createSignedUrls(filePaths, 3600);

        if (!sError && sData) {
          const urls: Record<string, string> = {};
          sData.forEach(item => {
            if (item.path && item.signedUrl) {
              urls[item.path] = item.signedUrl;
            }
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

  useEffect(() => {
    fetchData();
  }, []);

  // --- NOUVEL UTILITAIRE MUTUALISÉ ---
  const compressAndUpload = async (file: File, playerId: number) => {
    const options = { maxSizeMB: 0.15, maxWidthOrHeight: 800, useWebWorker: true };
    const compressed = await imageCompression(file, options);
    const fileExt = file.name.split('.').pop();
    const fileName = `${playerId}_${Date.now()}.${fileExt}`;

    const { error: upError } = await supabase.storage.from('joueurs_photos').upload(fileName, compressed);
    if (upError) throw new Error(`Erreur Storage: ${upError.message}`);
    
    return fileName;
  };

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || isUploading) return;

    setIsUploading(true);
    try {
      const nextId = players.length > 0 ? Math.max(...players.map(p => p.id)) + 1 : 1;
      let photoPath = null;

      if (selectedFile) {
        photoPath = await compressAndUpload(selectedFile, nextId);
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

  // --- NOUVELLE FONCTION POUR LES JOUEURS EXISTANTS ---
  const handleUpdatePhoto = async (playerId: number, file: File) => {
    setIsUploading(true);
    try {
      const photoPath = await compressAndUpload(file, playerId);
      const { error: updError } = await supabase
        .from('profiles')
        .update({ photo_url: photoPath })
        .eq('id', playerId);

      if (updError) throw updError;
      fetchData();
    } catch (err: any) { alert(err.message); } finally { setIsUploading(false); }
  };

  const handleDeletePlayer = async (id: number, name: string, photoPath: string | null) => {
    if (engagedPlayerIds.has(Number(id))) {
      alert(`Impossible : ${name} est déjà lié à des équipes existantes.`);
      return;
    }

    if (!confirm(`Supprimer définitivement le profil de ${name} ?`)) return;

    try {
      if (photoPath) {
        await supabase.storage.from('joueurs_photos').remove([photoPath]);
      }
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      if (error) throw error; fetchData();
    } catch (err: any) { alert("Erreur suppression: " + err.message); }
  };


  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-12 font-sans">
      <div className="max-w-2xl mx-auto">
        <button onClick={() => window.history.back()} className="mb-8 flex items-center gap-2 text-zinc-500 hover:text-white transition-colors group">
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" /> 
          Retour Admin
        </button>

        <h1 className="text-3xl font-black uppercase italic mb-8 tracking-tight">
          Gestion des <span className="text-red-600">Joueurs</span>
        </h1>

        <form onSubmit={handleAddPlayer} className="bg-zinc-900/50 p-6 rounded-3xl border border-white/10 space-y-4 mb-12 shadow-2xl">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="relative w-24 h-24 bg-zinc-800 rounded-2xl flex items-center justify-center border-2 border-dashed border-zinc-700 hover:border-red-600 transition-all overflow-hidden group shrink-0">
              {selectedFile ? (
                <img src={URL.createObjectURL(selectedFile)} className="w-full h-full object-cover" />
              ) : (
                <Camera className="text-zinc-500 group-hover:text-red-600 transition-colors" />
              )}
              <input type="file" accept="image/*" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} className="absolute inset-0 opacity-0 cursor-pointer" />
            </div>

            <div className="flex-1 space-y-4">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Prénom Nom..."
                className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3 focus:border-red-600 outline-none transition-all placeholder:text-zinc-600 text-white"
              />
              <button 
                type="submit" 
                disabled={isUploading || !newName.trim()}
                className="w-full bg-red-600 hover:bg-red-500 disabled:bg-zinc-800 disabled:text-zinc-600 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg"
              >
                {isUploading ? <Loader2 className="animate-spin" size={18} /> : <UserPlus size={18} />}
                Ajouter au tournoi
              </button>
            </div>
          </div>
        </form>

        {loading ? (
          <div className="flex justify-center p-12"><Loader2 className="animate-spin text-red-600" /></div>
        ) : (
          <div className="space-y-3">
            {players.map(player => {
              const isEngaged = engagedPlayerIds.has(Number(player.id));
              const imageUrl = player.photo_url ? signedUrls[player.photo_url] : null;

              return (
                <div key={player.id} className="flex items-center justify-between p-4 bg-zinc-900/30 border border-white/5 rounded-2xl hover:border-white/10 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-zinc-800 border border-white/10 overflow-hidden flex-shrink-0 shadow-inner relative">
                      {imageUrl ? (
                        <img src={imageUrl} className="w-full h-full object-cover" alt={player.nom} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-600 font-bold uppercase">PST</div>
                      )}
                      {isUploading && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><Loader2 size={12} className="animate-spin" /></div>}
                    </div>
                    <div>
                      <div className="font-bold uppercase leading-tight text-sm md:text-base">{player.nom}</div>
                      <div className="text-[10px] text-zinc-600 font-mono italic">ID: {player.id}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {/* BOUTON AJOUT PHOTO SI VIDE */}
                    {!player.photo_url && (
                      <label className="p-2 text-zinc-500 hover:text-blue-500 cursor-pointer transition-colors" title="Ajouter une photo">
                        <Upload size={20} />
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={(e) => e.target.files?.[0] && handleUpdatePhoto(player.id, e.target.files[0])} 
                        />
                      </label>
                    )}

                    {isEngaged ? (
                      <div className="flex items-center gap-1.5 text-zinc-500 text-[9px] font-black uppercase tracking-widest bg-zinc-800/80 px-3 py-2 rounded-full border border-white/5 shadow-sm">
                        <AlertCircle size={10} className="text-zinc-600" /> 
                        Engagé
                      </div>
                    ) : (
                      <button
                        onClick={() => handleDeletePlayer(player.id, player.nom, player.photo_url)}
                        className="text-zinc-700 hover:text-red-500 p-2 transition-all hover:bg-red-500/10 rounded-lg"
                      >
                        <Trash2 size={20} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
