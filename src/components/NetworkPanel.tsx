import React, { useState, useMemo } from 'react';
import { usePolling } from '../hooks/usePolling';
import { api } from '../api/client';
import { Globe, ShieldAlert, CheckCircle2, Search, ArrowUpDown } from 'lucide-react';

export default function NetworkPanel() {
  const { data: network, loading } = usePolling(() => api.getNetwork(), 3000);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<string>('timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const filteredAndSortedNetwork = useMemo(() => {
    if (!network) return [];
    
    // Filter
    let result = network.filter((conn: any) => {
      const term = searchTerm.toLowerCase();
      return (
        (conn.local_address && conn.local_address.toLowerCase().includes(term)) ||
        (conn.remote_address && conn.remote_address.toLowerCase().includes(term)) ||
        (conn.pid && conn.pid.toString().includes(term)) ||
        (conn.status && conn.status.toLowerCase().includes(term))
      );
    });

    // Sort
    result.sort((a: any, b: any) => {
      let valA = a[sortBy];
      let valB = b[sortBy];

      if (sortBy === 'is_suspicious') {
        valA = a.is_suspicious ? 1 : 0;
        valB = b.is_suspicious ? 1 : 0;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [network, searchTerm, sortBy, sortOrder]);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  if (loading && !network) return <div className="p-8 text-center text-soc-muted">Loading network...</div>;

  return (
    <div className="bg-soc-surface border border-soc-border rounded-xl overflow-hidden flex flex-col h-full">
      <div className="p-4 border-b border-soc-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center justify-between w-full sm:w-auto">
          <h3 className="font-bold flex items-center gap-2">
            <Globe className="w-4 h-4 text-soc-blue" />
            Network Connections
          </h3>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-soc-muted" />
            <input
              type="text"
              placeholder="Search IP, PID, or status..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-soc-bg border border-soc-border rounded-lg py-1.5 pl-9 pr-3 text-sm text-soc-text focus:outline-none focus:border-soc-blue/50"
            />
          </div>
          <span className="text-xs text-soc-muted hidden sm:inline-block">Active established connections</span>
        </div>
      </div>
      <div className="overflow-x-auto overflow-y-auto flex-1 max-h-[500px]">
        <table className="w-full text-left text-sm">
          <thead className="bg-soc-bg text-soc-muted sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 font-medium cursor-pointer hover:text-soc-text transition-colors" onClick={() => handleSort('local_address')}>
                <div className="flex items-center gap-1">Local Address <ArrowUpDown className="w-3 h-3 opacity-50" /></div>
              </th>
              <th className="px-4 py-3 font-medium cursor-pointer hover:text-soc-text transition-colors" onClick={() => handleSort('remote_address')}>
                <div className="flex items-center gap-1">Remote Address <ArrowUpDown className="w-3 h-3 opacity-50" /></div>
              </th>
              <th className="px-4 py-3 font-medium cursor-pointer hover:text-soc-text transition-colors" onClick={() => handleSort('status')}>
                <div className="flex items-center gap-1">Status <ArrowUpDown className="w-3 h-3 opacity-50" /></div>
              </th>
              <th className="px-4 py-3 font-medium cursor-pointer hover:text-soc-text transition-colors" onClick={() => handleSort('pid')}>
                <div className="flex items-center gap-1">PID <ArrowUpDown className="w-3 h-3 opacity-50" /></div>
              </th>
              <th className="px-4 py-3 font-medium cursor-pointer hover:text-soc-text transition-colors" onClick={() => handleSort('is_suspicious')}>
                <div className="flex items-center gap-1">Risk <ArrowUpDown className="w-3 h-3 opacity-50" /></div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-soc-border">
            {filteredAndSortedNetwork.map((conn: any) => (
              <tr
                key={conn.id}
                className={`transition-colors hover:bg-soc-bg/50 ${
                  conn.is_suspicious ? 'bg-soc-red/5' : ''
                }`}
              >
                <td className="px-4 py-3 font-mono text-soc-muted">{conn.local_address}</td>
                <td className="px-4 py-3 font-mono text-soc-blue">{conn.remote_address}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded-full bg-soc-green/10 text-soc-green text-[10px] font-bold uppercase">
                    {conn.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-soc-muted">{conn.pid}</td>
                <td className="px-4 py-3">
                  {conn.is_suspicious ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-soc-red/10 text-soc-red text-[10px] font-bold uppercase">
                      <ShieldAlert className="w-3 h-3" />
                      Suspicious
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-soc-green/10 text-soc-green text-[10px] font-bold uppercase">
                      <CheckCircle2 className="w-3 h-3" />
                      Safe
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
