'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface CalibrationBucket {
  predictedMid: number;
  actualRate: number | null;
  count: number;
}

const IDEAL_LINE = [{ x: 0, y: 0 }, { x: 100, y: 100 }];

export default function CalibrationChart({
  modernBuckets,
  dynamicBuckets,
}: {
  modernBuckets: CalibrationBucket[];
  dynamicBuckets: CalibrationBucket[];
}) {
  const modernData = modernBuckets.map(b => ({ x: b.predictedMid, y: b.actualRate, count: b.count }));
  const dynamicData = dynamicBuckets.map(b => ({ x: b.predictedMid, y: b.actualRate, count: b.count }));

  return (
    <ResponsiveContainer width="99%" height={320}>
      <LineChart margin={{ top: 10, right: 20, left: -10, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis
          dataKey="x"
          type="number"
          domain={[0, 100]}
          ticks={[0, 20, 40, 60, 80, 100]}
          tickFormatter={(v) => `${v}%`}
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#71717a', fontSize: 10, fontWeight: 'bold' }}
          label={{ value: 'Probabilité prédite', position: 'insideBottom', offset: -5, fill: '#71717a', fontSize: 10 }}
        />
        <YAxis
          type="number"
          domain={[0, 100]}
          tickFormatter={(v) => `${v}%`}
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#71717a', fontSize: 10 }}
        />
        <Tooltip
          cursor={{ stroke: 'rgba(255,255,255,0.1)' }}
          contentStyle={{
            backgroundColor: '#09090b',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.1)',
            fontSize: '12px',
            color: '#fff',
          }}
          formatter={(value, name, props) => {
            const count = (props?.payload as { count?: number } | undefined)?.count;
            const suffix = name !== 'Idéal' && count != null ? ` (n=${count})` : '';
            return [`${Number(value).toFixed(0)}%${suffix}`, name];
          }}
          labelFormatter={(v) => `Prédit ~${v}%`}
        />
        <Legend wrapperStyle={{ fontSize: 11, textTransform: 'uppercase', fontWeight: 'bold' }} />
        <Line
          data={IDEAL_LINE}
          dataKey="y"
          name="Idéal"
          stroke="#52525b"
          strokeWidth={2}
          strokeDasharray="4 4"
          dot={false}
          isAnimationActive={false}
        />
        <Line
          data={modernData}
          dataKey="y"
          name="Modern"
          stroke="#a855f7"
          strokeWidth={2}
          dot={{ r: 4, fill: '#a855f7' }}
          connectNulls={false}
          isAnimationActive={false}
        />
        <Line
          data={dynamicData}
          dataKey="y"
          name="Dynamique"
          stroke="#10b981"
          strokeWidth={2}
          dot={{ r: 4, fill: '#10b981' }}
          connectNulls={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
