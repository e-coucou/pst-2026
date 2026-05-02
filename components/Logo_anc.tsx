import React from 'react';

export const Logo = ({ className = "h-12" }: { className?: string }) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <svg 
        viewBox="0 0 200 80" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-auto"
      >
        {/* Tour Eiffel (Paris) */}
        <path d="M20 70 L35 10 L50 70 M25 55 H45 M30 35 H40" stroke="#EF4444" strokeWidth="2" strokeLinecap="round"/>
        
        {/* Trajectoire de la boule (Arc) */}
        <path d="M55 60 Q100 10 145 60" stroke="#EF4444" strokeWidth="1" strokeDasharray="4 2" opacity="0.5"/>
        
        {/* Clocher de St-Tropez */}
        <rect x="155" y="30" width="15" height="40" fill="#EF4444" /> {/* Corps Rouge */}
        <rect x="155" y="20" width="15" height="10" fill="#FDBA74" /> {/* Sommet Ocre/Orange */}
        <circle cx="162.5" cy="15" r="3" fill="#EF4444" />
        
        {/* Boule de pétanque (Pointeur - Purple) */}
        <circle cx="55" cy="65" r="6" fill="#7C3AED" className="animate-pulse" />
        
        {/* Cochonnet & Boule (Tireur - Orange) au pied du clocher */}
        <circle cx="145" cy="65" r="6" fill="#FB923C" />
        <circle cx="155" cy="72" r="3" fill="#EF4444" /> {/* Le cochonnet rouge */}
      </svg>

      <div className="flex flex-col leading-tight">
        <span className="text-xl font-black tracking-tighter text-slate-600">
          PST <span className="text-red-600">2026</span>
        </span>
        <span className="text-[10px] uppercase tracking-widest text-slate-500 font-medium">
          Paris — St-Tropez
        </span>
      </div>
    </div>
  );
};
