import React from 'react';
import { usePolling } from '../hooks/usePolling';
import { api } from '../api/client';
import { ShieldAlert, Bell, Activity, Target, PieChart as PieChartIcon } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { motion } from 'motion/react';
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
    { label: 'Total Logs Today', value: stats?.total_logs || 0, icon: Activity, color: 'text-soc-blue', border: 'border-soc-blue/30' },
    { label: 'Active Processes', value: stats?.process_count || 0, icon: Target, color: 'text-soc-purple', border: 'border-soc-purple/30' },
    { label: 'Network Conns', value: stats?.network_count || 0, icon: Activity, color: 'text-soc-blue', border: 'border-soc-blue/30' },
    { label: 'Critical Alerts', value: (Array.isArray(alerts) ? alerts : [])?.filter(a => a.severity === 'Critical').length || 0, icon: ShieldAlert, color: 'text-soc-red', border: 'border-soc-red/30' },
  ];

  const pieData = stats?.events_per_type ? Object.entries(stats.events_per_type).map(([name, value]) => ({
    name: name.replace(/_/g, ' ').toUpperCase(),
    value
  })) : [];

  const COLORS = ['#0ea5e9', '#8b5cf6', '#10b981', '#ef4444', '#eab308'];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div 
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* Row 1: Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((card, i) => (
          <motion.div key={i} variants={itemVariants} className={`glass-panel p-5 rounded-xl border-t-2 ${card.border} hover:-translate-y-1 transition-transform duration-300`}>
            <div className="flex justify-between items-start mb-4">
              <div className={`p-2.5 rounded-lg bg-soc-bg/50 border border-soc-border/50 ${card.color}`}>
                <card.icon className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-bold text-soc-text tracking-tight">{card.value}</div>
            <div className="text-xs font-semibold text-soc-muted uppercase tracking-widest mt-1">{card.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Row 2: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <LoginChart />
        </motion.div>
        <motion.div variants={itemVariants} className="glass-panel rounded-xl p-6 min-h-[400px] flex flex-col relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-soc-purple to-soc-blue opacity-50"></div>
          <h3 className="font-bold mb-6 text-soc-text flex items-center gap-2">
            <PieChartIcon className="w-4 h-4 text-soc-purple" />
            Event Distribution
          </h3>
          <div className="flex-1 min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  innerRadius={65}
                  outerRadius={85}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: 'rgba(10, 10, 15, 0.9)', backdropFilter: 'blur(8px)', border: '1px solid rgba(30, 41, 59, 0.8)', borderRadius: '8px' }}
                  itemStyle={{ color: '#f8fafc' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-3 mt-4">
            {pieData.map((entry, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs font-medium text-soc-muted">
                <div className="w-2.5 h-2.5 rounded-full shrink-0 shadow-[0_0_8px_currentColor]" style={{ backgroundColor: COLORS[i % COLORS.length], color: COLORS[i % COLORS.length] }} />
                <span className="whitespace-nowrap">{entry.name}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Row 3: Live Feed & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <LogFeed onSelectLog={onSelectLog} />
        </motion.div>
        <motion.div variants={itemVariants} className="space-y-4">
          <h3 className="font-bold text-soc-text flex items-center gap-2 px-1">
            <Bell className="w-4 h-4 text-soc-yellow" />
            Recent Alerts
          </h3>
          <AlertsPanel onInvestigate={onInvestigate} />
        </motion.div>
      </div>
    </motion.div>
  );
}
