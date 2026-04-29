// components/stepper.tsx
'use client';

import React from 'react';

interface StepperProps {
  currentStatus: string;
}

export default function RenderStepper({ currentStatus }: StepperProps) {
  const steps = [
    { id: 'JOUEURS', label: 'Joueurs' },
    { id: 'EQUIPES', label: 'Equipes' },
    { id: 'POULES', label: 'Poules' },
    { id: 'DEMI', label: 'Demis' },
    { id: 'FINALE', label: 'Finales' },
    { id: 'TERMINE', label: 'Podium' }
  ];

  // Trouver l'index actuel pour savoir quelles étapes sont passées
  const currentIdx = steps.findIndex(s => s.id === currentStatus);

  return (
    <div className="flex items-center justify-between mb-12 w-full max-w-3xl mx-auto px-4">
      {steps.map((step, idx) => {
        const isPast = currentIdx > idx;
        const isCurrent = step.id === currentStatus;

        return (
          <div key={step.id} className="flex items-center flex-1 last:flex-none">
            {/* Rond de l'étape */}
            <div className="relative flex flex-col items-center">
              <div 
                className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-black transition-all duration-500 ${
                  isCurrent 
                    ? 'bg-red-600 text-white ring-4 ring-red-600/20 scale-110' 
                    : isPast 
                      ? 'bg-purple-500 text-white' 
                      : 'bg-zinc-800 text-zinc-500'
                }`}
              >
                {isPast ? '✓' : idx + 1}
              </div>
              
              {/* Label sous le rond */}
              <span 
                className={`absolute -bottom-7 text-[9px] font-black uppercase italic whitespace-nowrap transition-colors duration-500 ${
                  isCurrent ? 'text-white' : 'text-zinc-600'
                }`}
              >
                {step.label}
              </span>
            </div>

            {/* Ligne de liaison entre les ronds */}
            {idx !== steps.length - 1 && (
              <div className="flex-1 h-[2px] mx-2 md:mx-4 bg-zinc-800 overflow-hidden">
                <div 
                  className={`h-full bg-red-600 transition-all duration-1000 ease-in-out ${
                    isPast ? 'w-full' : 'w-0'
                  }`} 
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}


