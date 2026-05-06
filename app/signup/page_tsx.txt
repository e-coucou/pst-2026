'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { UserPlus, ArrowRight } from 'lucide-react';

export default function SignupPage() {
  const [formData, setFormData] = useState({ nickname: '', password: '', invitation: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const supabase = createClient();
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. Nettoyage strict des variables avant tout appel
      const nicknameValue = formData.nickname.trim();
      const invitationValue = formData.invitation.trim();

      if (!nicknameValue) throw new Error("Le pseudo ne peut pas être vide !");

      // 2. Vérifier le code d'invitation
      const { data: isValid, error: rpcError } = await supabase.rpc('verify_invitation_code', { 
        attempted_code: invitationValue 
      });

      if (rpcError || !isValid) throw new Error("Code d'invitation incorrect !");

      // 3. Créer l'Auth avec l'email formaté et l'objet data officiel
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

        <form onSubmit={handleSignup} className="space-y-5">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-zinc-500 ml-4 tracking-widest">Nickname (Unique)</label>
            <input 
              className="w-full bg-black/50 border border-white/5 rounded-2xl px-6 py-4 outline-none focus:border-red-600 transition-all font-bold"
              placeholder="Ex: Pedro_83"
              onChange={(e) => setFormData({...formData, nickname: e.target.value})}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-zinc-500 ml-4 tracking-widest">Mot de passe</label>
            <input 
              type="password"
              className="w-full bg-black/50 border border-white/5 rounded-2xl px-6 py-4 outline-none focus:border-red-600 transition-all"
              placeholder="••••••••"
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-red-500 ml-4 tracking-widest">Code Invitation WhatsApp</label>
            <input 
              className="w-full bg-red-600/5 border border-red-600/20 rounded-2xl px-6 py-4 outline-none focus:border-red-600 transition-all text-red-500 font-mono"
              placeholder="Le code secret..."
              onChange={(e) => setFormData({...formData, invitation: e.target.value})}
              required
            />
          </div>

          {error && <div className="bg-red-600/10 border border-red-600/20 p-4 rounded-xl text-red-500 text-[10px] font-black uppercase text-center">{error}</div>}

          <button 
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-black uppercase py-5 rounded-[1.5rem] transition-all shadow-xl shadow-red-600/20 active:scale-95 flex items-center justify-center gap-3 tracking-widest"
          >
            {loading ? "Création..." : "Valider l'inscription"} <ArrowRight size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
