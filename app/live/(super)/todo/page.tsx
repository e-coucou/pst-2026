'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Loader2, X, RefreshCw, AlertTriangle, KeyRound } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function DevTodoDashboardPage() {
  const supabase = createClient();
  const router = useRouter();
  
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchTodoData = async () => {
    setLoading(true);
    try {
      // 1. VÉRIFICATION DE LA SESSION SUPABASE (Pour accès "Super User")
      const { data: { session }, error: sError } = await supabase.auth.getSession();
      
      if (sError || !session) {
        throw new Error("Authentification requise");
      }
      
      // OPTIONNEL... pas util j'ai supprimé
      // ex: if (session.user.email !== 'ton.email@dev.fr') throw new Error("Accès interdit");
      
      setSessionUser(session.user);

      // 2. Lecture du fichier via l'API
      const res = await fetch('/api/dev/todo');
      
      if (!res.ok) {
        if (res.status === 404) throw new Error("Fichier `todo.md` non trouvé à la racine");
        throw new Error("Erreur serveur lors de la lecture");
      }
      
      const data = await res.json();
      setContent(data.content);

    } catch (err: any) {
      console.error("Erreur Fetch:", err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodoData();
  }, []);

  // --- RENDU SI NON AUTHENTIFIÉ OU ERREUR DE PERMISSION ---
  if (error && error.includes("Authentification")) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-6 p-8">
        <KeyRound size={60} className="text-red-600 animate-pulse" />
        <h1 className="text-2xl font-black uppercase italic tracking-widest text-center">Accès <span className="text-red-600">Restreint</span></h1>
        <p className="text-zinc-500 text-sm max-w-sm text-center">Cette page de Roadmap est réservée aux administrateurs. Veuillez vous connecter.</p>
        <button onClick={() => router.push('/live/super/login')} className="px-6 py-3 bg-red-600 rounded-xl font-bold hover:bg-red-500 transition-colors">Se Connecter (Super User)</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-12 font-sans">
      {/* HEADER MUTUALISÉ (Même style que ta page Joueurs) */}
      <div className="max-w-4xl mx-auto mb-8 flex justify-between items-center">
        <h1 className="text-2xl font-black uppercase italic tracking-tight">
          PST 2026 <span className="text-red-600">Roadmap</span>
        </h1>
        <div className="flex gap-2">
          {sessionUser && (
             <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 bg-zinc-900 border border-white/5 px-4 py-2 rounded-2xl">
              <KeyRound size={12} className="text-green-500" />
              {sessionUser.email}
            </div>
          )}
          <button onClick={fetchTodoData} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-colors group" aria-label="Actualiser">
            <RefreshCw size={20} className={`text-zinc-500 group-hover:text-white transition-colors ${loading ? "animate-spin" : ""}`} />
          </button>
          <button onClick={() => router.push('/live/super')} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-colors group" aria-label="Fermer">
            <X size={24} className="text-zinc-500 group-hover:text-red-600 transition-colors" />
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        {loading ? (
          <div className="flex justify-center p-24"><Loader2 className="animate-spin text-red-600" size={40} /></div>
        ) : error ? (
           <div className="bg-red-950/50 border border-red-800 p-8 rounded-3xl flex flex-col items-center gap-4 text-center shadow-2xl">
                <AlertTriangle size={48} className="text-red-500" />
                <h2 className="text-lg font-bold text-red-200">Erreur de chargement</h2>
                <p className="text-red-300 text-sm">{error}</p>
                <button onClick={fetchTodoData} className="mt-4 px-5 py-2 bg-red-600 rounded-lg text-sm font-bold">Réessayer</button>
           </div>
        ) : (
          /* LE CONTENEUR PRINCIPAL STYLE PST */
          <div className="bg-zinc-900/30 border border-white/10 p-8 md:p-12 rounded-3xl shadow-2xl backdrop-blur-sm relative overflow-hidden">
            {/* Effet lumineux subtil en haut à gauche */}
            <div className="absolute -top-16 -left-16 w-32 h-32 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

            {/* LE PARSEUR MARKDOWN AVEC LE PLUGIN TAILWIND TYPOGRAPHY (prose) */}
            <article className="prose prose-invert max-w-none 
              prose-headings:uppercase prose-headings:italic prose-headings:font-black
              prose-h1:text-3xl prose-h1:text-red-600 prose-h1:border-b prose-h1:border-white/10 prose-h1:pb-6 prose-h1:mb-10
              prose-h2:text-xl prose-h2:mt-10 prose-h2:text-zinc-100 prose-h2:tracking-tight
              prose-p:text-zinc-400 prose-p:leading-relaxed
              prose-strong:text-white prose-strong:font-semibold
              prose-li:my-1 prose-li:text-zinc-400">
              
<ReactMarkdown 
  components={{
    // TITRE PRINCIPAL (#)
    h1: ({node, ...props}) => (
      <h1 className="text-4xl font-black uppercase italic text-red-600 mb-8 border-b-2 border-red-600/20 pb-4" {...props} />
    ),
    // SOUS-TITRES (##)
    h2: ({node, ...props}) => (
      <h2 className="text-xl font-black uppercase italic text-white mt-12 mb-6 flex items-center gap-3">
        <span className="w-1 h-6 bg-red-600"></span> {props.children}
      </h2>
    ),
    // PARAGRAPHES
    p: ({node, ...props}) => (
      <p className="text-zinc-400 text-sm font-medium leading-relaxed mb-4" {...props} />
    ),
    // LISTES ET CHECKBOXES
    li: ({node, ...props}) => {
      // Extraction propre du texte
      const getRawText = (n: any): string => {
        if (typeof n === 'string') return n;
        if (Array.isArray(n)) return n.map(getRawText).join('');
        if (n.props && n.props.children) return getRawText(n.props.children);
        return '';
      };

      const text = getRawText(props.children);
      const isDone = text.includes('[x]');
      const isTodo = text.includes('[ ]');

      if (isDone || isTodo) {
        const cleanText = text.replace('[x]', '').replace('[ ]', '').trim();
        return (
          <div className={`flex items-center gap-4 p-4 rounded-2xl mb-3 border transition-all ${
            isDone 
            ? 'bg-zinc-900/20 border-white/5 opacity-80' 
            : 'bg-zinc-800/40 border-white/10 hover:border-red-600/30'
          }`}>
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
              isDone ? 'bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.4)]' : 'border-2 border-zinc-700 bg-black'
            }`}>
              {isDone && <X size={14} className="text-white" />}
            </div>
            <span className={`text-sm font-bold tracking-tight uppercase ${
              isDone ? ' italic text-zinc-300' : 'text-zinc-100'
            }`}>
              {cleanText}
            </span>
          </div>
        );
      }
      return <li className="text-zinc-500 ml-6 list-disc mb-2" {...props} />;
    }
  }}
>
  {content}
</ReactMarkdown>
            </article>
          </div>
        )}
      </div>
    </div>
  );
}