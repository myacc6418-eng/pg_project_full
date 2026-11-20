import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PlusCircle,
  BedDouble,
  History,
  Sparkles,
  CheckCircle2,
  RefreshCw,
  Edit3,
  Copy,
  Archive,
} from 'lucide-react';
import { apiFetch } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { BottomSheet, CardSkeleton, EmptyState, formatInr, StatusIndicator } from '../../components/ui/CommonUI';
import { SafeImage } from '../../components/ui/SafeImage';
import {
  Bed,
  LocationVerificationStatus,
  Property,
  PropertyApprovalStatus,
  Room,
} from '../../../packages/shared/types';
import { PROMOTION_PACKAGES } from '../../../packages/shared/constants';

interface OwnerProperty extends Property {
  rooms: Room[];
  beds: Bed[];
  availableBeds: number;
  occupiedBeds: number;
  totalBeds: number;
  isPubliclyVisible: boolean;
}

export function OwnerPropertiesPage() {
  const { showToast, confirmAction } = useToast();
  const [properties, setProperties] = useState<OwnerProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);

  const [historyProp, setHistoryProp] = useState<OwnerProperty | null>(null);
  const [promoProp, setPromoProp] = useState<OwnerProperty | null>(null);

  const loadProperties = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ properties: OwnerProperty[] }>('/api/v1/properties/owner/mine');
      setProperties(res.properties);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProperties();
  }, []);

  const handleActivateLifetime = async (prop: OwnerProperty) => {
    const ok = await confirmAction({
      title: `Activate Lifetime Listing for ${prop.name}?`,
      description: 'One-time fee of ₹199 keeps this approved & verified PG publicly visible permanently.',
      confirmLabel: 'Pay ₹199 & Activate',
    });
    if (!ok) return;
    try {
      await apiFetch(`/api/v1/monetization/owner/lifetime-listing/${prop.id}`, { method: 'POST' });
      showToast('Lifetime Listing Activated', `${prop.name} is now permanently covered.`);
      await loadProperties();
    } catch (err: any) {
      showToast('Activation failed', err.message, 'error');
    }
  };

  const handleResubmit = async (propId: string) => {
    try {
      await apiFetch(`/api/v1/properties/owner/${propId}/resubmit`, {
        method: 'POST',
        body: JSON.stringify({ notes: 'Owner verified and resubmitted property details.' }),
      });
      showToast('Resubmitted to Super Admin');
      await loadProperties();
    } catch (err: any) {
      showToast('Resubmit failed', err.message, 'error');
    }
  };

  const handleDuplicate = async (prop: OwnerProperty) => {
    try {
      await apiFetch(`/api/v1/properties/owner/${prop.id}/duplicate`, { method: 'POST' });
      showToast('Property Duplicated as Draft', `Created a draft copy of ${prop.name}.`);
      await loadProperties();
    } catch (err: any) {
      showToast('Duplication failed', err.message, 'error');
    }
  };

  const handleToggleArchive = async (prop: OwnerProperty) => {
    const ok = await confirmAction({
      title: prop.isArchived ? `Unarchive ${prop.name}?` : `Archive ${prop.name}?`,
      description: prop.isArchived
        ? 'Restores this property to your active portfolio.'
        : 'Hides this property from marketplace discovery. Blocked if active tenant stays exist.',
      confirmLabel: prop.isArchived ? 'Unarchive' : 'Archive Property',
    });
    if (!ok) return;
    try {
      await apiFetch(`/api/v1/properties/owner/${prop.id}/archive`, { method: 'POST' });
      showToast(prop.isArchived ? 'Property Unarchived' : 'Property Archived');
      await loadProperties();
    } catch (err: any) {
      showToast('Action blocked', err.message, 'error');
    }
  };

  if (loading) return <CardSkeleton rows={3} />;

  const visibleList = properties.filter((p) => (showArchived ? p.isArchived : !p.isArchived));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#111827] dark:text-[#F9FAFB]">My PG Properties</h1>
          <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF]">
            Manage PG details, room/bed capacity, independent approval status, and listing entitlements.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowArchived((v) => !v)}
            className="min-h-[44px] px-3.5 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] text-xs font-semibold text-[#111827] dark:text-[#F9FAFB]"
          >
            {showArchived ? 'Show Active PGs' : `Archived (${properties.filter((p) => p.isArchived).length})`}
          </button>
          <Link
            to="/owner/add-pg"
            className="min-h-[44px] px-4 rounded-xl bg-[#047857] hover:bg-[#065F46] text-white text-sm font-semibold inline-flex items-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4" />
            Add New PG
          </Link>
        </div>
      </div>

      {visibleList.length === 0 ? (
        <EmptyState
          icon={BedDouble}
          title={showArchived ? 'No archived properties' : 'No PG properties added yet'}
          description={
            showArchived
              ? 'Archived PG properties appear here when removed from active service.'
              : 'Create your first PG property using the 10-step wizard.'
          }
          actionLabel={showArchived ? 'View Active PGs' : 'Add Your First PG'}
          onAction={() => (showArchived ? setShowArchived(false) : (window.location.href = '/owner/add-pg'))}
        />
      ) : (
        <div className="space-y-4">
          {visibleList.map((pg) => {
            const needsResubmit =
              pg.approvalStatus === PropertyApprovalStatus.DRAFT ||
              pg.approvalStatus === PropertyApprovalStatus.CORRECTIONS_REQUIRED ||
              pg.locationStatus === LocationVerificationStatus.CORRECTIONS_REQUIRED ||
              pg.locationStatus === LocationVerificationStatus.REVERIFICATION_REQUIRED;

            return (
              <div
                key={pg.id}
                className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-4"
              >
                <div className="flex flex-col lg:flex-row gap-4">
                  <SafeImage
                    src={pg.images[0] || '/src/assets/images/pg_green_nest_1795149981855.jpg'}
                    alt={pg.name}
                    className="w-full lg:w-44 h-32 rounded-xl object-cover shrink-0 border border-[#E5E7EB] dark:border-[#374151]"
                  />

                  <div className="flex-1 flex flex-col justify-between gap-3">
                    <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-3">
                      <div>
                        <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                          {pg.genderType} · Starting {formatInr(pg.startingRentInr)}/mo · Deposit{' '}
                          {formatInr(pg.securityDepositInr)}
                        </p>
                        <h2 className="mt-0.5 text-lg font-bold text-[#111827] dark:text-[#F9FAFB]">{pg.name}</h2>
                        <p className="text-xs text-[#4B5563] dark:text-[#D1D5DB]">
                          {pg.address}, {pg.locality}, {pg.city} - {pg.postalCode}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-4">
                        <div>
                          <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">Property Approval</p>
                          <StatusIndicator
                            status={
                              pg.approvalStatus === PropertyApprovalStatus.APPROVED
                                ? 'success'
                                : pg.approvalStatus === PropertyApprovalStatus.REJECTED ||
                                    pg.approvalStatus === PropertyApprovalStatus.SUSPENDED
                                  ? 'error'
                                  : 'warning'
                            }
                            label={pg.approvalStatus.replace(/_/g, ' ')}
                          />
                        </div>
                        <div>
                          <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">Location Verification</p>
                          <StatusIndicator
                            status={
                              pg.locationStatus === LocationVerificationStatus.VERIFIED
                                ? 'success'
                                : pg.locationStatus === LocationVerificationStatus.REJECTED
                                  ? 'error'
                                  : 'warning'
                            }
                            label={pg.locationStatus.replace(/_/g, ' ')}
                          />
                        </div>
                        <div>
                          <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">Listing Status</p>
                          <StatusIndicator
                            status={pg.isPubliclyVisible ? 'success' : 'neutral'}
                            label={
                              pg.isArchived
                                ? 'Archived'
                                : pg.isPubliclyVisible
                                  ? 'Live on Marketplace'
                                  : 'Not Public Yet'
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151]">
                        <span className="text-[#6B7280] dark:text-[#9CA3AF]">Rooms</span>
                        <p className="font-mono font-bold text-[#111827] dark:text-[#F9FAFB] tabular-nums">
                          {pg.rooms.length}
                        </p>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151]">
                        <span className="text-[#6B7280] dark:text-[#9CA3AF]">Total Beds</span>
                        <p className="font-mono font-bold text-[#111827] dark:text-[#F9FAFB] tabular-nums">
                          {pg.totalBeds}
                        </p>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151]">
                        <span className="text-[#6B7280] dark:text-[#9CA3AF]">Occupied</span>
                        <p className="font-mono font-bold text-[#047857] dark:text-[#34D399] tabular-nums">
                          {pg.occupiedBeds}
                        </p>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151]">
                        <span className="text-[#6B7280] dark:text-[#9CA3AF]">Vacant Beds</span>
                        <p className="font-mono font-bold text-[#111827] dark:text-[#F9FAFB] tabular-nums">
                          {pg.availableBeds}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {(pg.approvalReason || pg.locationNotes) && (
                  <div className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151] text-xs space-y-1">
                    {pg.approvalReason && (
                      <p className="text-[#111827] dark:text-[#F9FAFB]">
                        <strong>Approval Feedback:</strong> {pg.approvalReason}
                      </p>
                    )}
                    {pg.locationNotes && (
                      <p className="text-[#6B7280] dark:text-[#9CA3AF]">
                        <strong>Location Review:</strong> {pg.locationNotes}
                      </p>
                    )}
                  </div>
                )}

                <div className="pt-3 border-t border-[#E5E7EB] dark:border-[#374151] flex flex-wrap items-center gap-2">
                  <Link
                    to={`/owner/properties/${pg.id}`}
                    className="min-h-[40px] px-3.5 rounded-xl bg-[#047857] hover:bg-[#065F46] text-white text-xs font-semibold inline-flex items-center gap-1.5"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Manage &amp; Edit PG
                  </Link>

                  <Link
                    to={`/owner/rooms-beds?propertyId=${pg.id}`}
                    className="min-h-[40px] px-3.5 rounded-xl border border-[#E5E7EB] dark:border-[#374151] text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] inline-flex items-center gap-1.5"
                  >
                    <BedDouble className="w-3.5 h-3.5 text-[#047857] dark:text-[#34D399]" />
                    Floors, Rooms &amp; Beds
                  </Link>

                  <button
                    type="button"
                    onClick={() => setHistoryProp(pg)}
                    className="min-h-[40px] px-3.5 rounded-xl border border-[#E5E7EB] dark:border-[#374151] text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] inline-flex items-center gap-1.5"
                  >
                    <History className="w-3.5 h-3.5 text-[#047857] dark:text-[#34D399]" />
                    Audit History
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDuplicate(pg)}
                    className="min-h-[40px] px-3.5 rounded-xl border border-[#E5E7EB] dark:border-[#374151] text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] inline-flex items-center gap-1.5"
                  >
                    <Copy className="w-3.5 h-3.5 text-[#6B7280] dark:text-[#9CA3AF]" />
                    Duplicate Draft
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleArchive(pg)}
                    className="min-h-[40px] px-3.5 rounded-xl border border-[#E5E7EB] dark:border-[#374151] text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] inline-flex items-center gap-1.5"
                  >
                    <Archive className="w-3.5 h-3.5 text-[#6B7280] dark:text-[#9CA3AF]" />
                    {pg.isArchived ? 'Unarchive' : 'Archive'}
                  </button>

                  {needsResubmit && (
                    <button
                      type="button"
                      onClick={() => handleResubmit(pg.id)}
                      className="min-h-[40px] px-3.5 rounded-xl bg-amber-600 text-white text-xs font-semibold inline-flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Submit / Resubmit
                    </button>
                  )}

                  {!pg.hasLifetimeListing &&
                    pg.approvalStatus === PropertyApprovalStatus.APPROVED &&
                    pg.locationStatus === LocationVerificationStatus.VERIFIED && (
                      <button
                        type="button"
                        onClick={() => handleActivateLifetime(pg)}
                        className="min-h-[40px] px-3.5 rounded-xl bg-[#ECFDF5] dark:bg-[#10B981]/15 text-[#047857] dark:text-[#34D399] text-xs font-semibold inline-flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Buy ₹199 Lifetime Listing
                      </button>
                    )}

                  {pg.isPubliclyVisible && (
                    <button
                      type="button"
                      onClick={() => setPromoProp(pg)}
                      className="min-h-[40px] px-3.5 rounded-xl bg-[#ECFDF5] dark:bg-[#10B981]/15 text-[#047857] dark:text-[#34D399] text-xs font-semibold inline-flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      {pg.isPromoted ? 'Promoted' : 'Promote PG'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Approval & Location History Drawer */}
      <BottomSheet
        open={Boolean(historyProp)}
        onClose={() => setHistoryProp(null)}
        title={`Verification Audit History — ${historyProp?.name || ''}`}
      >
        {historyProp && (
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-bold text-[#111827] dark:text-[#F9FAFB] mb-2">Property Approval Decisions</h4>
              {historyProp.approvalHistory.length === 0 ? (
                <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">No review decisions recorded yet.</p>
              ) : (
                historyProp.approvalHistory.map((h) => (
                  <div
                    key={h.id}
                    className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151] text-xs mb-2"
                  >
                    <p className="font-semibold text-[#111827] dark:text-[#F9FAFB]">
                      {h.previousStatus} → {h.newStatus}
                    </p>
                    <p className="text-[#4B5563] dark:text-[#D1D5DB] mt-0.5">{h.reason}</p>
                    <p className="text-[#6B7280] dark:text-[#9CA3AF] mt-1">
                      By {h.actorName} · {new Date(h.timestamp).toLocaleString('en-IN')}
                    </p>
                  </div>
                ))
              )}
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#111827] dark:text-[#F9FAFB] mb-2">Location Verification History</h4>
              {historyProp.locationHistory.length === 0 ? (
                <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">No location decisions recorded yet.</p>
              ) : (
                historyProp.locationHistory.map((h) => (
                  <div
                    key={h.id}
                    className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151] text-xs mb-2"
                  >
                    <p className="font-semibold text-[#111827] dark:text-[#F9FAFB]">
                      {h.previousStatus} → {h.newStatus}
                    </p>
                    <p className="text-[#4B5563] dark:text-[#D1D5DB] mt-0.5">{h.notes}</p>
                    <p className="text-[#6B7280] dark:text-[#9CA3AF] mt-1">
                      By {h.actorName} · {new Date(h.timestamp).toLocaleString('en-IN')}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </BottomSheet>

      {/* Featured Promotion Drawer */}
      <BottomSheet
        open={Boolean(promoProp)}
        onClose={() => setPromoProp(null)}
        title={`Promote ${promoProp?.name || ''}`}
      >
        <div className="space-y-3">
          <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
            Promoted properties appear at the top of search results clearly labeled as Sponsored.
          </p>
          {PROMOTION_PACKAGES.map((pkg) => (
            <button
              key={pkg.id}
              type="button"
              onClick={async () => {
                if (!promoProp) return;
                try {
                  await apiFetch(`/api/v1/monetization/owner/promote/${promoProp.id}`, {
                    method: 'POST',
                    body: JSON.stringify({ packageId: pkg.id }),
                  });
                  showToast('Featured Promotion Active', `${promoProp.name} boosted for ${pkg.days} days.`);
                  setPromoProp(null);
                  await loadProperties();
                } catch (err: any) {
                  showToast('Promotion failed', err.message, 'error');
                }
              }}
              className="w-full p-4 rounded-xl border border-[#E5E7EB] dark:border-[#374151] hover:border-[#047857] dark:hover:border-[#34D399] flex items-center justify-between text-left"
            >
              <div>
                <p className="text-sm font-bold text-[#111827] dark:text-[#F9FAFB]">{pkg.label}</p>
                <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">{pkg.days} days sponsored spotlight</p>
              </div>
              <span className="font-mono text-base font-bold text-[#047857] dark:text-[#34D399] tabular-nums">
                {formatInr(pkg.priceInr)}
              </span>
            </button>
          ))}
        </div>
      </BottomSheet>
    </div>
  );
}
