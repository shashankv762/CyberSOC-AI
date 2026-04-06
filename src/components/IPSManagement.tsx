import React, { useState, useEffect } from 'react';
import { ShieldAlert, ShieldCheck, Search, AlertTriangle, Plus, X } from 'lucide-react';
import { api } from '../api/client';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';

export default function IPSManagement() {
  const [blockedIps, setBlockedIps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Manual block state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newIp, setNewIp] = useState('');
  const [newReason, setNewReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Unblock confirmation state
  const [ipToUnblock, setIpToUnblock] = useState<string | null>(null);

  const fetchBlockedIps = async () => {
    try {
      setLoading(true);
      const res = await api.getBlockedIps();
      setBlockedIps(res.data);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch blocked IPs:", err);
      setError("Failed to load IPS data. Ensure you have admin privileges.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlockedIps();
    // Poll every 10 seconds
    const interval = setInterval(fetchBlockedIps, 10000);
    return () => clearInterval(interval);
  }, []);

  const confirmUnblock = async () => {
    if (!ipToUnblock) return;
    
    try {
      await api.unblockIp(ipToUnblock);
      setBlockedIps(blockedIps.filter(b => b.ip !== ipToUnblock));
      toast.success(`IP ${ipToUnblock} unblocked successfully`);
    } catch (err) {
      console.error("Failed to unblock IP:", err);
      toast.error("Failed to unblock IP. Check console for details.");
    } finally {
      setIpToUnblock(null);
    }
  };

  const handleManualBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIp) return;
    
    setIsSubmitting(true);
    try {
      await api.blockIp(newIp, newReason || "Manually blocked by administrator");
      setIsModalOpen(false);
      setNewIp('');
      setNewReason('');
      fetchBlockedIps();
      toast.success(`IP ${newIp} blocked successfully`);
    } catch (err) {
      console.error("Failed to block IP:", err);
      toast.error("Failed to block IP. Please check if it's a valid IP format.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredIps = Array.isArray(blockedIps) ? blockedIps.filter(b => 
    b.ip.includes(searchTerm) || 
    (b.reason && b.reason.toLowerCase().includes(searchTerm.toLowerCase()))
  ) : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-soc-text flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-soc-red" />
            Intrusion Prevention System
          </h2>
          <p className="text-soc-muted text-sm mt-1">Manage automated and manual IP blocks</p>
        </div>
        
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-soc-red/10 text-soc-red hover:bg-soc-red/20 border border-soc-red/30 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Block IP Address
        </button>
      </div>

      {error && (
        <div className="p-4 bg-soc-red/10 border border-soc-red/20 text-soc-red rounded-xl text-sm flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          {error}
        </div>
      )}

      <div className="bg-soc-surface border border-soc-border rounded-xl overflow-hidden flex flex-col">
        <div className="p-4 border-b border-soc-border bg-soc-bg/50 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-soc-muted" />
            <input
              type="text"
              placeholder="Search blocked IPs or reasons..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-soc-bg border border-soc-border rounded-lg pl-9 pr-4 py-2 text-sm text-soc-text focus:outline-none focus:border-soc-blue/50"
            />
          </div>
          <div className="text-sm text-soc-muted font-mono">
            Total Blocked: <span className="text-soc-red font-bold">{blockedIps.length}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-soc-bg border-b border-soc-border text-soc-muted">
              <tr>
                <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">IP Address</th>
                <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">Reason</th>
                <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">Blocked At</th>
                <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-soc-border">
              {loading && blockedIps.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-soc-muted">
                    Loading IPS data...
                  </td>
                </tr>
              ) : filteredIps.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <ShieldCheck className="w-12 h-12 text-soc-green/50 mx-auto mb-3" />
                    <p className="text-soc-muted">No blocked IPs found</p>
                  </td>
                </tr>
              ) : (
                filteredIps.map((block) => (
                  <tr key={block.ip} className="hover:bg-soc-bg/50 transition-colors group">
                    <td className="px-6 py-4 font-mono text-soc-red font-bold">
                      {block.ip}
                    </td>
                    <td className="px-6 py-4 text-soc-text max-w-md truncate" title={block.reason}>
                      {block.reason}
                    </td>
                    <td className="px-6 py-4 text-soc-muted whitespace-nowrap">
                      {formatDistanceToNow(new Date(block.timestamp))} ago
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setIpToUnblock(block.ip)}
                        className="px-3 py-1.5 text-xs font-bold text-soc-green bg-soc-green/10 hover:bg-soc-green/20 border border-soc-green/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                      >
                        Unblock
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Unblock Confirmation Modal */}
      <AnimatePresence>
        {ipToUnblock && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-soc-surface border border-soc-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="p-4 border-b border-soc-border flex justify-between items-center bg-soc-bg/50">
                <h3 className="font-bold flex items-center gap-2 text-soc-text">
                  <ShieldCheck className="w-5 h-5 text-soc-green" />
                  Confirm Unblock
                </h3>
                <button onClick={() => setIpToUnblock(null)} className="p-1 hover:bg-soc-border rounded-md transition-colors text-soc-muted">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-6">
                <p className="text-soc-text mb-4">Are you sure you want to unblock the following IP address?</p>
                <div className="p-3 bg-soc-bg border border-soc-border rounded-xl font-mono text-soc-green font-bold text-center mb-6">
                  {ipToUnblock}
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setIpToUnblock(null)}
                    className="px-4 py-2 text-sm font-bold text-soc-text hover:bg-soc-border rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmUnblock}
                    className="px-4 py-2 text-sm font-bold bg-soc-green text-white hover:bg-soc-green/90 rounded-lg transition-colors flex items-center gap-2"
                  >
                    Confirm Unblock
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Manual Block Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-soc-surface border border-soc-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="p-4 border-b border-soc-border flex justify-between items-center bg-soc-bg/50">
                <h3 className="font-bold flex items-center gap-2 text-soc-text">
                  <ShieldAlert className="w-5 h-5 text-soc-red" />
                  Manually Block IP
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-soc-border rounded-md transition-colors text-soc-muted">
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <form onSubmit={handleManualBlock} className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-soc-muted tracking-widest ml-1">IP Address</label>
                  <input
                    type="text"
                    required
                    value={newIp}
                    onChange={(e) => setNewIp(e.target.value)}
                    placeholder="e.g., 192.168.1.100"
                    className="w-full bg-soc-bg border border-soc-border rounded-xl px-3 py-2 text-sm text-soc-text font-mono outline-none focus:border-soc-red/50"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-soc-muted tracking-widest ml-1">Reason (Optional)</label>
                  <textarea
                    value={newReason}
                    onChange={(e) => setNewReason(e.target.value)}
                    placeholder="Reason for blocking..."
                    rows={3}
                    className="w-full bg-soc-bg border border-soc-border rounded-xl px-3 py-2 text-sm text-soc-text outline-none focus:border-soc-red/50 resize-none"
                  />
                </div>

                <div className="pt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-sm font-bold text-soc-text hover:bg-soc-border rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 text-sm font-bold bg-soc-red text-white hover:bg-soc-red/90 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Blocking...' : 'Block IP'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
