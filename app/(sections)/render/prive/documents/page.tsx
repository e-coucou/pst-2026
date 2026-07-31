'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { ArrowLeft, Loader2, UploadCloud, FileText, Trash2, Download } from 'lucide-react';

interface DocumentRow {
  id: string;
  title: string;
  description: string | null;
  storage_path: string;
  file_size: number | null;
  created_at: string;
}

const BUCKET = 'residence_documents';

function formatSize(bytes: number | null) {
  if (!bytes) return '';
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} Mo` : `${(bytes / 1024).toFixed(0)} Ko`;
}

export default function ResidenceDocumentsPage() {
  const [docs, setDocs] = useState<DocumentRow[]>([]);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchDocs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchDocs() {
    setLoading(true);
    const { data } = await supabase.from('residence_documents').select('*').order('created_at', { ascending: false });
    if (data) {
      setDocs(data);
      if (data.length > 0) {
        const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrls(data.map(d => d.storage_path), 3600);
        const map: Record<string, string> = {};
        signed?.forEach(s => { if (s.signedUrl) map[s.path!] = s.signedUrl; });
        setSignedUrls(map);
      }
    }
    setLoading(false);
  }

  async function handleUpload() {
    if (!file || !title.trim()) return;
    setUploading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const path = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file);
    if (!uploadError) {
      const { error: insertError } = await supabase.from('residence_documents').insert({
        title: title.trim(),
        description: description.trim() || null,
        storage_path: path,
        file_size: file.size,
        mime_type: file.type,
        uploaded_by: user?.id ?? null,
      });
      if (!insertError) {
        setTitle('');
        setDescription('');
        setFile(null);
        await fetchDocs();
      }
    }
    setUploading(false);
  }

  async function handleDelete(doc: DocumentRow) {
    if (!confirm(`Supprimer "${doc.title}" ?`)) return;
    await supabase.storage.from(BUCKET).remove([doc.storage_path]);
    const { error } = await supabase.from('residence_documents').delete().eq('id', doc.id);
    if (!error) await fetchDocs();
  }

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <Loader2 className="text-red-600 animate-spin" size={40} />
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-20">
      <div className="max-w-4xl mx-auto w-full">

        <div className="flex items-center justify-between mb-10 flex-wrap gap-4">
          <Link href="/render/prive" className="inline-flex items-center gap-2 text-white bg-zinc-900 hover:bg-red-600 border border-white/10 hover:border-red-600 transition-all px-5 py-3 rounded-full text-xs font-black uppercase tracking-widest active:scale-95">
            <ArrowLeft size={16} /> Espace réservé
          </Link>
        </div>

        <div className="mb-10">
          <h1 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter">
            Documents <span className="text-red-600">Résidence</span>
          </h1>
          <p className="text-zinc-500 mt-2 font-bold uppercase tracking-widest text-[10px]">
            Convocations, comptes-rendus d&apos;AG, procès-verbaux...
          </p>
        </div>

        <div className="bg-zinc-900/50 border border-white/5 rounded-3xl p-6 mb-8 flex flex-col gap-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input placeholder="Titre du document" value={title} onChange={e => setTitle(e.target.value)}
              className="bg-zinc-800/50 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-red-600/50" />
            <input placeholder="Description (optionnel)" value={description} onChange={e => setDescription(e.target.value)}
              className="bg-zinc-800/50 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-red-600/50" />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <input type="file" accept="application/pdf" onChange={e => setFile(e.target.files?.[0] || null)}
              className="text-xs text-zinc-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-zinc-800 file:text-white file:text-[10px] file:font-black file:uppercase file:tracking-widest hover:file:bg-zinc-700" />
            <button onClick={handleUpload} disabled={uploading || !file || !title.trim()}
              className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white font-black uppercase tracking-widest text-[10px] px-5 py-3 rounded-xl transition-all active:scale-95">
              {uploading ? <Loader2 className="animate-spin" size={14} /> : <UploadCloud size={14} />} Importer
            </button>
          </div>
        </div>

        {docs.length === 0 ? (
          <div className="bg-zinc-900/50 border border-white/5 p-16 rounded-[3rem] text-center">
            <FileText className="text-zinc-400 mx-auto mb-4" size={32} />
            <p className="text-zinc-400 font-black uppercase tracking-widest">Aucun document pour l&apos;instant.</p>
          </div>
        ) : (
          <div className="bg-zinc-900/20 border border-white/5 rounded-[2rem] divide-y divide-white/5 overflow-hidden">
            {docs.map(doc => (
              <div key={doc.id} className="group flex items-center justify-between gap-4 px-6 py-5 hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="p-3 rounded-xl bg-zinc-800 text-red-600 shrink-0">
                    <FileText size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-black text-sm uppercase italic tracking-tight text-white truncate">{doc.title}</p>
                    {doc.description && <p className="text-xs text-zinc-500 truncate">{doc.description}</p>}
                    <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mt-1">
                      {new Date(doc.created_at).toLocaleDateString()} {doc.file_size ? `· ${formatSize(doc.file_size)}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  {signedUrls[doc.storage_path] && (
                    <a href={signedUrls[doc.storage_path]} target="_blank" rel="noopener noreferrer"
                      className="p-2.5 rounded-xl bg-white/5 text-zinc-400 hover:bg-red-600 hover:text-white transition-colors">
                      <Download size={16} />
                    </a>
                  )}
                  <button onClick={() => handleDelete(doc)}
                    className="p-2.5 rounded-xl bg-white/5 text-zinc-400 hover:bg-red-600 hover:text-white transition-colors opacity-0 group-hover:opacity-100">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
