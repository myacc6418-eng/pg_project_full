import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Building2,
  Utensils,
  Bell,
  Package,
  CalendarDays,
  Search,
  CheckCircle2,
  Wrench,
  ArrowRight,
  QrCode,
  FileText,
  MessageSquare,
  Receipt,
  FileCheck2,
  Store,
  XCircle,
} from 'lucide-react';
import { apiFetch } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { AdSlot } from '../../components/ui/AdSlot';
import { BottomSheet, CardSkeleton, EmptyState, formatInr, StatusIndicator } from '../../components/ui/CommonUI';
import {
  Bed,
  FoodMenuDay,
  JoiningRequest,
  JoiningRequestStatus,
  LocalBusinessListing,
  MaintenanceRequest,
  Notice,
  OutstandingDue,
  ParcelNotice,
  Property,
  RentCharge,
  Room,
  StartupEvent,
  TenantStay,
} from '../../../packages/shared/types';

interface EnrichedJoiningRequest extends JoiningRequest {
  propertyName?: string;
}

interface TenantWorkspaceResponse {
  activeStay: TenantStay | null;
  property: Property | null;
  room: Room | null;
  bed: Bed | null;
  joiningRequests: EnrichedJoiningRequest[];
  rentCharges: RentCharge[];
  outstandingDues: OutstandingDue[];
  notices: Notice[];
  readNoticeIds: string[];
  foodMenu: FoodMenuDay[];
  maintenanceRequests: MaintenanceRequest[];
  parcels: ParcelNotice[];
  nearbyBusinesses: LocalBusinessListing[];
}

export function TenantHomePage() {
  const { showToast, confirmAction } = useToast();
  const navigate = useNavigate();
  const [workspace, setWorkspace] = useState<TenantWorkspaceResponse | null>(null);
  const [recommendedPgs, setRecommendedPgs] = useState<Property[]>([]);
  const [events, setEvents] = useState<StartupEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [clarificationMap, setClarificationMap] = useState<Record<string, string>>({});
  const [termsTarget, setTermsTarget] = useState<EnrichedJoiningRequest | null>(null);
  const [termsPgDetail, setTermsPgDetail] = useState<Property | null>(null);
  const [termsChecked, setTermsChecked] = useState(false);
  const [submittingTerms, setSubmittingTerms] = useState(false);

  const loadWorkspace = async () => {
    setLoading(true);
    try {
      const [ws, pub, ev] = await Promise.all([
        apiFetch<TenantWorkspaceResponse>('/api/v1/operations/tenant/workspace'),
        apiFetch<{ properties: Property[] }>('/api/v1/properties/public'),
        apiFetch<{ events: StartupEvent[] }>('/api/v1/events/published'),
      ]);
      setWorkspace(ws);
      setRecommendedPgs(pub.properties.slice(0, 3));
      setEvents(ev.events.slice(0, 2));
    } catch {
      showToast('Failed to load tenant home', undefined, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkspace();
  }, []);

  const openTermsModal = async (jr: EnrichedJoiningRequest) => {
    setTermsTarget(jr);
    setTermsChecked(false);
    const localPg = recommendedPgs.find((p) => p.id === jr.propertyId) || null;
    setTermsPgDetail(localPg);
    try {
      const res = await apiFetch<{ property: Property }>(`/api/v1/properties/public/${jr.propertyId}`);
      if (res.property) setTermsPgDetail(res.property);
    } catch {
      // Fallback to localPg summary if available
    }
  };

  const handleAcceptTerms = async () => {
    if (!termsTarget) return;
    if (!termsChecked) {
      showToast('Accept House Rules', 'Please confirm you agree to the PG rules & terms.', 'error');
      return;
    }
    setSubmittingTerms(true);
    try {
      await apiFetch(`/api/v1/operations/joining-requests/${termsTarget.id}/accept-terms`, {
        method: 'POST',
        body: JSON.stringify({ acceptedTerms: true, agreementVersion: 'v2.0' }),
      });
      setTermsTarget(null);
      showToast('Stay Activated', 'Welcome to your PG! My PG Today is now unlocked.');
      await loadWorkspace();
    } catch (err: any) {
      showToast('Could not activate stay', err.message, 'error');
    } finally {
      setSubmittingTerms(false);
    }
  };

  const handleCancelRequest = async (jr: EnrichedJoiningRequest) => {
    const ok = await confirmAction({
      title: 'Cancel Joining Request?',
      description: `Cancel your request for ${jr.propertyName || jr.propertyId}? If a bed was reserved for you, it will be released immediately.`,
      confirmLabel: 'Cancel Request',
    });
    if (!ok) return;
    try {
      await apiFetch(`/api/v1/operations/joining-requests/${jr.id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'Cancelled by resident from Tenant Home' }),
      });
      showToast('Joining request cancelled', jr.propertyName || jr.propertyId, 'info');
      await loadWorkspace();
    } catch (err: any) {
      showToast('Could not cancel request', err.message, 'error');
    }
  };

  const handleSubmitClarification = async (jrId: string) => {
    const notes = (clarificationMap[jrId] || '').trim();
    if (notes.length < 3) {
      showToast('Enter clarification', 'Please provide at least a short reply.', 'error');
      return;
    }
    try {
      await apiFetch(`/api/v1/operations/joining-requests/${jrId}/respond`, {
        method: 'POST',
        body: JSON.stringify({ notes }),
      });
      setClarificationMap({ ...clarificationMap, [jrId]: '' });
      showToast('Reply Sent', 'Your joining request has been returned to the owner for review.');
      await loadWorkspace();
    } catch (err: any) {
      showToast('Failed to send reply', err.message, 'error');
    }
  };

  const handleMarkParcelPickedUp = async (parcelId: string) => {
    try {
      await apiFetch(`/api/v1/operations/tenant/parcels/${parcelId}/pickup`, { method: 'POST' });
      showToast('Parcel marked as picked up');
      await loadWorkspace();
    } catch {
      showToast('Update failed', undefined, 'error');
    }
  };

  if (loading || !workspace) return <CardSkeleton rows={4} />;

  if (!workspace.activeStay || !workspace.property) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-6">
          <p className="text-xs font-semibold text-[#047857] dark:text-[#34D399]">PG Seeker Workspace</p>
          <h1 className="mt-1 font-display text-2xl font-bold text-[#111827] dark:text-[#F9FAFB]">
            Find &amp; Join Your Next PG
          </h1>
          <p className="mt-1 text-sm text-[#6B7280] dark:text-[#9CA3AF]">
            Browse approved, location-verified PGs or track your onboarding progress below.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              to="/tenant/explore"
              className="min-h-[44px] px-5 rounded-xl bg-[#047857] hover:bg-[#065F46] dark:bg-[#10B981] dark:hover:bg-[#059669] text-white dark:text-[#0B1220] text-sm font-semibold inline-flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              Search Verified PGs
            </Link>
            <Link
              to="/tenant/connect"
              className="min-h-[44px] px-4 rounded-xl border border-[#E5E7EB] dark:border-[#374151] text-sm font-semibold text-[#111827] dark:text-[#F9FAFB] hover:bg-[#F8FAFC] dark:hover:bg-[#1F2937] inline-flex items-center gap-2"
            >
              <CalendarDays className="w-4 h-4 text-[#047857] dark:text-[#34D399]" />
              Startup Events
            </Link>
          </div>
        </div>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">Your Joining Requests</h2>
          {workspace.joiningRequests.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="No active PG joining requests"
              description="Explore verified PGs and submit a joining request to start digital onboarding."
              actionLabel="Explore PGs"
              onAction={() => navigate('/tenant/explore')}
            />
          ) : (
            workspace.joiningRequests.map((jr) => {
              const cancellable =
                jr.status === JoiningRequestStatus.PENDING ||
                jr.status === JoiningRequestStatus.INFO_REQUESTED ||
                jr.status === JoiningRequestStatus.APPROVED_AWAITING_TERMS;
              return (
                <div
                  key={jr.id}
                  className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusIndicator
                          status={
                            jr.status === JoiningRequestStatus.APPROVED_AWAITING_TERMS
                              ? 'success'
                              : jr.status === JoiningRequestStatus.REJECTED || jr.status === JoiningRequestStatus.CANCELLED
                                ? 'error'
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
                        {jr.propertyName || jr.propertyId} · {jr.preferredRoomType}
                      </p>
                      <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                        Move-in: {jr.moveInDate}
                        {jr.assignedRoomNumber && jr.assignedBedCode
                          ? ` · Assigned Room ${jr.assignedRoomNumber} · Bed ${jr.assignedBedCode}`
                          : ''}
                      </p>
                      {jr.cancellationReason && (
                        <p className="mt-1 text-xs text-[#DC2626] dark:text-[#F87171]">Reason: {jr.cancellationReason}</p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {jr.status === JoiningRequestStatus.APPROVED_AWAITING_TERMS && (
                        <button
                          type="button"
                          onClick={() => openTermsModal(jr)}
                          className="min-h-[44px] px-4 rounded-xl bg-[#047857] hover:bg-[#065F46] dark:bg-[#10B981] dark:hover:bg-[#059669] text-white dark:text-[#0B1220] text-sm font-semibold inline-flex items-center gap-2"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Review Terms &amp; Activate Stay
                        </button>
                      )}
                      {cancellable && (
                        <button
                          type="button"
                          onClick={() => handleCancelRequest(jr)}
                          className="min-h-[44px] px-3.5 rounded-xl border border-red-200 dark:border-red-900/50 text-xs font-semibold text-[#DC2626] dark:text-[#F87171] hover:bg-red-50 dark:hover:bg-red-950/30 inline-flex items-center gap-1.5"
                        >
                          <XCircle className="w-4 h-4" />
                          Cancel Request
                        </button>
                      )}
                    </div>
                  </div>

                  {jr.status === JoiningRequestStatus.INFO_REQUESTED && (
                    <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 space-y-2">
                      <p className="text-xs font-bold text-[#D97706] dark:text-amber-300 flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5" />
                        Owner Requested Clarification
                      </p>
                      {jr.ownerNotes && (
                        <p className="text-xs text-[#4B5563] dark:text-[#D1D5DB]">{jr.ownerNotes}</p>
                      )}
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          value={clarificationMap[jr.id] || ''}
                          onChange={(e) => setClarificationMap({ ...clarificationMap, [jr.id]: e.target.value })}
                          placeholder="Type your response to the PG owner..."
                          className="flex-1 min-h-[40px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] text-xs text-[#111827] dark:text-[#F9FAFB]"
                        />
                        <button
                          type="button"
                          onClick={() => handleSubmitClarification(jr.id)}
                          className="min-h-[40px] px-4 rounded-xl bg-[#047857] dark:bg-[#10B981] text-white dark:text-[#0B1220] text-xs font-semibold"
                        >
                          Send Reply
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </section>

        <BottomSheet
          open={Boolean(termsTarget)}
          onClose={() => setTermsTarget(null)}
          title="Review House Rules & Agreement (v2.0)"
          maxWidthClass="sm:max-w-lg"
        >
          {termsTarget && (
            <div className="space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151] space-y-1">
                <p className="font-bold text-sm text-[#111827] dark:text-[#F9FAFB] flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-[#047857] dark:text-[#34D399]" />
                  {termsPgDetail?.name || termsTarget.propertyName || termsTarget.propertyId}
                </p>
                <p className="text-[#6B7280] dark:text-[#9CA3AF]">
                  Assigned: {termsTarget.assignedRoomNumber ? `Room ${termsTarget.assignedRoomNumber} · ` : ''}
                  {termsTarget.assignedBedCode ? `Bed ${termsTarget.assignedBedCode}` : termsTarget.assignedBedId || 'Assigned'} · Preferred Sharing: {termsTarget.preferredRoomType}
                </p>
                <p className="text-[#6B7280] dark:text-[#9CA3AF]">
                  Standard Notice Period: 30 Days · Starting Rent {termsPgDetail ? formatInr(termsPgDetail.startingRentInr) : 'Per room'}/mo
                </p>
              </div>

              {termsPgDetail?.rules && termsPgDetail.rules.length > 0 && (
                <div>
                  <p className="font-bold text-[#111827] dark:text-[#F9FAFB] mb-1.5">Property House Rules</p>
                  <ul className="space-y-1 text-[#4B5563] dark:text-[#D1D5DB]">
                    {termsPgDetail.rules.map((r, i) => (
                      <li key={i}>• {r}</li>
                    ))}
                  </ul>
                </div>
              )}

              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] cursor-pointer">
                <input
                  type="checkbox"
                  checked={termsChecked}
                  onChange={(e) => setTermsChecked(e.target.checked)}
                  className="mt-0.5 rounded border-[#E5E7EB]"
                />
                <span className="text-[#111827] dark:text-[#F9FAFB]">
                  I have read and agree to the PG house rules, security deposit policy, 30-day notice period, and Agreement Version <strong>v2.0</strong>.
                </span>
              </label>

              <button
                type="button"
                disabled={submittingTerms}
                onClick={handleAcceptTerms}
                className="w-full min-h-[44px] rounded-xl bg-[#047857] hover:bg-[#065F46] dark:bg-[#10B981] dark:hover:bg-[#059669] text-white dark:text-[#0B1220] text-sm font-semibold"
              >
                {submittingTerms ? 'Activating Stay...' : 'Accept Agreement v2.0 & Activate Stay'}
              </button>
            </div>
          )}
        </BottomSheet>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">Recommended Verified PGs</h2>
            <Link to="/tenant/explore" className="text-xs font-semibold text-[#047857] dark:text-[#34D399] hover:underline">
              See all
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recommendedPgs.map((pg) => (
              <Link
                key={pg.id}
                to={`/tenant/pg/${pg.id}`}
                className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-4 hover:border-[#047857] dark:hover:border-[#34D399] transition-colors"
              >
                <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                  {pg.locality}, {pg.city}
                </p>
                <h3 className="mt-1 text-base font-bold text-[#111827] dark:text-[#F9FAFB]">{pg.name}</h3>
                <p className="mt-2 font-mono text-sm font-bold text-[#047857] dark:text-[#34D399] tabular-nums">
                  From {formatInr(pg.startingRentInr)}/mo
                </p>
              </Link>
            ))}
          </div>
        </section>

        <AdSlot variant="banner" slotId="tenant_home_discovery" />
      </div>
    );
  }

  const pendingRent = workspace.rentCharges
    .filter((r) => r.status !== 'PAID' && r.status !== 'WAIVED')
    .reduce((acc, r) => acc + Math.max(0, r.amountInr + (r.lateFeeInr || 0) - r.paidAmountInr), 0);
  const openExtraDues = (workspace.outstandingDues || [])
    .filter((d) => d.status !== 'SETTLED')
    .reduce((acc, d) => acc + Math.max(0, d.totalAmountInr - d.paidAmountInr), 0);

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
  const todayCode = dayNames[new Date().getDay()];
  const todayMenu = workspace.foodMenu.find((f) => f.day === todayCode) || workspace.foodMenu[0];
  const pendingParcels = workspace.parcels.filter((p) => !p.pickedUpAt);
  const unreadNoticesCount = workspace.notices.filter((n) => !workspace.readNoticeIds.includes(n.id)).length;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <StatusIndicator
            status={workspace.activeStay.status === 'CHECKOUT_REQUESTED' ? 'warning' : 'success'}
            label={
              workspace.activeStay.status === 'CHECKOUT_REQUESTED' ? 'Checkout Requested' : 'Active PG Stay'
            }
          />
          <h1 className="mt-1.5 font-display text-2xl font-bold text-[#111827] dark:text-[#F9FAFB]">
            My PG Today · {workspace.property.name}
          </h1>
          <p className="mt-1 text-sm text-[#6B7280] dark:text-[#9CA3AF]">
            Room {workspace.room?.roomNumber} · Bed {workspace.bed?.bedCode} · {workspace.property.locality},{' '}
            {workspace.property.city}
          </p>
        </div>

        <Link
          to="/tenant/my-pg?tab=stay"
          className="min-h-[44px] px-4 rounded-xl bg-[#047857] hover:bg-[#065F46] dark:bg-[#10B981] dark:hover:bg-[#059669] text-white dark:text-[#0B1220] text-sm font-semibold inline-flex items-center justify-center gap-2 whitespace-nowrap"
        >
          Manage Stay &amp; Rent
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* 3 Compact KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5">
          <p className="text-xs font-medium text-[#6B7280] dark:text-[#9CA3AF]">Rent &amp; Dues Balance</p>
          <p className="mt-1 font-mono text-2xl font-bold text-[#111827] dark:text-[#F9FAFB] tabular-nums">
            {formatInr(pendingRent + openExtraDues)}
          </p>
          <p className="mt-1 text-xs text-[#6B7280] dark:text-[#9CA3AF] tabular-nums">
            Monthly rent {formatInr(workspace.activeStay.monthlyRentInr)} · Deposit{' '}
            {formatInr(workspace.activeStay.securityDepositInr)}
          </p>
        </div>

        <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5">
          <p className="text-xs font-medium text-[#6B7280] dark:text-[#9CA3AF]">Parcels at Desk</p>
          <p className="mt-1 font-mono text-2xl font-bold text-[#111827] dark:text-[#F9FAFB] tabular-nums">
            {pendingParcels.length}
          </p>
          <p className="mt-1 text-xs text-[#6B7280] dark:text-[#9CA3AF]">
            {pendingParcels.length > 0
              ? `${pendingParcels[0].carrier} (${pendingParcels[0].trackingSuffix})`
              : 'All deliveries picked up'}
          </p>
        </div>

        <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5">
          <p className="text-xs font-medium text-[#6B7280] dark:text-[#9CA3AF]">Notices &amp; Maintenance</p>
          <p className="mt-1 font-mono text-2xl font-bold text-[#111827] dark:text-[#F9FAFB] tabular-nums">
            {unreadNoticesCount} unread
          </p>
          <p className="mt-1 text-xs text-[#6B7280] dark:text-[#9CA3AF] tabular-nums">
            {workspace.maintenanceRequests.length} active maintenance items
          </p>
        </div>
      </div>

      {/* 6 Quick Action Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Rent & Dues', to: '/tenant/my-pg?tab=rent', icon: Receipt },
          { label: 'Food Menu', to: '/tenant/my-pg?tab=food', icon: Utensils },
          { label: `Notices (${unreadNoticesCount})`, to: '/tenant/my-pg?tab=notices', icon: Bell },
          { label: 'Raise Complaint', to: '/tenant/my-pg?tab=complaints', icon: Wrench },
          { label: 'Parcels & Laundry', to: '/tenant/my-pg?tab=services', icon: Package },
          { label: 'Documents', to: '/tenant/my-pg?tab=documents', icon: FileCheck2 },
        ].map((tile) => {
          const Icon = tile.icon;
          return (
            <Link
              key={tile.label}
              to={tile.to}
              className="min-h-[52px] p-3.5 rounded-2xl bg-white dark:bg-[#111827] border border-[#E5E7EB] dark:border-[#374151] hover:border-[#047857] dark:hover:border-[#34D399] flex items-center gap-2.5 text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] transition-colors"
            >
              <Icon className="w-4 h-4 text-[#047857] dark:text-[#34D399] shrink-0" />
              <span className="truncate">{tile.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB] dark:border-[#374151]">
            <div className="flex items-center gap-2">
              <Utensils className="w-4 h-4 text-[#047857] dark:text-[#34D399]" />
              <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">
                Today&apos;s Mess Menu ({todayMenu?.day || todayCode})
              </h2>
            </div>
            <Link to="/tenant/my-pg?tab=food" className="text-xs font-semibold text-[#047857] dark:text-[#34D399] hover:underline">
              Weekly menu
            </Link>
          </div>
          {todayMenu ? (
            <div className="mt-4 space-y-3 text-sm">
              <div>
                <p className="text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF]">Breakfast</p>
                <p className="text-[#111827] dark:text-[#F9FAFB]">{todayMenu.breakfast}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF]">Lunch</p>
                <p className="text-[#111827] dark:text-[#F9FAFB]">{todayMenu.lunch}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF]">Dinner</p>
                <p className="text-[#111827] dark:text-[#F9FAFB]">{todayMenu.dinner}</p>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-[#6B7280] dark:text-[#9CA3AF]">Menu not published yet.</p>
          )}
        </div>

        <div className="lg:col-span-6 rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB] dark:border-[#374151]">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#047857] dark:text-[#34D399]" />
              <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">PG Notices &amp; Parcel Alerts</h2>
            </div>
            <Link to="/tenant/my-pg?tab=notices" className="text-xs font-semibold text-[#047857] dark:text-[#34D399] hover:underline">
              All notices
            </Link>
          </div>

          <div className="mt-4 space-y-3">
            {pendingParcels.map((parcel) => (
              <div
                key={parcel.id}
                className="p-3.5 rounded-xl bg-[#ECFDF5] dark:bg-[#10B981]/10 border border-[#047857]/20 dark:border-[#34D399]/30 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5">
                  <Package className="w-4 h-4 text-[#047857] dark:text-[#34D399] shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-[#065F46] dark:text-[#34D399]">
                      {parcel.carrier} · #{parcel.trackingSuffix}
                    </p>
                    <p className="text-xs text-[#047857] dark:text-[#10B981]">Ready at PG reception desk</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleMarkParcelPickedUp(parcel.id)}
                  className="min-h-[36px] px-3 rounded-lg bg-[#047857] dark:bg-[#10B981] text-white dark:text-[#0B1220] text-xs font-semibold whitespace-nowrap"
                >
                  Mark Picked Up
                </button>
              </div>
            ))}

            {workspace.notices.slice(0, 3).map((n) => {
              const isRead = workspace.readNoticeIds.includes(n.id);
              return (
                <div key={n.id} className="pb-3 border-b border-[#E5E7EB] dark:border-[#374151] last:border-b-0">
                  <div className="flex items-center justify-between text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                    <span>
                      {n.category} · {new Date(n.createdAt).toLocaleDateString('en-IN')}
                    </span>
                    <span className={isRead ? 'text-[#6B7280]' : 'font-semibold text-[#047857] dark:text-[#34D399]'}>
                      {isRead ? 'Read' : 'Unread'}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-[#111827] dark:text-[#F9FAFB]">{n.title}</h3>
                  <p className="mt-0.5 text-xs text-[#4B5563] dark:text-[#D1D5DB]">{n.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Nearby Local Services Strip */}
      {workspace.nearbyBusinesses.length > 0 && (
        <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Store className="w-4 h-4 text-[#047857] dark:text-[#34D399]" />
              <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">
                Nearby Local Services ({workspace.property.city})
              </h2>
            </div>
            <Link to="/tenant/connect" className="text-xs font-semibold text-[#047857] dark:text-[#34D399] hover:underline">
              Explore Local
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {workspace.nearbyBusinesses.slice(0, 3).map((biz) => (
              <div
                key={biz.id}
                className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151]"
              >
                <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">
                  {biz.category} · {biz.locality}
                </p>
                <p className="mt-1 text-sm font-bold text-[#111827] dark:text-[#F9FAFB]">{biz.name}</p>
                <p className="mt-0.5 text-xs font-semibold text-[#047857] dark:text-[#34D399]">{biz.offerText}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Startup Events */}
      <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-[#047857] dark:text-[#34D399]" />
            <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">Upcoming Startup Events</h2>
          </div>
          <Link to="/tenant/connect" className="text-xs font-semibold text-[#047857] dark:text-[#34D399] hover:underline">
            Explore Connect
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {events.map((ev) => (
            <Link
              key={ev.id}
              to="/tenant/connect"
              className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151] hover:border-[#047857] dark:hover:border-[#34D399] transition-colors"
            >
              <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                {ev.category} · {ev.city}
              </p>
              <p className="mt-1 text-sm font-bold text-[#111827] dark:text-[#F9FAFB]">{ev.title}</p>
              <p className="mt-0.5 text-xs text-[#6B7280] dark:text-[#9CA3AF]">{ev.venue}</p>
            </Link>
          ))}
        </div>
      </div>

      <AdSlot variant="banner" slotId="tenant_home_today" />
    </div>
  );
}
