import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DoorOpen, Search, Wrench, UserPlus, BedDouble } from 'lucide-react';
import { apiFetch } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { CardSkeleton, EmptyState, formatInr } from '../../components/ui/CommonUI';
import { BedStatus, Property } from '../../../packages/shared/types';

interface VacancyItem {
  bedId: string;
  bedCode: string;
  status: string;
  propertyId: string;
  propertyName: string;
  genderType: string;
  roomId: string;
  roomNumber: string;
  floorNumber: number;
  roomType: string;
  monthlyRentInr: number;
  depositInr: number;
}

export function OwnerVacanciesPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [vacancies, setVacancies] = useState<VacancyItem[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [propertyFilter, setPropertyFilter] = useState('ALL');
  const [roomTypeFilter, setRoomTypeFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const loadVacancies = async () => {
    setLoading(true);
    try {
      const [vacRes, ovRes] = await Promise.all([
        apiFetch<{ vacancies: VacancyItem[] }>('/api/v1/operations/owner/vacancies'),
        apiFetch<any>('/api/v1/operations/owner/overview?propertyId=ALL'),
      ]);
      setVacancies(vacRes.vacancies || []);
      setProperties(ovRes.properties || []);
    } catch {
      showToast('Could not load live vacancies', undefined, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVacancies();
  }, []);

  const handleMarkMaintenance = async (bedId: string, bedCode: string) => {
    try {
      await apiFetch(`/api/v1/operations/owner/beds/${bedId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: BedStatus.MAINTENANCE }),
      });
      showToast(`Bed ${bedCode} moved to maintenance`, 'Vacancy count updated automatically.');
      await loadVacancies();
    } catch (err: any) {
      showToast('Update failed', err.message, 'error');
    }
  };

  if (loading) return <CardSkeleton rows={4} />;

  const filtered = vacancies.filter((v) => {
    if (propertyFilter !== 'ALL' && v.propertyId !== propertyFilter) return false;
    if (roomTypeFilter !== 'ALL' && v.roomType !== roomTypeFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        v.bedCode.toLowerCase().includes(q) ||
        v.roomNumber.toLowerCase().includes(q) ||
        v.propertyName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const potentialMonthlyRevenue = filtered.reduce((acc, v) => acc + v.monthlyRentInr, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#111827] dark:text-[#F9FAFB]">Live Vacancies</h1>
          <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF]">
            Real-time unoccupied beds calculated directly from room &amp; stay status across all PG properties.
          </p>
        </div>
        <Link
          to="/owner/tenants"
          className="min-h-[42px] px-4 rounded-xl bg-[#047857] hover:bg-[#065F46] text-white text-xs font-semibold inline-flex items-center gap-1.5 self-start"
        >
          <UserPlus className="w-4 h-4" />
          Onboard Resident
        </Link>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-4">
          <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">Available Vacant Beds</p>
          <p className="mt-1 font-mono text-2xl font-bold text-[#047857] dark:text-[#34D399] tabular-nums">
            {filtered.length}
          </p>
        </div>
        <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-4">
          <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">Potential Monthly Rent</p>
          <p className="mt-1 font-mono text-2xl font-bold text-[#111827] dark:text-[#F9FAFB] tabular-nums">
            {formatInr(potentialMonthlyRevenue)}
          </p>
        </div>
        <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-4">
          <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">Properties With Openings</p>
          <p className="mt-1 font-mono text-2xl font-bold text-[#111827] dark:text-[#F9FAFB] tabular-nums">
            {new Set(filtered.map((f) => f.propertyId)).size}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-[#6B7280] dark:text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search bed code, room, property..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full min-h-[42px] pl-9 pr-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-sm text-[#111827] dark:text-[#F9FAFB]"
          />
        </div>
        <select
          aria-label="Filter by property"
          value={propertyFilter}
          onChange={(e) => setPropertyFilter(e.target.value)}
          className="min-h-[42px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-sm text-[#111827] dark:text-[#F9FAFB]"
        >
          <option value="ALL">All Properties ({properties.length})</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by room type"
          value={roomTypeFilter}
          onChange={(e) => setRoomTypeFilter(e.target.value)}
          className="min-h-[42px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-sm text-[#111827] dark:text-[#F9FAFB]"
        >
          <option value="ALL">All Sharing Types</option>
          <option value="SINGLE">Single</option>
          <option value="TWIN">Twin Sharing</option>
          <option value="TRIPLE">Triple Sharing</option>
          <option value="FOUR_SHARING">Four Sharing</option>
        </select>
      </div>

      {/* Vacancy Cards */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={DoorOpen}
          title="100% Occupied (No Vacant Beds Match)"
          description="No available beds match your current filters. Add new rooms/beds or check upcoming checkouts."
          actionLabel="Manage Rooms & Beds"
          onAction={() => navigate('/owner/rooms-beds')}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((v) => (
            <div
              key={v.bedId}
              className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 flex flex-col justify-between gap-4"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-base font-bold text-[#047857] dark:text-[#34D399]">
                    Bed {v.bedCode}
                  </span>
                  <span className="text-[11px] font-semibold text-[#6B7280] dark:text-[#9CA3AF]">
                    {v.genderType} · {v.roomType.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="mt-1 text-sm font-bold text-[#111827] dark:text-[#F9FAFB]">{v.propertyName}</p>
                <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                  Floor {v.floorNumber} · Room {v.roomNumber}
                </p>
                <div className="mt-3 pt-3 border-t border-[#E5E7EB] dark:border-[#374151] flex items-center justify-between text-xs">
                  <span className="text-[#6B7280] dark:text-[#9CA3AF]">Monthly Rent</span>
                  <span className="font-mono font-bold text-[#111827] dark:text-[#F9FAFB] tabular-nums">
                    {formatInr(v.monthlyRentInr)}/mo
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs mt-1">
                  <span className="text-[#6B7280] dark:text-[#9CA3AF]">Security Deposit</span>
                  <span className="font-mono font-semibold text-[#6B7280] dark:text-[#9CA3AF] tabular-nums">
                    {formatInr(v.depositInr)}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  to={`/owner/tenants?onboardPropertyId=${v.propertyId}&onboardBedId=${v.bedId}`}
                  className="flex-1 min-h-[38px] px-3 rounded-xl bg-[#047857] hover:bg-[#065F46] text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Assign / Onboard
                </Link>
                <button
                  type="button"
                  onClick={() => handleMarkMaintenance(v.bedId, v.bedCode)}
                  className="min-h-[38px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] text-xs font-semibold text-[#B45309] dark:text-amber-400 inline-flex items-center gap-1"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  Maint.
                </button>
                <Link
                  to={`/owner/rooms-beds?propertyId=${v.propertyId}`}
                  className="min-h-[38px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] inline-flex items-center gap-1"
                >
                  <BedDouble className="w-3.5 h-3.5" />
                  Room
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
