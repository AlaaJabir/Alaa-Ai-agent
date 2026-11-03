import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Play,
  RotateCcw,
  Check,
  X,
  Info,
} from 'lucide-react';
import { ApprovalRequest, ActionRiskLevel } from '../../types/approval';
import { getAllApprovals } from '../../db/approvals';
import { ApprovalEngine } from '../../core/approval/approvalEngine';
import { RiskBadge } from '../common/RiskBadge';

export const ApprovalCenter: React.FC = () => {
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [filterState, setFilterState] = useState<'PENDING' | 'RESOLVED' | 'ALL'>('PENDING');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    loadApprovals();
  }, []);

  const loadApprovals = async () => {
    // Sweep any expired requests first
    await ApprovalEngine.sweepExpiredApprovals();
    const list = await getAllApprovals();
    setApprovals(list);
  };

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    setActionMessage(null);
    try {
      const res = await ApprovalEngine.approve(id);
      if (res.success) {
        setActionMessage({
          text: `Action successfully authorized and executed! ${res.result?.message || ''}`,
          type: 'success',
        });
      } else {
        setActionMessage({
          text: `Approval failed: ${res.error}`,
          type: 'error',
        });
      }
      await loadApprovals();
    } catch (err: any) {
      setActionMessage({
        text: `Execution error: ${err?.message}`,
        type: 'error',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    setProcessingId(id);
    setActionMessage(null);
    try {
      const res = await ApprovalEngine.reject(id, 'Declined directly in Approval Center.');
      if (res.success) {
        setActionMessage({
          text: 'Action proposal rejected. Logged in audit trail.',
          type: 'success',
        });
      }
      await loadApprovals();
    } catch (err: any) {
      setActionMessage({
        text: `Error rejecting action: ${err?.message}`,
        type: 'error',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const filteredApprovals = approvals.filter((app) => {
    if (filterState === 'PENDING') return app.state === 'PENDING_APPROVAL';
    if (filterState === 'RESOLVED') return app.state !== 'PENDING_APPROVAL';
    return true;
  });

  const pendingCount = approvals.filter((a) => a.state === 'PENDING_APPROVAL').length;

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-white">Approval Engine</h1>
            {pendingCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-semibold border border-amber-500/30">
                {pendingCount} Pending
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Independent security gate: Gemini may propose operations, but only you authorize execution.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800 self-start text-xs font-medium">
          <button
            onClick={() => setFilterState('PENDING')}
            className={`px-3 py-1.5 rounded-lg transition ${
              filterState === 'PENDING'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            onClick={() => setFilterState('RESOLVED')}
            className={`px-3 py-1.5 rounded-lg transition ${
              filterState === 'RESOLVED'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            History
          </button>
          <button
            onClick={() => setFilterState('ALL')}
            className={`px-3 py-1.5 rounded-lg transition ${
              filterState === 'ALL'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All
          </button>
        </div>
      </div>

      {/* Action Notification Alert */}
      {actionMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 ${
            actionMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-slate-400 hover:text-white shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Approvals List */}
      {filteredApprovals.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-800/80 flex items-center justify-center text-slate-400 mx-auto mb-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
          </div>
          <h3 className="text-base font-semibold text-white">
            {filterState === 'PENDING' ? 'No pending approval requests' : 'No approval history found'}
          </h3>
          <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
            {filterState === 'PENDING'
              ? 'All suggested actions have been reviewed. When MY AGENT proposes modifications, they will appear here.'
              : 'History of approved and rejected actions will be retained here in local storage.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredApprovals.map((req) => {
            const isPending = req.state === 'PENDING_APPROVAL';
            const isProcessing = processingId === req.id;

            return (
              <div
                key={req.id}
                className={`rounded-2xl border p-4 sm:p-5 transition shadow-lg ${
                  isPending
                    ? 'bg-slate-900 border-amber-500/40 shadow-amber-500/5'
                    : 'bg-slate-900/60 border-slate-800/80'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2 rounded-xl mt-0.5 ${
                        isPending
                          ? 'bg-amber-500/20 text-amber-400'
                          : req.state === 'EXECUTED'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {isPending ? (
                        <ShieldAlert className="w-5 h-5" />
                      ) : req.state === 'EXECUTED' ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <XCircle className="w-5 h-5" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm sm:text-base font-semibold text-white">
                          {req.actionName}
                        </span>
                        <RiskBadge risk={req.riskLevel} />
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                            isPending
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                              : req.state === 'EXECUTED'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          }`}
                        >
                          {req.state}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-300">{req.description}</p>
                    </div>
                  </div>

                  {/* Actions (Approve / Reject) */}
                  {isPending && (
                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      <button
                        onClick={() => handleReject(req.id)}
                        disabled={isProcessing}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold active:scale-95 transition disabled:opacity-50"
                      >
                        <X className="w-4 h-4" />
                        <span>Reject</span>
                      </button>

                      <button
                        onClick={() => handleApprove(req.id)}
                        disabled={isProcessing}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/30 active:scale-95 transition disabled:opacity-50"
                      >
                        <Check className="w-4 h-4" />
                        <span>{isProcessing ? 'Authorizing...' : 'Approve & Execute'}</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Target & Affected Data Specification */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/50">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block">
                      Target
                    </span>
                    <span className="text-slate-300 font-mono text-[11px]">{req.target}</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/50">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block">
                      Data Affected
                    </span>
                    <span className="text-slate-300 font-mono text-[11px]">{req.dataAffected}</span>
                  </div>
                </div>

                {/* Parameters inspection */}
                {req.params && Object.keys(req.params).length > 0 && (
                  <div className="mt-2 p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/50 text-[11px] font-mono text-slate-400 overflow-x-auto">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block font-sans mb-1">
                      Validated Parameters
                    </span>
                    <pre className="whitespace-pre-wrap">{JSON.stringify(req.params, null, 2)}</pre>
                  </div>
                )}

                {/* Execution Result if completed */}
                {req.executionResult && (
                  <div className="mt-2 p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-xs text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>Result: {req.executionResult.message}</span>
                  </div>
                )}

                {/* Rejection reason if declined */}
                {req.rejectionReason && (
                  <div className="mt-2 p-2.5 rounded-xl bg-rose-950/30 border border-rose-800/40 text-xs text-rose-300 flex items-center gap-2">
                    <XCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>Reason: {req.rejectionReason}</span>
                  </div>
                )}

                {/* Timestamp & Expiry */}
                <div className="mt-3 flex items-center justify-between text-[10px] text-slate-500">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>Requested: {new Date(req.requestedAt).toLocaleString()}</span>
                  </div>
                  {isPending && (
                    <span>Expires: {new Date(req.expiresAt).toLocaleTimeString()}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
