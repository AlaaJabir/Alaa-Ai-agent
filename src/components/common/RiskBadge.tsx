import React from 'react';
import { ActionRiskLevel } from '../../types/approval';

interface RiskBadgeProps {
  risk: ActionRiskLevel;
  size?: 'sm' | 'md';
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ risk, size = 'md' }) => {
  const getBadgeStyle = () => {
    switch (risk) {
      case 'READ':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'PROPOSE':
        return 'bg-sky-500/10 text-sky-400 border-sky-500/30';
      case 'MODIFY':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'DELETE':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'EXTERNAL_ACTION':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
  };

  const px = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center font-mono font-medium rounded-md border uppercase tracking-wider ${px} ${getBadgeStyle()}`}
    >
      {risk}
    </span>
  );
};
