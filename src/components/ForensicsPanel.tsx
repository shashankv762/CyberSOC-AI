import React, { useState, useMemo, useEffect } from 'react';
import { Search, Download, ShieldAlert, AlertCircle, Clock, Database, User, Globe } from 'lucide-react';
import { api } from '../api/client';
import { motion, AnimatePresence } from 'motion/react';

export default function ForensicsPanel() {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState('source_ip'); // 'source_ip' or 'username'
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    const handleForensicsSearch = (e: any) => {
      const { type, query } = e.detail;
      setSearchType(type);
      setQuery(query);
      // Trigger search immediately
      performSearch(type, query);
    };

    window.addEventListener('soc_forensics_search', handleForensicsSearch);
    return () => window.removeEventListener('soc_forensics_search', handleForensicsSearch);
  }, []);

  const performSearch = async (type: string, searchQuery: string) => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setSearched(true);
    try {
      const params: any = { limit: 500 };
      if (type === 'source_ip') {
        params.source_ip = searchQuery;
      } else {
        params.username = searchQuery;
      }
      const res = await api.getLogs(params);
      setLogs(res.data);
    } catch (err) {
      console.error("Failed to fetch forensics logs:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    performSearch(searchType, query);
  };

  const exportCSV = () => {
    if (!Array.isArray(logs) || logs.length === 0) return;
    const headers = ['Timestamp', 'Source IP', 'Event Type', 'Username', 'Status Code', 'Is Anomaly', 'Payload'];
    const csvContent = [
      headers.join(','),
      ...logs.map(log => [
        new Date(log.timestamp).toISOString(),
        log.source_ip,
        log.event_type,
        log.username,
        log.status_code,
        log.is_anomaly ? 'Yes' : 'No',
        `"${JSON.stringify(log.payload).replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `forensics_${searchType}_${query}_${new Date().toISOString()}.csv`;
    link.click();
  };

  const exportJSON = () => {
    if (!Array.isArray(logs) || logs.length === 0) return;
    const jsonContent = JSON.stringify(logs, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `forensics_${searchType}_${query}_${new Date().toISOString()}.json`;
    link.click();
  };

  const anomalyCount = useMemo(() => Array.isArray(logs) ? logs.filter(l => l.is_anomaly).length : 0, [logs]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-soc-text to-soc-muted">
        Forensics & Deep Analysis
      </h2>

      {/* Search Bar */}
      <div className="glass-panel rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-soc-blue via-soc-purple to-soc-blue opacity-50"></div>
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-xs font-bold text-soc-muted uppercase tracking-widest mb-2 ml-1">Search Query</label>
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-soc-muted group-focus-within:text-soc-blue transition-colors" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchType === 'source_ip' ? "Enter IP address (e.g., 192.168.1.100)" : "Enter username (e.g., admin)"}
                className="w-full bg-soc-surface/50 border border-soc-border/50 rounded-xl py-3 pl-12 pr-4 text-soc-text focus:outline-none focus:border-soc-blue/50 focus:ring-1 focus:ring-soc-blue/50 transition-all"
              />
            </div>
          </div>
          <div className="w-full md:w-48">
            <label className="block text-xs font-bold text-soc-muted uppercase tracking-widest mb-2 ml-1">Search By</label>
            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value)}
              className="w-full bg-soc-surface/50 border border-soc-border/50 rounded-xl py-3 px-4 text-soc-text focus:outline-none focus:border-soc-blue/50 focus:ring-1 focus:ring-soc-blue/50 transition-all"
            >
              <option value="source_ip">Source IP</option>
              <option value="username">Username</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="w-full md:w-auto py-3 px-8 bg-soc-blue text-white font-bold rounded-xl hover:bg-soc-blue/90 transition-all disabled:opacity-50 shadow-[0_0_15px_rgba(14,165,233,0.4)]"
          >
            {loading ? 'Searching...' : 'Analyze'}
          </button>
        </form>
      </div>

      {/* Results Area */}
      {searched && (
        <AnimatePresence mode="wait">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="glass-panel p-5 rounded-xl border-l-4 border-l-soc-blue flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-soc-blue/10 flex items-center justify-center">
                  <Database className="w-6 h-6 text-soc-blue" />
                </div>
                <div>
                  <div className="text-xs font-bold text-soc-muted uppercase tracking-widest">Total Events</div>
                  <div className="text-2xl font-bold text-soc-text">{logs.length}</div>
                </div>
              </div>
              <div className="glass-panel p-5 rounded-xl border-l-4 border-l-soc-red flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-soc-red/10 flex items-center justify-center">
                  <ShieldAlert className="w-6 h-6 text-soc-red" />
                </div>
                <div>
                  <div className="text-xs font-bold text-soc-muted uppercase tracking-widest">Anomalies Detected</div>
                  <div className="text-2xl font-bold text-soc-red">{anomalyCount}</div>
                </div>
              </div>
              <div className="glass-panel p-5 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-soc-muted uppercase tracking-widest mb-2">Export Data</div>
                  <div className="flex gap-2">
                    <button onClick={exportCSV} disabled={logs.length === 0} className="px-3 py-1.5 bg-soc-surface border border-soc-border rounded-lg text-xs font-bold hover:bg-soc-border transition-colors disabled:opacity-50 flex items-center gap-1">
                      <Download className="w-3 h-3" /> CSV
                    </button>
                    <button onClick={exportJSON} disabled={logs.length === 0} className="px-3 py-1.5 bg-soc-surface border border-soc-border rounded-lg text-xs font-bold hover:bg-soc-border transition-colors disabled:opacity-50 flex items-center gap-1">
                      <Download className="w-3 h-3" /> JSON
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline View */}
            <div className="glass-panel rounded-2xl p-6">
              <h3 className="font-bold flex items-center gap-2 text-soc-text mb-6">
                <Clock className="w-5 h-5 text-soc-purple" />
                Event Timeline
              </h3>
              
              {Array.isArray(logs) && logs.length > 0 ? (
                <div className="relative border-l-2 border-soc-border/50 ml-4 space-y-8 pb-4">
                  {logs.map((log, index) => (
                    <motion.div 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: Math.min(index * 0.05, 1) }}
                      key={log.id} 
                      className="relative pl-6"
                    >
                      {/* Timeline Dot */}
                      <div className={`absolute -left-[9px] top-1.5 w-4 h-4 rounded-full border-2 border-soc-bg ${
                        log.is_anomaly ? 'bg-soc-red shadow-[0_0_10px_rgba(239,68,68,0.6)]' : 'bg-soc-blue shadow-[0_0_10px_rgba(14,165,233,0.4)]'
                      }`} />
                      
                      <div className={`p-4 rounded-xl border ${
                        log.is_anomaly ? 'bg-soc-red/5 border-soc-red/30' : 'bg-soc-surface/50 border-soc-border/50'
                      }`}>
                        <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-mono text-soc-muted">
                              {new Date(log.timestamp).toLocaleString()}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              log.is_anomaly ? 'bg-soc-red/20 text-soc-red' : 'bg-soc-blue/20 text-soc-blue'
                            }`}>
                              {log.event_type.replace(/_/g, ' ')}
                            </span>
                          </div>
                          {log.is_anomaly && (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-soc-red uppercase">
                              <AlertCircle className="w-3 h-3" /> Anomaly
                            </span>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                          <div>
                            <div className="text-[10px] text-soc-muted uppercase font-bold mb-1 flex items-center gap-1"><Globe className="w-3 h-3"/> IP</div>
                            <div className="text-sm font-mono text-soc-text">{log.source_ip}</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-soc-muted uppercase font-bold mb-1 flex items-center gap-1"><User className="w-3 h-3"/> User</div>
                            <div className="text-sm font-mono text-soc-text">{log.username}</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-soc-muted uppercase font-bold mb-1">Status</div>
                            <div className={`text-sm font-mono ${log.status_code >= 400 ? 'text-soc-red' : 'text-soc-green'}`}>{log.status_code}</div>
                          </div>
                        </div>
                        
                        <div className="mt-3 pt-3 border-t border-soc-border/30">
                          <div className="text-[10px] text-soc-muted uppercase font-bold mb-1">Payload</div>
                          <pre className="text-xs font-mono text-soc-muted bg-black/30 p-2 rounded overflow-x-auto">
                            {typeof log.payload === 'string' ? log.payload : JSON.stringify(log.payload)}
                          </pre>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-soc-muted">
                  <Search className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>No events found for this query.</p>
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
