import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import {
  QrCode,
  Copy,
  Download,
  Share2,
  Printer,
  ExternalLink,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  Building2,
} from 'lucide-react';
import { apiFetch } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { BottomSheet, CardSkeleton, EmptyState, StatusIndicator } from '../../components/ui/CommonUI';
import {
  JoiningRequest,
  JoiningRequestStatus,
  LocationVerificationStatus,
  Property,
  PropertyApprovalStatus,
} from '../../../packages/shared/types';

interface OverviewResponse {
  properties: (Property & { availableBeds?: number; totalBeds?: number })[];
  joiningRequests: JoiningRequest[];
}

export function OwnerQROnboardingPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<(Property & { availableBeds?: number; totalBeds?: number })[]>([]);
  const [joiningRequests, setJoiningRequests] = useState<JoiningRequest[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [posterOpen, setPosterOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<OverviewResponse>('/api/v1/operations/owner/overview?propertyId=ALL');
      setProperties(res.properties || []);
      setJoiningRequests(res.joiningRequests || []);
      if (res.properties?.length > 0 && !selectedPropertyId) {
        setSelectedPropertyId(res.properties[0].id);
      }
    } catch {
      showToast('Could not load QR onboarding workspace', undefined, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectedPg = useMemo(
    () => properties.find((p) => p.id === selectedPropertyId) || properties[0] || null,
    [properties, selectedPropertyId]
  );

  const joinUrl = selectedPg ? `${window.location.origin}/join/${selectedPg.id}` : '';

  useEffect(() => {
    if (!joinUrl) {
      setQrDataUrl('');
      return;
    }
    QRCode.toDataURL(joinUrl, {
      width: 320,
      margin: 2,
      color: {
        dark: '#065F46',
        light: '#FFFFFF',
      },
    })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(''));
  }, [joinUrl]);

  const handleCopyLink = async () => {
    if (!joinUrl) return;
    try {
      await navigator.clipboard?.writeText(joinUrl);
      showToast('QR Join Link Copied', joinUrl);
    } catch {
      showToast('Copy failed', 'Please copy the URL manually.', 'error');
    }
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl || !selectedPg) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `${selectedPg.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-qr-onboarding.png`;
    link.click();
    showToast('QR Code Downloaded', 'Saved PNG ready for reception desk or print poster.');
  };

  const handleShareQr = async () => {
    if (!joinUrl || !selectedPg) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${selectedPg.name} on PG Finder`,
          text: `Scan or open this link to request joining ${selectedPg.name} (${selectedPg.locality}, ${selectedPg.city}).`,
          url: joinUrl,
        });
        return;
      } catch {
        // Fallback to copy below
      }
    }
    await handleCopyLink();
  };

  if (loading) return <CardSkeleton rows={4} />;

  if (!selectedPg) {
    return (
      <EmptyState
        icon={Building2}
        title="Add a PG Property First"
        description="QR onboarding codes are generated uniquely for each PG property in your portfolio."
        actionLabel="Add PG Property"
        onAction={() => navigate('/owner/add-pg')}
      />
    );
  }

  const isEligible =
    !selectedPg.isArchived &&
    selectedPg.approvalStatus === PropertyApprovalStatus.APPROVED &&
    selectedPg.locationStatus === LocationVerificationStatus.VERIFIED &&
    (selectedPg.hasLifetimeListing || selectedPg.coveredBySubscription);

  const propQrRequests = joiningRequests.filter(
    (j) => j.propertyId === selectedPg.id && j.origin === 'QR'
  );
  const allQrRequests = joiningRequests.filter((j) => j.origin === 'QR');
  const qrStats = {
    total: allQrRequests.length,
    pending: allQrRequests.filter((j) => j.status === JoiningRequestStatus.PENDING || j.status === JoiningRequestStatus.INFO_REQUESTED).length,
    approved: allQrRequests.filter((j) => j.status === JoiningRequestStatus.APPROVED_AWAITING_TERMS).length,
    rejected: allQrRequests.filter((j) => j.status === JoiningRequestStatus.REJECTED).length,
    completed: allQrRequests.filter((j) => j.status === JoiningRequestStatus.ACTIVE).length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#111827] dark:text-[#F9FAFB]">
            QR Tenant Onboarding
          </h1>
          <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF]">
            Generate property-specific QR codes &amp; printable posters for instant resident joining requests.
          </p>
        </div>

        <select
          aria-label="Select PG property"
          value={selectedPg.id}
          onChange={(e) => setSelectedPropertyId(e.target.value)}
          className="min-h-[42px] px-3.5 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] text-sm font-semibold text-[#111827] dark:text-[#F9FAFB]"
        >
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.locality})
            </option>
          ))}
        </select>
      </div>

      {/* Eligibility Status Banner */}
      {isEligible ? (
        <div className="rounded-2xl border border-[#047857]/30 bg-[#ECFDF5] dark:bg-[#10B981]/10 p-4 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-[#047857] dark:text-[#34D399] shrink-0" />
          <div className="text-xs">
            <p className="font-bold text-[#065F46] dark:text-[#34D399]">
              QR Onboarding Active for {selectedPg.name}
            </p>
            <p className="text-[#047857] dark:text-[#10B981]">
              Approved, location-verified, and entitled. Walk-in applicants scanning this QR can submit joining requests immediately.
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-[#B45309] dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-bold text-[#92400E] dark:text-amber-300">
              QR Onboarding Paused — Property Not Yet Eligible for Public Joining
            </p>
            <p className="text-[#B45309] dark:text-amber-400">
              Applicants scanning this link will see an unavailable notice until Super Admin Approval ({selectedPg.approvalStatus}), Location Verification ({selectedPg.locationStatus}), and an active Listing Entitlement are complete.
            </p>
          </div>
        </div>
      )}

      {/* QR Generator + Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-6 flex flex-col items-center text-center">
          <div className="p-4 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt={`QR Code for ${selectedPg.name}`} className="w-52 h-52 object-contain" />
            ) : (
              <div className="w-52 h-52 flex items-center justify-center bg-slate-100 rounded-xl">
                <QrCode className="w-16 h-16 text-slate-400" />
              </div>
            )}
          </div>

          <h2 className="mt-4 font-display text-lg font-bold text-[#111827] dark:text-[#F9FAFB]">{selectedPg.name}</h2>
          <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
            {selectedPg.locality}, {selectedPg.city}
          </p>
          <p className="mt-2 px-3 py-1.5 rounded-lg bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151] font-mono text-[11px] text-[#047857] dark:text-[#34D399] break-all">
            {joinUrl}
          </p>

          <div className="mt-5 w-full grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={handleCopyLink}
              className="min-h-[42px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] text-xs font-semibold inline-flex items-center justify-center gap-1.5 hover:bg-[#F8FAFC] dark:hover:bg-[#1F2937]"
            >
              <Copy className="w-3.5 h-3.5 text-[#047857] dark:text-[#34D399]" />
              Copy Link
            </button>
            <button
              type="button"
              onClick={handleDownloadQr}
              className="min-h-[42px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] text-xs font-semibold inline-flex items-center justify-center gap-1.5 hover:bg-[#F8FAFC] dark:hover:bg-[#1F2937]"
            >
              <Download className="w-3.5 h-3.5 text-[#047857] dark:text-[#34D399]" />
              Download PNG
            </button>
            <button
              type="button"
              onClick={handleShareQr}
              className="min-h-[42px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] text-xs font-semibold inline-flex items-center justify-center gap-1.5 hover:bg-[#F8FAFC] dark:hover:bg-[#1F2937]"
            >
              <Share2 className="w-3.5 h-3.5 text-[#047857] dark:text-[#34D399]" />
              Share QR
            </button>
            <button
              type="button"
              onClick={() => setPosterOpen(true)}
              className="min-h-[42px] px-3 rounded-xl bg-[#047857] hover:bg-[#065F46] text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Poster
            </button>
          </div>

          <Link
            to={`/join/${selectedPg.id}`}
            className="mt-3 w-full min-h-[40px] rounded-xl bg-[#ECFDF5] dark:bg-[#10B981]/15 text-[#047857] dark:text-[#34D399] text-xs font-semibold inline-flex items-center justify-center gap-1.5"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Preview Joining Page
          </Link>
        </div>

        {/* QR Onboarding Tracking Metrics & Requests */}
        <div className="lg:col-span-7 space-y-5">
          <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">QR Onboarding Tracking</h2>
                <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                  Real-time request conversion across your portfolio (no simulated scan counts).
                </p>
              </div>
              <Link to="/owner/joining-requests" className="text-xs font-semibold text-[#047857] dark:text-[#34D399] hover:underline">
                Manage Requests
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              <div className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151]">
                <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">QR Requests</p>
                <p className="mt-1 font-mono text-lg font-bold tabular-nums">{qrStats.total}</p>
              </div>
              <div className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151]">
                <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">Pending</p>
                <p className="mt-1 font-mono text-lg font-bold text-[#B45309] dark:text-amber-400 tabular-nums">{qrStats.pending}</p>
              </div>
              <div className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151]">
                <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">Approved</p>
                <p className="mt-1 font-mono text-lg font-bold text-[#047857] dark:text-[#34D399] tabular-nums">{qrStats.approved}</p>
              </div>
              <div className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151]">
                <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">Rejected</p>
                <p className="mt-1 font-mono text-lg font-bold tabular-nums">{qrStats.rejected}</p>
              </div>
              <div className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151]">
                <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">Activated</p>
                <p className="mt-1 font-mono text-lg font-bold text-[#047857] dark:text-[#34D399] tabular-nums">{qrStats.completed}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-3">
            <h3 className="text-sm font-bold text-[#111827] dark:text-[#F9FAFB]">
              Recent QR Requests for {selectedPg.name} ({propQrRequests.length})
            </h3>
            {propQrRequests.length === 0 ? (
              <div className="p-4 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151] text-xs text-[#6B7280] dark:text-[#9CA3AF] flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#047857] dark:text-[#34D399] shrink-0" />
                No QR-origin joining requests submitted for {selectedPg.name} yet. Print or share the QR code at your reception desk!
              </div>
            ) : (
              <div className="space-y-2.5">
                {propQrRequests.map((jr) => (
                  <div
                    key={jr.id}
                    className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <StatusIndicator
                          status={
                            jr.status === JoiningRequestStatus.ACTIVE || jr.status === JoiningRequestStatus.APPROVED_AWAITING_TERMS
                              ? 'success'
                              : jr.status === JoiningRequestStatus.REJECTED
                                ? 'error'
                                : 'warning'
                          }
                          label={jr.status.replace(/_/g, ' ')}
                        />
                        <span className="text-[11px] font-mono text-[#047857] dark:text-[#34D399]">QR Onboarding</span>
                      </div>
                      <p className="mt-1 text-sm font-bold text-[#111827] dark:text-[#F9FAFB]">
                        {jr.tenantName} · {jr.tenantPhone}
                      </p>
                      <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                        {jr.preferredRoomType} · Move-in {jr.moveInDate}
                      </p>
                    </div>
                    <Link
                      to="/owner/joining-requests"
                      className="min-h-[36px] px-3 rounded-lg bg-[#047857] text-white text-xs font-semibold inline-flex items-center gap-1 self-start sm:self-auto"
                    >
                      Review
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Printable Poster Modal */}
      <BottomSheet open={posterOpen} onClose={() => setPosterOpen(false)} title="Printable QR Onboarding Poster" maxWidthClass="sm:max-w-md">
        <div className="space-y-4">
          <div className="rounded-2xl border-2 border-[#047857] bg-white p-6 text-center text-[#111827]">
            <p className="font-display text-sm font-extrabold text-[#047857] uppercase tracking-wider">PG Finder Verified Residence</p>
            <h3 className="mt-2 font-display text-2xl font-extrabold">{selectedPg.name}</h3>
            <p className="text-xs text-[#6B7280]">{selectedPg.locality}, {selectedPg.city}</p>

            <div className="my-5 inline-block p-3 rounded-2xl border border-[#E5E7EB] bg-white">
              {qrDataUrl && <img src={qrDataUrl} alt="Printable PG Onboarding QR" className="w-48 h-48 mx-auto" />}
            </div>

            <p className="font-display text-base font-bold text-[#047857]">Scan to Request Joining</p>
            <p className="mt-1 text-xs text-[#4B5563]">
              1. Scan with any phone camera · 2. Choose room sharing &amp; move-in date · 3. Review house rules &amp; activate stay
            </p>
          </div>

          <div className="flex gap-2.5 print:hidden">
            <button
              type="button"
              onClick={() => window.print()}
              className="flex-1 min-h-[44px] rounded-xl bg-[#047857] text-white text-sm font-semibold inline-flex items-center justify-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              Print Poster
            </button>
            <button
              type="button"
              onClick={handleDownloadQr}
              className="min-h-[44px] px-4 rounded-xl border border-[#E5E7EB] dark:border-[#374151] text-sm font-semibold inline-flex items-center justify-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              PNG
            </button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
