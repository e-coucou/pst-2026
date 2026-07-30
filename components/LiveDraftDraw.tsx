'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import FavoriStar from '@/components/FavoriStar';

interface Player {
  id: number;
  nom: string;
  elo: number;
  modern: number;
}

type Role = 'Tireur' | 'Pointeur';
type RoleMode = 'normal' | 'aleatoire';

// Tirage des équipes "en direct" : le tirage au sort lui-même a lieu physiquement en
// dehors de l'app (boules, tombola...) — l'app se contente de proposer à chaque étape
// les joueurs restants du pool concerné, et d'enregistrer celui que l'admin clique (celui
// qui vient d'être annoncé dans la salle). Une équipe = 2 clics consécutifs.
//
// Deux façons d'attribuer les rôles pointeur/tireur :
// - 'normal'    : la présélection JOUEURS (pool Pointeurs / pool Tireurs) est respectée,
//                 chaque paire choisit librement laquelle des deux est tirée en premier.
// - 'aleatoire' : la présélection JOUEURS ne compte plus. Un seul pool (tous les joueurs
//                 sélectionnés) ; l'admin fixe une seule fois qui des "impairs" (1er,
//                 3e... tiré de chaque paire) sont Tireurs ou Pointeurs, et le rôle
//                 alterne ensuite automatiquement à chaque tirage.
export default function LiveDraftDraw({
  pointeurPool,
  tireurPool,
  favoriId,
  onPairComplete,
}: {
  pointeurPool: Player[];
  tireurPool: Player[];
  favoriId: number | null;
  onPairComplete: (pointeur: Player, tireur: Player) => void;
}) {
  const [roleMode, setRoleMode] = useState<RoleMode>('normal');
  const [oddRole, setOddRole] = useState<Role>('Tireur'); // mode 'aleatoire' uniquement, fixé une fois
  const [firstRole, setFirstRole] = useState<Role | null>(null);
  const [pendingFirst, setPendingFirst] = useState<Player | null>(null);

  const flatPool = [...pointeurPool, ...tireurPool];

  const poolFor = (role: Role) => {
    const base = roleMode === 'aleatoire' ? flatPool : (role === 'Tireur' ? tireurPool : pointeurPool);
    return pendingFirst ? base.filter(p => p.id !== pendingFirst.id) : base;
  };

  const handlePick = (role: Role, player: Player) => {
    if (!pendingFirst) {
      setFirstRole(role);
      setPendingFirst(player);
      return;
    }

    const pointeur = firstRole === 'Pointeur' ? pendingFirst : player;
    const tireur = firstRole === 'Tireur' ? pendingFirst : player;
    onPairComplete(pointeur, tireur);
    setFirstRole(null);
    setPendingFirst(null);
  };

  const secondRole: Role | null = firstRole ? (firstRole === 'Tireur' ? 'Pointeur' : 'Tireur') : null;
  const isDraftDone = pointeurPool.length === 0 && tireurPool.length === 0 && !pendingFirst;

  const renderList = (role: Role) => (
    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
      {poolFor(role).map(p => (
        <button
          key={p.id}
          onClick={() => handlePick(role, p)}
          className={`w-full p-3 bg-black rounded-xl border border-white/5 text-left text-xs font-bold uppercase transition-all ${
            role === 'Pointeur' ? 'hover:border-purple-500' : 'hover:border-orange-500'
          }`}
        >
          {p.nom} <FavoriStar active={p.id === favoriId} size={10} />
        </button>
      ))}
    </div>
  );

  if (isDraftDone) {
    return (
      <div className="bg-zinc-900/30 p-8 rounded-[3rem] border border-white/5 text-center">
        <Check className="mx-auto text-green-500 mb-4" size={32} />
        <p className="text-sm font-black uppercase text-zinc-400 tracking-widest">Tirage terminé</p>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900/30 p-8 rounded-[3rem] border border-white/5 space-y-6">
      {/* MODE D'ATTRIBUTION DES RÔLES */}
      <div className="space-y-2">
        <p className="text-center text-[9px] font-black uppercase text-zinc-500 tracking-[0.2em]">Attribution des rôles</p>
        <div className="flex flex-wrap justify-center gap-2">
          {(['normal', 'aleatoire'] as const).map(m => (
            <button
              key={m}
              onClick={() => setRoleMode(m)}
              className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                roleMode === m ? 'bg-red-600 text-white' : 'bg-zinc-900 text-zinc-400 hover:text-white'
              }`}
            >
              {m === 'normal' ? 'Présélection P/T' : 'Rôles aléatoires'}
            </button>
          ))}
        </div>
      </div>

      {roleMode === 'aleatoire' && !pendingFirst && (
        <div className="flex flex-wrap justify-center items-center gap-2">
          <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Les impairs sont</span>
          {(['Tireur', 'Pointeur'] as const).map(r => (
            <button
              key={r}
              onClick={() => setOddRole(r)}
              className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                oddRole === r
                  ? r === 'Pointeur' ? 'bg-purple-600 text-white' : 'bg-orange-600 text-white'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white'
              }`}
            >
              {r}s
            </button>
          ))}
        </div>
      )}

      {pendingFirst && firstRole && (
        <div className="text-center">
          <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest mb-2">{firstRole} tiré</p>
          <p className={`text-2xl font-black uppercase italic ${firstRole === 'Pointeur' ? 'text-purple-400' : 'text-orange-400'}`}>
            {pendingFirst.nom} <FavoriStar active={pendingFirst.id === favoriId} />
          </p>
        </div>
      )}

      {!pendingFirst ? (
        roleMode === 'aleatoire' ? (
          <div>
            <p className="text-center text-[10px] font-black uppercase text-zinc-400 tracking-widest mb-2">
              Prochain tiré — sera {oddRole} ({poolFor(oddRole).length} restant(s))
            </p>
            {renderList(oddRole)}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-center text-[10px] font-black uppercase text-orange-500 tracking-widest mb-2">Tireurs restants ({tireurPool.length})</p>
              {renderList('Tireur')}
            </div>
            <div>
              <p className="text-center text-[10px] font-black uppercase text-purple-500 tracking-widest mb-2">Pointeurs restants ({pointeurPool.length})</p>
              {renderList('Pointeur')}
            </div>
          </div>
        )
      ) : (
        <div className="space-y-3">
          <p className="text-center text-[10px] font-black uppercase text-zinc-500 tracking-widest">
            Partenaire — {secondRole} restants ({poolFor(secondRole!).length})
          </p>
          {renderList(secondRole!)}
        </div>
      )}
    </div>
  );
}
