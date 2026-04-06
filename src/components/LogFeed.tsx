import React, { useState, useMemo } from 'react';
import { usePolling } from '../hooks/usePolling';
import { api } from '../api/client';
import { AlertCircle, CheckCircle2, Activity, Filter, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LogFeedProps {
  onSelectLog: (log: any) => void;
}

export default function LogFeed({ onSelectLog }: LogFeedProps) {
  const { data: logs, loading } = usePolling(() => api.getLogs({ limit: 100 }), 3000);

  const [filterEventType, setFilterEventType] = useState('');
  const [filterSourceIp, setFilterSourceIp] = useState('');
  const [filterAnomaly, setFilterAnomaly] = useState('all'); // 'all', 'anomaly', 'normal'
  const [showFilters, setShowFilters] = useState(false);

  const filteredLogs = useMemo(() => {
    if (!logs || !Array.isArray(logs)) return [];
    return logs.filter((log: any) => {
      if (filterEventType && log.event_type !== filterEventType) return false;
      if (filterSourceIp && !log.source_ip.includes(filterSourceIp)) return false;
      if (filterAnomaly === 'anomaly' && !log.is_anomaly) return false;
      if (filterAnomaly === 'normal' && log.is_anomaly) return false;
      return true;
    });
  }, [logs, filterEventType, filterSourceIp, filterAnomaly]);

  const uniqueEventTypes = useMemo(() => {
    if (!logs || !Array.isArray(logs)) return [];
    return Array.from(new Set(logs.map((l: any) => l.event_type))) as string[];
  }, [logs]);

  if (loading && !logs) return <div className="p-8 text-center text-soc-muted font-mono animate-pulse">SYNCING_LOG_DATA...</div>;

  return (
    <div className="glass-panel rounded-2xl overflow-hidden flex flex-col h-full relative">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-soc-blue to-soc-purple opacity-50"></div>
      
      <div className="p-4 border-b border-soc-border/50 flex justify-between items-center bg-soc-surface/50">
        <h3 className="font-bold flex items-center gap-2 text-soc-text">
          <Activity className="w-5 h-5 text-soc-blue" />
          Live Log Stream
        </h3>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs font-mono text-soc-muted">
            <span className="w-2 h-2 rounded-full bg-soc-green animate-pulse shadow-[0_0_8px_#10b981]"></span>
            {filteredLogs.length} EVENTS
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg transition-all duration-300 ${showFilters ? 'bg-soc-blue/20 text-soc-blue neon-border-blue' : 'hover:bg-soc-surface/80 text-soc-muted hover:text-soc-blue'}`}
          >
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-soc-bg/50 border-b border-soc-border/50 overflow-hidden"
          >
            <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-soc-muted tracking-widest ml-1">Event Type</label>
                <select 
                  value={filterEventType} 
                  onChange={e => setFilterEventType(e.target.value)}
                  className="bg-soc-surface/50 border border-soc-border/50 rounded-xl px-3 py-2 text-sm text-soc-text outline-none focus:border-soc-blue/50 focus:ring-1 focus:ring-soc-blue/50 transition-all"
                >
                  <option value="">All Types</option>
                  {uniqueEventTypes.map(type => (
                    <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-soc-muted tracking-widest ml-1">Source IP</label>
                <input 
                  type="text" 
                  placeholder="Filter by IP..."
                  value={filterSourceIp} 
                  onChange={e => setFilterSourceIp(e.target.value)}
                  className="bg-soc-surface/50 border border-soc-border/50 rounded-xl px-3 py-2 text-sm text-soc-text outline-none focus:border-soc-blue/50 focus:ring-1 focus:ring-soc-blue/50 transition-all"
                />
              </div>
              
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-soc-muted tracking-widest ml-1">Status</label>
                <select 
                  value={filterAnomaly} 
                  onChange={e => setFilterAnomaly(e.target.value)}
                  className="bg-soc-surface/50 border border-soc-border/50 rounded-xl px-3 py-2 text-sm text-soc-text outline-none focus:border-soc-blue/50 focus:ring-1 focus:ring-soc-blue/50 transition-all"
                >
                  <option value="all">All Statuses</option>
                  <option value="anomaly">Anomaly Only</option>
                  <option value="normal">Normal Only</option>
                </select>
              </div>
            </div>
            
            {(filterEventType || filterSourceIp || filterAnomaly !== 'all') && (
              <div className="px-4 pb-4 flex justify-end">
                <button 
                  onClick={() => {
                    setFilterEventType('');
                    setFilterSourceIp('');
                    setFilterAnomaly('all');
                  }}
                  className="flex items-center gap-1 text-xs font-bold text-soc-muted hover:text-soc-text px-3 py-1.5 rounded-lg hover:bg-soc-surface/50 transition-colors"
                >
                  <X className="w-3 h-3" /> Clear Filters
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="overflow-x-auto flex-1 min-h-[300px] max-h-[600px] overflow-y-auto custom-scrollbar">
        <table className="w-full text-left text-sm">
          <thead className="bg-soc-bg/80 backdrop-blur-md text-soc-muted sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 font-medium tracking-wider uppercase text-[10px]">Time</th>
              <th className="px-4 py-3 font-medium tracking-wider uppercase text-[10px]">Source IP</th>
              <th className="px-4 py-3 font-medium tracking-wider uppercase text-[10px]">Event Type</th>
              <th className="px-4 py-3 font-medium tracking-wider uppercase text-[10px]">User</th>
              <th className="px-4 py-3 font-medium tracking-wider uppercase text-[10px]">Status</th>
              <th className="px-4 py-3 font-medium tracking-wider uppercase text-[10px]">Anomaly</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-soc-border/30">
            <AnimatePresence>
              {filteredLogs?.map((log: any) => (
                <motion.tr
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  key={log.id}
                  onClick={() => onSelectLog(log)}
                  className={`cursor-pointer transition-all duration-200 hover:bg-soc-surface/80 ${
                    log.is_anomaly ? 'bg-soc-red/5 hover:bg-soc-red/10 border-l-2 border-soc-red' : 'border-l-2 border-transparent hover:border-soc-blue/50'
                  }`}
                >
                  <td className="px-4 py-3 text-soc-muted whitespace-nowrap font-mono text-xs">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="px-4 py-3 font-mono text-soc-blue text-xs">{log.source_ip}</td>
                  <td className="px-4 py-3">
                    <span className="capitalize font-medium">{log.event_type.replace(/_/g, ' ')}</span>
                  </td>
                  <td className="px-4 py-3 text-soc-muted font-mono text-xs">{log.username}</td>
                  <td className="px-4 py-3">
                    <span className={`font-mono text-xs ${log.status_code >= 400 ? 'text-soc-red' : 'text-soc-green'}`}>
                      {log.status_code}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {log.is_anomaly ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-soc-red/10 border border-soc-red/30 text-soc-red text-[10px] font-bold uppercase shadow-[0_0_8px_rgba(239,68,68,0.2)]">
                        <AlertCircle className="w-3 h-3" />
                        Anomaly
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-soc-green/10 border border-soc-green/30 text-soc-green text-[10px] font-bold uppercase">
                        <CheckCircle2 className="w-3 h-3" />
                        Normal
                      </span>
                    )}
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
            {filteredLogs.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-soc-muted font-mono text-sm">
                  NO_LOGS_MATCH_CRITERIA
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
