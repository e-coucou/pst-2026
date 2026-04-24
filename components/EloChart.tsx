'use client'

import { useState, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Label, ReferenceArea } from 'recharts'

export default function EloChart({ history }: { history: any[] }) {
  const [method, setMethod] = useState<'pst' | 'modern'>('pst')

// 1. Préparation des données
  const data = useMemo(() => {
    return history?.map((h, index) => ({
      index, // On utilise l'index numérique pour le placement précis sur l'axe X
      name: `M${index + 1}`,
      pst: parseFloat(h.elo_value.toFixed(1)),
      modern: parseFloat(h.elo_modern_value.toFixed(1)),
      year: h.year,
      gameId: h.game_id
    })) || []
  }, [history])

// 2. Calcul des marqueurs d'années (le premier match de chaque nouvelle année)
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
  
// 3. Calcul des positions des Label
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

  return (
	<div className="w-full h-full min-h-[300px] min-w-0 flex flex-col gap-4">
      <div className="flex gap-2">
        <button 
          onClick={() => setMethod('pst')}
          className={`px-4 py-1 rounded-full text-sm font-medium transition ${method === 'pst' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
        >
          ELO
        </button>
        <button 
          onClick={() => setMethod('modern')}
          className={`px-4 py-1 rounded-full text-sm font-medium transition ${method === 'modern' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
        >
          Moderne
        </button>
      </div>
	<div className="flex-1">
      <ResponsiveContainer width="100%" height="100%">

		<LineChart data={data} margin={{ top: 20, right: 30, bottom: 20, left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />  
          {/* On utilise l'index pour l'axe X pour que les ReferenceLine tombent pile sur les points */}
          <XAxis dataKey="index" hide />
          <YAxis domain={['auto', 'auto']} stroke="#9CA3AF" fontSize={12} tickFormatter={(val) => Math.round(val).toString()}/>

		  <Tooltip 
              contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px' }}
              itemStyle={{ color: '#F3F4F6' }}
              labelFormatter={(index) => `Match #${data[index]?.gameId || index} (${data[index]?.year})`}
          />

		  {/* 3. LIGNES DE RÉFÉRENCE POUR LES SAISONS */}
          {yearMarkers.map((m) => (
              <ReferenceLine 
				key={`line-${m.year}`}
                x={m.index} 
                stroke="#4B5563" 
                strokeDasharray="5 5"
              />
            ))}

		{/* Labels positionnés au centre de chaque zone d'année */}
		{seasonLabels.map((s) => (
		  <ReferenceLine
		    key={`label-${s.year}`}
		    x={(s.start + s.end) / 2} // Position centrale mathématique
		    stroke="none"             // On ne dessine pas de ligne
		  >
		    <Label
		      value={s.year.toString()}
		      position="top"
		      offset={10}             // Ajuste cette valeur pour monter/descendre le texte
		      fill="#9CA3AF"
		      fontSize={12}
		      fontWeight="bold"
		    />
		  </ReferenceLine>
		))}

          <Line 
            type="monotone" 
            dataKey={method} 
            stroke={method === 'pst' ? '#3B82F6' : '#A855F7'} 
            strokeWidth={3}
            dot={{ r: 4 }}
            activeDot={{ r: 8 }}
            animationDuration={1000}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  </div>
  )
}
