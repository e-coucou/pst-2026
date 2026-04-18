'use client'

import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

export default function EloChart({ history }: { history: any[] }) {
  const [method, setMethod] = useState<'pst' | 'modern'>('pst')

  // Préparation des données pour le graphique
  const data = history?.map((h, index) => ({
    name: `M${index + 1}`,
    pst: parseFloat(h.elo_value.toFixed(1)),
    modern: parseFloat(h.elo_modern_value.toFixed(1)),
    year: h.year
  }))

  return (
    <div className="w-full h-full min-h-[300px] min-w-0">
      <div className="flex gap-2">
        <button 
          onClick={() => setMethod('pst')}
          className={`px-4 py-1 rounded-full text-sm font-medium transition ${method === 'pst' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
        >
          PST Classic
        </button>
        <button 
          onClick={() => setMethod('modern')}
          className={`px-4 py-1 rounded-full text-sm font-medium transition ${method === 'modern' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
        >
          Moderne
        </button>
      </div>

      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} />
          <YAxis domain={['auto', 'auto']} stroke="#9CA3AF" fontSize={12} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px' }}
            itemStyle={{ color: '#F3F4F6' }}
          />
          <Line 
            type="monotone" 
            dataKey={method} 
            stroke={method === 'pst' ? '#3B82F6' : '#A855F7'} 
            strokeWidth={3}
            dot={{ r: 4 }}
            activeDot={{ r: 8 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
