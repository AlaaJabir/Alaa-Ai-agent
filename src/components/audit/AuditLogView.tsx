import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Trash2,
  Filter,
  User,
  Bot,
  Cpu,
} from 'lucide-react';
import { AuditLogEntry, AuditStatus } from '../../types/audit';
import { getAllAuditLogs, clearAuditLogs } from '../../db/auditLogs';
import { RiskBadge } from '../common/RiskBadge';

export const AuditLogView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [statusFilter, setStatusFilter] = useState<AuditStatus | 'ALL'>('ALL');
  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    const list = await getAllAuditLogs();
    setLogs(list);
  };

  const handleClearLogs = async () => {
    if (window.confirm('Clear all audit logs from local storage?')) {
      await clearAuditLogs();
      await loadLogs();
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (statusFilter === 'ALL') return true;
    return log.status === statusFilter;
  });

  const getActorIcon = (actor: string) => {
    switch (actor) {
      case 'USER':
        return <User className="w-3.5 h-3.5 text-blue-400" />;
      case 'AGENT':
        return <Bot className="w-3.5 h-3.5 text-purple-400" />;
      default:
        return <Cpu className="w-3.5 h-3.5 text-emerald-400" />;
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-white">Security & Audit Activity</h1>
            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-xs font-mono font-medium">
              {logs.length} Records
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Immutable local record of tool proposals, user approvals, execution attempts, and security policy checks.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {logs.length > 0 && (
            <button
              onClick={handleClearLogs}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Clear Logs</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
        {(['ALL', 'SUCCESS', 'PENDING', 'BLOCKED', 'REJECTED', 'FAILURE'] as const).map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1.5 rounded-xl font-medium transition whitespace-nowrap ${
              statusFilter === st
                ? 'bg-blue-600 text-white shadow'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Logs Table / List */}
      {filteredLogs.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-800/80 flex items-center justify-center text-slate-400 mx-auto mb-3">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
          </div>
          <h3 className="text-base font-semibold text-white">No audit records found</h3>
          <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
            Audit entries are generated whenever actions are proposed, approved, executed, or rejected.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden divide-y divide-slate-800/80">
          {filteredLogs.map((log) => (
            <div
              key={log.id}
              onClick={() => setSelectedEntry(log)}
              className="p-3.5 sm:p-4 hover:bg-slate-800/40 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="p-2 rounded-xl bg-slate-950 border border-slate-800/80 shrink-0 mt-0.5">
                  {getActorIcon(log.actor)}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-semibold text-slate-200">
                      {log.actionType}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                        log.status === 'SUCCESS'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : log.status === 'BLOCKED' || log.status === 'REJECTED'
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      }`}
                    >
                      {log.status}
                    </span>
                    <RiskBadge risk={log.riskLevel} size="sm" />
                  </div>

                  <p className="mt-1 text-slate-300 break-words">{log.details}</p>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 text-[10px] text-slate-500 pt-1 sm:pt-0">
                <span className="font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800/60">
                  {log.actor}
                </span>
                <span>{new Date(log.timestamp).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Selected Entry Detail Modal */}
      {selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-semibold">Audit Record Inspection</h3>
              <button
                onClick={() => setSelectedEntry(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div>
                <span className="text-slate-500 block font-mono">Record ID</span>
                <span className="font-mono text-slate-200">{selectedEntry.id}</span>
              </div>

              <div>
                <span className="text-slate-500 block font-mono">Action Type & Actor</span>
                <span className="text-slate-200">
                  {selectedEntry.actionType} by {selectedEntry.actor}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block font-mono">Details</span>
                <p className="text-slate-200 bg-slate-950 p-2.5 rounded-xl border border-slate-800 font-mono">
                  {selectedEntry.details}
                </p>
              </div>

              {selectedEntry.approvalId && (
                <div>
                  <span className="text-slate-500 block font-mono">Related Approval ID</span>
                  <span className="font-mono text-blue-400">{selectedEntry.approvalId}</span>
                </div>
              )}

              {selectedEntry.metadata && (
                <div>
                  <span className="text-slate-500 block font-mono mb-1">Metadata</span>
                  <pre className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto">
                    {JSON.stringify(selectedEntry.metadata, null, 2)}
                  </pre>
                </div>
              )}

              <div className="pt-2 text-right">
                <button
                  onClick={() => setSelectedEntry(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
