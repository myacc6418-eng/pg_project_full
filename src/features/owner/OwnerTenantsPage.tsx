import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { UserPlus, Search, ArrowRight, Users, QrCode, Eye, MessageSquarePlus } from 'lucide-react';
import { apiFetch } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { BottomSheet, CardSkeleton, EmptyState, formatInr, StatusIndicator } from '../../components/ui/CommonUI';
import {
  Bed,
  BedStatus,
  JoiningRequest,
  JoiningRequestStatus,
  Property,
  Room,
  StayStatus,
  TenantStay,
} from '../../../packages/shared/types';

export function OwnerTenantsPage({ initialSection = 'tenants' }: { initialSection?: 'tenants' | 'joining' }) {
  const { showToast, confirmAction } = useToast();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<Property[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [joiningRequests, setJoiningRequests] = useState<JoiningRequest[]>([]);
  const [stays, setStays] = useState<TenantStay[]>([]);

  // Filters
  const [propertyFilter, setPropertyFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | StayStatus>('ALL');
  const [search, setSearch] = useState('');

  // Joining Request Room -> Bed Map & Modals
  const [selectedRooms, setSelectedRooms] = useState<Record<string, string>>({});
  const [selectedBeds, setSelectedBeds] = useState<Record<string, string>>({});
  const [detailRequest, setDetailRequest] = useState<JoiningRequest | null>(null);
  const [infoRequestTarget, setInfoRequestTarget] = useState<JoiningRequest | null>(null);
  const [infoRequestNote, setInfoRequestNote] = useState('');

  // Owner-Assisted Onboarding Modal
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [onbPropId, setOnbPropId] = useState(searchParams.get('onboardPropertyId') || '');
  const [onbBedId, setOnbBedId] = useState(searchParams.get('onboardBedId') || '');
  const [onbName, setOnbName] = useState('');
  const [onbPhone, setOnbPhone] = useState('');
  const [onbEmail, setOnbEmail] = useState('');
  const [onbEmergencyName, setOnbEmergencyName] = useState('');
  const [onbEmergencyPhone, setOnbEmergencyPhone] = useState('');
  const [onbRent, setOnbRent] = useState('');
  const [onbDeposit, setOnbDeposit] = useState('');
  const [onbDepositPaid, setOnbDepositPaid] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<any>('/api/v1/operations/owner/overview?propertyId=ALL');
      setProperties(res.properties || []);
      setRooms(res.rooms || []);
      setBeds(res.beds || []);
      setJoiningRequests(res.joiningRequests || []);
      setStays(res.stays || []);
      if (!onbPropId && res.properties?.[0]) {
        setOnbPropId(res.properties[0].id);
      }
      if (searchParams.get('onboardBedId')) {
        setShowOnboardModal(true);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openBedsForOnboard = beds.filter((b) => b.propertyId === onbPropId && b.status === BedStatus.AVAILABLE);

  useEffect(() => {
    if (onbPropId && openBedsForOnboard.length > 0 && !openBedsForOnboard.some((b) => b.id === onbBedId)) {
      const first = openBedsForOnboard[0];
      setOnbBedId(first.id);
      const rm = rooms.find((r) => r.id === first.roomId);
      setOnbRent(String(first.monthlyRentOverrideInr || rm?.monthlyRentInr || 8500));
      setOnbDeposit(String(rm?.depositInr ?? 15000));
    }
  }, [onbPropId, beds.length]);

  const handleDecision = async (jr: JoiningRequest, decision: 'APPROVE' | 'REJECT') => {
    const bedId = selectedBeds[jr.id];
    if (decision === 'APPROVE' && !bedId) {
      showToast('Select an available bed first', undefined, 'error');
      return;
    }
    try {
      await apiFetch(`/api/v1/operations/owner/joining-requests/${jr.id}/decision`, {
        method: 'POST',
        body: JSON.stringify({ decision, bedId }),
      });
      setDetailRequest(null);
      showToast(decision === 'APPROVE' ? 'Approved & Bed Reserved' : 'Request Rejected');
      await loadData();
    } catch (err: any) {
      showToast('Action failed', err.message, 'error');
    }
  };

  const handleRequestInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!infoRequestTarget) return;
    setSubmitting(true);
    try {
      await apiFetch(`/api/v1/operations/owner/joining-requests/${infoRequestTarget.id}/decision`, {
        method: 'POST',
        body: JSON.stringify({ decision: 'REQUEST_INFO', notes: infoRequestNote.trim() }),
      });
      setInfoRequestTarget(null);
      setInfoRequestNote('');
      setDetailRequest(null);
      showToast('Clarification Requested', 'Tenant has been notified to respond.');
      await loadData();
    } catch (err: any) {
      showToast('Could not request info', err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOnboardTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiFetch('/api/v1/operations/owner/tenants/onboard', {
        method: 'POST',
        body: JSON.stringify({
          propertyId: onbPropId,
          bedId: onbBedId,
          fullName: onbName,
          phone: onbPhone,
          email: onbEmail || undefined,
          emergencyContactName: onbEmergencyName || undefined,
          emergencyContactPhone: onbEmergencyPhone || undefined,
          monthlyRentInr: onbRent ? Number(onbRent) : undefined,
          securityDepositInr: onbDeposit ? Number(onbDeposit) : undefined,
          depositPaid: onbDepositPaid,
        }),
      });
      setShowOnboardModal(false);
      setOnbName('');
      setOnbPhone('');
      setOnbEmail('');
      setOnbEmergencyName('');
      setOnbEmergencyPhone('');
      showToast('Resident onboarded & bed marked occupied');
      await loadData();
    } catch (err: any) {
      showToast('Onboarding failed', err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickCheckout = async (stay: TenantStay) => {
    const ok = await confirmAction({
      title: `Finalize Checkout for ${stay.tenantName}?`,
      description:
        'Deposit will be adjusted against unpaid dues, excess dues carried forward, and the assigned bed released to Available.',
      confirmLabel: 'Finalize Checkout',
    });
    if (!ok) return;
    try {
      await apiFetch(`/api/v1/operations/owner/stays/${stay.id}/finalize-checkout`, { method: 'POST' });
      showToast('Checkout Finalized', 'Bed released and ledger settled.');
      await loadData();
    } catch (err: any) {
      showToast('Checkout failed', err.message, 'error');
    }
  };

  if (loading) return <CardSkeleton rows={4} />;

  const filteredRequests = joiningRequests.filter((jr) => {
    if (propertyFilter !== 'ALL' && jr.propertyId !== propertyFilter) return false;
    if (search.trim() && !jr.tenantName.toLowerCase().includes(search.toLowerCase()) && !jr.tenantPhone.includes(search)) {
      return false;
    }
    return true;
  });

  const filteredStays = stays.filter((st) => {
    if (propertyFilter !== 'ALL' && st.propertyId !== propertyFilter) return false;
    if (statusFilter !== 'ALL' && st.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const bed = beds.find((b) => b.id === st.bedId);
      return (
        st.tenantName.toLowerCase().includes(q) ||
        (st.tenantCode || '').toLowerCase().includes(q) ||
        (bed?.bedCode || '').toLowerCase().includes(q) ||
        (st.tenantPhone || '').includes(q)
      );
    }
    return true;
  });

  const renderJoiningRequestsSection = () => (
    <section className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">
          Joining Requests ({filteredRequests.length})
        </h2>
        <span className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">Approve &amp; reserve available beds</span>
      </div>
      {filteredRequests.length === 0 ? (
        <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF]">No joining requests matching filter.</p>
      ) : (
        filteredRequests.map((jr) => {
          const prop = properties.find((p) => p.id === jr.propertyId);
          const propRooms = rooms.filter((r) => r.propertyId === jr.propertyId && r.isActive !== false);
          const allOpenBeds = beds.filter((b) => b.propertyId === jr.propertyId && b.status === BedStatus.AVAILABLE);
          const chosenRoomId = selectedRooms[jr.id] || 'ALL';
          const filteredOpenBeds =
            chosenRoomId === 'ALL' ? allOpenBeds : allOpenBeds.filter((b) => b.roomId === chosenRoomId);
          const canReview =
            jr.status === JoiningRequestStatus.PENDING || jr.status === JoiningRequestStatus.INFO_REQUESTED;

          return (
            <div
              key={jr.id}
              className="p-4 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] space-y-3"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusIndicator
                      status={
                        jr.status === JoiningRequestStatus.ACTIVE
                          ? 'success'
                          : jr.status === JoiningRequestStatus.REJECTED
                            ? 'error'
                            : jr.status === JoiningRequestStatus.APPROVED_AWAITING_TERMS
                              ? 'info'
                              : 'warning'
                      }
                      label={jr.status.replace(/_/g, ' ')}
                    />
                    {jr.origin === 'QR' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#ECFDF5] dark:bg-[#10B981]/15 text-[#047857] dark:text-[#34D399] text-[11px] font-semibold">
                        <QrCode className="w-3 h-3" />
                        QR Onboarding
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 text-sm font-bold text-[#111827] dark:text-[#F9FAFB]">
                    {jr.tenantName} · {jr.tenantPhone}
                  </p>
                  <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                    {prop?.name} · Requested {jr.preferredRoomType} · Move-in {jr.moveInDate}
                  </p>
                  {jr.notes && (
                    <p className="mt-1 text-xs text-[#4B5563] dark:text-[#D1D5DB] line-clamp-2">
                      Note: {jr.notes}
                    </p>
                  )}
                  {jr.ownerNotes && (
                    <p className="mt-0.5 text-xs text-[#D97706] dark:text-amber-300">
                      Owner note: {jr.ownerNotes}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDetailRequest(jr)}
                    className="min-h-[38px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] text-xs font-semibold inline-flex items-center gap-1.5 text-[#111827] dark:text-[#F9FAFB]"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    View
                  </button>
                  {canReview && (
                    <button
                      type="button"
                      onClick={() => {
                        setInfoRequestTarget(jr);
                        setInfoRequestNote(jr.ownerNotes || '');
                      }}
                      className="min-h-[38px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] text-xs font-semibold inline-flex items-center gap-1.5 text-[#111827] dark:text-[#F9FAFB]"
                    >
                      <MessageSquarePlus className="w-3.5 h-3.5 text-[#047857] dark:text-[#34D399]" />
                      Request Info
                    </button>
                  )}
                </div>
              </div>

              {canReview && (
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#E5E7EB] dark:border-[#374151]">
                  <select
                    aria-label="Filter room for bed assignment"
                    value={chosenRoomId}
                    onChange={(e) => {
                      const roomId = e.target.value;
                      setSelectedRooms({ ...selectedRooms, [jr.id]: roomId });
                      const firstOpenInRoom =
                        roomId === 'ALL'
                          ? allOpenBeds[0]
                          : allOpenBeds.find((b) => b.roomId === roomId);
                      setSelectedBeds({ ...selectedBeds, [jr.id]: firstOpenInRoom?.id || '' });
                    }}
                    className="min-h-[38px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] text-xs text-[#111827] dark:text-[#F9FAFB]"
                  >
                    <option value="ALL">All Rooms ({allOpenBeds.length} open)</option>
                    {propRooms.map((r) => {
                      const count = allOpenBeds.filter((b) => b.roomId === r.id).length;
                      return (
                        <option key={r.id} value={r.id}>
                          Room {r.roomNumber} · {r.roomType} ({count} open)
                        </option>
                      );
                    })}
                  </select>

                  <select
                    aria-label="Assign available bed"
                    value={selectedBeds[jr.id] || ''}
                    onChange={(e) => setSelectedBeds({ ...selectedBeds, [jr.id]: e.target.value })}
                    className="min-h-[38px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] text-xs text-[#111827] dark:text-[#F9FAFB]"
                  >
                    <option value="">Select available bed...</option>
                    {filteredOpenBeds.map((b) => {
                      const rm = rooms.find((r) => r.id === b.roomId);
                      const rent = b.monthlyRentOverrideInr || rm?.monthlyRentInr || 0;
                      const dep = rm?.depositInr || 0;
                      return (
                        <option key={b.id} value={b.id}>
                          Bed {b.bedCode} · Room {rm?.roomNumber} ({formatInr(rent)}/mo, Dep {formatInr(dep)})
                        </option>
                      );
                    })}
                  </select>

                  <button
                    type="button"
                    onClick={() => handleDecision(jr, 'APPROVE')}
                    className="min-h-[38px] px-3.5 rounded-xl bg-[#047857] hover:bg-[#065F46] text-white text-xs font-semibold"
                  >
                    Approve &amp; Assign
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDecision(jr, 'REJECT')}
                    className="min-h-[38px] px-3.5 rounded-xl border border-red-200 dark:border-red-900/50 text-[#DC2626] dark:text-red-400 text-xs font-semibold"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          );
        })
      )}
    </section>
  );

  const renderStaysSection = () => (
    <section className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">
          Tenant Directory ({filteredStays.length})
        </h2>
        <span className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">Click any resident to open 9-tab workspace</span>
      </div>
      {filteredStays.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No Resident Stays Match"
          description="Onboard a resident onto an available bed or adjust your search/property filters."
          actionLabel="Owner-Assisted Onboarding"
          onAction={() => setShowOnboardModal(true)}
        />
      ) : (
        <div className="space-y-3">
          {filteredStays.map((st) => {
            const prop = properties.find((p) => p.id === st.propertyId);
            const room = rooms.find((r) => r.id === st.roomId);
            const bed = beds.find((b) => b.id === st.bedId);
            return (
              <div
                key={st.id}
                className="p-4 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusIndicator
                      status={
                        st.status === StayStatus.ACTIVE
                          ? 'success'
                          : st.status === StayStatus.CHECKOUT_REQUESTED
                            ? 'warning'
                            : 'neutral'
                      }
                      label={st.status.replace(/_/g, ' ')}
                    />
                    {st.tenantCode && (
                      <span className="font-mono text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">
                        {st.tenantCode}
                      </span>
                    )}
                  </div>
                  <Link
                    to={`/owner/tenants/${st.id}`}
                    className="mt-1 inline-block text-sm font-bold text-[#111827] dark:text-[#F9FAFB] hover:text-[#047857] dark:hover:text-[#34D399]"
                  >
                    {st.tenantName}
                  </Link>
                  <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                    {prop?.name} · Room {room?.roomNumber || '-'} · Bed {bed?.bedCode || st.bedId} · Rent{' '}
                    {formatInr(st.monthlyRentInr)}/mo
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    to={`/owner/tenants/${st.id}`}
                    className="min-h-[38px] px-3.5 rounded-xl bg-[#047857] hover:bg-[#065F46] text-white text-xs font-semibold inline-flex items-center gap-1.5"
                  >
                    Manage Tenant
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  {st.status !== StayStatus.CHECKED_OUT && (
                    <button
                      type="button"
                      onClick={() => handleQuickCheckout(st)}
                      className="min-h-[38px] px-3.5 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] hover:border-[#047857] text-xs font-semibold text-[#111827] dark:text-[#F9FAFB]"
                    >
                      Checkout
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#111827] dark:text-[#F9FAFB]">
            {initialSection === 'joining' ? 'Joining Requests & Onboarding' : 'Tenant Management'}
          </h1>
          <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF]">
            Onboard residents directly, review QR joining requests, transfer beds, verify KYC, and settle deposits.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowOnboardModal(true)}
          className="min-h-[44px] px-4 rounded-xl bg-[#047857] hover:bg-[#065F46] text-white text-xs font-semibold inline-flex items-center gap-1.5 self-start"
        >
          <UserPlus className="w-4 h-4" />
          Onboard New Tenant
        </button>
      </div>

      {/* Filters Bar */}
      <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-[#6B7280] dark:text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search name, phone, bed code, ID..."
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
          aria-label="Filter by stay status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="min-h-[42px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-sm text-[#111827] dark:text-[#F9FAFB]"
        >
          <option value="ALL">All Stay Statuses</option>
          <option value={StayStatus.ACTIVE}>Active</option>
          <option value={StayStatus.CHECKOUT_REQUESTED}>Checkout Requested</option>
          <option value={StayStatus.CHECKED_OUT}>Checked Out</option>
        </select>
      </div>

      {initialSection === 'joining' ? (
        <>
          {renderJoiningRequestsSection()}
          {renderStaysSection()}
        </>
      ) : (
        <>
          {renderStaysSection()}
          {renderJoiningRequestsSection()}
        </>
      )}

      {/* Owner-Assisted Onboarding Modal */}
      <BottomSheet
        open={showOnboardModal}
        onClose={() => setShowOnboardModal(false)}
        title="Owner-Assisted Tenant Onboarding"
        maxWidthClass="sm:max-w-xl"
      >
        <form onSubmit={handleOnboardTenant} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Property</label>
              <select
                value={onbPropId}
                onChange={(e) => setOnbPropId(e.target.value)}
                required
                className="w-full min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#1F2937] text-sm"
              >
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Available Bed</label>
              <select
                value={onbBedId}
                onChange={(e) => setOnbBedId(e.target.value)}
                required
                className="w-full min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#1F2937] text-sm"
              >
                {openBedsForOnboard.length === 0 ? (
                  <option value="">No available beds</option>
                ) : (
                  openBedsForOnboard.map((b) => {
                    const rm = rooms.find((r) => r.id === b.roomId);
                    return (
                      <option key={b.id} value={b.id}>
                        {b.bedCode} · Room {rm?.roomNumber} ({formatInr(b.monthlyRentOverrideInr || rm?.monthlyRentInr || 0)})
                      </option>
                    );
                  })
                )}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Resident Full Name</label>
              <input
                type="text"
                value={onbName}
                onChange={(e) => setOnbName(e.target.value)}
                required
                className="w-full min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#1F2937] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Phone Number (10 digits)</label>
              <input
                type="tel"
                value={onbPhone}
                onChange={(e) => setOnbPhone(e.target.value)}
                required
                className="w-full min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#1F2937] text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Email (optional)</label>
              <input
                type="email"
                value={onbEmail}
                onChange={(e) => setOnbEmail(e.target.value)}
                className="w-full min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#1F2937] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Monthly Rent (₹)</label>
              <input
                type="number"
                value={onbRent}
                onChange={(e) => setOnbRent(e.target.value)}
                required
                className="w-full min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#1F2937] text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Deposit (₹)</label>
              <input
                type="number"
                value={onbDeposit}
                onChange={(e) => setOnbDeposit(e.target.value)}
                required
                className="w-full min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#1F2937] text-sm tabular-nums"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Emergency Contact Name</label>
              <input
                type="text"
                value={onbEmergencyName}
                onChange={(e) => setOnbEmergencyName(e.target.value)}
                className="w-full min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#1F2937] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Emergency Contact Phone</label>
              <input
                type="tel"
                value={onbEmergencyPhone}
                onChange={(e) => setOnbEmergencyPhone(e.target.value)}
                className="w-full min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#1F2937] text-sm"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs font-medium">
            <input
              type="checkbox"
              checked={onbDepositPaid}
              onChange={(e) => setOnbDepositPaid(e.target.checked)}
            />
            Security deposit collected at onboarding
          </label>

          <button
            type="submit"
            disabled={submitting || openBedsForOnboard.length === 0}
            className="w-full min-h-[44px] rounded-xl bg-[#047857] hover:bg-[#065F46] disabled:opacity-50 text-white text-sm font-semibold"
          >
            {submitting ? 'Onboarding...' : 'Confirm Onboarding & Occupy Bed'}
          </button>
        </form>
      </BottomSheet>

      {/* Joining Request Detail BottomSheet */}
      <BottomSheet
        open={Boolean(detailRequest)}
        onClose={() => setDetailRequest(null)}
        title="Joining Request Details"
        maxWidthClass="sm:max-w-lg"
      >
        {detailRequest && (() => {
          const prop = properties.find((p) => p.id === detailRequest.propertyId);
          const rm = detailRequest.assignedRoomId ? rooms.find((r) => r.id === detailRequest.assignedRoomId) : null;
          const bd = detailRequest.assignedBedId ? beds.find((b) => b.id === detailRequest.assignedBedId) : null;
          return (
            <div className="space-y-4 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <StatusIndicator
                  status={
                    detailRequest.status === JoiningRequestStatus.ACTIVE
                      ? 'success'
                      : detailRequest.status === JoiningRequestStatus.REJECTED
                        ? 'error'
                        : 'warning'
                  }
                  label={detailRequest.status.replace(/_/g, ' ')}
                />
                {detailRequest.origin === 'QR' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#ECFDF5] dark:bg-[#10B981]/15 text-[#047857] dark:text-[#34D399] font-semibold">
                    <QrCode className="w-3 h-3" />
                    QR Onboarding
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151]">
                <div>
                  <p className="text-[#6B7280] dark:text-[#9CA3AF]">Applicant</p>
                  <p className="font-bold text-[#111827] dark:text-[#F9FAFB]">{detailRequest.tenantName}</p>
                </div>
                <div>
                  <p className="text-[#6B7280] dark:text-[#9CA3AF]">Phone</p>
                  <p className="font-mono font-bold text-[#111827] dark:text-[#F9FAFB]">{detailRequest.tenantPhone}</p>
                </div>
                <div>
                  <p className="text-[#6B7280] dark:text-[#9CA3AF]">Email</p>
                  <p className="font-semibold text-[#111827] dark:text-[#F9FAFB] break-all">
                    {detailRequest.tenantEmail || 'On file in tenant profile'}
                  </p>
                </div>
                <div>
                  <p className="text-[#6B7280] dark:text-[#9CA3AF]">Property</p>
                  <p className="font-semibold text-[#111827] dark:text-[#F9FAFB]">{prop?.name || detailRequest.propertyId}</p>
                </div>
                <div>
                  <p className="text-[#6B7280] dark:text-[#9CA3AF]">Preferred Room</p>
                  <p className="font-semibold text-[#111827] dark:text-[#F9FAFB]">{detailRequest.preferredRoomType}</p>
                </div>
                <div>
                  <p className="text-[#6B7280] dark:text-[#9CA3AF]">Move-in Date</p>
                  <p className="font-semibold text-[#111827] dark:text-[#F9FAFB]">{detailRequest.moveInDate}</p>
                </div>
              </div>

              {rm && bd && (
                <div className="p-3 rounded-xl bg-[#ECFDF5]/60 dark:bg-[#10B981]/10 border border-[#047857]/20">
                  <p className="font-bold text-[#047857] dark:text-[#34D399]">
                    Assigned: Room {rm.roomNumber} · Bed {bd.bedCode}
                  </p>
                  {detailRequest.acceptedAgreementVersion && (
                    <p className="text-[11px] text-[#4B5563] dark:text-[#D1D5DB] mt-0.5">
                      Agreement {detailRequest.acceptedAgreementVersion} accepted on{' '}
                      {detailRequest.acceptedAt ? new Date(detailRequest.acceptedAt).toLocaleString('en-IN') : '—'}
                    </p>
                  )}
                </div>
              )}

              {detailRequest.notes && (
                <div>
                  <p className="font-semibold text-[#111827] dark:text-[#F9FAFB] mb-1">Tenant Notes</p>
                  <p className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151] whitespace-pre-line">
                    {detailRequest.notes}
                  </p>
                </div>
              )}

              {detailRequest.ownerNotes && (
                <div>
                  <p className="font-semibold text-[#D97706] mb-1">Owner Notes / Info Request</p>
                  <p className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900">
                    {detailRequest.ownerNotes}
                  </p>
                </div>
              )}
            </div>
          );
        })()}
      </BottomSheet>

      {/* Request Info Modal */}
      <BottomSheet
        open={Boolean(infoRequestTarget)}
        onClose={() => setInfoRequestTarget(null)}
        title="Request Additional Info from Tenant"
        maxWidthClass="sm:max-w-md"
      >
        <form onSubmit={handleRequestInfoSubmit} className="space-y-4">
          <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
            Specify what clarification or document detail you need from{' '}
            <strong className="text-[#111827] dark:text-[#F9FAFB]">{infoRequestTarget?.tenantName}</strong> before assigning a bed.
          </p>
          <textarea
            rows={3}
            value={infoRequestNote}
            onChange={(e) => setInfoRequestNote(e.target.value)}
            placeholder="e.g. Please confirm expected check-in time and share workplace/college name."
            required
            className="w-full p-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#1F2937] text-sm"
          />
          <button
            type="submit"
            disabled={submitting}
            className="w-full min-h-[42px] rounded-xl bg-[#047857] hover:bg-[#065F46] text-white text-sm font-semibold"
          >
            {submitting ? 'Sending...' : 'Send Info Request'}
          </button>
        </form>
      </BottomSheet>
    </div>
  );
}
