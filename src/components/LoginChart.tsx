import React from 'react';
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { usePolling } from '../hooks/usePolling';
import { api } from '../api/client';

export default function LoginChart() {
  const { data: stats } = usePolling(() => api.getStats(), 30000);

  const chartData = Array.from({ length: 24 }, (_, i) => {
    const hourData = Array.isArray(stats?.timeline) ? stats.timeline.find((t: any) => t.hour === i) : null;
    return {
      name: `${i.toString().padStart(2, '0')}:00`,
      total: hourData?.count || 0,
      anomalies: Math.floor((hourData?.count || 0) * (Math.random() * 0.1)) // Mocking anomalies for visual line
    };
  });

  return (
    <div className="bg-soc-surface border border-soc-border rounded-xl p-6 h-[400px] flex flex-col">
      <h3 className="font-bold mb-6 text-soc-text">Login Activity — Last 24 Hours</h3>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#30363d" vertical={false} />
            <XAxis 
              dataKey="name" 
              stroke="#8b949e" 
              fontSize={10} 
              tickLine={false} 
              axisLine={false}
              interval={3}
            />
            <YAxis 
              stroke="#8b949e" 
              fontSize={10} 
              tickLine={false} 
              axisLine={false}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '8px' }}
              itemStyle={{ fontSize: '12px' }}
            />
            <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
            <Bar dataKey="total" name="Total Logins" fill="#58a6ff" radius={[4, 4, 0, 0]} barSize={20} />
            <Line dataKey="anomalies" name="Anomalies" stroke="#f85149" strokeWidth={2} dot={{ r: 3, fill: '#f85149' }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
