'use client'; // Obligatoire pour utiliser usePathname

import Link from 'next/link';
import { usePathname } from 'next/navigation'; // Import pour détecter la page actuelle
import { Trophy, Swords, Home, BarChart3, Menu } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname(); // Récupère l'URL actuelle (ex: "/tournois")

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/5 bg-black/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* LOGO */}
          <div className="flex items-center gap-3">
            <div className="bg-red-600 p-1.5 rounded-lg shadow-[0_0_15px_rgba(220,38,38,0.4)]">
              <Trophy size={20} className="text-white" />
            </div>
            <Link href="/" className="group">
              <span className="text-white font-black italic uppercase tracking-tighter text-lg leading-none block">
                Paris <span className="text-red-600 group-hover:text-white transition-colors">Saint-Tropez</span>
              </span>
            </Link>
          </div>

          {/* NAVIGATION DYNAMIQUE */}
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
          </div>

          {/* MOBILE MENU & SAISON */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Live</span>
              <span className="text-xs font-bold italic text-white uppercase">Saison 2026</span>
            </div>
          </div>

        </div>
      </div>
    </nav>
  );
}

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

      {/* Version optimisée du point rouge */}
      {active && (
        <span className="flex h-3 w-3 ml-1">
          <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-red-100 opacity-95"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-900"></span>
        </span>
      )}
    </Link>
  );
}
