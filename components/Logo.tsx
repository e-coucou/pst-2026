import React from 'react';

export const Logo = ({ className = "h-12" }: { className?: string }) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <svg
        viewBox="0 0 512 512"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-auto rounded-xl shadow-md"
      >
        {/* Fond rouge Saint-Tropez */}
        <rect width="512" height="512" fill="#e31e24" />

        {/* Groupe avec translation ajustée pour un centrage parfait à l'échelle 1.3 */}
        <g transform="translate(-45, -115) scale(1.5)">
          
          {/* Tour de St-Tropez */}
          <g 
            stroke="#ffffff" 
            strokeWidth="12" 
            fill="none" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <rect x="220" y="260" width="70" height="110" />
            <path d="M245 370 V320 Q255 300 265 320 V370" />
            <rect x="235" y="190" width="40" height="70" />
            <path d="M225 190 Q255 150 285 190" />
            <rect x="248" y="140" width="14" height="20" />
            <line x1="255" y1="140" x2="255" y2="130" />
            <circle cx="255" cy="220" r="6" />
            <line x1="255" y1="220" x2="255" y2="215" />
          </g>

          {/* Boule de pétanque */}
          <g stroke="#ffffff" strokeWidth="12" fill="none">
            <circle cx="180" cy="340" r="70" />
            <path d="M130 300 Q180 340 230 380" />
            <path d="M140 360 Q180 320 220 300" />
          </g>

          {/* Cochonnet (Orange Tailwind 500) */}
          <circle cx="300" cy="360" r="18" fill="#f97316" />
          <ellipse cx="320" cy="370" rx="12" ry="6" fill="#f97316" />

          {/* Ligne de sol */}
          <line x1="260" y1="340" x2="300" y2="340" stroke="#ffffff" strokeWidth="12" />
        </g>
      </svg>

      <div className="flex flex-col leading-tight">
        <span className="text-xl font-black tracking-tighter text-slate-800 dark:text-white">
          PST <span className="text-[#e31e24]">2026</span>
        </span>
        <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">
          Paris — St-Tropez
        </span>
      </div>
    </div>
  );
};
