import React, { useState, useMemo } from 'react';
import { usePolling } from '../hooks/usePolling';
import { api } from '../api/client';
import { Activity, AlertTriangle, Search, ArrowUpDown } from 'lucide-react';

export default function ProcessPanel() {
  const { data: processes, loading } = usePolling(() => api.getProcesses(), 3000);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<string>('cpu_percent');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const filteredAndSortedProcesses = useMemo(() => {
    if (!processes) return [];
    
    // Filter
    let result = processes.filter((proc: any) => {
      const term = searchTerm.toLowerCase();
      return (
        (proc.name && proc.name.toLowerCase().includes(term)) ||
        (proc.pid && proc.pid.toString().includes(term)) ||
        (proc.exe_path && proc.exe_path.toLowerCase().includes(term)) ||
        (proc.status && proc.status.toLowerCase().includes(term))
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
  }, [processes, searchTerm, sortBy, sortOrder]);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  if (loading && !processes) return <div className="p-8 text-center text-soc-muted">Loading processes...</div>;

  return (
    <div className="bg-soc-surface border border-soc-border rounded-xl overflow-hidden flex flex-col h-full">
      <div className="p-4 border-b border-soc-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center justify-between w-full sm:w-auto">
          <h3 className="font-bold flex items-center gap-2">
            <Activity className="w-4 h-4 text-soc-purple" />
            System Processes
          </h3>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-soc-muted" />
            <input
              type="text"
              placeholder="Search name, PID, or path..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-soc-bg border border-soc-border rounded-lg py-1.5 pl-9 pr-3 text-sm text-soc-text focus:outline-none focus:border-soc-purple/50"
            />
          </div>
          <span className="text-xs text-soc-muted hidden sm:inline-block">Real-time Task Manager</span>
        </div>
      </div>
      <div className="overflow-x-auto overflow-y-auto flex-1 max-h-[500px]">
        <table className="w-full text-left text-sm">
          <thead className="bg-soc-bg text-soc-muted sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 font-medium cursor-pointer hover:text-soc-text transition-colors" onClick={() => handleSort('pid')}>
                <div className="flex items-center gap-1">PID <ArrowUpDown className="w-3 h-3 opacity-50" /></div>
              </th>
              <th className="px-4 py-3 font-medium cursor-pointer hover:text-soc-text transition-colors" onClick={() => handleSort('name')}>
                <div className="flex items-center gap-1">Name <ArrowUpDown className="w-3 h-3 opacity-50" /></div>
              </th>
              <th className="px-4 py-3 font-medium cursor-pointer hover:text-soc-text transition-colors" onClick={() => handleSort('cpu_percent')}>
                <div className="flex items-center gap-1">CPU % <ArrowUpDown className="w-3 h-3 opacity-50" /></div>
              </th>
              <th className="px-4 py-3 font-medium cursor-pointer hover:text-soc-text transition-colors" onClick={() => handleSort('memory_usage')}>
                <div className="flex items-center gap-1">Memory % <ArrowUpDown className="w-3 h-3 opacity-50" /></div>
              </th>
              <th className="px-4 py-3 font-medium cursor-pointer hover:text-soc-text transition-colors" onClick={() => handleSort('status')}>
                <div className="flex items-center gap-1">Status <ArrowUpDown className="w-3 h-3 opacity-50" /></div>
              </th>
              <th className="px-4 py-3 font-medium cursor-pointer hover:text-soc-text transition-colors" onClick={() => handleSort('exe_path')}>
                <div className="flex items-center gap-1">Path <ArrowUpDown className="w-3 h-3 opacity-50" /></div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-soc-border">
            {filteredAndSortedProcesses.map((proc: any) => (
              <tr
                key={proc.id}
                className={`transition-colors hover:bg-soc-bg/50 ${
                  proc.is_suspicious ? 'bg-soc-red/5' : ''
                }`}
              >
                <td className="px-4 py-3 font-mono text-soc-blue">{proc.pid}</td>
                <td className="px-4 py-3 font-medium flex items-center gap-2">
                  {proc.name}
                  {proc.is_suspicious && (
                    <AlertTriangle className="w-3 h-3 text-soc-red" />
                  )}
                </td>
                <td className={`px-4 py-3 ${(proc.cpu_percent || 0) > 50 ? 'text-soc-yellow' : 'text-soc-muted'}`}>
                  {(proc.cpu_percent || 0).toFixed(1)}%
                </td>
                <td className="px-4 py-3 text-soc-muted">
                  {(proc.memory_usage || 0).toFixed(1)}%
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    proc.status === 'running' ? 'bg-soc-green/10 text-soc-green' : 'bg-soc-muted/10 text-soc-muted'
                  }`}>
                    {proc.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-soc-muted truncate max-w-[200px]" title={proc.exe_path}>
                  {proc.exe_path}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
