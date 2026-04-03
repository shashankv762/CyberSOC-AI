import React, { useState, useEffect } from 'react';
import { usePolling } from '../hooks/usePolling';
import { api } from '../api/client';
import { formatDistanceToNow } from 'date-fns';
import { ShieldAlert, Check, Search, Settings, X, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';

interface AlertsPanelProps {
  onInvestigate: (alert: any) => void;
}

export default function AlertsPanel({ onInvestigate }: AlertsPanelProps) {
  const { data: alerts, refresh } = usePolling(() => api.getAlerts({ limit: 20, acknowledged: false }), 5000);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    auto_ack_enabled: false,
    auto_ack_severity: 'Low',
    auto_ack_delay_minutes: 60
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (showSettings) {
      api.getSettings().then(res => setSettings(res.data)).catch(console.error);
    }
  }, [showSettings]);

  const handleAcknowledge = async (e, id) => {
    e.stopPropagation();
    try {
      await api.acknowledgeAlert(id, true);
      toast.success('Alert acknowledged', {
        style: {
          background: '#1e1e2e',
          color: '#10b981',
          border: '1px solid rgba(16, 185, 129, 0.5)',
        },
        iconTheme: {
          primary: '#10b981',
          secondary: '#1e1e2e',
        },
      });
      refresh();
    } catch (err) {
      toast.error('Failed to acknowledge alert');
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await api.updateSettings(settings);
      setShowSettings(false);
    } catch (err) {
      console.error("Failed to save settings", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button 
          onClick={() => setShowSettings(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-soc-surface border border-soc-border rounded-lg text-xs font-bold text-soc-muted hover:text-soc-text hover:bg-soc-border transition-colors"
        >
          <Settings className="w-4 h-4" />
          Auto-Ack Settings
        </button>
      </div>

      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-soc-surface border border-soc-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="p-4 border-b border-soc-border flex justify-between items-center bg-soc-bg/50">
                <h3 className="font-bold flex items-center gap-2">
                  <Settings className="w-5 h-5 text-soc-blue" />
                  Auto-Acknowledge Settings
                </h3>
                <button onClick={() => setShowSettings(false)} className="p-1 hover:bg-soc-border rounded-md transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-soc-text">Enable Auto-Acknowledge</label>
                  <input 
                    type="checkbox" 
                    checked={settings.auto_ack_enabled}
                    onChange={e => setSettings({...settings, auto_ack_enabled: e.target.checked})}
                    className="w-4 h-4 accent-soc-blue"
                  />
                </div>
                
                <div className={`space-y-4 transition-opacity ${settings.auto_ack_enabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-bold text-soc-muted tracking-widest ml-1">Target Severity</label>
                    <select 
                      value={settings.auto_ack_severity}
                      onChange={e => setSettings({...settings, auto_ack_severity: e.target.value})}
                      className="bg-soc-bg border border-soc-border rounded-xl px-3 py-2 text-sm text-soc-text outline-none focus:border-soc-blue/50"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>
                  
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-bold text-soc-muted tracking-widest ml-1">Delay (Minutes)</label>
                    <input 
                      type="number" 
                      min="1"
                      value={settings.auto_ack_delay_minutes}
                      onChange={e => setSettings({...settings, auto_ack_delay_minutes: parseInt(e.target.value) || 60})}
                      className="bg-soc-bg border border-soc-border rounded-xl px-3 py-2 text-sm text-soc-text outline-none focus:border-soc-blue/50"
                    />
                  </div>
                  <p className="text-xs text-soc-muted">
                    Alerts with severity <strong>{settings.auto_ack_severity}</strong> will be automatically acknowledged after <strong>{settings.auto_ack_delay_minutes}</strong> minutes.
                  </p>
                </div>
              </div>
              <div className="p-4 border-t border-soc-border bg-soc-bg/50 flex justify-end gap-2">
                <button onClick={() => setShowSettings(false)} className="px-4 py-2 text-sm font-bold text-soc-text hover:bg-soc-border rounded-lg transition-colors">
                  Cancel
                </button>
                <button 
                  onClick={handleSaveSettings} 
                  disabled={saving}
                  className="px-4 py-2 text-sm font-bold bg-soc-blue text-white hover:bg-soc-blue/90 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {!alerts || alerts.length === 0 ? (
        <div className="bg-soc-surface border border-soc-border rounded-xl p-8 text-center">
          <div className="w-12 h-12 bg-soc-green/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-6 h-6 text-soc-green" />
          </div>
          <h4 className="font-bold text-soc-text">All Clear</h4>
          <p className="text-sm text-soc-muted">No active alerts requiring attention.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`bg-soc-surface border border-soc-border rounded-xl p-4 transition-all hover:border-soc-muted border-l-4 ${
                alert.severity === 'Critical' ? 'border-l-soc-red' : 
                alert.severity === 'Medium' ? 'border-l-soc-yellow' : 'border-l-soc-blue'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                  alert.severity === 'Critical' ? 'bg-soc-red/10 text-soc-red' : 
                  alert.severity === 'Medium' ? 'bg-soc-yellow/10 text-soc-yellow' : 'bg-soc-blue/10 text-soc-blue'
                }`}>
                  {alert.severity}
                </span>
                <span className="text-[10px] text-soc-muted">
                  {formatDistanceToNow(new Date(alert.created_at))} ago
                </span>
              </div>
              
              <p className="text-sm font-medium text-soc-text mb-3 line-clamp-2">
                {alert.reason}
              </p>

              <div className="flex gap-2">
                <button
                  onClick={(e) => handleAcknowledge(e, alert.id)}
                  className="flex-1 py-1.5 text-xs font-bold bg-soc-bg hover:bg-soc-border text-soc-text rounded-lg transition-colors border border-soc-border"
                >
                  Acknowledge
                </button>
                <button
                  onClick={() => onInvestigate(alert)}
                  className="px-3 py-1.5 bg-soc-blue/10 hover:bg-soc-blue/20 text-soc-blue rounded-lg transition-colors"
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
