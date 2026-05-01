'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Trophy, Swords, Home, BarChart3, Menu, X, Video, 
  User, Crown, Zap, Loader2, Fingerprint, Settings2, ShieldAlert, Skull} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

export default function Navbar() {
  const pathname = usePathname() || "";
  const router = useRouter();
  const supabase = createClient();
  
  const [isOpen, setIsOpen] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Écoute de la session et récupération du rôle
  useEffect(() => {
    async function checkUser() {
      // 1. On vérifie d'abord si une session existe
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setUserRole(null);
        setLoading(false);
        return;
      }

      // 2. On appelle le RPC pour avoir le rôle exact sans se soucier des RLS
      // Note: Assure-toi d'avoir créé la fonction 'get_my_role' en SQL
      const { data: role, error } = await supabase.rpc('get_my_role');

      if (!error && role) {
        setUserRole(role);
      } else {
        // En cas d'erreur ou si pas de ligne, on met membre par défaut
        setUserRole('membre');
      }
      setLoading(false);
    }

    checkUser();

    // Listener pour les changements d'état (login/logout)
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setUserRole(null);
        router.refresh();
      } else if (event === 'SIGNED_IN') {
        checkUser();
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, [supabase, router]);

  const closeMenu = () => setIsOpen(false);

  const handleAuthAction = async () => {
    if (!userRole) {
      router.push('/login');
    } else {
      if (confirm("Voulez-vous vous déconnecter ?")) {
        await supabase.auth.signOut();
        router.push('/');
        router.refresh();
      }
    }
  };

  // Définition de l'icône selon le rôle
  const getRoleIcon = () => {
    if (loading) return <Loader2 size={20} className="text-white animate-spin" />;
    
    switch (userRole) {
      case 'super': return <Zap size={20} className="text-white" fill="currentColor" />; // Dieu / Puissance
      case 'admin': return <Crown size={20} className="text-white" />; // Roi
      case 'membre': return <Trophy size={20} className="text-white bg-red-600" />; // Tête
      default: return <User size={20} className="text-white" />; // Guest
    }
  };

  return (
    <nav className="sticky top-0 z-[100] w-full border-b border-white/5 bg-black/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

{/* LOGO & AUTH ICON DYNAMIQUE */}
<div className="flex items-center gap-2">
  <div className="flex items-center gap-1.5">
    {/* Accès direct à /live/super pour le rôle super */}
    {userRole === 'super' && (
      <Link
        href="/live/super"
        className="p-1.5 rounded-lg bg-zinc-900 border border-red-600/50 text-red-500 hover:bg-red-600 hover:text-white transition-all shadow-lg hover:scale-110 active:scale-95"
        title="Panel Super Admin"
      >
        <Fingerprint size={20} className="group-hover:animate-pulse" />
      </Link>
    )}
    {/* Accès direct à /live/super pour le rôle super */}
    { (userRole === 'admin' || userRole === 'super') && (
      <Link
        href="/live/switch"
        className="p-1.5 rounded-lg bg-zinc-900 border border-red-600/50 text-red-500 hover:bg-red-600 hover:text-white transition-all shadow-lg hover:scale-110 active:scale-95"
        title="Panel Live"
      >
        <Settings2 size={20} fill="currentColor" />
      </Link>
    )}
    {/* Bouton de Connexion/Déconnexion existant */}
    <button 
      onClick={handleAuthAction}
      className={`p-1.5 rounded-lg transition-all duration-500 shadow-lg ${
        !userRole ? 'bg-red-600 shadow-red-600/20' : 'bg-red-600 border border-white/10'
      } hover:scale-110 active:scale-95`}
      title={userRole ? `Connecté en tant que ${userRole}` : "Se connecter"}
    >
      {getRoleIcon()}
    </button>
  </div>

  <Link href="/" className="group font-black italic uppercase tracking-tighter text-lg leading-none block ml-1" onClick={closeMenu}>
    <span className="text-white group-hover:text-red-600 transition-colors">Paris </span>
    <span className="text-red-600 group-hover:text-white transition-colors">Saint-Tropez</span>
  </Link>
</div>

          {/* NAVIGATION DESKTOP */}
          <div className="hidden md:flex items-center gap-8">
            <NavLink href="/" icon={<Home size={16} />} label="Accueil" active={pathname === "/"} />
            <NavLink href="/classement" icon={<BarChart3 size={16} />} label="Classement" active={pathname.startsWith("/classement") || pathname.startsWith("/joueurs")} />
            <NavLink href="/tournois" icon={<Swords size={16} />} label="Tournois" active={pathname.startsWith("/tournois")} />
            <NavLink href="/videos" icon={<Video size={16} />} label="Vidéos" active={pathname.startsWith("/videos")} />
          </div>

          {/* BOUTON BURGER (Mobile uniquement) */}
          <div className="md:hidden flex items-center gap-4">
            <div className="flex flex-col items-end group mr-2">
              <Link href="/live" className="flex flex-col items-end">
                <span className="text-[8px] font-black text-red-500 uppercase tracking-widest leading-none group-hover:text-white group-active:text-white">Live </span>
                <span className="text-[10px] font-bold italic text-white uppercase leading-none group-hover:text-red-500 group-active:text-red-500">2026</span>
              </Link>
            </div>
            <button 
              onClick={() => setIsOpen(!isOpen)}
              className="text-white p-2 hover:text-red-500 transition-colors"
            >
              {isOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>

          {/* ACCÈS ADMIN (Desktop uniquement) - Visible seulement si Admin ou Super */}
          <div className="hidden md:flex items-center gap-4">
            {(userRole === 'admin' || userRole === 'super') && (
              <div className="flex flex-col items-end group">
                <Link href="/live" className="flex flex-col items-end">
                  <span className="text-[10px] font-black text-red-500 uppercase tracking-widest group-hover:text-white">Live</span>
                  <span className="text-xs font-bold italic text-white uppercase group-hover:text-red-600">Saison 2026</span>
                </Link>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* MENU MOBILE DÉROULANT */}
      {isOpen && (
        <div className="md:hidden bg-black/95 border-b border-white/10 px-6 py-8 flex flex-col gap-6 animate-in slide-in-from-top duration-300">
          <MobileNavLink href="/" label="Accueil" active={pathname === "/"} onClick={closeMenu} />
          <MobileNavLink href="/classement" label="Classement" active={pathname.startsWith("/classement")} onClick={closeMenu} />
          <MobileNavLink href="/tournois" label="Tournois" active={pathname.startsWith("/tournois")} onClick={closeMenu} />
          <MobileNavLink href="/videos" label="Vidéos" active={pathname.startsWith("/videos")} onClick={closeMenu} />
          {userRole && (
            <button 
              onClick={() => { handleAuthAction(); closeMenu(); }}
              className="text-left text-red-600 text-2xl font-black uppercase italic"
            >
              Déconnexion
            </button>
          )}
		  {userRole === 'super' && (
		    <MobileNavLink href="/live/super" label="🚀 Super Admin" active={pathname === "/live/super"} onClick={closeMenu} />
		  )}
        </div>
      )}
    </nav>
  );
}

// --- SOUS-COMPOSANTS ---

function NavLink({ href, icon, label, active }: { href: string, icon: React.ReactNode, label: string, active: boolean }) {
  return (
    <Link 
      href={href} 
      className={`relative flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-300 group ${
        active ? 'text-white' : 'text-gray-500 hover:text-red-500'
      }`}
    >
      <span className={`${active ? 'text-red-600' : 'group-hover:text-red-600'} transition-colors`}>
        {icon}
      </span>
      <span>{label}</span>
      {active && (
        <span className="flex h-2 w-2 ml-1">
          <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-red-100 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
        </span>
      )}
    </Link>
  );
}

function MobileNavLink({ href, label, active, onClick }: { href: string, label: string, active: boolean, onClick: () => void }) {
  return (
    <Link 
      href={href} 
      onClick={onClick}
      className={`text-3xl font-black uppercase italic tracking-tighter transition-all ${
        active ? 'text-red-600' : 'text-white hover:text-red-500'
      }`}
    >
      <div className="flex items-center justify-between">
        {label}
        {active && <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse" />}
      </div>
    </Link>
  );
}
