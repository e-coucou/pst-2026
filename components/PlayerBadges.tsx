import { Flame, Swords, HeartPulse, Crosshair, Focus, ShieldCheck } from 'lucide-react';
import type { PlayerAchievementStats } from '@/utils/player-achievements';

interface BadgeDef {
  key: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  colorClass: string;
  unlocked: boolean;
}

export default function PlayerBadges({ achievements }: { achievements: PlayerAchievementStats }) {
  const badges: BadgeDef[] = [
    {
      key: 'streak',
      title: 'Série de feu',
      description: '5 victoires consécutives ou plus',
      icon: <Flame size={22} />,
      colorClass: 'border-orange-500/30 bg-orange-500/5 text-orange-500',
      unlocked: achievements.maxWinStreak >= 5,
    },
    {
      key: 'fanny',
      title: 'Fanny à répétition',
      description: '3 Fanny infligées (13-0) ou plus',
      icon: <Swords size={22} />,
      colorClass: 'border-red-600/30 bg-red-600/5 text-red-600',
      unlocked: achievements.fannyGiven >= 3,
    },
    {
      key: 'clutch',
      title: 'Sang-froid',
      description: 'Au moins une victoire 13-12',
      icon: <HeartPulse size={22} />,
      colorClass: 'border-red-500/30 bg-red-500/5 text-red-500',
      unlocked: achievements.clutchWins >= 1,
    },
    {
      key: 'tireur',
      title: 'Tireur redoutable',
      description: '60%+ de victoires au tir (5 matchs mini)',
      icon: <Crosshair size={22} />,
      colorClass: 'border-orange-500/30 bg-orange-500/5 text-orange-500',
      unlocked: achievements.tireurMatches >= 5 && achievements.tireurWinrate >= 60,
    },
    {
      key: 'pointeur',
      title: 'Pointeur redoutable',
      description: '60%+ de victoires au pointage (5 matchs mini)',
      icon: <Focus size={22} />,
      colorClass: 'border-purple-500/30 bg-purple-500/5 text-purple-500',
      unlocked: achievements.pointeurMatches >= 5 && achievements.pointeurWinrate >= 60,
    },
    {
      key: 'veteran',
      title: 'Increvable',
      description: '50 matchs joués ou plus',
      icon: <ShieldCheck size={22} />,
      colorClass: 'border-white/20 bg-white/5 text-white',
      unlocked: achievements.matches >= 50,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {badges.map(b => (
        <div
          key={b.key}
          title={b.description}
          className={`flex flex-col items-center text-center gap-2 p-4 rounded-3xl border transition-all ${
            b.unlocked ? b.colorClass : 'border-white/5 bg-zinc-900/30 text-zinc-600 opacity-50'
          }`}
        >
          {b.icon}
          <p className="text-[10px] font-black uppercase tracking-widest leading-tight">{b.title}</p>
          <p className="text-[9px] uppercase tracking-wide leading-tight opacity-70">{b.description}</p>
        </div>
      ))}
    </div>
  );
}
