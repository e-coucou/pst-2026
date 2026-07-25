'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { Film, Calendar, ExternalLink, Heart, Camera, ImageIcon, UploadCloud } from 'lucide-react';

interface Photo {
  name: string;
  url: string;
  year: number;
}

export default function VideosPage() {
  const [videos, setVideos] = useState<any[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();

      const { data: videosData, error: videosError } = await supabase
        .from('videos')
        .select('*')
        .order('year', { ascending: false });

      if (!videosError) setVideos(videosData || []);

      // La policy RLS du bucket réserve l'accès au dossier "private/".
      const { data: files } = await supabase.storage
        .from('photos_import')
        .list('private', { limit: 500, sortBy: { column: 'created_at', order: 'desc' } });

      if (files && files.length > 0) {
        const paths = files.map(f => `private/${f.name}`);
        const { data: signedUrls } = await supabase.storage
          .from('photos_import')
          .createSignedUrls(paths, 86400); // 24h : large marge si l'onglet reste ouvert longtemps

        const photoList: Photo[] = files
          .map(f => {
            const signed = signedUrls?.find(s => s.path === `private/${f.name}`);
            const createdAt = f.created_at ? new Date(f.created_at) : new Date();
            return signed?.signedUrl
              ? { name: f.name, url: signed.signedUrl, year: createdAt.getFullYear() }
              : null;
          })
          .filter((p): p is Photo => p !== null);

        setPhotos(photoList);
      }

      setLoading(false);
    };
    fetchData();
  }, []);

  const getEmbedUrl = (url: string) => {
    if (!url) return "";
    let videoId = "";
    if (url.includes("v=")) videoId = url.split("v=")[1]?.split("&")[0];
    else if (url.includes("youtu.be/")) videoId = url.split("youtu.be/")[1]?.split("?")[0];
    return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
  };

  const videoYears = Array.from(new Set(videos.map(v => v.year))).sort((a, b) => b - a);
  const photoYears = Array.from(new Set(photos.map(p => p.year))).sort((a, b) => b - a);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="text-red-600 font-black uppercase italic tracking-widest animate-pulse">
        Chargement de la zone membres...
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-20">
      <div className="max-w-7xl mx-auto w-full">

        {/* Header de la page centré */}
        <div className="mb-16 text-center flex flex-col items-center">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-red-600 p-2 rounded-xl shadow-[0_0_20px_rgba(220,38,38,0.4)]">
              <Film size={24} className="text-white" />
            </div>
            <span className="text-red-600 font-black uppercase tracking-[0.3em] text-xs">Médiathèque Privée</span>
          </div>
          <h1 className="text-5xl md:text-8xl font-black uppercase italic tracking-tighter">
            PST <span className="text-red-600">TV</span>
          </h1>
          <p className="text-zinc-500 mt-4 max-w-xl font-bold uppercase tracking-widest text-[10px] md:text-xs">
            Revivez les plus beaux points et les finales légendaires du tournoi.
          </p>
        </div>

        {/* Remerciements Philippine - Design "Générique" */}
        <div className="mb-16 relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-red-600/20 to-purple-600/20 rounded-[2.5rem] blur opacity-75"></div>
          <div className="relative bg-zinc-900/50 border border-white/10 p-8 md:p-12 rounded-[2.5rem] text-center overflow-hidden">
            <Heart className="text-red-600 mx-auto mb-6 animate-pulse" size={32} fill="currentColor" />
            <h2 className="text-xl md:text-2xl font-black uppercase italic mb-4 tracking-tight">
              Remerciements <span className="text-red-600 text-3xl">Spéciaux</span>
            </h2>
            <p className="text-zinc-300 max-w-3xl mx-auto leading-relaxed italic font-medium">
              Toutes ces vidéos ont été pensées, imaginées, créées, montées et publiées sous l'exclusif talent de
              <span className="text-white font-black px-2 uppercase">Philippine</span>.
              Les joueurs la remercient vivement pour son regard et sa créativité. Grâce à elle, nous pouvons vivre et revivre ces excellents moments saison après saison.
            </p>
            <div className="mt-6 text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500">
              Creative Direction & Montage • Philippine
            </div>
          </div>
        </div>

        {/* CTA IMPORT PHOTO */}
        <div className="mb-24 flex flex-col items-center text-center gap-4">
          <Link
            href="/videos/upload"
            className="inline-flex items-center gap-3 bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest text-sm px-8 py-4 rounded-2xl shadow-xl shadow-red-600/20 transition-all active:scale-95"
          >
            <UploadCloud size={20} />
            Importer une photo
          </Link>
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-[0.3em]">
            Participez à l&apos;enrichissement pictural !
          </p>
        </div>

        {/* GALERIE VIDÉOS */}
        <div className="flex items-center gap-6 mb-10 w-full">
          <h2 className="text-3xl md:text-4xl font-black italic uppercase text-white tracking-tighter shrink-0 flex items-center gap-3">
            <Film className="text-red-600" size={28} /> Galerie <span className="text-red-600">Vidéos</span>
          </h2>
          <div className="h-px flex-1 bg-gradient-to-r from-zinc-800 to-transparent"></div>
        </div>

        {videoYears.length === 0 ? (
          <div className="bg-zinc-900/50 border border-white/5 p-20 rounded-[3rem] text-center mb-24">
            <p className="text-zinc-600 font-black uppercase tracking-widest">Aucune vidéo disponible.</p>
          </div>
        ) : (
          videoYears.map(year => (
            <section key={year} className="mb-24 w-full">
              {/* Titre de saison */}
              <div className="flex items-center gap-6 mb-10 w-full">
                <h3 className="text-4xl font-black italic uppercase text-white tracking-tighter shrink-0">
                  Saison <span className="text-red-600">{year}</span>
                </h3>
                <div className="h-px flex-1 bg-gradient-to-r from-zinc-800 to-transparent"></div>
              </div>

              {/* GRILLE : On force le w-full et on s'assure que les colonnes sont égales */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 w-full justify-items-center">
                {videos.filter(v => v.year === year).map(video => (
                  <div key={video.id} className="group flex flex-col w-full max-w-full lg:max-w-none">
                    {/* Cadre Vidéo */}
                    <div className="relative aspect-video bg-zinc-900 rounded-[2rem] overflow-hidden border border-white/5 group-hover:border-red-600/50 transition-all duration-500 shadow-2xl w-full">
                      <iframe
                        src={getEmbedUrl(video.link)}
                        className="w-full h-full absolute inset-0"
                        allowFullScreen
                      />
                    </div>

                    {/* Infos Vidéo */}
                    <div className="mt-5 px-4 flex justify-between items-center w-full">
                      <div className="flex items-center gap-2 text-zinc-500">
                        <Calendar size={14} className="text-red-600" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] italic">{video.year}</span>
                      </div>
                      <a
                        href={video.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-zinc-900 p-2 rounded-full text-zinc-500 hover:text-white hover:bg-red-600 transition-all duration-300"
                      >
                        <ExternalLink size={14} />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))
        )}

        {/* GALERIE PHOTOS */}
        <div className="flex items-center gap-6 mb-10 w-full">
          <h2 className="text-3xl md:text-4xl font-black italic uppercase text-white tracking-tighter shrink-0 flex items-center gap-3">
            <ImageIcon className="text-red-600" size={28} /> Galerie <span className="text-red-600">Photos</span>
          </h2>
          <div className="h-px flex-1 bg-gradient-to-r from-zinc-800 to-transparent"></div>
        </div>

        {photoYears.length === 0 ? (
          <div className="bg-zinc-900/50 border border-white/5 p-20 rounded-[3rem] text-center">
            <Camera className="text-zinc-700 mx-auto mb-4" size={32} />
            <p className="text-zinc-600 font-black uppercase tracking-widest">Aucune photo pour l&apos;instant.</p>
          </div>
        ) : (
          photoYears.map(year => (
            <section key={year} className="mb-16 w-full">
              <div className="flex items-center gap-6 mb-10 w-full">
                <h3 className="text-4xl font-black italic uppercase text-white tracking-tighter shrink-0">
                  Saison <span className="text-red-600">{year}</span>
                </h3>
                <div className="h-px flex-1 bg-gradient-to-r from-zinc-800 to-transparent"></div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 w-full">
                {photos.filter(p => p.year === year).map(photo => (
                  <a
                    key={photo.name}
                    href={photo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative aspect-square rounded-2xl overflow-hidden border border-white/5 hover:border-red-600/50 transition-all duration-300 shadow-xl bg-zinc-900"
                  >
                    <img
                      src={photo.url}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  </a>
                ))}
              </div>
            </section>
          ))
        )}

      </div>
    </div>
  );
}
