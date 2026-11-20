import React from 'react';
import { CheckCircle2, Clock, AlertTriangle, XCircle, X } from 'lucide-react';

export function formatInr(amount: number): string {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

export function StatusIndicator({
  status,
  label,
}: {
  status: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  label: string;
}) {
  const styles = {
    success: 'text-[#047857] dark:text-[#34D399]',
    warning: 'text-[#B45309] dark:text-[#FBBF24]',
    error: 'text-[#DC2626] dark:text-[#F87171]',
    info: 'text-[#2563EB] dark:text-[#60A5FA]',
    neutral: 'text-[#6B7280] dark:text-[#9CA3AF]',
  }[status];

  const Icon =
    status === 'success'
      ? CheckCircle2
      : status === 'warning'
        ? Clock
        : status === 'error'
          ? XCircle
          : AlertTriangle;

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${styles}`}>
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span>{label}</span>
    </span>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-8 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#ECFDF5] dark:bg-[#10B981]/15 text-[#047857] dark:text-[#34D399]">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="mt-4 text-base font-bold text-[#111827] dark:text-[#F9FAFB]">{title}</h3>
      <p className="mt-1.5 text-sm text-[#6B7280] dark:text-[#9CA3AF] max-w-md mx-auto leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 min-h-[44px] px-5 py-2.5 rounded-xl bg-[#047857] hover:bg-[#065F46] dark:bg-[#10B981] dark:hover:bg-[#059669] text-sm font-semibold text-white dark:text-[#0B1220] transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export function CardSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading content">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5"
        >
          <div className="h-4 w-1/3 rounded bg-slate-200 dark:bg-[#1F2937] animate-pulse" />
          <div className="mt-3 h-3 w-2/3 rounded bg-slate-100 dark:bg-[#1F2937]/80 animate-pulse" />
          <div className="mt-2 h-3 w-1/2 rounded bg-slate-100 dark:bg-[#1F2937]/60 animate-pulse" />
        </div>
      ))}
    </div>
  );
}

export function BottomSheet({
  open,
  onClose,
  title,
  children,
  maxWidthClass = 'sm:max-w-lg',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidthClass?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
      <div
        className={`w-full ${maxWidthClass} max-h-[90vh] flex flex-col bg-white dark:bg-[#111827] rounded-t-3xl sm:rounded-2xl border border-[#E5E7EB] dark:border-[#374151] shadow-2xl pb-safe`}
      >
        <div className="sm:hidden w-10 h-1.5 bg-slate-300 dark:bg-[#374151] rounded-full mx-auto mt-3" />
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E7EB] dark:border-[#374151]">
          <h3 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB] truncate pr-4">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-[#6B7280] dark:text-[#9CA3AF] hover:bg-[#F8FAFC] dark:hover:bg-[#1F2937] hover:text-[#111827] dark:hover:text-[#F9FAFB]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto p-5 text-[#111827] dark:text-[#F9FAFB]">{children}</div>
      </div>
    </div>
  );
}
