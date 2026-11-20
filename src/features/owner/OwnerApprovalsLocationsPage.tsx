import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, ExternalLink } from 'lucide-react';
import { apiFetch } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { CardSkeleton, StatusIndicator } from '../../components/ui/CommonUI';
import {
  LocationVerificationStatus,
  Property,
  PropertyApprovalStatus,
} from '../../../packages/shared/types';

export function OwnerApprovalsLocationsPage({ mode }: { mode: 'approvals' | 'locations' }) {
  const { showToast } = useToast();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [notesMap, setNotesMap] = useState<Record<string, string>>({});

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ properties: Property[] }>('/api/v1/properties/owner/mine');
      setProperties(res.properties);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleResubmit = async (propId: string) => {
    try {
      await apiFetch(`/api/v1/properties/owner/${propId}/resubmit`, {
        method: 'POST',
        body: JSON.stringify({
          notes:
            (notesMap[propId] || '').trim() ||
            (mode === 'approvals'
              ? 'Owner updated compliance details and resubmitted for approval.'
              : 'Owner updated street coordinates and requested location verification.'),
        }),
      });
      showToast('Submitted for Super Admin Review');
      await loadData();
    } catch (err: any) {
      showToast('Submission failed', err.message, 'error');
    }
  };

  if (loading) return <CardSkeleton rows={3} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-[#111827] dark:text-[#F9FAFB]">
          {mode === 'approvals' ? 'PG Property Approvals Tracker' : 'Location Verification & Re-verification'}
        </h1>
        <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF]">
          {mode === 'approvals'
            ? 'Independent Super Admin compliance approval required before any PG becomes publicly searchable.'
            : 'Coordinate and street-address verification handled by Super Admin. Editing verified address/GPS triggers automatic re-verification.'}
        </p>
      </div>

      <div className="space-y-4">
        {properties.map((pg) => {
          const canResubmit =
            mode === 'approvals'
              ? pg.approvalStatus === PropertyApprovalStatus.DRAFT ||
                pg.approvalStatus === PropertyApprovalStatus.CORRECTIONS_REQUIRED
              : pg.locationStatus === LocationVerificationStatus.DRAFT ||
                pg.locationStatus === LocationVerificationStatus.CORRECTIONS_REQUIRED ||
                pg.locationStatus === LocationVerificationStatus.REVERIFICATION_REQUIRED;

          const history = mode === 'approvals' ? pg.approvalHistory : pg.locationHistory;

          return (
            <div
              key={pg.id}
              className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-[#111827] dark:text-[#F9FAFB]">{pg.name}</h2>
                  <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                    {pg.address}, {pg.locality}, {pg.city} - {pg.postalCode}
                  </p>
                </div>

                {mode === 'approvals' ? (
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
                ) : (
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
                )}
              </div>

              {mode === 'locations' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151]">
                  <div>
                    <p className="text-[#6B7280] dark:text-[#9CA3AF]">Owner Submitted Coordinates</p>
                    <p className="font-mono font-bold text-[#111827] dark:text-[#F9FAFB]">
                      {pg.ownerLat}, {pg.ownerLng}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#6B7280] dark:text-[#9CA3AF]">Super Admin Verified Coordinates</p>
                    <p className="font-mono font-bold text-[#047857] dark:text-[#34D399]">
                      {pg.verifiedLat && pg.verifiedLng ? `${pg.verifiedLat}, ${pg.verifiedLng}` : 'Pending Verification'}
                    </p>
                  </div>
                </div>
              )}

              {(pg.approvalReason || pg.locationNotes) && (
                <p className="text-xs text-[#4B5563] dark:text-[#D1D5DB]">
                  <strong>Latest Reviewer Note:</strong> {mode === 'approvals' ? pg.approvalReason : pg.locationNotes}
                </p>
              )}

              {history.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-bold text-[#111827] dark:text-[#F9FAFB]">Timeline</p>
                  {history.map((h: any) => (
                    <div
                      key={h.id}
                      className="p-2.5 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151] text-xs"
                    >
                      <span className="font-semibold text-[#111827] dark:text-[#F9FAFB]">
                        {h.previousStatus} → {h.newStatus}
                      </span>{' '}
                      · <span className="text-[#6B7280] dark:text-[#9CA3AF]">{h.reason || h.notes}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-[#E5E7EB] dark:border-[#374151]">
                <Link
                  to={`/owner/properties/${pg.id}`}
                  className="min-h-[40px] px-3.5 rounded-xl border border-[#E5E7EB] dark:border-[#374151] text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] inline-flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Edit Property / Address
                </Link>

                {canResubmit && (
                  <>
                    <input
                      type="text"
                      placeholder="Optional note for Super Admin..."
                      value={notesMap[pg.id] || ''}
                      onChange={(e) => setNotesMap({ ...notesMap, [pg.id]: e.target.value })}
                      className="flex-1 min-w-[200px] min-h-[40px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#1F2937] text-xs text-[#111827] dark:text-[#F9FAFB]"
                    />
                    <button
                      type="button"
                      onClick={() => handleResubmit(pg.id)}
                      className="min-h-[40px] px-4 rounded-xl bg-[#047857] text-white text-xs font-semibold inline-flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Submit / Resubmit for Review
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
