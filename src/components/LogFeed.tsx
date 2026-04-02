import React, { useState, useMemo } from 'react';
import { usePolling } from '../hooks/usePolling';
import { api } from '../api/client';
import { AlertCircle, CheckCircle2, Activity, Filter, X } from 'lucide-react';

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
    if (!logs) return [];
    return logs.filter((log: any) => {
      if (filterEventType && log.event_type !== filterEventType) return false;
      if (filterSourceIp && !log.source_ip.includes(filterSourceIp)) return false;
      if (filterAnomaly === 'anomaly' && !log.is_anomaly) return false;
      if (filterAnomaly === 'normal' && log.is_anomaly) return false;
      return true;
    });
  }, [logs, filterEventType, filterSourceIp, filterAnomaly]);

  const uniqueEventTypes = useMemo(() => {
    if (!logs) return [];
    return Array.from(new Set(logs.map((l: any) => l.event_type))) as string[];
  }, [logs]);

  if (loading && !logs) return <div className="p-8 text-center text-soc-muted">Loading logs...</div>;

  return (
    <div className="bg-soc-surface border border-soc-border rounded-xl overflow-hidden flex flex-col h-full">
      <div className="p-4 border-b border-soc-border flex justify-between items-center">
        <h3 className="font-bold flex items-center gap-2">
          <Activity className="w-4 h-4 text-soc-blue" />
          Live Log Stream
        </h3>
        <div className="flex items-center gap-3">
          <span className="text-xs text-soc-muted">Showing {filteredLogs.length} events</span>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`p-1.5 rounded-md transition-colors ${showFilters ? 'bg-soc-blue/20 text-soc-blue' : 'hover:bg-soc-bg text-soc-muted'}`}
          >
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="p-3 bg-soc-bg border-b border-soc-border flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase font-bold text-soc-muted">Event Type</label>
            <select 
              value={filterEventType} 
              onChange={e => setFilterEventType(e.target.value)}
              className="bg-soc-surface border border-soc-border rounded px-2 py-1 text-xs text-soc-text outline-none focus:border-soc-blue"
            >
              <option value="">All Types</option>
              {uniqueEventTypes.map(type => (
                <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
          
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase font-bold text-soc-muted">Source IP</label>
            <input 
              type="text" 
              placeholder="Filter by IP..."
              value={filterSourceIp} 
              onChange={e => setFilterSourceIp(e.target.value)}
              className="bg-soc-surface border border-soc-border rounded px-2 py-1 text-xs text-soc-text outline-none focus:border-soc-blue w-32"
            />
          </div>
          
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase font-bold text-soc-muted">Status</label>
            <select 
              value={filterAnomaly} 
              onChange={e => setFilterAnomaly(e.target.value)}
              className="bg-soc-surface border border-soc-border rounded px-2 py-1 text-xs text-soc-text outline-none focus:border-soc-blue"
            >
              <option value="all">All Statuses</option>
              <option value="anomaly">Anomaly Only</option>
              <option value="normal">Normal Only</option>
            </select>
          </div>
          
          {(filterEventType || filterSourceIp || filterAnomaly !== 'all') && (
            <button 
              onClick={() => {
                setFilterEventType('');
                setFilterSourceIp('');
                setFilterAnomaly('all');
              }}
              className="flex items-center gap-1 text-xs text-soc-muted hover:text-soc-text px-2 py-1 ml-auto"
            >
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>
      )}

      <div className="overflow-x-auto flex-1 min-h-[300px] max-h-[600px] overflow-y-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-soc-bg text-soc-muted sticky top-0">
            <tr>
              <th className="px-4 py-3 font-medium">Time</th>
              <th className="px-4 py-3 font-medium">Source IP</th>
              <th className="px-4 py-3 font-medium">Event Type</th>
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Anomaly</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-soc-border">
            {filteredLogs?.map((log: any) => (
              <tr
                key={log.id}
                onClick={() => onSelectLog(log)}
                className={`cursor-pointer transition-colors hover:bg-soc-bg/50 ${
                  log.is_anomaly ? 'bg-soc-red/5' : ''
                }`}
              >
                <td className="px-4 py-3 text-soc-muted whitespace-nowrap">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </td>
                <td className="px-4 py-3 font-mono text-soc-blue">{log.source_ip}</td>
                <td className="px-4 py-3">
                  <span className="capitalize">{log.event_type.replace(/_/g, ' ')}</span>
                </td>
                <td className="px-4 py-3 text-soc-muted">{log.username}</td>
                <td className="px-4 py-3">
                  <span className={log.status_code >= 400 ? 'text-soc-red' : 'text-soc-green'}>
                    {log.status_code}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {log.is_anomaly ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-soc-red/10 text-soc-red text-[10px] font-bold uppercase">
                      <AlertCircle className="w-3 h-3" />
                      Anomaly
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-soc-green/10 text-soc-green text-[10px] font-bold uppercase">
                      <CheckCircle2 className="w-3 h-3" />
                      Normal
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {filteredLogs.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-soc-muted">
                  No logs match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
