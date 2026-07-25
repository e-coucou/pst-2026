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
        {/* Fond rouge Saint-Tropez (aligné sur app/icon.png et le theme_color du manifest) */}
        <rect width="512" height="512" fill="#e31e24" />

        {/* Groupe avec translation ajustée pour un centrage parfait à l'échelle 1.3 */}
        <g transform="translate(-45, -125) scale(1.5)">
          
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

          {/* Cochonnet — clin d'œil "petit cochon" (comme sur apple-icon.png), orange Tailwind 500 */}
          <g fill="#f97316">
            {/* Corps */}
            <ellipse cx="335" cy="360" rx="26" ry="15" />
            {/* Tête */}
            <circle cx="315" cy="352" r="13" />
            {/* Groin */}
            <ellipse cx="301" cy="354" rx="6" ry="4" />
            {/* Oreille */}
            <path d="M311 340 L304 328 L320 338 Z" />
            {/* Pattes */}
            <rect x="321" y="372" width="6" height="12" rx="2" />
            <rect x="343" y="372" width="6" height="12" rx="2" />
          </g>
          {/* Queue en tire-bouchon */}
          <path
            d="M359 356 Q369 350 363 342 Q359 337 365 333"
            stroke="#f97316"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
          />

          {/* Ligne de sol */}
          <line x1="250" y1="340" x2="298" y2="340" stroke="#ffffff" strokeWidth="12" />
        </g>
      </svg>

      <div className="flex flex-col leading-tight">
        <span className="text-xl font-black tracking-tighter text-white">
          PST <span className="text-[#e31e24]">2026</span>
        </span>
        <span className="text-[10px] uppercase tracking-widest text-zinc-300 font-bold">
          Paris — St-Tropez
        </span>
      </div>
    </div>
  );
};

