'use client'

import { useMemo, useState, useEffect } from 'react'
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts'

/**
 * Tooltip avec pastilles de couleurs synchronisées et tri Top 16
 */
const Top16Tooltip = ({ active, payload }: any) => {
  if (active && payload && payload[0]) {
    const data = payload[0].payload;
    const topPlayers = data.top16 || [];

    return (
      <div className="bg-black/95 backdrop-blur-xl border border-white/10 p-5 rounded-2xl shadow-2xl min-w-[240px]">
        <div className="flex justify-between items-end mb-4 border-b border-white/10 pb-2">
          <span className="text-[10px] text-red-600 font-black uppercase tracking-[0.2em]">
            {data.label}
          </span>
        </div>
        
        <div className="space-y-1.5">
          {topPlayers.map((player: any, i: number) => (
            <div key={i} className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div 
                  className="w-2 h-2 rounded-full shadow-[0_0_5px_rgba(0,0,0,0.3)]" 
                  style={{ backgroundColor: player.color }} 
                />
                <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-tight">
                  {player.nom}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] font-mono font-black text-white italic">{Math.round(player.elo)}</span>
                <span className="text-[10px] font-mono font-black italic text-purple-500"> / {Math.round(player.modern)}</span>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[8px] text-zinc-600 mt-4 text-center font-bold uppercase italic">
          + {data.totalPlayers - topPlayers.length} autres joueurs
        </p>
      </div>
    );
  }
  return null;
};

export default function GlobalProgressionChart({ 
  timeline = [], 
  allPlayerNames = [] 
}: { 
  timeline: any[], 
  allPlayerNames: string[] 
}) {
  const [isClient, setIsClient] = useState(false);

  // Sécurité pour l'hydratation Next.js
  useEffect(() => {
    setIsClient(true);
  }, []);

  const { chartData, playerConfigs } = useMemo(() => {
    if (!allPlayerNames?.length || !timeline?.length) return { chartData: [], playerConfigs: [] };

    // 1. Définition unique des couleurs (31 joueurs)
    const configs = allPlayerNames.map((name, i) => ({
      name,
      color: `hsl(${(i * 360) / allPlayerNames.length}, 85%, 60%)`
    }));

    const colorMap = new Map(configs.map(c => [c.name, c.color]));
    
    // 2. Initialisation des scores (départ à 1000)
    const lastKnownElo: Record<string, number> = {};
    configs.forEach(c => lastKnownElo[c.name] = 1000);

    // 3. Transformation des 120 points de données
    const data = timeline.map((match: any, index: number) => {
      // Mise à jour des scores pour ceux qui ont joué
      if (match.players) {
        match.players.forEach((p: any) => {
          if (p.nom) lastKnownElo[p.nom] = p.elo;
        });
      }

      // Construction de l'objet du point
      const row: any = {
        index,
        label: `S${match.year} — MATCH ${match.game_id}`,
        totalPlayers: match.players?.length || 0,
        // On attache la couleur fixe à chaque joueur du top 16 pour le tooltip
        top16: (match.players || []).slice(0, 16).map((p: any) => ({
          ...p,
          color: colorMap.get(p.nom) || '#fff'
        }))
      };

      // On remplit le score de TOUS les joueurs pour tracer les 31 lignes
      configs.forEach(c => {
        row[c.name] = lastKnownElo[c.name];
      });

      return row;
    });

    return { chartData: data, playerConfigs: configs };
  }, [timeline, allPlayerNames]);

  // Si on n'est pas sur le client ou si les données sont absentes
  if (!isClient || chartData.length === 0) {
    return (
      <div className="w-full h-full min-h-[500px] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500 italic">
            Synchronisation des matchs...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[500px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
          <CartesianGrid 
            strokeDasharray="3 3" 
            vertical={false} 
            stroke="#ffffff" 
            opacity={0.03} 
          />
          
          <XAxis dataKey="index" hide />
          <YAxis domain={['auto', 'auto']} hide />
          
          <Tooltip 
            content={<Top16Tooltip />} 
            isAnimationActive={false}
            cursor={{ stroke: '#dc2626', strokeWidth: 1, strokeDasharray: '4 4' }}
          />

          {/* Tracé des 31 courbes */}
          {playerConfigs.map((player) => (
            <Line
              key={player.name}
              type="monotone"
              dataKey={player.name}
              stroke={player.color}
              strokeWidth={1.5}
              dot={false}
              strokeOpacity={0.4}
              connectNulls
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
