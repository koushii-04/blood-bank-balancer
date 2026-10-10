import React from 'react';

export const BloodGroupBadge = ({ bloodGroup, size = 'md' }) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : size === 'lg' ? 'px-3.5 py-1.5 text-base' : 'px-2.5 py-1 text-sm';
  
  // Highlight special universal donor / receiver
  const isUrgentType = bloodGroup === 'O-' || bloodGroup === 'AB+';

  return (
    <span className={`inline-flex items-center font-bold rounded-lg border tracking-wide font-mono ${sizeClasses} ${
      isUrgentType
        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm shadow-rose-950'
        : 'bg-red-950/40 text-red-300 border-red-800/40'
    }`}>
      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5 animate-pulse"></span>
      {bloodGroup}
    </span>
  );
};

export const StatusBadge = ({ status }) => {
  const styles = {
    AVAILABLE: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    PENDING: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    APPROVED: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    IN_TRANSIT: 'bg-purple-500/10 text-purple-400 border-purple-500/30 animate-pulse',
    COMPLETED: 'bg-teal-500/10 text-teal-400 border-teal-500/30',
    CANCELLED: 'bg-slate-700/40 text-slate-400 border-slate-600',
    REJECTED: 'bg-red-500/10 text-red-400 border-red-500/30',
    RESERVED: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    EXPIRED: 'bg-rose-950/60 text-rose-400 border-rose-700/50 line-through',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles[status] || 'bg-slate-800 text-slate-300 border-slate-700'}`}>
      {status?.replace('_', ' ')}
    </span>
  );
};

export const PriorityBadge = ({ priority }) => {
  const styles = {
    CRITICAL: 'bg-red-600/20 text-red-400 border-red-500 animate-emergency-pulse font-bold',
    URGENT: 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-semibold',
    NORMAL: 'bg-slate-800 text-slate-300 border-slate-700 font-medium',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs border ${styles[priority] || styles.NORMAL}`}>
      {priority}
    </span>
  );
};
