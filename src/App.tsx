import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import LogFeed from './components/LogFeed';
import AlertsPanel from './components/AlertsPanel';
import IncidentDetail from './components/IncidentDetail';
import Chatbot from './components/Chatbot';
import Login from './components/Login';
import ProcessPanel from './components/ProcessPanel';
import NetworkPanel from './components/NetworkPanel';
import ForensicsPanel from './components/ForensicsPanel';
import UserManagement from './components/UserManagement';
import { RefreshCw, Clock } from 'lucide-react';
import { api } from './api/client';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster, toast } from 'react-hot-toast';
import { auth } from './firebase';
import { signOut } from 'firebase/auth';

export default function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('soc_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [chatContextAlertId, setChatContextAlertId] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [alertCount, setAlertCount] = useState(0);
  const seenAlertIds = useRef(new Set());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!user) return;
    const fetchAlerts = async () => {
      try {
        const res = await api.getAlerts({ acknowledged: false });
        if (Array.isArray(res.data)) {
          setAlertCount(res.data.length);
          
          // Check for new critical alerts
          res.data.forEach(alert => {
            if (!seenAlertIds.current.has(alert.id)) {
              seenAlertIds.current.add(alert.id);
              if (alert.severity === 'Critical') {
                toast.error(`CRITICAL ALERT: ${alert.reason}`, {
                  duration: 6000,
                  position: 'top-right',
                  style: {
                    background: '#1e1e2e',
                    color: '#ef4444',
                    border: '1px solid rgba(239, 68, 68, 0.5)',
                  },
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: '#1e1e2e',
                  },
                });
              }
            }
          });
        }
      } catch (err) {
        console.error("Failed to fetch alerts:", err);
      }
    };
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 10000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
    };
    window.addEventListener('soc_unauthorized', handleUnauthorized);
    return () => window.removeEventListener('soc_unauthorized', handleUnauthorized);
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Firebase sign out error", err);
    }
    localStorage.removeItem('soc_token');
    localStorage.removeItem('soc_user');
    setUser(null);
  };

  if (!user) {
    return <Login onLoginSuccess={setUser} />;
  }

  const handleInvestigate = (incident) => {
    setSelectedIncident(incident);
  };

  const handleAskAI = (incident) => {
    setChatContextAlertId(incident.id);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard onSelectLog={setSelectedIncident} onInvestigate={handleInvestigate} />;
      case 'processes':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-soc-text to-soc-muted">System Processes</h2>
            <ProcessPanel />
          </div>
        );
      case 'network':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-soc-text to-soc-muted">Network Activity</h2>
            <NetworkPanel />
          </div>
        );
      case 'alerts':
        return (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-soc-text to-soc-muted">Active Security Alerts</h2>
            <AlertsPanel onInvestigate={handleInvestigate} />
          </div>
        );
      case 'logs':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-soc-text to-soc-muted">Comprehensive Log Stream</h2>
            <LogFeed onSelectLog={setSelectedIncident} />
          </div>
        );
      case 'forensics':
        return <ForensicsPanel />;
      case 'users':
        return user.role === 'admin' ? <UserManagement /> : <div className="p-8 text-soc-red">Unauthorized</div>;
      case 'chatbot':
        return (
          <div className="h-[calc(100vh-160px)] glass-panel rounded-2xl overflow-hidden flex flex-col items-center justify-center p-12 text-center relative">
             <div className="absolute inset-0 bg-gradient-to-b from-soc-purple/5 to-transparent pointer-events-none"></div>
             <div className="w-20 h-20 bg-soc-purple/10 rounded-3xl flex items-center justify-center mb-6 neon-border-blue">
                <RefreshCw className="w-10 h-10 text-soc-purple animate-spin-slow" />
             </div>
             <h2 className="text-2xl font-bold mb-2 neon-text-blue">AI Analyst Interface</h2>
             <p className="text-soc-muted max-w-md">Use the floating assistant in the bottom right to interact with the CyberSOC AI analyst from any page.</p>
          </div>
        );
      default:
        return <Dashboard onSelectLog={setSelectedIncident} onInvestigate={handleInvestigate} />;
    }
  };

  return (
    <div className="min-h-screen bg-soc-bg text-soc-text flex dark">
      <Toaster />
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} alertCount={alertCount} userRole={user.role} />
      
      <main className="flex-1 ml-64 flex flex-col min-h-screen relative">
        {/* Top Bar */}
        <header className="h-20 glass-panel border-b border-soc-border/50 sticky top-0 z-40 px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold capitalize tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-soc-text to-soc-muted">{activeTab}</h2>
            <div className="h-6 w-px bg-soc-border/50 hidden md:block" />
            <div className="hidden md:flex items-center gap-2 text-soc-blue text-sm font-mono tracking-wider">
              <span className="w-2 h-2 rounded-full bg-soc-blue animate-pulse shadow-[0_0_8px_#0ea5e9]"></span>
              {currentTime.toUTCString().replace('GMT', 'UTC')}
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => window.location.reload()}
              className="p-2 hover:bg-soc-surface/50 rounded-lg transition-colors text-soc-muted hover:text-soc-blue"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <div className="h-6 w-px bg-soc-border/50" />
            <div className="flex items-center gap-3">
              <div className="text-right hidden md:block">
                <div className="text-sm font-bold text-soc-text">{user.username}</div>
                <div className="text-xs text-soc-muted font-mono uppercase">Role: {user.role || 'Analyst'}</div>
              </div>
              <div className="w-10 h-10 rounded-full bg-soc-blue/10 border border-soc-blue/40 flex items-center justify-center text-soc-blue font-bold shadow-[0_0_10px_rgba(14,165,233,0.2)]">
                {user.username.substring(0, 2).toUpperCase()}
              </div>
              <button 
                onClick={handleLogout}
                className="ml-2 px-3 py-1.5 bg-soc-red/10 border border-soc-red/30 rounded-lg text-xs font-bold text-soc-red hover:bg-soc-red/20 hover:border-soc-red/50 transition-all shadow-[0_0_10px_rgba(239,68,68,0.1)]"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 p-8 overflow-x-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Global Components */}
      <IncidentDetail 
        incident={selectedIncident} 
        onClose={() => setSelectedIncident(null)} 
        onAskAI={handleAskAI}
        onForensics={(incident) => {
          setSelectedIncident(null);
          setActiveTab('forensics');
          // We can dispatch a custom event to trigger forensics search
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('soc_forensics_search', { detail: { type: 'source_ip', query: incident.source_ip } }));
          }, 100);
        }}
      />
      
      <Chatbot 
        contextAlertId={chatContextAlertId} 
        onClearContext={() => setChatContextAlertId(null)} 
      />
    </div>
  );
}

