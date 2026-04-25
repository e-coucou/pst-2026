'use client'

import { useState, useMemo, useEffect } from 'react' // Ajout de useEffect
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Label } from 'recharts'

export default function EloChart({ history }: { history: any[] }) {
  const [method, setMethod] = useState<'pst' | 'modern'>('pst')
  const [isMounted, setIsMounted] = useState(false) // État pour le montage

  // Correction du bug width(-1) : On attend le montage client
	useEffect(() => {
	  // On attend la fin de la pile d'exécution (micro-task)
	  const timer = setTimeout(() => {
	    setIsMounted(true);
	  }, 50); // 50ms suffisent pour stabiliser le layout
	  return () => clearTimeout(timer);
	}, []);

  // 1. Préparation des données
  const data = useMemo(() => {
    return history?.map((h, index) => ({
      index, 
      name: `M${index + 1}`,
      pst: parseFloat(h.elo_value.toFixed(1)),
      modern: parseFloat(h.elo_modern_value.toFixed(1)),
      year: h.year,
      gameId: h.game_id
    })) || []
  }, [history])

  // 2. Marqueurs d'années
  const yearMarkers = useMemo(() => {
    const markers: { index: number; year: number }[] = []
    const seenYears = new Set()

    data.forEach((d) => {
      if (!seenYears.has(d.year)) {
        seenYears.add(d.year)
        markers.push({ index: d.index, year: d.year })
      }
    })
    return markers;
  }, [data])
  
  // 3. Zones pour les Labels de saisons
  const seasonLabels = useMemo(() => {
    const zones: { year: number; start: number; end: number }[] = [];
    const years = [...new Set(data.map(d => d.year))];
  
    years.forEach((y) => {
      const yearMatches = data.filter(d => d.year === y);
      const firstIndex = yearMatches[0].index;
      const lastIndex = yearMatches[yearMatches.length - 1].index;
      
      zones.push({
        year: y,
        start: firstIndex,
        end: lastIndex
      });
    });
    return zones;
  }, [data]);

  // Si on n'est pas encore sur le client, on affiche un placeholder de la même taille
  if (!isMounted) {
    return <div className="w-full h-full min-h-[350px] bg-zinc-900/10 animate-pulse rounded-[2rem]" />;
  }

  return (
    <div className="w-full h-full min-h-[300px] min-w-0 flex flex-col gap-6">
      {/* BOUTONS DE SELECTION STYLE ST-TROPEZ */}
      <div className="flex gap-3">
        <button 
          onClick={() => setMethod('pst')}
          className={`px-6 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
            method === 'pst' 
            ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)]' 
            : 'bg-zinc-900 text-zinc-500 border border-white/5 hover:bg-zinc-800'
          }`}
        >
          ELO CLASSIQUE
        </button>
        <button 
          onClick={() => setMethod('modern')}
          className={`px-6 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
            method === 'modern' 
            ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]' 
            : 'bg-zinc-900 text-zinc-500 border border-white/5 hover:bg-zinc-800'
          }`}
        >
          MODERN ELO
        </button>
      </div>

      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={1}>
          <LineChart data={data} margin={{ top: 30, right: 10, bottom: 10, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} /> 
            
            <XAxis dataKey="index" hide />
            
            <YAxis 
              domain={['auto', 'auto']} 
              stroke="#4b5563" 
              fontSize={10} 
              fontWeight="bold"
              tickFormatter={(val) => Math.round(val).toString()}
              axisLine={false}
              tickLine={false}
            />

            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#09090b', 
                border: '1px solid rgba(255,255,255,0.1)', 
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: 'bold',
                textTransform: 'uppercase'
              }}
              itemStyle={{ color: method === 'pst' ? '#ef4444' : '#a855f7' }}
              labelStyle={{ color: '#71717a', marginBottom: '4px', fontSize: '10px' }}
              labelFormatter={(index) => `Match #${data[index]?.gameId || index} — ${data[index]?.year}`}
              cursor={{ stroke: '#3f3f46', strokeWidth: 1 }}
            />

            {yearMarkers.map((m) => (
              <ReferenceLine 
                key={`line-${m.year}`}
                x={m.index} 
                stroke="#3f3f46" 
                strokeDasharray="5 5"
              />
            ))}

            {seasonLabels.map((s) => (
              <ReferenceLine
                key={`label-${s.year}`}
                x={(s.start + s.end) / 2}
                stroke="none"
              >
                <Label
                  value={`${s.year}`}
                  position="top"
                  offset={20}
                  fill="#52525b"
                  fontSize={10}
                  fontWeight="900"
                  style={{ letterSpacing: '0.2em' }}
                />
              </ReferenceLine>
            ))}

            <Line 
              type="monotone" 
              dataKey={method} 
              stroke={method === 'pst' ? '#dc2626' : '#a855f7'} 
              strokeWidth={4}
              dot={{ r: 0 }}
              activeDot={{ 
                r: 6, 
                stroke: '#000', 
                strokeWidth: 2,
                fill: method === 'pst' ? '#dc2626' : '#a855f7'
              }}
              animationDuration={1500}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
