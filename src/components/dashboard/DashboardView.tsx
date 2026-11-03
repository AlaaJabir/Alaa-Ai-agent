import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  MessageSquare,
  Brain,
  HardDrive,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Wifi,
  WifiOff,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { getAllConversations } from '../../db/conversations';
import { getPendingApprovals } from '../../db/approvals';
import { getAllMemories } from '../../db/memories';
import { getAllAuditLogs } from '../../db/auditLogs';
import { Conversation } from '../../types/chat';
import { ApprovalRequest } from '../../types/approval';
import { AuditLogEntry } from '../../types/audit';
import { GeminiClient } from '../../core/ai/geminiClient';
import { RiskBadge } from '../common/RiskBadge';

interface DashboardViewProps {
  onNavigate: (tab: 'chat' | 'memory' | 'approvals' | 'activity' | 'settings', conversationId?: string) => void;
  onNewChat: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate, onNewChat }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<ApprovalRequest[]>([]);
  const [memoryCount, setMemoryCount] = useState<number>(0);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [aiStatus, setAiStatus] = useState<{ online: boolean; model?: string; checking: boolean }>({
    online: false,
    checking: true,
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [convs, apps, mems, logs] = await Promise.all([
        getAllConversations(),
        getPendingApprovals(),
        getAllMemories(),
        getAllAuditLogs(),
      ]);
      setConversations(convs.slice(0, 4));
      setPendingApprovals(apps);
      setMemoryCount(mems.length);
      setAuditLogs(logs.slice(0, 5));
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    }

    try {
      const health = await GeminiClient.checkHealth();
      setAiStatus({
        online: health.aiConfigured,
        model: health.model,
        checking: false,
      });
    } catch {
      setAiStatus({
        online: false,
        checking: false,
      });
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Hero Welcome Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-blue-950/40 border border-slate-800/80 p-5 sm:p-6 shadow-xl">
        <div className="absolute top-0 right-0 -mr-10 -mt-10 w-44 h-44 rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium mb-3">
              <Sparkles className="w-3 h-3" />
              <span>Personal AI Operating System • Phase 1</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              MY AGENT
            </h1>
            <p className="mt-1 text-sm text-slate-400 max-w-xl">
              Your private, local-first digital agent. Operates strictly from local IndexedDB storage with an independent security Approval Engine.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5">
            <button
              onClick={onNewChat}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-sm font-semibold shadow-lg shadow-blue-600/25 transition"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Start Conversation</span>
            </button>
          </div>
        </div>

        {/* Status Indicators Ribbon */}
        <div className="mt-6 pt-5 border-t border-slate-800/60 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/50">
            {aiStatus.online ? (
              <Wifi className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Gemini AI</div>
              <div className="font-medium text-slate-200 truncate">
                {aiStatus.checking ? 'Connecting...' : aiStatus.online ? 'Online (Vercel API)' : 'Offline / Standby'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/50">
            <HardDrive className="w-4 h-4 text-blue-400 shrink-0" />
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Local Storage</div>
              <div className="font-medium text-slate-200">IndexedDB Active</div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/50">
            <Brain className="w-4 h-4 text-purple-400 shrink-0" />
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Local Memories</div>
              <div className="font-medium text-slate-200">{memoryCount} Items Stored</div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/50">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Approval Engine</div>
              <div className="font-medium text-slate-200">Policy Enforced</div>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Approvals Alert Banner */}
      {pendingApprovals.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-amber-200">
                {pendingApprovals.length} Action{pendingApprovals.length > 1 ? 's' : ''} Awaiting Your Approval
              </div>
              <div className="text-xs text-amber-300/80">
                AI proposed operations require your explicit authorization before execution.
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigate('approvals')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 text-xs font-semibold shrink-0 transition"
          >
            <span>Review Now</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Quick Launch Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Recent Conversations */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/70">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
              <MessageSquare className="w-4 h-4 text-blue-400" />
              <span>Recent Conversations</span>
            </div>
            <button
              onClick={() => onNavigate('chat')}
              className="text-xs text-blue-400 hover:text-blue-300 font-medium"
            >
              View all
            </button>
          </div>

          {conversations.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No conversations yet. Start chatting to build your personal context.
            </div>
          ) : (
            <div className="space-y-2">
              {conversations.map((c) => (
                <div
                  key={c.id}
                  onClick={() => onNavigate('chat', c.id)}
                  className="p-3 rounded-xl bg-slate-950/40 hover:bg-slate-800/50 border border-slate-800/40 cursor-pointer transition flex items-center justify-between group"
                >
                  <div className="min-w-0 pr-3">
                    <div className="text-sm font-medium text-slate-200 truncate group-hover:text-blue-400 transition">
                      {c.title || 'Untitled Conversation'}
                    </div>
                    <div className="text-xs text-slate-500 truncate mt-0.5">
                      {c.preview || 'No messages'}
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-500 whitespace-nowrap">
                    {new Date(c.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Security & Audit Activity */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/70">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Audit Trail & Activity</span>
            </div>
            <button
              onClick={() => onNavigate('activity')}
              className="text-xs text-blue-400 hover:text-blue-300 font-medium"
            >
              View audit log
            </button>
          </div>

          {auditLogs.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No audit records yet. All tool interactions and approvals will be logged here.
            </div>
          ) : (
            <div className="space-y-2">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/40 flex items-center justify-between gap-2 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {log.status === 'SUCCESS' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : log.status === 'BLOCKED' ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    ) : (
                      <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    )}
                    <div className="truncate text-slate-300">{log.details}</div>
                  </div>
                  <div className="shrink-0">
                    <RiskBadge risk={log.riskLevel} size="sm" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
