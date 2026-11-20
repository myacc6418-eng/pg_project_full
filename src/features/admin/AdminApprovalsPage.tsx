import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { History } from 'lucide-react';
import { apiFetch } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { CardSkeleton, formatInr, StatusIndicator } from '../../components/ui/CommonUI';
import {
  LocationVerificationStatus,
  Property,
  PropertyApprovalStatus,
} from '../../../packages/shared/types';
import { INDIAN_CITIES } from '../../../packages/shared/constants';

interface AdminProperty extends Property {
  ownerName: string;
  ownerEmail: string;
}

interface VacancyRow {
  propertyId: string;
  propertyName: string;
  city: string;
  locality: string;
  roomsCount: number;
  totalBeds: number;
  availableBeds: number;
  occupiedBeds: number;
  reservedBeds: number;
  maintenanceBeds: number;
  inactiveBeds: number;
}

export function AdminApprovalsPage({
  mode,
}: {
  mode: 'approvals' | 'locations' | 'properties' | 'vacancies';
}) {
  const { showToast } = useToast();
  const [properties, setProperties] = useState<AdminProperty[]>([]);
  const [vacancies, setVacancies] = useState<VacancyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [cityFilter, setCityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [expandedHistory, setExpandedHistory] = useState<Record<string, boolean>>({});
  const [notesMap, setNotesMap] = useState<Record<string, string>>({});
  const [latMap, setLatMap] = useState<Record<string, string>>({});
  const [lngMap, setLngMap] = useState<Record<string, string>>({});

  const loadData = async () => {
    setLoading(true);
    try {
      if (mode === 'vacancies') {
        const ops = await apiFetch<{ vacanciesByProperty: VacancyRow[] }>('/api/v1/admin/operations');
        setVacancies(ops.vacanciesByProperty);
      } else {
        const res = await apiFetch<{ properties: AdminProperty[] }>('/api/v1/properties/admin/all');
        setProperties(res.properties);
        const lats: Record<string, string> = {};
        const lngs: Record<string, string> = {};
        res.properties.forEach((p) => {
          lats[p.id] = String(p.verifiedLat ?? p.ownerLat);
          lngs[p.id] = String(p.verifiedLng ?? p.ownerLng);
        });
        setLatMap(lats);
        setLngMap(lngs);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setStatusFilter('ALL');
    loadData();
  }, [mode]);

  const handleApprovalDecision = async (propId: string, status: PropertyApprovalStatus) => {
    const reason = (notesMap[propId] || '').trim() || `Admin marked property as ${status.replace(/_/g, ' ')}.`;
    try {
      await apiFetch(`/api/v1/properties/admin/${propId}/approval`, {
        method: 'POST',
        body: JSON.stringify({ status, reason }),
      });
      showToast('Approval Status Updated', `Property set to ${status.replace(/_/g, ' ')}`);
      await loadData();
    } catch (err: any) {
      showToast('Update failed', err.message, 'error');
    }
  };

  const handleLocationDecision = async (propId: string, status: LocationVerificationStatus) => {
    const notes = (notesMap[propId] || '').trim() || `Admin verified street address and map coordinates.`;
    try {
      await apiFetch(`/api/v1/properties/admin/${propId}/location-verify`, {
        method: 'POST',
        body: JSON.stringify({
          status,
          notes,
          verifiedLat: Number(latMap[propId]),
          verifiedLng: Number(lngMap[propId]),
        }),
      });
      showToast('Location Verification Updated', `Location set to ${status.replace(/_/g, ' ')}`);
      await loadData();
    } catch (err: any) {
      showToast('Verification failed', err.message, 'error');
    }
  };

  if (loading) return <CardSkeleton rows={3} />;

  const inputClass =
    'min-h-[42px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#1F2937] text-sm text-[#111827] dark:text-[#F9FAFB]';

  if (mode === 'vacancies') {
    const filteredVacancies = vacancies.filter((v) => {
      if (cityFilter !== 'ALL' && v.city !== cityFilter) return false;
      if (
        search &&
        !v.propertyName.toLowerCase().includes(search.toLowerCase()) &&
        !v.locality.toLowerCase().includes(search.toLowerCase())
      ) {
        return false;
      }
      return true;
    });

    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#111827] dark:text-[#F9FAFB]">
            Platform Rooms &amp; Bed Vacancies Matrix
          </h1>
          <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF]">
            Inspect live bed availability, reservations, and maintenance holds across every PG property.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Search property or locality..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${inputClass} flex-1 min-w-[200px]`}
          />
          <select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} className={inputClass}>
            <option value="ALL">All Cities</option>
            {INDIAN_CITIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-[#E5E7EB] dark:border-[#374151] text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                <th className="p-4 font-semibold">Property</th>
                <th className="p-4 font-semibold">City &amp; Locality</th>
                <th className="p-4 font-semibold">Rooms</th>
                <th className="p-4 font-semibold">Total Beds</th>
                <th className="p-4 font-semibold">Available</th>
                <th className="p-4 font-semibold">Occupied</th>
                <th className="p-4 font-semibold">Reserved</th>
                <th className="p-4 font-semibold">Maintenance</th>
                <th className="p-4 font-semibold">Inactive</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#374151] text-sm">
              {filteredVacancies.map((v) => (
                <tr key={v.propertyId} className="hover:bg-[#F8FAFC] dark:hover:bg-[#1F2937]/60">
                  <td className="p-4 font-semibold text-[#111827] dark:text-[#F9FAFB]">{v.propertyName}</td>
                  <td className="p-4 text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                    {v.locality}, {v.city}
                  </td>
                  <td className="p-4 font-mono tabular-nums text-[#111827] dark:text-[#F9FAFB]">{v.roomsCount}</td>
                  <td className="p-4 font-mono tabular-nums font-bold text-[#111827] dark:text-[#F9FAFB]">{v.totalBeds}</td>
                  <td className="p-4 font-mono tabular-nums font-bold text-[#047857] dark:text-[#34D399]">{v.availableBeds}</td>
                  <td className="p-4 font-mono tabular-nums text-[#111827] dark:text-[#F9FAFB]">{v.occupiedBeds}</td>
                  <td className="p-4 font-mono tabular-nums text-[#B45309] dark:text-[#FBBF24]">{v.reservedBeds}</td>
                  <td className="p-4 font-mono tabular-nums text-[#6B7280] dark:text-[#9CA3AF]">{v.maintenanceBeds}</td>
                  <td className="p-4 font-mono tabular-nums text-[#6B7280] dark:text-[#9CA3AF]">{v.inactiveBeds}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  const filteredProperties = properties.filter((p) => {
    if (cityFilter !== 'ALL' && p.city !== cityFilter) return false;
    if (
      search &&
      !p.name.toLowerCase().includes(search.toLowerCase()) &&
      !p.ownerName.toLowerCase().includes(search.toLowerCase()) &&
      !p.locality.toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }
    if (mode === 'approvals' && statusFilter !== 'ALL' && p.approvalStatus !== statusFilter) return false;
    if (mode === 'locations' && statusFilter !== 'ALL' && p.locationStatus !== statusFilter) return false;
    return true;
  });

  if (mode === 'properties') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#111827] dark:text-[#F9FAFB]">All PG Properties Directory</h1>
          <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF]">
            Inspect compliance, location pins, active entitlements (Lifetime ₹199 vs Pro/Business Sub), and Featured boost status.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Search property, owner, or locality..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${inputClass} flex-1 min-w-[200px]`}
          />
          <select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} className={inputClass}>
            <option value="ALL">All Cities</option>
            {INDIAN_CITIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[820px]">
            <thead>
              <tr className="border-b border-[#E5E7EB] dark:border-[#374151] text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                <th className="p-4 font-semibold">PG Property</th>
                <th className="p-4 font-semibold">Owner</th>
                <th className="p-4 font-semibold">Approval</th>
                <th className="p-4 font-semibold">Location</th>
                <th className="p-4 font-semibold">Entitlement</th>
                <th className="p-4 font-semibold">Promotion / State</th>
                <th className="p-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#374151] text-sm">
              {filteredProperties.map((pg) => {
                const entitlement = pg.hasLifetimeListing
                  ? 'Lifetime (₹199)'
                  : pg.coveredBySubscription
                    ? 'Subscription Plan'
                    : 'Unlisted';
                return (
                  <tr key={pg.id} className="hover:bg-[#F8FAFC] dark:hover:bg-[#1F2937]/60">
                    <td className="p-4">
                      <p className="font-semibold text-[#111827] dark:text-[#F9FAFB]">{pg.name}</p>
                      <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                        {pg.locality}, {pg.city} · {pg.genderType} · {formatInr(pg.startingRentInr)}/mo
                      </p>
                    </td>
                    <td className="p-4 text-xs text-[#4B5563] dark:text-[#D1D5DB]">
                      {pg.ownerName}
                      <br />
                      <span className="text-[#6B7280] dark:text-[#9CA3AF]">{pg.ownerEmail}</span>
                    </td>
                    <td className="p-4">
                      <StatusIndicator
                        status={pg.approvalStatus === PropertyApprovalStatus.APPROVED ? 'success' : 'warning'}
                        label={pg.approvalStatus.replace(/_/g, ' ')}
                      />
                    </td>
                    <td className="p-4">
                      <StatusIndicator
                        status={pg.locationStatus === LocationVerificationStatus.VERIFIED ? 'success' : 'warning'}
                        label={pg.locationStatus.replace(/_/g, ' ')}
                      />
                    </td>
                    <td className="p-4 text-xs font-semibold text-[#111827] dark:text-[#F9FAFB]">{entitlement}</td>
                    <td className="p-4 text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                      {pg.isPromoted ? 'Promoted' : 'Standard'} · {pg.isArchived ? 'Archived' : 'Live'}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <Link
                          to="/admin/approvals"
                          className="min-h-[34px] px-2.5 rounded-lg border border-[#E5E7EB] dark:border-[#374151] text-xs font-semibold inline-flex items-center text-[#111827] dark:text-[#F9FAFB]"
                        >
                          Compliance
                        </Link>
                        <Link
                          to="/admin/locations"
                          className="min-h-[34px] px-2.5 rounded-lg border border-[#E5E7EB] dark:border-[#374151] text-xs font-semibold inline-flex items-center text-[#047857] dark:text-[#34D399]"
                        >
                          Pin
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-[#111827] dark:text-[#F9FAFB]">
          {mode === 'approvals' ? 'PG Property Approvals' : 'Location Coordinate Verification'}
        </h1>
        <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF]">
          {mode === 'approvals'
            ? 'Review property compliance independently of owner subscription tier. Every decision writes an immutable audit trail.'
            : 'Inspect owner-submitted coordinates, adjust if needed, and confirm verified GPS pins before public listing.'}
        </p>
      </div>

      {/* City & Status Filter Bar */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search property, owner, or locality..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`${inputClass} flex-1 min-w-[200px]`}
        />
        <select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} className={inputClass}>
          <option value="ALL">All Cities</option>
          {INDIAN_CITIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={inputClass}>
          <option value="ALL">All Statuses</option>
          {mode === 'approvals'
            ? Object.values(PropertyApprovalStatus).map((st) => (
                <option key={st} value={st}>{st.replace(/_/g, ' ')}</option>
              ))
            : Object.values(LocationVerificationStatus).map((st) => (
                <option key={st} value={st}>{st.replace(/_/g, ' ')}</option>
              ))}
        </select>
      </div>

      <div className="space-y-4">
        {filteredProperties.map((pg) => {
          const historyItems = mode === 'approvals' ? pg.approvalHistory || [] : pg.locationHistory || [];
          const isHistOpen = Boolean(expandedHistory[pg.id]);

          return (
            <div
              key={pg.id}
              className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-4"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                    Owner: {pg.ownerName} ({pg.ownerEmail}) · Starting {formatInr(pg.startingRentInr)}/mo
                  </p>
                  <h2 className="mt-1 text-lg font-bold text-[#111827] dark:text-[#F9FAFB]">{pg.name}</h2>
                  <p className="text-xs text-[#4B5563] dark:text-[#D1D5DB]">
                    {pg.address}, {pg.landmark}, {pg.locality}, {pg.city} - {pg.postalCode}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <div>
                    <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">Approval</p>
                    <StatusIndicator
                      status={pg.approvalStatus === PropertyApprovalStatus.APPROVED ? 'success' : 'warning'}
                      label={pg.approvalStatus.replace(/_/g, ' ')}
                    />
                  </div>
                  <div>
                    <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">Location</p>
                    <StatusIndicator
                      status={pg.locationStatus === LocationVerificationStatus.VERIFIED ? 'success' : 'warning'}
                      label={pg.locationStatus.replace(/_/g, ' ')}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setExpandedHistory((prev) => ({ ...prev, [pg.id]: !prev[pg.id] }))}
                    className="min-h-[36px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] inline-flex items-center gap-1.5"
                  >
                    <History className="w-3.5 h-3.5 text-[#047857] dark:text-[#34D399]" />
                    History ({historyItems.length})
                  </button>
                </div>
              </div>

              {isHistOpen && (
                <div className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151] space-y-2">
                  <p className="text-xs font-bold text-[#111827] dark:text-[#F9FAFB]">
                    {mode === 'approvals' ? 'Approval Decision Trail' : 'Location Audit Trail'}
                  </p>
                  {historyItems.length === 0 ? (
                    <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">No audit entries recorded yet.</p>
                  ) : (
                    historyItems.map((h: any) => (
                      <div key={h.id} className="text-xs border-l-2 border-[#047857] dark:border-[#34D399] pl-2.5">
                        <p className="font-semibold text-[#111827] dark:text-[#F9FAFB]">
                          {h.previousStatus} → {h.newStatus}
                        </p>
                        <p className="text-[#4B5563] dark:text-[#D1D5DB]">{h.reason || h.notes}</p>
                        <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">
                          {h.actorName} · {new Date(h.timestamp).toLocaleString('en-IN')}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}

              {mode === 'locations' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151]">
                  <div>
                    <label className="block text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] mb-1">
                      Verified Latitude (Owner submitted: {pg.ownerLat})
                    </label>
                    <input
                      type="text"
                      value={latMap[pg.id] || ''}
                      onChange={(e) => setLatMap({ ...latMap, [pg.id]: e.target.value })}
                      className="w-full min-h-[40px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] font-mono text-xs text-[#111827] dark:text-[#F9FAFB]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] mb-1">
                      Verified Longitude (Owner submitted: {pg.ownerLng})
                    </label>
                    <input
                      type="text"
                      value={lngMap[pg.id] || ''}
                      onChange={(e) => setLngMap({ ...lngMap, [pg.id]: e.target.value })}
                      className="w-full min-h-[40px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] font-mono text-xs text-[#111827] dark:text-[#F9FAFB]"
                    />
                  </div>
                </div>
              )}

              <input
                type="text"
                placeholder={mode === 'approvals' ? 'Enter approval decision reason...' : 'Enter location verification notes...'}
                value={notesMap[pg.id] || ''}
                onChange={(e) => setNotesMap({ ...notesMap, [pg.id]: e.target.value })}
                className="w-full min-h-[42px] px-3.5 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-sm text-[#111827] dark:text-[#F9FAFB]"
              />

              {mode === 'approvals' ? (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleApprovalDecision(pg.id, PropertyApprovalStatus.APPROVED)}
                    className="min-h-[40px] px-4 rounded-xl bg-[#047857] text-white text-xs font-semibold"
                  >
                    Approve Property
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApprovalDecision(pg.id, PropertyApprovalStatus.CORRECTIONS_REQUIRED)}
                    className="min-h-[40px] px-3.5 rounded-xl border border-[#E5E7EB] dark:border-[#374151] text-xs font-semibold text-[#111827] dark:text-[#F9FAFB]"
                  >
                    Request Corrections
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApprovalDecision(pg.id, PropertyApprovalStatus.REJECTED)}
                    className="min-h-[40px] px-3.5 rounded-xl border border-red-200 dark:border-red-900/50 text-[#DC2626] dark:text-red-400 text-xs font-semibold"
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApprovalDecision(pg.id, PropertyApprovalStatus.SUSPENDED)}
                    className="min-h-[40px] px-3.5 rounded-xl border border-red-200 dark:border-red-900/50 text-[#DC2626] dark:text-red-400 text-xs font-semibold"
                  >
                    Suspend
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleLocationDecision(pg.id, LocationVerificationStatus.VERIFIED)}
                    className="min-h-[40px] px-4 rounded-xl bg-[#047857] text-white text-xs font-semibold"
                  >
                    Verify Location Coordinates
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLocationDecision(pg.id, LocationVerificationStatus.CORRECTIONS_REQUIRED)}
                    className="min-h-[40px] px-3.5 rounded-xl border border-[#E5E7EB] dark:border-[#374151] text-xs font-semibold text-[#111827] dark:text-[#F9FAFB]"
                  >
                    Request Address Corrections
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLocationDecision(pg.id, LocationVerificationStatus.REJECTED)}
                    className="min-h-[40px] px-3.5 rounded-xl border border-red-200 dark:border-red-900/50 text-[#DC2626] dark:text-red-400 text-xs font-semibold"
                  >
                    Reject Location
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
