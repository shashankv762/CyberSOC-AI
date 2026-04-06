import React from 'react';
import { LayoutDashboard, Bell, List, MessageSquare, ShieldCheck, Globe, Cpu, SearchCode, Users } from 'lucide-react';
import { motion } from 'motion/react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  alertCount: number;
  userRole?: string;
}

export default function Sidebar({ activeTab, setActiveTab, alertCount, userRole }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'processes', label: 'Processes', icon: Cpu },
    { id: 'network', label: 'Network', icon: Globe },
    { id: 'alerts', label: 'Alerts', icon: Bell, badge: alertCount },
    { id: 'logs', label: 'Logs', icon: List },
    { id: 'forensics', label: 'Forensics', icon: SearchCode },
    { id: 'chatbot', label: 'Chatbot', icon: MessageSquare },
  ];

  if (userRole === 'admin') {
    menuItems.push({ id: 'ips', label: 'IPS', icon: ShieldCheck });
    menuItems.push({ id: 'users', label: 'Users', icon: Users });
  }

  return (
    <div className="w-64 h-screen fixed left-0 top-0 glass-panel border-r border-soc-border/50 flex flex-col z-50">
      <div className="p-6 flex items-center gap-3 border-b border-soc-border/30">
        <div className="relative">
          <div className="absolute inset-0 bg-soc-blue blur-md opacity-50 rounded-full"></div>
          <ShieldCheck className="w-8 h-8 text-soc-blue relative z-10" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-soc-blue to-soc-purple">
          CyberSOC
        </h1>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 relative overflow-hidden group ${
                isActive
                  ? 'text-soc-text bg-soc-blue/10 neon-border-blue'
                  : 'text-soc-muted hover:bg-soc-surface/50 hover:text-soc-text'
              }`}
            >
              {isActive && (
                <motion.div 
                  layoutId="sidebar-active"
                  className="absolute left-0 top-0 w-1 h-full bg-soc-blue shadow-[0_0_10px_#0ea5e9]"
                />
              )}
              <item.icon className={`w-5 h-5 transition-colors ${isActive ? 'text-soc-blue' : 'group-hover:text-soc-blue/70'}`} />
              <span className="font-medium tracking-wide">{item.label}</span>
              {item.badge && item.badge > 0 ? (
                <span className="ml-auto bg-soc-red/20 text-soc-red border border-soc-red/50 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.4)]">
                  {item.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-soc-border/30">
        <div className="flex items-center gap-2 px-4 py-3 bg-soc-bg/50 border border-soc-border/50 rounded-lg shadow-inner">
          <div className="w-2 h-2 bg-soc-green rounded-full animate-pulse shadow-[0_0_8px_#10b981]" />
          <span className="text-xs font-semibold text-soc-green uppercase tracking-widest">Monitoring Active</span>
        </div>
      </div>
    </div>
  );
}
