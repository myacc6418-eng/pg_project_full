import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  FileCheck2,
  BedDouble,
  Receipt,
  ShieldCheck,
  MessageSquareWarning,
  Megaphone,
  History,
  LogOut,
  ShieldAlert,
} from 'lucide-react';
import { apiFetch } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { CardSkeleton, formatInr, StatusIndicator } from '../../components/ui/CommonUI';
import {
  Bed,
  BedTransfer,
  Complaint,
  DocumentVerificationStatus,
  LawfulDocumentType,
  MaintenanceRequest,
  Notice,
  OutstandingDue,
  Property,
  RentCharge,
  Room,
  StayStatus,
  TenantDocument,
  TenantStay,
} from '../../../packages/shared/types';
import { LAWFUL_DOCUMENT_LABELS } from '../../../packages/shared/constants';

type TenantTab =
  | 'overview'
  | 'documents'
  | 'room-bed'
  | 'rent'
  | 'deposit'
  | 'complaints'
  | 'notices'
  | 'history'
  | 'checkout';

export function OwnerTenantDetailPage() {
  const { stayId } = useParams();
  const navigate = useNavigate();
  const { showToast, confirmAction } = useToast();
  const [tab, setTab] = useState<TenantTab>('overview');
  const [loading, setLoading] = useState(true);

  const [stay, setStay] = useState<TenantStay | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [bed, setBed] = useState<Bed | null>(null);
  const [availableBeds, setAvailableBeds] = useState<any[]>([]);
  const [documents, setDocuments] = useState<TenantDocument[]>([]);
  const [bedTransfers, setBedTransfers] = useState<BedTransfer[]>([]);
  const [rentCharges, setRentCharges] = useState<RentCharge[]>([]);
  const [outstandingDues, setOutstandingDues] = useState<OutstandingDue[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceRequest[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);

  // Document Upload Form
  const [docType, setDocType] = useState<LawfulDocumentType>('INSTITUTION_ID');
  const [docTitle, setDocTitle] = useState('');
  const [docUrl, setDocUrl] = useState('https://storage.pgfinder.in/private/tenant-kyc.pdf');
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

  // Bed Transfer Form
  const [targetBedId, setTargetBedId] = useState('');
  const [transferReason, setTransferReason] = useState('Resident requested bed change');
  const [updateRent, setUpdateRent] = useState(true);

  // Deposit Adjustment Form
  const [depType, setDepType] = useState<'DEDUCTION' | 'REFUND' | 'RECEIVED'>('DEDUCTION');
  const [depLabel, setDepLabel] = useState('');
  const [depAmount, setDepAmount] = useState('');

  // Checkout Form
  const [checkoutDeduction, setCheckoutDeduction] = useState('0');
  const [checkoutReason, setCheckoutReason] = useState('Painting & deep cleaning adjustment');

  // Notice Form
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeBody, setNoticeBody] = useState('');

  const loadDetail = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<any>(`/api/v1/operations/owner/tenants/${stayId}`);
      setStay(res.stay);
      setProperty(res.property);
      setRoom(res.room);
      setBed(res.bed);
      setAvailableBeds(res.availableBeds || []);
      if (res.availableBeds?.[0] && !targetBedId) setTargetBedId(res.availableBeds[0].id);
      setDocuments(res.documents || []);
      setBedTransfers(res.bedTransfers || []);
      setRentCharges(res.rentCharges || []);
      setOutstandingDues(res.outstandingDues || []);
      setComplaints(res.complaints || []);
      setMaintenanceRequests(res.maintenanceRequests || []);
      setNotices(res.notices || []);
    } catch {
      showToast('Could not load tenant profile', undefined, 'error');
      navigate('/owner/tenants');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
  }, [stayId]);

  const handleUploadDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch(`/api/v1/operations/owner/tenants/${stayId}/documents`, {
        method: 'POST',
        body: JSON.stringify({ docType, title: docTitle, fileUrl: docUrl }),
      });
      setDocTitle('');
      showToast('Private document uploaded');
      await loadDetail();
    } catch (err: any) {
      showToast('Upload blocked', err.message, 'error');
    }
  };

  const handleReviewDoc = async (docId: string, status: DocumentVerificationStatus) => {
    const notes = reviewNotes[docId]?.trim() || `Marked ${status.replace(/_/g, ' ')} by owner`;
    try {
      await apiFetch(`/api/v1/operations/owner/documents/${docId}/review`, {
        method: 'POST',
        body: JSON.stringify({ status, notes }),
      });
      showToast(`Document ${status.replace(/_/g, ' ')}`);
      await loadDetail();
    } catch (err: any) {
      showToast('Review failed', err.message, 'error');
    }
  };

  const handleTransferBed = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch(`/api/v1/operations/owner/stays/${stayId}/transfer-bed`, {
        method: 'POST',
        body: JSON.stringify({
          targetBedId,
          reason: transferReason,
          updateRentToNewRoom: updateRent,
        }),
      });
      showToast('Bed transfer completed');
      await loadDetail();
    } catch (err: any) {
      showToast('Transfer failed', err.message, 'error');
    }
  };

  const handleRecordRentPayment = async (rc: RentCharge, waive = false) => {
    const rem = Math.max(0, rc.amountInr + (rc.lateFeeInr || 0) - rc.paidAmountInr);
    try {
      await apiFetch(`/api/v1/operations/owner/rent/${rc.id}/record-payment`, {
        method: 'POST',
        body: JSON.stringify(waive ? { waive: true } : { amountInr: rem, paymentMode: 'UPI' }),
      });
      showToast(waive ? 'Rent charge waived' : 'Payment recorded & receipt issued');
      await loadDetail();
    } catch (err: any) {
      showToast('Rent update failed', err.message, 'error');
    }
  };

  const handleDepositAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch(`/api/v1/operations/owner/stays/${stayId}/deposit-adjustment`, {
        method: 'POST',
        body: JSON.stringify({ type: depType, label: depLabel, amountInr: Number(depAmount) }),
      });
      setDepLabel('');
      setDepAmount('');
      showToast('Deposit ledger updated');
      await loadDetail();
    } catch (err: any) {
      showToast('Update failed', err.message, 'error');
    }
  };

  const handlePostNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!property) return;
    try {
      await apiFetch('/api/v1/operations/owner/notices', {
        method: 'POST',
        body: JSON.stringify({
          propertyId: property.id,
          title: noticeTitle,
          body: noticeBody,
          category: 'GENERAL',
        }),
      });
      setNoticeTitle('');
      setNoticeBody('');
      showToast('Notice published to property');
      await loadDetail();
    } catch (err: any) {
      showToast('Failed to post notice', err.message, 'error');
    }
  };

  const handleFinalizeCheckout = async () => {
    if (!stay) return;
    const ok = await confirmAction({
      title: `Finalize Checkout for ${stay.tenantName}?`,
      description: 'Releases the bed to Available, computes deposit settlement, and preserves unpaid dues.',
      confirmLabel: 'Finalize Checkout & Release Bed',
    });
    if (!ok) return;
    try {
      const res = await apiFetch<any>(`/api/v1/operations/owner/stays/${stay.id}/finalize-checkout`, {
        method: 'POST',
        body: JSON.stringify({
          deductionInr: Number(checkoutDeduction || 0),
          deductionReason: checkoutReason,
        }),
      });
      showToast(
        'Checkout Finalized',
        `Refund: ${formatInr(res.refundBalance || 0)} · Carried-forward dues: ${formatInr(res.remainingUnpaidDebt || 0)}`
      );
      await loadDetail();
    } catch (err: any) {
      showToast('Checkout failed', err.message, 'error');
    }
  };

  if (loading || !stay) return <CardSkeleton rows={4} />;

  const tabs: { id: TenantTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'documents', label: 'Documents', icon: FileCheck2 },
    { id: 'room-bed', label: 'Room & Bed', icon: BedDouble },
    { id: 'rent', label: 'Rent & Payments', icon: Receipt },
    { id: 'deposit', label: 'Security Deposit', icon: ShieldCheck },
    { id: 'complaints', label: 'Complaints', icon: MessageSquareWarning },
    { id: 'notices', label: 'Notices', icon: Megaphone },
    { id: 'history', label: 'Stay History', icon: History },
    { id: 'checkout', label: 'Checkout', icon: LogOut },
  ];

  const unpaidRentTotal = rentCharges
    .filter((rc) => rc.status !== 'PAID' && rc.status !== 'WAIVED')
    .reduce((acc, rc) => acc + Math.max(0, rc.amountInr + (rc.lateFeeInr || 0) - rc.paidAmountInr), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/owner/tenants"
            className="min-h-[40px] min-w-[40px] rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] flex items-center justify-center text-[#111827] dark:text-[#F9FAFB]"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-bold text-[#111827] dark:text-[#F9FAFB]">{stay.tenantName}</h1>
              <StatusIndicator
                status={
                  stay.status === StayStatus.ACTIVE
                    ? 'success'
                    : stay.status === StayStatus.CHECKOUT_REQUESTED
                      ? 'warning'
                      : 'neutral'
                }
                label={stay.status.replace(/_/g, ' ')}
              />
            </div>
            <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
              {stay.tenantCode || stay.id} · {property?.name} · Room {room?.roomNumber || '-'} · Bed {bed?.bedCode || stay.bedId}
            </p>
          </div>
        </div>
      </div>

      {/* 9-Tab Switcher */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`min-h-[40px] px-3.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                active
                  ? 'bg-[#047857] text-white'
                  : 'border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#111827] dark:hover:text-[#F9FAFB]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: Overview */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-3">
            <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">Resident Profile</h2>
            <div className="space-y-2 text-sm">
              <p><span className="text-[#6B7280] dark:text-[#9CA3AF]">Phone:</span> {stay.tenantPhone || '—'}</p>
              <p><span className="text-[#6B7280] dark:text-[#9CA3AF]">Email:</span> {stay.tenantEmail || '—'}</p>
              <p><span className="text-[#6B7280] dark:text-[#9CA3AF]">Emergency Contact:</span> {stay.emergencyContactName || 'Not set'} ({stay.emergencyContactPhone || '—'})</p>
              <p><span className="text-[#6B7280] dark:text-[#9CA3AF]">Joined On:</span> {new Date(stay.createdAt).toLocaleDateString('en-IN')}</p>
              <p><span className="text-[#6B7280] dark:text-[#9CA3AF]">Notice Period:</span> {stay.noticeDays} days</p>
            </div>
          </div>
          <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-3">
            <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">Financial Summary</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937]">
                <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">Monthly Rent</p>
                <p className="font-mono text-lg font-bold text-[#111827] dark:text-[#F9FAFB]">{formatInr(stay.monthlyRentInr)}</p>
              </div>
              <div className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937]">
                <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">Security Deposit</p>
                <p className="font-mono text-lg font-bold text-[#047857] dark:text-[#34D399]">{formatInr(stay.securityDepositInr)}</p>
              </div>
              <div className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937]">
                <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">Unpaid Rent</p>
                <p className="font-mono text-lg font-bold text-[#B45309] dark:text-amber-400">{formatInr(unpaidRentTotal)}</p>
              </div>
              <div className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937]">
                <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">Verified Docs</p>
                <p className="font-mono text-lg font-bold text-[#111827] dark:text-[#F9FAFB]">
                  {documents.filter((d) => d.status === DocumentVerificationStatus.VERIFIED).length} / {documents.length}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Private Documents (Lawful non-Aadhaar KYC) */}
      {tab === 'documents' && (
        <div className="space-y-5">
          <div className="rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/30 p-3.5 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-300">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Privacy Rule: Documents are strictly private to this resident and the owning PG manager. Aadhaar / UIDAI uploads are blocked by policy.
            </span>
          </div>

          <form onSubmit={handleUploadDoc} className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 grid grid-cols-1 sm:grid-cols-4 gap-3">
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value as LawfulDocumentType)}
              className="min-h-[42px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-sm"
            >
              {Object.entries(LAWFUL_DOCUMENT_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Document title (e.g. Signed Agreement)"
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              required
              className="min-h-[42px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-sm"
            />
            <input
              type="url"
              placeholder="Private document URL"
              value={docUrl}
              onChange={(e) => setDocUrl(e.target.value)}
              required
              className="min-h-[42px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-sm"
            />
            <button type="submit" className="min-h-[42px] rounded-xl bg-[#047857] text-white text-xs font-semibold">
              Upload Private Doc
            </button>
          </form>

          <div className="space-y-3">
            {documents.length === 0 ? (
              <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF]">No KYC or agreement documents uploaded yet.</p>
            ) : (
              documents.map((d) => (
                <div key={d.id} className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-[#111827] dark:text-[#F9FAFB]">{d.title}</p>
                      <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                        {LAWFUL_DOCUMENT_LABELS[d.docType]} · Uploaded {new Date(d.uploadedAt).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                    <StatusIndicator
                      status={
                        d.status === DocumentVerificationStatus.VERIFIED
                          ? 'success'
                          : d.status === DocumentVerificationStatus.REJECTED
                            ? 'error'
                            : 'warning'
                      }
                      label={d.status.replace(/_/g, ' ')}
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      placeholder="Verification notes (required for review)..."
                      value={reviewNotes[d.id] || ''}
                      onChange={(e) => setReviewNotes({ ...reviewNotes, [d.id]: e.target.value })}
                      className="flex-1 min-h-[38px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => handleReviewDoc(d.id, DocumentVerificationStatus.VERIFIED)}
                      className="min-h-[38px] px-3 rounded-xl bg-[#047857] text-white text-xs font-semibold"
                    >
                      Verify
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReviewDoc(d.id, DocumentVerificationStatus.RESUBMISSION_REQUIRED)}
                      className="min-h-[38px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] text-xs font-semibold text-[#B45309] dark:text-amber-400"
                    >
                      Request Resubmit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReviewDoc(d.id, DocumentVerificationStatus.REJECTED)}
                      className="min-h-[38px] px-3 rounded-xl border border-red-200 dark:border-red-900/50 text-xs font-semibold text-[#DC2626] dark:text-red-400"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Room & Bed + Transfer */}
      {tab === 'room-bed' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <form onSubmit={handleTransferBed} className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-4">
            <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">Transfer Bed</h2>
            {stay.status === StayStatus.CHECKED_OUT ? (
              <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF]">Resident has checked out.</p>
            ) : availableBeds.length === 0 ? (
              <p className="text-sm text-[#B45309] dark:text-amber-400">No open beds available in {property?.name}.</p>
            ) : (
              <>
                <select
                  value={targetBedId}
                  onChange={(e) => setTargetBedId(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-sm"
                >
                  {availableBeds.map((b) => (
                    <option key={b.id} value={b.id}>
                      Bed {b.bedCode} · Room {b.roomNumber} ({formatInr(b.monthlyRentOverrideInr || b.roomRent)})
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  required
                  className="w-full min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-sm"
                />
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={updateRent} onChange={(e) => setUpdateRent(e.target.checked)} />
                  Update monthly rent to new bed rate
                </label>
                <button type="submit" className="w-full min-h-[44px] rounded-xl bg-[#047857] text-white text-sm font-semibold">
                  Confirm Bed Transfer
                </button>
              </>
            )}
          </form>

          <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-3">
            <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">Transfer History</h2>
            {bedTransfers.length === 0 ? (
              <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF]">No bed transfers recorded.</p>
            ) : (
              bedTransfers.map((tr) => (
                <div key={tr.id} className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] text-xs space-y-1">
                  <p className="font-bold text-[#111827] dark:text-[#F9FAFB]">
                    {tr.fromBedCode} → {tr.toBedCode}
                  </p>
                  <p className="text-[#6B7280] dark:text-[#9CA3AF]">{tr.reason} · By {tr.actorName}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 4: Rent & Payments */}
      {tab === 'rent' && (
        <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-3">
          <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">Rent Billing &amp; Receipts</h2>
          {rentCharges.map((rc) => {
            const rem = Math.max(0, rc.amountInr + (rc.lateFeeInr || 0) - rc.paidAmountInr);
            return (
              <div key={rc.id} className="p-4 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF]">
                    Month {rc.billingMonth} · Due {rc.dueDate} {rc.receiptNumber ? `· ${rc.receiptNumber}` : ''}
                  </p>
                  <p className="font-mono text-sm font-bold text-[#111827] dark:text-[#F9FAFB]">
                    {formatInr(rc.paidAmountInr)} / {formatInr(rc.amountInr + (rc.lateFeeInr || 0))}
                  </p>
                  <StatusIndicator status={rc.status === 'PAID' || rc.status === 'WAIVED' ? 'success' : 'warning'} label={rc.status} />
                </div>
                {rem > 0 && rc.status !== 'WAIVED' && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleRecordRentPayment(rc, false)}
                      className="min-h-[38px] px-3.5 rounded-xl bg-[#047857] text-white text-xs font-semibold"
                    >
                      Mark Full Paid ({formatInr(rem)})
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRecordRentPayment(rc, true)}
                      className="min-h-[38px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] text-xs font-semibold"
                    >
                      Waive
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {outstandingDues.length > 0 && (
            <div className="pt-3 border-t border-[#E5E7EB] dark:border-[#374151] space-y-2">
              <h3 className="text-sm font-bold">Outstanding Dues</h3>
              {outstandingDues.map((d) => (
                <div key={d.id} className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] flex justify-between text-xs">
                  <span>{d.description}</span>
                  <span className="font-mono font-bold">{formatInr(d.totalAmountInr - d.paidAmountInr)} ({d.status})</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: Security Deposit */}
      {tab === 'deposit' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <form onSubmit={handleDepositAdjustment} className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-3">
            <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">Add Deposit Adjustment</h2>
            <select
              value={depType}
              onChange={(e) => setDepType(e.target.value as any)}
              className="w-full min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-sm"
            >
              <option value="DEDUCTION">Deduction (Damage / Cleaning)</option>
              <option value="REFUND">Refund Issued</option>
              <option value="RECEIVED">Additional Deposit Collected</option>
            </select>
            <input
              type="text"
              placeholder="Entry label (e.g. Key replacement)"
              value={depLabel}
              onChange={(e) => setDepLabel(e.target.value)}
              required
              className="w-full min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-sm"
            />
            <input
              type="number"
              min={1}
              placeholder="Amount (₹)"
              value={depAmount}
              onChange={(e) => setDepAmount(e.target.value)}
              required
              className="w-full min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-sm tabular-nums"
            />
            <button type="submit" className="w-full min-h-[44px] rounded-xl bg-[#047857] text-white text-sm font-semibold">
              Record Entry
            </button>
          </form>

          <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-2.5">
            <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">Settlement Ledger</h2>
            {(stay.depositSettlementHistory || []).map((item) => (
              <div key={item.id} className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] flex justify-between text-xs">
                <div>
                  <p className="font-bold text-[#111827] dark:text-[#F9FAFB]">{item.label}</p>
                  <p className="text-[#6B7280] dark:text-[#9CA3AF]">{item.type}</p>
                </div>
                <span className="font-mono font-bold text-[#111827] dark:text-[#F9FAFB]">{formatInr(item.amountInr)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: Complaints & Maintenance */}
      {tab === 'complaints' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-3">
            <h2 className="text-base font-bold">Resident Complaints ({complaints.length})</h2>
            {complaints.length === 0 ? (
              <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF]">No complaints raised by this tenant.</p>
            ) : (
              complaints.map((c) => (
                <div key={c.id} className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] space-y-1">
                  <div className="flex justify-between">
                    <span className="text-xs font-bold">{c.category} · {c.priority}</span>
                    <StatusIndicator status={c.status === 'RESOLVED' ? 'success' : 'warning'} label={c.status} />
                  </div>
                  <p className="text-sm">{c.description}</p>
                </div>
              ))
            )}
          </div>
          <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-3">
            <h2 className="text-base font-bold">Property Maintenance Queue ({maintenanceRequests.length})</h2>
            {maintenanceRequests.map((m) => (
              <div key={m.id} className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] flex justify-between text-xs">
                <div>
                  <p className="font-bold">{m.title}</p>
                  <p className="text-[#6B7280] dark:text-[#9CA3AF]">Due {m.dueDate}</p>
                </div>
                <StatusIndicator status={m.status === 'COMPLETED' ? 'success' : 'warning'} label={m.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 7: Notices & Agreements */}
      {tab === 'notices' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <form onSubmit={handlePostNotice} className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-3">
            <h2 className="text-base font-bold">Send Property Notice</h2>
            <input
              type="text"
              placeholder="Notice title"
              value={noticeTitle}
              onChange={(e) => setNoticeTitle(e.target.value)}
              required
              className="w-full min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-sm"
            />
            <textarea
              rows={3}
              placeholder="Message to residents..."
              value={noticeBody}
              onChange={(e) => setNoticeBody(e.target.value)}
              required
              className="w-full p-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-sm"
            />
            <button type="submit" className="w-full min-h-[44px] rounded-xl bg-[#047857] text-white text-sm font-semibold">
              Publish Notice
            </button>
          </form>
          <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-2.5">
            <h2 className="text-base font-bold">Property Announcements ({notices.length})</h2>
            {notices.map((n) => (
              <div key={n.id} className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] text-xs space-y-1">
                <p className="font-bold">{n.title}</p>
                <p className="text-[#6B7280] dark:text-[#9CA3AF]">{n.body}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 8: Stay History */}
      {tab === 'history' && (
        <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-3">
          <h2 className="text-base font-bold">Stay Audit Timeline</h2>
          {(stay.stayHistory || []).length === 0 ? (
            <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF]">No timeline events recorded.</p>
          ) : (
            (stay.stayHistory || []).map((ev) => (
              <div key={ev.id} className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151]">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-[#047857] dark:text-[#34D399]">{ev.eventType}</span>
                  <span className="text-[#6B7280] dark:text-[#9CA3AF]">{new Date(ev.timestamp).toLocaleString('en-IN')}</span>
                </div>
                <p className="mt-1 text-sm">{ev.summary}</p>
                <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">Actor: {ev.actorName}</p>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 9: Checkout Settlement */}
      {tab === 'checkout' && (
        <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-4 max-w-xl">
          <h2 className="text-base font-bold">Final Checkout Settlement</h2>
          {stay.status === StayStatus.CHECKED_OUT ? (
            <p className="text-sm text-[#047857] dark:text-[#34D399]">
              Checked out on {stay.checkedOutAt ? new Date(stay.checkedOutAt).toLocaleDateString('en-IN') : '—'}. Bed released.
            </p>
          ) : (
            <>
              <div className="p-4 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#6B7280] dark:text-[#9CA3AF]">Security Deposit Held</span>
                  <span className="font-mono font-bold">{formatInr(stay.depositPaid ? stay.securityDepositInr : 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280] dark:text-[#9CA3AF]">Unpaid Rent Balance</span>
                  <span className="font-mono font-bold text-[#B45309] dark:text-amber-400">{formatInr(unpaidRentTotal)}</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Additional Checkout Deduction (₹)</label>
                <input
                  type="number"
                  min={0}
                  value={checkoutDeduction}
                  onChange={(e) => setCheckoutDeduction(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Deduction Reason</label>
                <input
                  type="text"
                  value={checkoutReason}
                  onChange={(e) => setCheckoutReason(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-sm"
                />
              </div>
              <button
                type="button"
                onClick={handleFinalizeCheckout}
                className="w-full min-h-[44px] rounded-xl bg-[#047857] hover:bg-[#065F46] text-white text-sm font-semibold"
              >
                Finalize Checkout &amp; Release Bed
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
