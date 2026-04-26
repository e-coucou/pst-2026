'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Trophy, Swords, Home, BarChart3, Menu, X } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname() || "";
  const [isOpen, setIsOpen] = useState(false);

  // Fonction pour fermer le menu quand on clique sur un lien
  const closeMenu = () => setIsOpen(false);

  return (
    <nav className="sticky top-0 z-[100] w-full border-b border-white/5 bg-black/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* LOGO */}
          <div className="flex items-center gap-3">
            <div className="bg-red-600 p-1.5 rounded-lg shadow-[0_0_15px_rgba(220,38,38,0.4)]">
              <Trophy size={20} className="text-white" />
            </div>
            <Link href="/" className="group font-black italic uppercase tracking-tighter text-lg leading-none block" onClick={closeMenu}>
              <span className="text-white group-hover:text-red-600 transition-colors">Paris </span>
              <span className="text-red-600 group-hover:text-white transition-colors">Saint-Tropez</span>
            </Link>
          </div>

          {/* NAVIGATION DESKTOP */}
          <div className="hidden md:flex items-center gap-8">
            <NavLink 
              href="/" 
              icon={<Home size={16} />} 
              label="Accueil" 
              active={pathname === "/"} 
            />
            <NavLink 
              href="/classement" 
              icon={<BarChart3 size={16} />} 
              label="Classement" 
              active={pathname.startsWith("/classement") || pathname.startsWith("/joueurs")} 
            />
            <NavLink 
              href="/tournois" 
              icon={<Swords size={16} />} 
              label="Tournois" 
              active={pathname.startsWith("/tournois")} 
            />
            <NavLink 
              href="/videos" 
              icon={<Swords size={16} />} 
              label="Vidéos" 
              active={pathname.startsWith("/videos")} 
            />
          </div>

          {/* BOUTON BURGER (Mobile uniquement) */}
          <div className="md:hidden flex items-center gap-4">
            <div className="flex flex-col items-end mr-2">
              <span className="text-[8px] font-black text-red-500 uppercase tracking-widest leading-none">Live</span>
              <span className="text-[10px] font-bold italic text-white uppercase leading-none">2026</span>
            </div>
            <button 
              onClick={() => setIsOpen(!isOpen)}
              className="text-purple-500 p-2 hover:text-red-500 transition-colors"
            >
              {isOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>

          {/* SAISON (Desktop uniquement) */}
          <div className="hidden md:flex items-center gap-4">
            <div className="flex flex-col items-end group">
              <span className="text-[10px] font-black text-red-500 uppercase tracking-widest group-hover:text-white">Live</span>
              <span className="text-xs font-bold italic text-white uppercase group-hover:text-red-600">Saison 2026</span>
            </div>
          </div>

        </div>
      </div>

      {/* MENU MOBILE DÉROULANT */}
      {isOpen && (
        <div className="md:hidden bg-black/95 border-b border-white/10 px-6 py-8 flex flex-col gap-6 animate-in slide-in-from-top duration-300">
          <MobileNavLink 
            href="/" 
            label="Accueil" 
            active={pathname === "/"} 
            onClick={closeMenu}
          />
          <MobileNavLink 
            href="/classement" 
            label="Classement" 
            active={pathname.startsWith("/classement") || pathname.startsWith("/joueurs")} 
            onClick={closeMenu}
          />
          <MobileNavLink 
            href="/tournois" 
            label="Tournois" 
            active={pathname.startsWith("/tournois")} 
            onClick={closeMenu}
          />
          <MobileNavLink 
            href="/videos" 
            label="Vidéos" 
            active={pathname.startsWith("/videos")} 
            onClick={closeMenu}
          />
        </div>
      )}
    </nav>
  );
}

// Sous-composant pour les liens Desktop
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

// Sous-composant pour les liens Mobiles
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
