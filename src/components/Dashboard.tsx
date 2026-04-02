import React from 'react';
import { usePolling } from '../hooks/usePolling';
import { api } from '../api/client';
import { ShieldAlert, Bell, Activity, Target, PieChart as PieChartIcon } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import LoginChart from './LoginChart';
import LogFeed from './LogFeed';
import AlertsPanel from './AlertsPanel';

interface DashboardProps {
  onSelectLog: (log: any) => void;
  onInvestigate: (alert: any) => void;
}

export default function Dashboard({ onSelectLog, onInvestigate }: DashboardProps) {
  const { data: stats } = usePolling(() => api.getStats(), 5000);
  const { data: alerts } = usePolling(() => api.getAlerts({ limit: 5 }), 5000);

  const metricCards = [
    { label: 'Total Logs Today', value: stats?.total_logs || 0, icon: Activity, color: 'text-soc-blue' },
    { label: 'Active Processes', value: stats?.process_count || 0, icon: Target, color: 'text-soc-purple' },
    { label: 'Network Conns', value: stats?.network_count || 0, icon: Activity, color: 'text-soc-blue' },
    { label: 'Critical Alerts', value: alerts?.filter(a => a.severity === 'Critical').length || 0, icon: ShieldAlert, color: 'text-soc-red' },
  ];

  const pieData = stats?.events_per_type ? Object.entries(stats.events_per_type).map(([name, value]) => ({
    name: name.replace(/_/g, ' ').toUpperCase(),
    value
  })) : [];

  const COLORS = ['#58a6ff', '#d29922', '#bc8cff', '#f85149', '#3fb950'];

  return (
    <div className="space-y-6">
      {/* Row 1: Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((card, i) => (
          <div key={i} className="bg-soc-surface border border-soc-border p-5 rounded-xl shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-2 rounded-lg bg-soc-bg border border-soc-border ${card.color}`}>
                <card.icon className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-bold text-soc-text">{card.value}</div>
            <div className="text-xs font-medium text-soc-muted uppercase tracking-wider">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Row 2: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <LoginChart />
        </div>
        <div className="bg-soc-surface border border-soc-border rounded-xl p-6 min-h-[400px] flex flex-col">
          <h3 className="font-bold mb-6 text-soc-text flex items-center gap-2">
            <PieChartIcon className="w-4 h-4 text-soc-purple" />
            Event Distribution
          </h3>
          <div className="flex-1 min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '8px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-3 mt-4">
            {pieData.map((entry, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs text-soc-muted">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="whitespace-nowrap">{entry.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: Live Feed & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <LogFeed onSelectLog={onSelectLog} />
        </div>
        <div className="space-y-4">
          <h3 className="font-bold text-soc-text flex items-center gap-2 px-1">
            <Bell className="w-4 h-4 text-soc-yellow" />
            Recent Alerts
          </h3>
          <AlertsPanel onInvestigate={onInvestigate} />
        </div>
      </div>
    </div>
  );
}
