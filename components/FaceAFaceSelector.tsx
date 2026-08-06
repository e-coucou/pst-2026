'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftRight, Swords } from 'lucide-react';

interface PlayerOption {
  id: number;
  nom: string;
}

export default function FaceAFaceSelector({
  players,
  initialA,
  initialB,
  opponentsByPlayer,
}: {
  players: PlayerOption[];
  initialA?: number;
  initialB?: number;
  // Pour chaque joueur, la liste des adversaires déjà affrontés — une fois A choisi, B se
  // restreint à cette liste. Non fourni = pas de restriction (tous les joueurs proposés).
  opponentsByPlayer?: Record<number, number[]>;
}) {
  const router = useRouter();
  const [a, setA] = useState<number | ''>(initialA ?? '');
  const [b, setB] = useState<number | ''>(initialB ?? '');

  const canCompare = a !== '' && b !== '' && a !== b;

  const bOptions = useMemo(() => {
    if (a === '' || !opponentsByPlayer) return players;
    const faced = new Set(opponentsByPlayer[a] || []);
    return players.filter(p => faced.has(p.id));
  }, [players, opponentsByPlayer, a]);

  const handleChangeA = (value: number | '') => {
    setA(value);
    if (value !== '' && opponentsByPlayer) {
      const faced = new Set(opponentsByPlayer[value] || []);
      if (b !== '' && !faced.has(b)) setB('');
    }
  };

  const compare = () => {
    if (!canCompare) return;
    router.push(`/joueurs/face-a-face?a=${a}&b=${b}`);
  };

  const swap = () => {
    if (a === '' || b === '') return;
    const nextA = b;
    const nextB = a;
    setA(nextA);
    setB(nextB);
    router.push(`/joueurs/face-a-face?a=${nextA}&b=${nextB}`);
  };

  return (
    <div className="bg-zinc-900/50 border border-white/5 rounded-3xl p-6 flex flex-col md:flex-row items-center gap-4">
      <select
        value={a}
        onChange={e => handleChangeA(e.target.value ? Number(e.target.value) : '')}
        className="w-full md:flex-1 bg-zinc-800 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold uppercase text-white focus:outline-none focus:border-red-600 transition-colors"
      >
        <option value="">Joueur A</option>
        {players.map(p => (
          <option key={p.id} value={p.id} disabled={p.id === b}>{p.nom}</option>
        ))}
      </select>

      <button
        onClick={swap}
        disabled={a === '' || b === ''}
        className="p-3 rounded-full bg-zinc-800 text-zinc-400 hover:text-red-600 hover:bg-red-600/10 transition-all disabled:opacity-30 disabled:pointer-events-none shrink-0"
        title="Inverser"
        aria-label="Inverser les joueurs"
      >
        <ArrowLeftRight size={16} />
      </button>

      <select
        value={b}
        onChange={e => setB(e.target.value ? Number(e.target.value) : '')}
        disabled={a !== '' && bOptions.length === 0}
        className="w-full md:flex-1 bg-zinc-800 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold uppercase text-white focus:outline-none focus:border-red-600 transition-colors disabled:opacity-40"
      >
        <option value="">
          {a !== '' && bOptions.length === 0 ? 'Aucun adversaire affronté' : 'Joueur B'}
        </option>
        {bOptions.map(p => (
          <option key={p.id} value={p.id} disabled={p.id === a}>{p.nom}</option>
        ))}
      </select>

      <button
        onClick={compare}
        disabled={!canCompare}
        className="w-full md:w-auto shrink-0 px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest bg-red-600/10 text-red-600 border border-red-600/20 hover:bg-red-600 hover:text-white transition-all disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center gap-2"
      >
        <Swords size={14} /> Comparer
      </button>
    </div>
  );
}
