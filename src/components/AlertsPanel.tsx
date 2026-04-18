import React, { useState, useEffect } from 'react';
import { usePolling } from '../hooks/usePolling';
import { api } from '../api/client';
import { formatDistanceToNow } from 'date-fns';
import { Check, Search, Settings, X, Save } from 'lucide-react';
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
    auto_ack_delay_minutes: 60,
    anomaly_threshold: 0.35,
    critical_threshold: 0.85
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (showSettings) {
      api.getSettings().then(res => setSettings(res.data)).catch(console.error);
    }
  }, [showSettings]);

  const handleAcknowledge = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    try {
      await api.acknowledgeAlert(id, true);
      toast.success('Alert acknowledged', {
        style: {
          background: '#000000',
          color: '#10b981',
          border: '1px solid rgba(16, 185, 129, 0.5)',
        },
        iconTheme: {
          primary: '#10b981',
          secondary: '#000000',
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
                <h3 className="font-bold flex items-center gap-2 font-syne">
                  <Settings className="w-5 h-5 text-soc-cyan" />
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
                    className="w-4 h-4 accent-soc-cyan"
                  />
                </div>
                
                <div className={`space-y-4 transition-opacity ${settings.auto_ack_enabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-bold text-soc-muted tracking-widest ml-1">Target Severity</label>
                    <select 
                      value={settings.auto_ack_severity}
                      onChange={e => setSettings({...settings, auto_ack_severity: e.target.value})}
                      className="bg-soc-bg border border-soc-border rounded-xl px-3 py-2 text-sm text-soc-text outline-none focus:border-soc-cyan/50 font-mono"
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
                      className="bg-soc-bg border border-soc-border rounded-xl px-3 py-2 text-sm text-soc-text outline-none focus:border-soc-cyan/50 font-mono"
                    />
                  </div>
                  <p className="text-xs text-soc-muted pb-4 border-b border-soc-border">
                    Alerts with severity <strong>{settings.auto_ack_severity}</strong> will be automatically acknowledged after <strong>{settings.auto_ack_delay_minutes}</strong> minutes.
                  </p>
                </div>
                
                <h4 className="font-bold text-soc-text font-syne pt-2">AI Anomaly Detection</h4>
                <div className="space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-bold text-soc-muted tracking-widest ml-1">Anomaly Threshold ({settings.anomaly_threshold})</label>
                    <input 
                      type="range" 
                      min="0.1" max="0.9" step="0.05"
                      value={settings.anomaly_threshold}
                      onChange={e => setSettings({...settings, anomaly_threshold: parseFloat(e.target.value)})}
                      className="accent-soc-cyan"
                    />
                    <p className="text-[10px] text-soc-muted">Scores above this generate an alert.</p>
                  </div>
                  
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-bold text-soc-muted tracking-widest ml-1">Critical Threshold ({settings.critical_threshold})</label>
                    <input 
                      type="range" 
                      min="0.5" max="0.99" step="0.05"
                      value={settings.critical_threshold}
                      onChange={e => setSettings({...settings, critical_threshold: parseFloat(e.target.value)})}
                      className="accent-soc-red"
                    />
                    <p className="text-[10px] text-soc-muted">Scores above this trigger automated IPS blocks.</p>
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-soc-border bg-soc-bg/50 flex justify-end gap-2">
                <button onClick={() => setShowSettings(false)} className="px-4 py-2 text-sm font-bold text-soc-text hover:bg-soc-border rounded-lg transition-colors">
                  Cancel
                </button>
                <button 
                  onClick={handleSaveSettings} 
                  disabled={saving}
                  className="px-4 py-2 text-sm font-bold bg-soc-cyan text-soc-bg hover:bg-soc-cyan/90 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {!alerts || !Array.isArray(alerts) || alerts.length === 0 ? (
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
              className={`glass-panel rounded-xl p-4 transition-all hover:border-soc-cyan/50 border-l-4 ${
                alert.severity === 'Critical' ? 'border-l-soc-red' : 
                alert.severity === 'Medium' ? 'border-l-soc-yellow' : 'border-l-soc-cyan'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                  alert.severity === 'Critical' ? 'bg-soc-red/10 text-soc-red' : 
                  alert.severity === 'Medium' ? 'bg-soc-yellow/10 text-soc-yellow' : 'bg-soc-cyan/10 text-soc-cyan'
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

              <div className="flex flex-wrap gap-2 mb-3">
                {alert.source_ip && (
                  <span className="text-[10px] font-mono bg-soc-bg px-2 py-1 rounded border border-soc-border text-soc-cyan">
                    IP: {alert.source_ip}
                  </span>
                )}
                {alert.event_type && (
                  <span className="text-[10px] font-mono bg-soc-bg px-2 py-1 rounded border border-soc-border text-soc-text">
                    Event: {alert.event_type}
                  </span>
                )}
                {alert.status_code && (
                  <span className="text-[10px] font-mono bg-soc-bg px-2 py-1 rounded border border-soc-border text-soc-text">
                    Status: {alert.status_code}
                  </span>
                )}
                {(() => {
                  let port = 'N/A';
                  try {
                    const payload = typeof alert.payload === 'string' ? JSON.parse(alert.payload) : alert.payload;
                    if (payload && payload.port) port = payload.port;
                  } catch (e) {}
                  if (port !== 'N/A') {
                    return (
                      <span className="text-[10px] font-mono bg-soc-bg px-2 py-1 rounded border border-soc-border text-soc-text">
                        Port: {port}
                      </span>
                    );
                  }
                  return null;
                })()}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={(e) => handleAcknowledge(e, alert.id)}
                  className="flex-1 py-1.5 text-xs font-bold bg-soc-bg hover:bg-soc-border text-soc-text rounded-lg transition-colors border border-soc-border"
                >
                  Acknowledge
                </button>
                <button
                  onClick={() => onInvestigate(alert)}
                  className="px-3 py-1.5 bg-soc-cyan/10 hover:bg-soc-cyan/20 text-soc-cyan rounded-lg transition-colors"
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
