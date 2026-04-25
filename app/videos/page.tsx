'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Play, Film, Calendar, ExternalLink } from 'lucide-react';

export default function VideosPage() {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVideos = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .order('year', { ascending: false });
      
      if (!error) setVideos(data || []);
      setLoading(false);
    };
    fetchVideos();
  }, []);

  // Fonction pour transformer le lien YouTube en embed
  const getEmbedUrl = (url: string) => {
    if (!url) return "";
    let videoId = "";
    if (url.includes("v=")) videoId = url.split("v=")[1]?.split("&")[0];
    else if (url.includes("youtu.be/")) videoId = url.split("youtu.be/")[1]?.split("?")[0];
    
    return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
  };

  const years = Array.from(new Set(videos.map(v => v.year))).sort((a, b) => b - a);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-red-600 font-black uppercase italic tracking-widest">Chargement de la zone membres...</div>;

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-20">
      <div className="max-w-7xl mx-auto">
        
        {/* Header de la page */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-red-600 p-2 rounded-xl">
              <Film size={24} className="text-white" />
            </div>
            <span className="text-red-600 font-black uppercase tracking-[0.3em] text-xs">Médiathèque Privée</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black uppercase italic tracking-tighter">PST <span className="text-red-600">TV</span></h1>
          <p className="text-zinc-500 mt-4 max-w-xl font-bold uppercase tracking-widest text-[10px] md:text-xs">
            Revivez les plus beaux points et les finales légendaires du tournoi.
          </p>
        </div>

        {years.length === 0 ? (
          <div className="bg-zinc-900/50 border border-white/5 p-20 rounded-[3rem] text-center">
            <p className="text-zinc-600 font-black uppercase tracking-widest">Aucune vidéo disponible pour le moment.</p>
          </div>
        ) : (
          years.map(year => (
            <section key={year} className="mb-20">
              <div className="flex items-center gap-6 mb-8">
                <h2 className="text-3xl font-black italic uppercase text-white">Saison {year}</h2>
                <div className="h-px flex-1 bg-zinc-900"></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {videos.filter(v => v.year === year).map(video => (
                  <div key={video.id} className="group flex flex-col">
                    {/* Container Vidéo */}
                    <div className="relative aspect-video bg-zinc-900 rounded-[2rem] overflow-hidden border border-white/5 group-hover:border-red-600/50 transition-all shadow-2xl">
                      <iframe 
                        src={getEmbedUrl(video.link)}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                    
                    {/* Info Vidéo */}
                    <div className="mt-4 px-4 flex justify-between items-center">
                      <div className="flex items-center gap-2 text-zinc-500">
                        <Calendar size={14} />
                        <span className="text-[10px] font-black uppercase tracking-widest italic">{video.year}</span>
                      </div>
                      <a 
                        href={video.link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-zinc-500 hover:text-red-600 transition-colors"
                      >
                        <ExternalLink size={16} />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
