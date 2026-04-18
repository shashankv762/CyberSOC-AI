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
import IPSManagement from './components/IPSManagement';
import SentinelBrain from './components/SentinelBrain';
import { RefreshCw, MessageSquare, X } from 'lucide-react';
import { api } from './api/client';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster, toast } from 'react-hot-toast';
import { auth } from './firebase';
import { signOut } from 'firebase/auth';

import { ErrorBoundary } from './components/ErrorBoundary';

import AegixLogo from './components/AegixLogo';

export default function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('soc_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [chatContextData, setChatContextData] = useState(null);
  const [isChatFloatingOpen, setIsChatFloatingOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [alertCount, setAlertCount] = useState(0);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const seenAlertIds = useRef(new Set());

  const [isProfileOpen, setIsProfileOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onIdTokenChanged(async (firebaseUser) => {
      setIsAuthReady(true);
      if (firebaseUser) {
        try {
          const token = await firebaseUser.getIdToken();
          localStorage.setItem('soc_token', token);
        } catch (e) {
          console.error("Failed to get ID token", e);
        }

        // Sync local user state with Firebase if logged in
        const saved = localStorage.getItem('soc_user');
        const localUser = saved ? JSON.parse(saved) : null;
        
        if (localUser && localUser.id === firebaseUser.uid) {
          setUser({
            ...localUser,
            photoURL: firebaseUser.photoURL,
            displayName: firebaseUser.displayName || localUser.username
          });
        } else if (!localUser) {
           // If no local user but firebase user exists, create a basic one
           const appUser = {
            id: firebaseUser.uid,
            username: firebaseUser.email?.split('@')[0] || firebaseUser.displayName || 'User',
            role: 'analyst',
            isFirebase: true
          };
          localStorage.setItem('soc_user', JSON.stringify(appUser));
          setUser(appUser);
        }
      } else {
        // Only clear if the current user was a Firebase user
        const saved = localStorage.getItem('soc_user');
        const localUser = saved ? JSON.parse(saved) : null;
        if (localUser && localUser.isFirebase) {
          localStorage.removeItem('soc_token');
          localStorage.removeItem('soc_user');
          setUser(null);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!user) return;
    // If it's a Firebase user, wait for the token to be refreshed/verified
    if (user.isFirebase && !isAuthReady) return;

    const fetchAlerts = async () => {
      try {
        const res = await api.getAlerts({ acknowledged: false });
        if (Array.isArray(res.data)) {
          setAlertCount(res.data.length);
        }
      } catch (err) {
        console.error("Failed to fetch alerts:", err);
      }
    };
    fetchAlerts();

    // SSE Setup for Real-Time Push Notifications
    const evtSource = new EventSource('/api/stream');
    evtSource.addEventListener('new_alert', (e) => {
      try {
        const alert = JSON.parse(e.data);
        setAlertCount(prev => prev + 1);
        if (alert.severity === 'Critical') {
          toast.error(`CRITICAL THREAT DETECTED: ${alert.reason}`, {
            duration: 8000,
            position: 'top-right',
            style: {
              background: '#000000',
              color: '#ef4444',
              border: '2px solid rgba(239, 68, 68, 0.8)',
              boxShadow: '0 0 20px rgba(239, 68, 68, 0.4)'
            },
            iconTheme: {
              primary: '#ef4444',
              secondary: '#000000',
            },
          });
        }
      } catch (err) {
        console.error("Error parsing SSE alert message", err);
      }
    });

    return () => evtSource.close();
  }, [user, isAuthReady]);

  useEffect(() => {
    const handleUnauthorized = () => {
      localStorage.removeItem('soc_token');
      localStorage.removeItem('soc_user');
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

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-soc-bg flex items-center justify-center dark">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-soc-cyan/30 border-t-soc-cyan rounded-full animate-spin"></div>
          <div className="text-soc-cyan font-mono text-sm uppercase tracking-widest animate-pulse">Initializing Secure Connection...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <ErrorBoundary>
        <Login onLoginSuccess={setUser} />
      </ErrorBoundary>
    );
  }

  const handleInvestigate = (incident: any) => {
    setSelectedIncident(incident);
  };

  const handleAskAI = (incident: any) => {
    setChatContextData(incident);
    setSelectedIncident(null);
    setActiveTab('chatbot');
    setIsChatFloatingOpen(false);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard onSelectLog={setSelectedIncident} onInvestigate={handleInvestigate} />;
      case 'sentinel':
        return <SentinelBrain />;
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
      case 'ips':
        return user.role === 'admin' ? <IPSManagement /> : <div className="p-8 text-soc-red">Unauthorized</div>;
      case 'chatbot':
        return (
          <Chatbot 
            contextData={chatContextData} 
            onClearContext={() => setChatContextData(null)} 
            autoSend={true}
          />
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
            <div className="hidden md:flex items-center gap-2 text-soc-cyan text-sm font-mono tracking-wider">
              <span className="w-2 h-2 rounded-full bg-soc-cyan animate-pulse shadow-[0_0_8px_#00e5c0]"></span>
              {currentTime.toUTCString().replace('GMT', 'UTC')}
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => window.location.reload()}
              className="p-2 hover:bg-soc-surface/50 rounded-lg transition-colors text-soc-muted hover:text-soc-cyan"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <div className="h-6 w-px bg-soc-border/50" />
            <div className="flex items-center gap-3 relative">
              <div className="text-right hidden md:block">
                <div className="text-sm font-bold text-soc-text font-syne">{user.displayName || user.username}</div>
                <div className="text-xs text-soc-muted font-mono uppercase">Role: {user.role || 'Analyst'}</div>
              </div>
              <button 
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="w-10 h-10 rounded-full bg-soc-cyan/10 border border-soc-cyan/40 flex items-center justify-center text-soc-cyan font-bold shadow-[0_0_10px_rgba(0,229,192,0.2)] overflow-hidden hover:border-soc-cyan transition-colors focus:outline-none"
              >
                {user.photoURL ? (
                  <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  user.username.substring(0, 2).toUpperCase()
                )}
              </button>

              <AnimatePresence>
                {isProfileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-14 right-0 w-64 glass-panel bg-soc-surface border border-soc-border rounded-xl shadow-2xl overflow-hidden z-50"
                  >
                    <div className="p-4 border-b border-soc-border bg-soc-bg/50">
                      <div className="font-bold text-soc-text font-syne">{user.displayName || user.username}</div>
                      <div className="text-xs text-soc-muted truncate">{user.email || 'No email provided'}</div>
                      <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-soc-cyan/10 border border-soc-cyan/30 text-soc-cyan text-[10px] font-bold uppercase">
                        {user.role || 'Analyst'}
                      </div>
                    </div>
                    <div className="p-2">
                      <button 
                        onClick={() => {
                          setIsProfileOpen(false);
                          if (user.role === 'admin') {
                            setActiveTab('users');
                          } else {
                            toast.error('You do not have permission to manage users.');
                          }
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-soc-text hover:bg-soc-cyan/10 hover:text-soc-cyan rounded-lg transition-colors"
                      >
                        User Management
                      </button>
                      <button 
                        onClick={() => {
                          setIsProfileOpen(false);
                          handleLogout();
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-soc-red hover:bg-soc-red/10 rounded-lg transition-colors mt-1"
                      >
                        Logout
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 p-8 overflow-x-hidden">
          <ErrorBoundary>
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
          </ErrorBoundary>
        </div>
      </main>

      {/* Global Components */}
      <IncidentDetail 
        incident={selectedIncident} 
        onClose={() => setSelectedIncident(null)} 
        onAskAI={handleAskAI}
        onForensics={(incident: any) => {
          setSelectedIncident(null);
          setActiveTab('forensics');
          // We can dispatch a custom event to trigger forensics search
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('soc_forensics_search', { detail: { type: 'source_ip', query: incident.source_ip } }));
          }, 100);
        }}
      />

      {/* Floating Chatbot */}
      <AnimatePresence>
        {isChatFloatingOpen && activeTab !== 'chatbot' && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-24 right-8 w-96 h-[500px] z-50 shadow-2xl"
          >
            <Chatbot 
              contextData={chatContextData} 
              onClearContext={() => setChatContextData(null)} 
              isFloating={true}
              onClose={() => setIsChatFloatingOpen(false)}
              autoSend={true}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB */}
      {activeTab !== 'chatbot' && (
        <button
          onClick={() => setIsChatFloatingOpen(!isChatFloatingOpen)}
          className={`fixed bottom-8 right-8 w-14 h-14 rounded-full flex items-center justify-center z-50 transition-all duration-300 shadow-lg border ${
            isChatFloatingOpen 
              ? 'bg-black border-soc-red text-soc-red rotate-90 shadow-[0_0_15px_rgba(255,71,87,0.3)]' 
              : 'bg-black border-soc-purple text-soc-purple hover:scale-110 shadow-[0_0_20px_rgba(139,92,246,0.3)]'
          }`}
        >
          {isChatFloatingOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <div className="relative flex items-center justify-center w-full h-full">
              <div className="absolute inset-0 bg-white blur-md opacity-20 rounded-full animate-pulse"></div>
              <AegixLogo className="w-8 h-8 relative z-10" />
            </div>
          )}
        </button>
      )}
    </div>
  );
}

