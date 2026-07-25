'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { ImageIcon, Camera, ArrowLeft, UploadCloud } from 'lucide-react';
import { logActivity } from '@/utils/log-activity';

interface Photo {
  name: string;
  path: string;
  url: string;
  year: number;
}

export default function PhotosGalleryPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchPhotos = async () => {
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
            const path = `private/${f.name}`;
            const signed = signedUrls?.find(s => s.path === path);
            const createdAt = f.created_at ? new Date(f.created_at) : new Date();
            return signed?.signedUrl
              ? { name: f.name, path, url: signed.signedUrl, year: createdAt.getFullYear() }
              : null;
          })
          .filter((p): p is Photo => p !== null);

        setPhotos(photoList);
      }

      setLoading(false);
    };
    fetchPhotos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const photoYears = Array.from(new Set(photos.map(p => p.year))).sort((a, b) => b - a);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="text-red-600 font-black uppercase italic tracking-widest animate-pulse">
        Chargement de la galerie...
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-20">
      <div className="max-w-7xl mx-auto w-full">

        <div className="flex items-center justify-between mb-10">
          <Link href="/videos" className="inline-flex items-center gap-2 text-white bg-zinc-900 hover:bg-red-600 border border-white/10 hover:border-red-600 transition-all px-5 py-3 rounded-full text-xs font-black uppercase tracking-widest active:scale-95">
            <ArrowLeft size={16} /> Médiathèque
          </Link>
          <Link
            href="/videos/upload"
            className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest text-[10px] px-5 py-3 rounded-xl transition-all active:scale-95"
          >
            <UploadCloud size={14} /> Importer une photo
          </Link>
        </div>

        {/* Header de la page centré */}
        <div className="mb-16 text-center flex flex-col items-center">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-red-600 p-2 rounded-xl shadow-[0_0_20px_rgba(220,38,38,0.4)]">
              <ImageIcon size={24} className="text-white" />
            </div>
            <span className="text-red-600 font-black uppercase tracking-[0.3em] text-xs">Galerie Photos</span>
          </div>
          <h1 className="text-5xl md:text-8xl font-black uppercase italic tracking-tighter">
            PST <span className="text-red-600">PICS</span>
          </h1>
          <p className="text-zinc-500 mt-4 max-w-xl font-bold uppercase tracking-widest text-[10px] md:text-xs">
            Les photos partagées par les membres, saison après saison.
          </p>
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
                <h2 className="text-4xl font-black italic uppercase text-white tracking-tighter shrink-0">
                  Saison <span className="text-red-600">{year}</span>
                </h2>
                <div className="h-px flex-1 bg-gradient-to-r from-zinc-800 to-transparent"></div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 w-full">
                {photos.filter(p => p.year === year).map(photo => (
                  <a
                    key={photo.name}
                    href={photo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => logActivity(supabase, 'PHOTO_VIEW', { photo: photo.path })}
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
