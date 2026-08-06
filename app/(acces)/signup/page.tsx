'use client';

import { useState, useEffect, Suspense } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { UserPlus, ArrowRight } from 'lucide-react'; // On enlève Chrome ici

// Petit composant SVG pour le logo Google (plus propre que Lucide pour du branding)
const GoogleLogo = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z" fill="#EA4335"/>
  </svg>
);

function SignupForm() {
  const [formData, setFormData] = useState({ nickname: '', password: '', invitation: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get('error') === 'invite_required') {
      setError("Ce compte Google n'a pas de code d'invitation valide : inscris-toi d'abord avec le code ci-dessous.");
    }
  }, [searchParams]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const nicknameValue = formData.nickname.trim();
      const invitationValue = formData.invitation.trim();

      if (!nicknameValue) throw new Error("Le pseudo ne peut pas être vide !");

      const { data: isValid, error: rpcError } = await supabase.rpc('verify_invitation_code', { 
        attempted_code: invitationValue 
      });

      if (rpcError || !isValid) throw new Error("Code d'invitation incorrect !");

      const { error: authErr } = await supabase.auth.signUp({
        email: `${nicknameValue.toLowerCase()}@pst.net`,
        password: formData.password,
        options: {
          data: {
            nickname: nicknameValue,
            invitation_code: invitationValue
          }
        }
      });

      if (authErr) throw authErr;
      router.push('/login?message=Compte créé avec succès !');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

const handleGoogleSignup = async (e?: React.MouseEvent<HTMLButtonElement>) => {
  if (e) e.preventDefault();
  const invitationValue = formData.invitation.trim();
    
    if (!invitationValue) {
      setError("Saisis d'abord le code d'invitation !");
      return;
    }

    setLoading(true);
    try {
      // 1. On vérifie d'abord si le code secret est bon
      const { data: isValid, error: rpcError } = await supabase.rpc('verify_invitation_code', { 
        attempted_code: invitationValue 
      });

      if (rpcError || !isValid) throw new Error("Code d'invitation incorrect !");

      // 2. On lance l'auth Google, en passant le code par l'URL de retour :
      // c'est /auth/callback (côté serveur) qui le revérifiera avant de
      // valider la création du compte. Le localStorage n'est pas lisible
      // par le Route Handler, il ne protégeait donc rien.
      const { error: googleErr } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?invite=${encodeURIComponent(invitationValue)}`,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          }
        }
      });

      if (googleErr) throw googleErr;
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6 font-sans text-white">
      <div className="max-w-md w-full bg-zinc-900/50 border border-white/10 p-10 rounded-[3rem] shadow-2xl backdrop-blur-xl">
        <div className="text-center mb-8">
          <div className="bg-red-600/20 text-red-600 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-600/30">
            <UserPlus size={28} />
          </div>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter">Devenir <span className="text-red-600">Membre</span></h1>
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-[0.2em] mt-2 italic">Accès exclusif Paris Saint-Tropez</p>
        </div>

        <div className="space-y-2 mb-6">
          <label className="text-[10px] font-black uppercase text-red-500 ml-4 tracking-widest">Code Invitation WhatsApp</label>
          <input 
            className="w-full bg-red-600/5 border border-red-600/20 rounded-2xl px-6 py-4 outline-none focus:border-red-600 transition-all text-red-500 font-mono"
            placeholder="Le code secret..."
            value={formData.invitation}
            onChange={(e) => setFormData({...formData, invitation: e.target.value})}
            required
          />
        </div>
        
        {error && <p className="text-red-600 text-[10px] font-black uppercase text-center italic tracking-widest mb-4">{error}</p>}

        <button 
          type="button"
          onClick={handleGoogleSignup}
          disabled={loading}
          className="w-full mb-6 bg-white text-black font-black uppercase py-4 rounded-2xl transition-all hover:bg-zinc-200 flex items-center justify-center gap-3 tracking-widest text-xs shadow-lg active:scale-95 disabled:opacity-50"
        >
          <GoogleLogo /> Continuer avec Google
        </button>

        <div className="relative flex items-center gap-4 mb-6">
          <div className="h-[1px] w-full bg-white/10"></div>
          <span className="text-[10px] text-zinc-400 font-black uppercase">OU</span>
          <div className="h-[1px] w-full bg-white/10"></div>
        </div>

        <form onSubmit={handleSignup} className="space-y-5">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-zinc-500 ml-4 tracking-widest">Nickname (Unique)</label>
            <input 
              className="w-full bg-black border border-white/5 rounded-2xl px-6 py-4 outline-none focus:border-red-600 transition-all font-bold"
              placeholder="Ex: Pedro_83"
              onChange={(e) => setFormData({...formData, nickname: e.target.value})}
              required={!loading}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-zinc-500 ml-4 tracking-widest">Mot de passe</label>
            <input 
              type="password"
              className="w-full bg-black border border-white/5 rounded-2xl px-6 py-4 outline-none focus:border-red-600 transition-all"
              placeholder="••••••••"
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              required={!loading}
            />
          </div>

          <button 
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-black uppercase py-5 rounded-[1.5rem] transition-all shadow-xl shadow-red-600/20 active:scale-95 flex items-center justify-center gap-3 tracking-widest"
          >
            {loading ? "Vérification..." : "Valider l'inscription"} <ArrowRight size={18} />
          </button>
        </form>

        <div className="mt-8 text-center border-t border-white/5 pt-8">
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">
            Déjà un compte ?
            <Link href="/login" className="text-white hover:text-red-600 underline ml-2 transition-colors">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center text-white animate-pulse uppercase text-[10px] font-black tracking-widest">Initialisation...</div>}>
      <SignupForm />
    </Suspense>
  );
}