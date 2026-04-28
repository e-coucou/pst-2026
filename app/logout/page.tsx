'use client';

import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { useState } from 'react';

export default function LogoutButton() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      // Déconnecte l'utilisateur et détruit la session dans Supabase
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Redirection + Rafraîchissement pour purger le cache des Server Components
      router.push('/login?message=Déconnexion réussie');
      router.refresh();
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error);
      setLoading(false);
    }
  };

  return (
    <button 
      onClick={handleLogout}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white hover:bg-white/10 rounded-xl transition-all disabled:opacity-50"
    >
      <LogOut size={16} />
      {loading ? 'Sortie...' : 'Déconnexion'}
    </button>
  );
}
