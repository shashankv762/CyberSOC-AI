import React, { useEffect, useRef } from 'react';
import { usePolling } from '../hooks/usePolling';
import { api } from '../api/client';
import { Brain, ShieldAlert, Cpu, Activity, CheckCircle2, AlertTriangle, Zap, FileText, X, Skull, Volume2, VolumeX, Globe, Database, Server } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import DefenceInDepth from './DefenceInDepth';
import AttackerProfile from './AttackerProfile';
import CampaignNamer from './CampaignNamer';
import ReplayTimeline from './ReplayTimeline';
import MalwareAnalyzer from './MalwareAnalyzer';

export default function SentinelBrain() {
  const { data: history } = usePolling(() => api.getSentinelHistory(), 2000);
  const [selectedReport, setSelectedReport] = React.useState<string | null>(null);
  const [isHackerMode, setIsHackerMode] = React.useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = React.useState(false);
  const lastAlertId = useRef<string | null>(null);
  
  const events = Array.isArray(history) ? history : [];

  // Sentinel Voice: TTS for critical alerts
  useEffect(() => {
    if (!isVoiceEnabled || events.length === 0) return;
    const latest = events[0];
    if (latest.event?.severity === 'Critical' && latest.event?.id !== lastAlertId.current) {
      lastAlertId.current = latest.event.id;
      const utterance = new SpeechSynthesisUtterance(`Critical Alert detected: ${latest.event.reason}`);
      utterance.rate = 0.9;
      utterance.pitch = 0.8;
      window.speechSynthesis.speak(utterance);
    }
  }, [events, isVoiceEnabled]);

  return (
    <div className={`space-y-6 max-w-6xl mx-auto transition-all duration-500 ${isHackerMode ? 'grayscale invert brightness-150' : ''}`}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-soc-purple to-soc-cyan flex items-center gap-3">
            <Brain className="w-8 h-8 text-soc-purple" />
            SENTINEL AI Brain
          </h2>
          <p className="text-soc-muted mt-1 font-mono text-sm">Episodic Threat Memory & Layered Self-Hardening</p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
            className={`p-2 rounded-lg border transition-all ${isVoiceEnabled ? 'bg-soc-purple/20 border-soc-purple text-soc-purple' : 'bg-soc-bg border-soc-border text-soc-muted'}`}
            title="Toggle Sentinel Voice"
          >
            {isVoiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
          <button 
            onClick={() => setIsHackerMode(!isHackerMode)}
            className={`p-2 rounded-lg border transition-all ${isHackerMode ? 'bg-soc-red/20 border-soc-red text-soc-red' : 'bg-soc-bg border-soc-border text-soc-muted'}`}
            title="Toggle Hacker Perspective"
          >
            <Skull className="w-5 h-5" />
          </button>
          <div className="glass-panel px-4 py-2 rounded-lg flex items-center gap-2 border border-soc-purple/30">
            <div className="w-2 h-2 rounded-full bg-soc-purple animate-pulse shadow-[0_0_8px_#8b5cf6]"></div>
            <span className="text-xs font-bold text-soc-purple uppercase tracking-widest">Episodic Memory Sync</span>
          </div>
          <div className="glass-panel px-4 py-2 rounded-lg flex items-center gap-2 border border-soc-cyan/30">
            <div className="w-2 h-2 rounded-full bg-soc-cyan animate-pulse shadow-[0_0_8px_#00e5c0]"></div>
            <span className="text-xs font-bold text-soc-cyan uppercase tracking-widest">Self-Hardening Active</span>
          </div>
        </div>
      </div>

      {/* Row 1: Defence In Depth & Campaign */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <DefenceInDepth />
        </div>
        <div className="space-y-6">
          {events[0]?.campaign && <CampaignNamer campaign={events[0].campaign} />}
          {events[0]?.attacker_profile && <AttackerProfile profile={events[0].attacker_profile} />}
          {events[0]?.malware_analysis && <MalwareAnalyzer analysis={events[0].malware_analysis} />}
        </div>
      </div>

      {/* Row 2: Replay Timeline */}
      <ReplayTimeline events={events} onReplay={(e) => console.log('Replaying:', e)} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Stats & Config */}
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-xl border-t-2 border-soc-purple/50">
            <h3 className="font-syne font-bold text-soc-text mb-4 flex items-center gap-2">
              <Cpu className="w-5 h-5 text-soc-purple" />
              Brain Configuration
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 rounded-lg bg-black/40 border border-white/5">
                <span className="text-sm text-soc-muted">LLM Engine</span>
                <span className="text-xs font-mono text-soc-cyan bg-soc-cyan/10 px-2 py-1 rounded">Phi-3-Mini (Local)</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-black/40 border border-white/5">
                <span className="text-sm text-soc-muted">Memory Architecture</span>
                <span className="text-xs font-mono text-soc-purple bg-soc-purple/10 px-2 py-1 rounded">Episodic Vector DB</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-black/40 border border-white/5">
                <span className="text-sm text-soc-muted">Hardening Logic</span>
                <span className="text-xs font-mono text-soc-cyan bg-soc-cyan/10 px-2 py-1 rounded">Layered (1 → 4)</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-black/40 border border-white/5">
                <span className="text-sm text-soc-muted">Decision Engine</span>
                <span className="text-xs font-mono text-soc-red bg-soc-red/10 px-2 py-1 rounded">RL (PPO) Active</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-black/40 border border-white/5">
                <span className="text-sm text-soc-muted">Deep Learning</span>
                <span className="text-xs font-mono text-soc-cyan bg-soc-cyan/10 px-2 py-1 rounded">Online MLP Active</span>
              </div>
            </div>

            {/* AI Control Panel */}
            <div className="mt-8 pt-6 border-t border-soc-border">
              <h4 className="text-xs font-bold text-soc-muted tracking-widest uppercase mb-4 flex items-center gap-2">
                <Brain className="w-4 h-4" />
                Model Controls
              </h4>
              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={async () => {
                    import('react-hot-toast').then(m => m.default.promise(
                      api.sendSentinelCommand('FORCE_RETRAIN'),
                      { loading: "Forcing RL model retrain...", success: "Retraining initiated", error: "Failed to retrain" }
                    ));
                  }}
                  className="w-full flex items-center justify-between px-4 py-2 bg-soc-purple/10 hover:bg-soc-purple/20 text-soc-purple rounded-lg border border-soc-purple/20 transition-all font-mono text-xs"
                >
                  Force RL Agent Retrain
                  <Zap className="w-3 h-3" />
                </button>
                <button
                  onClick={async () => {
                    if (window.confirm("Are you sure you want to completely erase the Episodic Vector Memory? The AI will forget past campaigns.")) {
                      import('react-hot-toast').then(m => m.default.promise(
                        api.sendSentinelCommand('CLEAR_MEMORY'),
                        { loading: "Clearing memory bank...", success: "Episodic memory cleared", error: "Failed to clear memory" }
                      ));
                    }
                  }}
                  className="w-full flex items-center justify-between px-4 py-2 bg-soc-yellow/10 hover:bg-soc-yellow/20 text-soc-yellow rounded-lg border border-soc-yellow/20 transition-all font-mono text-xs"
                >
                  Clear Episodic Memory
                  <AlertTriangle className="w-3 h-3" />
                </button>
                <button
                  onClick={async () => {
                    if (window.confirm("WARNING: This resets both the Deep Learning MLP and RL Agent to default baseline states. Proceed?")) {
                      import('react-hot-toast').then(m => m.default.promise(
                        api.sendSentinelCommand('RESET_MODELS'),
                        { loading: "Resetting AI models...", success: "AI models reverted to baseline", error: "Failed to reset models" }
                      ));
                    }
                  }}
                  className="w-full flex items-center justify-between px-4 py-2 bg-soc-red/10 hover:bg-soc-red/20 text-soc-red rounded-lg border border-soc-red/20 transition-all font-mono text-xs"
                >
                  Reset AI Models to Baseline
                  <Skull className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Deception Controls */}
            <div className="mt-8 pt-6 border-t border-soc-border">
              <h4 className="text-xs font-bold text-soc-cyan tracking-widest uppercase mb-4 flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Deception Engine
              </h4>
              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={async () => {
                    import('react-hot-toast').then(m => m.default.promise(
                      api.sendSentinelCommand('DEPLOY_HONEYPOT'),
                      { loading: "Deploying generic honeypot service...", success: "Honeypot deployed to catch scanners", error: "Failed to deploy honeypot" }
                    ));
                  }}
                  className="w-full flex items-center justify-between px-4 py-2 bg-soc-cyan/10 hover:bg-soc-cyan/20 text-soc-cyan rounded-lg border border-soc-cyan/20 transition-all font-mono text-xs"
                >
                  Deploy Target Honeypot
                  <Server className="w-3 h-3" />
                </button>
                <button
                  onClick={async () => {
                    import('react-hot-toast').then(m => m.default.promise(
                      api.sendSentinelCommand('DEPLOY_HONEY_CREDENTIALS'),
                      { loading: "Injecting memory traps...", success: "Honey credentials deployed", error: "Failed to deploy credentials" }
                    ));
                  }}
                  className="w-full flex items-center justify-between px-4 py-2 bg-soc-green/10 hover:bg-soc-green/20 text-soc-green rounded-lg border border-soc-green/20 transition-all font-mono text-xs"
                >
                  Inject Honey Credentials
                  <Database className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-xl border-t-2 border-soc-cyan/50">
            <h3 className="font-syne font-bold text-soc-text mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-soc-cyan" />
              Intelligence Growth
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-black/40 border border-white/5 text-center">
                <div className="text-2xl font-bold text-soc-text font-syne">{events.length}</div>
                <div className="text-[10px] text-soc-muted uppercase tracking-widest mt-1">Episodic Memories</div>
              </div>
              <div className="p-4 rounded-lg bg-black/40 border border-white/5 text-center">
                <div className="text-2xl font-bold text-soc-purple font-syne">
                  {events.filter((e: any) => e.auto_respond).length}
                </div>
                <div className="text-[10px] text-soc-muted uppercase tracking-widest mt-1">Auto-Remediated</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Event Stream */}
        <div className="lg:col-span-2 glass-panel rounded-xl flex flex-col overflow-hidden h-[600px]">
          <div className="p-4 border-b border-white/10 bg-black/40 flex justify-between items-center">
            <h3 className="font-syne font-bold text-soc-text flex items-center gap-2">
              <Zap className="w-5 h-5 text-soc-yellow" />
              Autonomous Decision Stream
            </h3>
            <div className="text-xs font-mono text-soc-muted">Live Feed</div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 relative">
            <div className="absolute left-10 top-6 bottom-6 w-px bg-white/10"></div>
            
            <div className="space-y-8 relative z-10">
              <AnimatePresence initial={false}>
                {events.length === 0 ? (
                  <div className="text-center text-soc-muted py-10 font-mono text-sm">
                    Waiting for events to analyze...
                  </div>
                ) : (
                  events.map((event: any, idx: number) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex gap-6 relative"
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 shadow-lg border-2 border-black ${
                        event.auto_respond ? 'bg-soc-purple text-white' : 'bg-soc-bg border-soc-border text-soc-muted'
                      }`}>
                        {event.auto_respond ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                      </div>
                      
                      <div className="flex-1 glass-panel p-4 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="text-xs text-soc-muted font-mono mb-1">
                              {new Date(event.timestamp).toLocaleString()}
                            </div>
                            <div className="font-bold text-soc-text text-sm">
                              {event.analysis}
                            </div>
                            {event.mitre_tactic && (
                              <div className="text-xs font-mono text-soc-cyan mt-1">
                                {event.mitre_tactic}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col gap-1 items-end">
                            {event.similarity_score > 0 && (
                              <div className={`px-2 py-1 rounded text-xs font-bold font-mono ${
                                event.similarity_score > 0.85 ? 'bg-soc-purple/20 text-soc-purple border border-soc-purple/30' : 'bg-soc-yellow/20 text-soc-yellow border border-soc-yellow/30'
                              }`}>
                                Sim: {(event.similarity_score * 100).toFixed(1)}%
                              </div>
                            )}
                            {event.anomaly_result?.is_anomaly && (
                              <div className="px-2 py-1 rounded text-xs font-bold font-mono bg-soc-red/20 text-soc-red border border-soc-red/30">
                                Anomaly
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="bg-black/40 p-3 rounded-lg border border-white/5">
                            <div className="text-[10px] text-soc-muted uppercase tracking-widest mb-1">Decision</div>
                            <div className={`text-sm font-bold ${event.action === 'AUTO_REMEDIATE' ? 'text-soc-green' : 'text-soc-yellow'}`}>
                              {event.action}
                            </div>
                            <div className="text-xs text-soc-text mt-1 opacity-80">
                              {event.reasoning}
                            </div>
                          </div>
                          
                          {event.execution_result && (
                            <div className="bg-black/40 p-3 rounded-lg border border-white/5">
                              <div className="text-[10px] text-soc-muted uppercase tracking-widest mb-1">Execution</div>
                              <div className="text-xs text-soc-text font-mono">
                                {event.execution_result}
                              </div>
                            </div>
                          )}

                          {event.incident_report && (
                            <button
                              onClick={() => setSelectedReport(event.incident_report)}
                              className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-2 bg-soc-cyan/10 hover:bg-soc-cyan/20 text-soc-cyan rounded-lg border border-soc-cyan/30 transition-colors text-xs font-bold font-mono"
                            >
                              <FileText className="w-4 h-4" />
                              View Post-Incident Report
                            </button>
                          )}
                          
                          <div className="text-[10px] text-soc-muted font-mono text-right">
                            Memory ID: {event.stored_id}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Report Modal */}
      <AnimatePresence>
        {selectedReport && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setSelectedReport(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-3xl max-h-[80vh] flex flex-col glass-panel rounded-xl border border-soc-cyan/30 shadow-[0_0_30px_rgba(0,229,192,0.15)] overflow-hidden"
            >
              <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/40">
                <h3 className="font-syne font-bold text-soc-cyan flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Post-Incident Report
                </h3>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="p-1 hover:bg-white/10 rounded-lg transition-colors text-soc-muted hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto">
                <div className="markdown-body prose prose-invert prose-sm max-w-none prose-pre:bg-black/50 prose-pre:border prose-pre:border-white/10">
                  <Markdown>{selectedReport}</Markdown>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
