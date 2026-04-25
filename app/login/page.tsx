'use client';

import { useState, Suspense } from 'react'; // Ajout de Suspense ici
import { createClient } from '@/utils/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { LockKeyhole, Zap } from 'lucide-react';
import Link from 'next/link';

// 1. On crée un composant interne pour le formulaire
function LoginForm() {
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const message = searchParams.get('message');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = `${nickname.toLowerCase().trim()}@pst.net`;
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("Nickname ou mot de passe incorrect.");
    } else {
      router.push('/classement');
      router.refresh();
    }
  };

  return (
    <div className="max-w-md w-full">
      {message && (
        <div className="mb-6 bg-green-500/10 border border-green-500/20 p-4 rounded-2xl text-green-500 text-center text-xs font-bold uppercase tracking-widest">
          {message}
        </div>
      )}
      
      <div className="bg-zinc-900/50 border border-white/10 p-10 rounded-[3rem] shadow-2xl backdrop-blur-xl">
        <div className="text-center mb-10">
          <div className="bg-red-600 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-red-600/30">
            <LockKeyhole className="text-white" size={28} />
          </div>
          <h1 className="text-4xl font-black uppercase italic tracking-tighter">
            PST <span className="text-red-600 italic">Club</span>
          </h1>
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] mt-2 italic">
            Espace Membres
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <input 
            className="w-full bg-black border border-white/5 rounded-2xl px-6 py-4 outline-none focus:border-red-600 transition-all font-bold"
            placeholder="Nickname"
            onChange={(e) => setNickname(e.target.value)}
            required
          />
          <input 
            type="password"
            className="w-full bg-black border border-white/5 rounded-2xl px-6 py-4 outline-none focus:border-red-600 transition-all"
            placeholder="Mot de passe"
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && <p className="text-red-600 text-[10px] font-black uppercase text-center italic tracking-widest">{error}</p>}

          <button className="w-full bg-red-600 hover:bg-red-700 text-white font-black uppercase py-5 rounded-[1.5rem] transition-all shadow-xl shadow-red-600/20 active:scale-95 flex items-center justify-center gap-2 tracking-[0.2em]">
            Connexion <Zap size={18} fill="currentColor" />
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">
            Pas encore de compte ? <Link href="/signup" className="text-white hover:text-red-600 underline ml-2 transition-colors">S'inscrire</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

// 2. Le composant principal enveloppe le formulaire dans un Suspense
export default function LoginPage() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6 text-white font-sans">
      <Suspense fallback={<div className="text-white uppercase font-black animate-pulse">Chargement...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
