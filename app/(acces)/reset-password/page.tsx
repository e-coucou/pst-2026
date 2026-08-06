'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';

function ResetPasswordForm() {
  const [nickname, setNickname] = useState('');
  const [invitationCode, setInvitationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname, invitationCode, newPassword }),
      });
      const data = await res.json();

      if (!data.success) throw new Error(data.error || "Erreur inconnue.");
      router.push('/login?message=Mot de passe mis à jour !');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full">
      <div className="bg-zinc-900/50 border border-white/10 p-10 rounded-[3rem] shadow-2xl backdrop-blur-xl">
        <div className="text-center mb-8">
          <div className="bg-red-600 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-red-600/30">
            <KeyRound className="text-white" size={28} />
          </div>
          <h1 className="text-3xl md:text-4xl font-black uppercase italic tracking-tighter text-white">
            Nouveau <span className="text-red-600">Mot de passe</span>
          </h1>
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] mt-2 italic">
            Comptes pseudo uniquement — pas Google
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <input
            className="w-full bg-black border border-white/5 rounded-2xl px-6 py-4 outline-none focus:border-red-600 transition-all font-bold text-white"
            placeholder="Nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            disabled={loading}
            required
          />
          <input
            className="w-full bg-red-600/5 border border-red-600/20 rounded-2xl px-6 py-4 outline-none focus:border-red-600 transition-all text-red-500 font-mono"
            placeholder="Code d'invitation"
            value={invitationCode}
            onChange={(e) => setInvitationCode(e.target.value)}
            disabled={loading}
            required
          />
          <input
            type="password"
            className="w-full bg-black border border-white/5 rounded-2xl px-6 py-4 outline-none focus:border-red-600 transition-all text-white"
            placeholder="Nouveau mot de passe"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={loading}
            required
          />
          <input
            type="password"
            className="w-full bg-black border border-white/5 rounded-2xl px-6 py-4 outline-none focus:border-red-600 transition-all text-white"
            placeholder="Confirmer le mot de passe"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
            required
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
                Réinitialiser <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-white/5 pt-8">
          <Link href="/login" className="text-zinc-500 hover:text-white text-[10px] font-black uppercase tracking-widest underline transition-colors">
            Retour à la connexion
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6 text-white font-sans">
      <ResetPasswordForm />
    </div>
  );
}
