import React from 'react';
import {
  LayoutDashboard,
  MessageSquare,
  Brain,
  ShieldAlert,
  Activity,
  Settings,
  Sparkles,
  Phone,
} from 'lucide-react';
import { PWAInstallButton } from '../../components/common/PWAInstallButton';
import { OfflineIndicator } from '../../components/common/OfflineIndicator';

export type NavTab = 'dashboard' | 'chat' | 'memory' | 'approvals' | 'activity' | 'settings';

interface AppLayoutProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  pendingApprovalsCount: number;
  onStartCall?: () => void;
  children: React.ReactNode;
}

interface NavItemConfig {
  id: NavTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  activeTab,
  onSelectTab,
  pendingApprovalsCount,
  onStartCall,
  children,
}) => {
  const navItems: NavItemConfig[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'memory', label: 'Memory', icon: Brain },
    {
      id: 'approvals',
      label: 'Approvals',
      icon: ShieldAlert,
      badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined,
    },
    { id: 'activity', label: 'Activity', icon: Activity },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#090a0f] text-slate-100 flex flex-col md:flex-row antialiased">
      <OfflineIndicator />

      {/* Desktop Sidebar (visible on md+) */}
      <aside className="hidden md:flex flex-col w-64 border-r border-slate-800/80 bg-slate-950/70 p-4 shrink-0 justify-between">
        <div className="space-y-6">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm tracking-wide text-white flex items-center gap-1.5">
                <span>MY AGENT</span>
                <span className="text-[10px] font-mono px-1 rounded bg-blue-500/20 text-blue-400">PWA</span>
              </div>
              <div className="text-[11px] text-slate-400">Personal AI Operating System</div>
            </div>
          </div>

          {/* Quick Voice Call Launcher Button */}
          {onStartCall && (
            <button
              onClick={onStartCall}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white text-xs font-bold shadow-lg shadow-blue-600/30 hover:brightness-110 active:scale-95 transition"
            >
              <Phone className="w-4 h-4" />
              <span>Voice Call Mode</span>
            </button>
          )}

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id as NavTab)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900/80'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                        isActive ? 'bg-white text-blue-600' : 'bg-amber-500 text-slate-950'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="space-y-3 pt-4 border-t border-slate-800/80">
          <PWAInstallButton />
          <div className="px-2 text-[10px] font-mono text-slate-500 flex items-center justify-between">
            <span>Local-first • Phase 1</span>
            <span>v1.0.0</span>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header (visible on mobile) */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-slate-950/80 border-b border-slate-800/80 sticky top-0 z-40 backdrop-blur-md pt-safe">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="font-bold text-sm tracking-wide text-white">MY AGENT</span>
          </div>

          <div className="flex items-center gap-2">
            {onStartCall && (
              <button
                onClick={onStartCall}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-semibold shadow-md shadow-blue-500/20 active:scale-95 transition"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Call AI</span>
              </button>
            )}
            <PWAInstallButton compact />
          </div>
        </header>

        {/* Content Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto">
          {children}
        </main>

        {/* Mobile Bottom Navigation Bar (iPhone-first) */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-950/90 border-t border-slate-800/80 backdrop-blur-lg px-2 pt-2 pb-safe z-40 flex items-center justify-around">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id as NavTab)}
                className={`relative flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition ${
                  isActive ? 'text-blue-400' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  {item.badge && (
                    <span className="absolute -top-1.5 -right-2 px-1 py-0.2 rounded-full text-[9px] font-bold bg-amber-500 text-slate-950">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium tracking-tight">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
