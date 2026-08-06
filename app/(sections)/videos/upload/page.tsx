'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import imageCompression from 'browser-image-compression';
import { logActivity } from '@/utils/log-activity';
import { UploadCloud, X, Loader2, CheckCircle2, AlertCircle, Camera } from 'lucide-react';

// Supabase interprète la limite du bucket en Mo décimal (1 MB = 1 000 000 octets),
// pas en Mio binaire : on utilise la même base, avec une petite marge de sécurité,
// pour ne jamais se faire recaler par le serveur alors qu'on pensait être dans les clous.
const BUCKET_LIMIT_MB = 1.5;
const SAFETY_MARGIN = 0.95;
const MAX_BYTES = BUCKET_LIMIT_MB * 1_000_000 * SAFETY_MARGIN; // ~1 425 000 octets
const formatKo = (bytes: number) => `${Math.round(bytes / 1024)} Ko`;

// La cible maxSizeMB de la lib n'est qu'indicative (nombre d'itérations limité par
// appel) : on boucle nous-mêmes sur des réglages de plus en plus agressifs, en
// repartant à chaque fois du résultat précédent, jusqu'à passer sous la limite.
// La lib écrase la qualité autant qu'il faut pour tenir dans maxSizeMB à la
// résolution donnée : mieux vaut viser une résolution déjà raisonnable avec une
// qualité de départ haute, plutôt qu'une grande résolution écrasée en qualité.
const COMPRESSION_STEPS = [
  { maxWidthOrHeight: 1920, initialQuality: 0.9 },
  { maxWidthOrHeight: 1600, initialQuality: 0.88 },
  { maxWidthOrHeight: 1280, initialQuality: 0.85 },
  { maxWidthOrHeight: 1080, initialQuality: 0.8 },
  { maxWidthOrHeight: 900, initialQuality: 0.75 },
];

async function compressUnderLimit(file: File): Promise<File> {
  let result: File = file;
  try {
    for (const step of COMPRESSION_STEPS) {
      result = await imageCompression(result, {
        maxSizeMB: MAX_BYTES / (1024 * 1024),
        maxWidthOrHeight: step.maxWidthOrHeight,
        fileType: 'image/webp',
        useWebWorker: true,
        initialQuality: step.initialQuality,
      });
      if (result.size <= MAX_BYTES) break;
    }
  } catch {
    // Format illisible par le navigateur (ex: HEIC brut échappé à la conversion iOS)
    throw new Error("Format d'image non lisible par le navigateur. Essaie une capture d'écran ou une photo au format JPEG.");
  }
  return result;
}

// Vignette légère pour la galerie (400px suffit largement en grille) : une seule
// passe, pas besoin de boucle, un webp 400px tient toujours largement sous 100 Ko.
async function makeThumbnail(file: File): Promise<File> {
  return imageCompression(file, {
    maxWidthOrHeight: 400,
    initialQuality: 0.7,
    maxSizeMB: 0.1,
    fileType: 'image/webp',
    useWebWorker: true,
  });
}

export default function UploadPhotoPage() {
  const router = useRouter();
  const supabase = createClient();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [oversizedBlob, setOversizedBlob] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (file: File | null) => {
    setError('');
    setSuccess(false);
    setOversizedBlob(null);
    setSelectedFile(file);
    setPreviewUrl(file ? URL.createObjectURL(file) : null);
  };

  // Envoie la version pleine taille + une vignette (même nom de base, dossiers
  // séparés) : la galerie ne charge que les vignettes, le clic ouvre la version
  // complète.
  const sendToStorage = async (full: File) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Tu dois être connecté pour importer une photo.");

    const baseName = `${user.id}_${Date.now()}.webp`;
    // La policy RLS du bucket exige que le fichier soit dans le dossier "private/".
    const fullPath = `private/full/${baseName}`;
    const thumbPath = `private/thumbs/${baseName}`;

    const { error: upError } = await supabase.storage
      .from('photos_import')
      .upload(fullPath, full, { contentType: 'image/webp' });

    if (upError) {
      if (/exceeded the maximum allowed size/i.test(upError.message)) {
        throw new Error(
          `Le serveur a refusé la photo (${formatKo(full.size)}) : elle dépasse la limite de ${formatKo(MAX_BYTES)}.`
        );
      }
      throw upError;
    }

    try {
      const thumbnail = await makeThumbnail(full);
      const { error: thumbError } = await supabase.storage
        .from('photos_import')
        .upload(thumbPath, thumbnail, { contentType: 'image/webp' });
      if (thumbError) console.error('Erreur upload vignette:', thumbError.message);
    } catch (e) {
      // La vignette est un bonus pour la galerie : son échec ne doit pas faire
      // échouer l'import, la photo pleine taille est déjà en ligne.
      console.error('Erreur génération vignette:', e);
    }

    logActivity(supabase, 'PHOTO_UPLOAD', { path: '/videos/upload' });
    setSuccess(true);
    setSelectedFile(null);
    setPreviewUrl(null);
    setOversizedBlob(null);
  };

  // Compresse et envoie. Tant que le résultat dépasse la limite, on ne tente pas
  // l'upload : on affiche la taille exacte et on garde le blob pour le bouton
  // "Envoyer quand même" (au cas où l'utilisateur veuille forcer malgré tout).
  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setError('');
    try {
      const compressed = await compressUnderLimit(selectedFile);

      if (compressed.size > MAX_BYTES) {
        setOversizedBlob(compressed);
        throw new Error(
          `Photo encore trop lourde après compression : ${formatKo(compressed.size)} (maximum autorisé : ${formatKo(MAX_BYTES)}).`
        );
      }

      await sendToStorage(compressed);
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'import.");
    } finally {
      setUploading(false);
    }
  };

  const handleForceSend = async () => {
    if (!oversizedBlob) return;
    setUploading(true);
    setError('');
    try {
      await sendToStorage(oversizedBlob);
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'import.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-black uppercase italic tracking-tighter">
            Importer <span className="text-red-600">une photo</span>
          </h1>
          <button
            onClick={() => router.push('/videos')}
            className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-colors"
            aria-label="Fermer"
          >
            <X size={24} />
          </button>
        </div>

        <div className="bg-zinc-900/50 border border-white/10 p-8 rounded-[3rem] shadow-2xl space-y-6">

          <label className="relative flex flex-col items-center justify-center aspect-square bg-zinc-800/50 rounded-[2rem] border-2 border-dashed border-zinc-700 hover:border-red-600 transition-all overflow-hidden cursor-pointer group">
            {previewUrl ? (
              <img src={previewUrl} className="w-full h-full object-cover" alt="Aperçu" />
            ) : (
              <div className="flex flex-col items-center gap-3 text-zinc-500 group-hover:text-red-600 transition-colors">
                <Camera size={40} />
                <span className="text-[10px] font-black uppercase tracking-widest">Choisir une photo</span>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              className="absolute inset-0 opacity-0 cursor-pointer"
              onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
            />
          </label>

          {error && (
            <div className="bg-red-600/10 border border-red-600/20 p-4 rounded-xl text-red-500 text-[10px] font-black uppercase text-center flex items-center justify-center gap-2">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          {success && (
            <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-xl text-green-500 text-[10px] font-black uppercase text-center flex items-center justify-center gap-2">
              <CheckCircle2 size={14} /> Photo importée avec succès !
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-zinc-800 disabled:text-zinc-400 text-white font-black uppercase py-4 rounded-2xl transition-all shadow-xl shadow-red-600/20 active:scale-95 flex items-center justify-center gap-3 tracking-widest"
          >
            {uploading ? <Loader2 className="animate-spin" size={18} /> : <UploadCloud size={18} />}
            {uploading ? 'Compression & envoi...' : 'Envoyer'}
          </button>

          {oversizedBlob && !uploading && (
            <button
              onClick={handleForceSend}
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-black uppercase py-3 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2 tracking-widest text-xs"
            >
              Envoyer quand même ({formatKo(oversizedBlob.size)})
            </button>
          )}

          <button
            onClick={() => router.push('/videos/photos')}
            className="w-full text-zinc-500 font-bold text-xs uppercase hover:text-white transition-colors"
          >
            Retour à la galerie
          </button>

        </div>
      </div>
    </div>
  );
}
