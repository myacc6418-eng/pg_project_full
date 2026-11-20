import React, { useEffect, useState } from 'react';
import { BarChart3, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { apiFetch } from '../../services/api';
import { useTheme } from '../../hooks/useTheme';
import { useToast } from '../../hooks/useToast';
import { CardSkeleton, formatInr } from '../../components/ui/CommonUI';

interface PropertyReportRow {
  propertyId: string;
  propertyName: string;
  totalBeds: number;
  occupiedBeds: number;
  occupancyRatePct: number;
  rentCollectedInr: number;
  rentPendingInr: number;
  expensesInr: number;
  netProfitInr: number;
  outstandingDuesInr: number;
  openComplaints: number;
}

export function OwnerReportsPage() {
  const { resolvedTheme } = useTheme();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<PropertyReportRow[]>([]);

  useEffect(() => {
    apiFetch<{ byProperty: PropertyReportRow[] }>('/api/v1/operations/owner/reports')
      .then((res) => setRows(res.byProperty || []))
      .finally(() => setLoading(false));
  }, []);

  const exportCsv = () => {
    const csvRows = [
      ['Property', 'Total Beds', 'Occupied', 'Occupancy %', 'Rent Collected', 'Pending Rent', 'Expenses', 'Net Profit', 'Outstanding Dues', 'Open Complaints'],
      ...rows.map((r) => [
        `"${r.propertyName.replace(/"/g, '""')}"`,
        String(r.totalBeds),
        String(r.occupiedBeds),
        String(r.occupancyRatePct),
        String(r.rentCollectedInr),
        String(r.rentPendingInr),
        String(r.expensesInr),
        String(r.netProfitInr),
        String(r.outstandingDuesInr),
        String(r.openComplaints),
      ]),
    ];
    const blob = new Blob([csvRows.map((x) => x.join(',')).join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pgfinder-owner-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Portfolio report CSV downloaded');
  };

  if (loading) return <CardSkeleton rows={4} />;

  const isDark = resolvedTheme === 'dark';
  const tickColor = isDark ? '#9CA3AF' : '#6B7280';
  const gridColor = isDark ? '#374151' : '#E5E7EB';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <BarChart3 className="w-6 h-6 text-[#047857] dark:text-[#34D399]" />
          <div>
            <h1 className="font-display text-2xl font-bold text-[#111827] dark:text-[#F9FAFB]">
              Reports &amp; Analytics
            </h1>
            <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF]">
              Real-time revenue, expense, occupancy, and net operating profit computed per PG property.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          className="min-h-[40px] px-4 rounded-xl bg-[#047857] text-white text-xs font-semibold inline-flex items-center gap-1.5 self-start"
        >
          <Download className="w-4 h-4" />
          Export Report CSV
        </button>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5">
          <h2 className="text-base font-bold mb-4">Revenue vs Expenses by Property</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="propertyName" tick={{ fontSize: 10, fill: tickColor }} stroke={gridColor} />
                <YAxis tick={{ fontSize: 10, fill: tickColor }} stroke={gridColor} />
                <Tooltip
                  formatter={(v: any) => formatInr(Number(v))}
                  contentStyle={{
                    backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                    borderColor: isDark ? '#374151' : '#E5E7EB',
                    color: isDark ? '#F9FAFB' : '#111827',
                    borderRadius: 12,
                  }}
                />
                <Legend />
                <Bar dataKey="rentCollectedInr" name="Collected" fill={isDark ? '#34D399' : '#047857'} radius={[6, 6, 0, 0]} />
                <Bar dataKey="expensesInr" name="Expenses" fill={isDark ? '#FBBF24' : '#D97706'} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5">
          <h2 className="text-base font-bold mb-4">Occupancy Rate (%)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="propertyName" tick={{ fontSize: 10, fill: tickColor }} stroke={gridColor} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: tickColor }} stroke={gridColor} />
                <Tooltip
                  formatter={(v: any) => `${v}%`}
                  contentStyle={{
                    backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                    borderColor: isDark ? '#374151' : '#E5E7EB',
                    color: isDark ? '#F9FAFB' : '#111827',
                    borderRadius: 12,
                  }}
                />
                <Bar dataKey="occupancyRatePct" name="Occupancy %" fill={isDark ? '#10B981' : '#065F46'} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-[#6B7280] dark:text-[#9CA3AF]">
            <tr>
              <th className="p-3.5 font-semibold">Property</th>
              <th className="p-3.5 font-semibold">Beds (Occ/Tot)</th>
              <th className="p-3.5 font-semibold">Occupancy</th>
              <th className="p-3.5 font-semibold">Collected</th>
              <th className="p-3.5 font-semibold">Pending Rent</th>
              <th className="p-3.5 font-semibold">Expenses</th>
              <th className="p-3.5 font-semibold">Net Profit</th>
              <th className="p-3.5 font-semibold">Open Complaints</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#374151]">
            {rows.map((r) => (
              <tr key={r.propertyId}>
                <td className="p-3.5 font-bold">{r.propertyName}</td>
                <td className="p-3.5 font-mono">{r.occupiedBeds} / {r.totalBeds}</td>
                <td className="p-3.5 font-mono text-[#047857] dark:text-[#34D399] font-bold">{r.occupancyRatePct}%</td>
                <td className="p-3.5 font-mono">{formatInr(r.rentCollectedInr)}</td>
                <td className="p-3.5 font-mono text-[#B45309] dark:text-amber-400">{formatInr(r.rentPendingInr)}</td>
                <td className="p-3.5 font-mono">{formatInr(r.expensesInr)}</td>
                <td className="p-3.5 font-mono font-bold">{formatInr(r.netProfitInr)}</td>
                <td className="p-3.5 font-mono">{r.openComplaints}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
