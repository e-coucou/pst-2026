'use client';

import { useState, useEffect, Suspense } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { LockKeyhole, Zap, Loader2 } from 'lucide-react';
import Link from 'next/link';

// Logo Google identique au Signup pour la cohérence
const GoogleLogo = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z" fill="#EA4335"/>
  </svg>
);

function LoginForm() {
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const message = searchParams.get('message');

  useEffect(() => {
    const authError = searchParams.get('error');
    if (authError === 'auth_failed') {
      setError("La connexion a échoué. Réessaie.");
    } else if (authError === 'invite_required') {
      setError("Ce compte Google n'a pas encore de code d'invitation validé : inscris-toi via la page d'inscription.");
    }
  }, [searchParams]);

  const logActivity = async (action: string, details: string, userId?: string) => {
    try {
      await supabase.from('session_logs').insert({
        user_id: userId || null, // Ajout du user_id pour valider la RLS
        player_nickname: nickname ? nickname.toLowerCase().trim() : 'google_auth',
        action: action.toUpperCase(), // Style PST : Uppercase
        details: details
      });
    } catch (e) {
      console.error("Erreur log:", e);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const cleanNickname = nickname.trim();
    const email = `${cleanNickname.toLowerCase()}@pst.net`;

    // Récupération de 'data' qui contient l'utilisateur
    const { data, error: authError } = await supabase.auth.signInWithPassword({ 
      email, 
      password 
    });

    if (authError) {
      setError("Nickname ou mot de passe incorrect.");
      // Pas de userId ici car l'auth a échoué
      await logActivity('LOGIN_FAILED', authError.message);
      setLoading(false);
    } else {
      // Connexion réussie : on passe l'ID de l'utilisateur au log
      await logActivity('LOGIN_SUCCESS', 'Connexion réussie', data.user?.id);
      router.push('/');
      router.refresh();
    }
  };

  // --- LOGIN GOOGLE ---
  const handleGoogleLogin = async () => {
    setLoading(true);
    const { error: googleErr } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account',
        },
      }
    });

    if (googleErr) {
      setError(googleErr.message);
      setLoading(false);
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
          <h1 className="text-4xl font-black uppercase italic tracking-tighter text-white">
            PST <span className="text-red-600 italic">Club</span>
          </h1>
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] mt-2 italic">
            Espace Membres
          </p>
        </div>

        {/* BOUTON GOOGLE */}
        <button 
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full mb-6 bg-white text-black font-black uppercase py-4 rounded-2xl transition-all hover:bg-zinc-200 flex items-center justify-center gap-3 tracking-widest text-xs shadow-lg active:scale-95 disabled:opacity-50"
        >
          <GoogleLogo /> Continuer avec Google
        </button>

        <div className="relative flex items-center gap-4 mb-6">
          <div className="h-[1px] w-full bg-white/10"></div>
          <span className="text-[10px] text-zinc-600 font-black uppercase tracking-widest">OU</span>
          <div className="h-[1px] w-full bg-white/10"></div>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <input 
            className="w-full bg-black border border-white/5 rounded-2xl px-6 py-4 outline-none focus:border-red-600 transition-all font-bold text-white"
            placeholder="Nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            disabled={loading}
            required={!loading}
          />
          <input 
            type="password"
            className="w-full bg-black border border-white/5 rounded-2xl px-6 py-4 outline-none focus:border-red-600 transition-all text-white"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            required={!loading}
          />

          {error && (
            <p className="text-red-600 text-[10px] font-black uppercase text-center italic tracking-widest">
              {error}
            </p>
          )}

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-zinc-800 text-white font-black uppercase py-5 rounded-[1.5rem] transition-all shadow-xl shadow-red-600/20 active:scale-95 flex items-center justify-center gap-3 tracking-[0.2em]"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                Vérification...
              </>
            ) : (
              <>
                Entrer <Zap size={18} fill="currentColor" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-white/5 pt-8">
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">
            Pas encore de compte ? 
            <Link href="/signup" className="text-white hover:text-red-600 underline ml-2 transition-colors">
              S'inscrire
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6 text-white font-sans">
      <Suspense fallback={<div className="text-white animate-pulse uppercase text-[10px] font-black tracking-widest">Initialisation...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}