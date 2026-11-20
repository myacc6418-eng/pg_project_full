import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Building2,
  Receipt,
  Utensils,
  MessageSquareWarning,
  Users,
  LogOut,
  FileCheck2,
  Star,
  Bell,
  Package,
  BedDouble,
  CheckCircle2,
  Wrench,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { apiFetch } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { CardSkeleton, EmptyState, formatInr, StatusIndicator } from '../../components/ui/CommonUI';
import {
  Bed,
  Complaint,
  FoodMenuDay,
  LaundryRequest,
  LocalBusinessListing,
  MaintenanceRequest,
  Notice,
  OutstandingDue,
  ParcelNotice,
  Property,
  RentCharge,
  Room,
  RoommateExpense,
  RoommateTaskItem,
  TenantDocument,
  TenantStay,
} from '../../../packages/shared/types';
import { LAWFUL_DOCUMENT_LABELS } from '../../../packages/shared/constants';

const REQUIRED_DOC_SLOTS = [
  { key: 'INSTITUTION_ID', label: 'College / Employer ID Card' },
  { key: 'DRIVING_LICENSE', label: 'Driving License / Passport' },
  { key: 'LOCAL_POLICE_VERIFICATION', label: 'Local Police Verification / Address Proof' },
  { key: 'SIGNED_AGREEMENT', label: 'Signed PG Stay Agreement' },
] as const;

export function TenantMyPGPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const activeTab = searchParams.get('tab') || 'stay';
  const { showToast, confirmAction } = useToast();

  const [loading, setLoading] = useState(true);
  const [stay, setStay] = useState<TenantStay | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [bed, setBed] = useState<Bed | null>(null);
  const [rentCharges, setRentCharges] = useState<RentCharge[]>([]);
  const [outstandingDues, setOutstandingDues] = useState<OutstandingDue[]>([]);
  const [foodMenu, setFoodMenu] = useState<FoodMenuDay[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [readNoticeIds, setReadNoticeIds] = useState<string[]>([]);
  const [noticeFilter, setNoticeFilter] = useState('ALL');
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceRequest[]>([]);
  const [parcels, setParcels] = useState<ParcelNotice[]>([]);
  const [laundryRequests, setLaundryRequests] = useState<LaundryRequest[]>([]);
  const [nearbyBusinesses, setNearbyBusinesses] = useState<LocalBusinessListing[]>([]);
  const [roommateExpenses, setRoommateExpenses] = useState<RoommateExpense[]>([]);
  const [roommateTasks, setRoommateTasks] = useState<RoommateTaskItem[]>([]);
  const [documents, setDocuments] = useState<TenantDocument[]>([]);

  const [cmpCategory, setCmpCategory] = useState('INTERNET');
  const [cmpPriority, setCmpPriority] = useState('MEDIUM');
  const [cmpDesc, setCmpDesc] = useState('');
  const [cmpPhotoUrl, setCmpPhotoUrl] = useState('');
  const [commentMap, setCommentMap] = useState<Record<string, string>>({});

  const [mntTitle, setMntTitle] = useState('');
  const [mntPriority, setMntPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');

  const [rmTitle, setRmTitle] = useState('');
  const [rmAmount, setRmAmount] = useState('');
  const [rmSplitCount, setRmSplitCount] = useState('2');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskType, setTaskType] = useState<'GROCERY' | 'TASK'>('GROCERY');

  const [laundryService, setLaundryService] = useState('SpinFresh Express Laundry');
  const [laundryDate, setLaundryDate] = useState(new Date().toISOString().slice(0, 10));
  const [laundrySummary, setLaundrySummary] = useState('');

  const [mealPref, setMealPref] = useState<'VEG' | 'NON_VEG'>('VEG');
  const [breakfastOptIn, setBreakfastOptIn] = useState(true);
  const [lunchOptIn, setLunchOptIn] = useState(true);
  const [dinnerOptIn, setDinnerOptIn] = useState(true);
  const [mealRating, setMealRating] = useState(5);
  const [mealComment, setMealComment] = useState('');

  const [docType, setDocType] = useState('INSTITUTION_ID');
  const [docTitle, setDocTitle] = useState('');
  const [docUrl, setDocUrl] = useState('');
  const [replacingDocId, setReplacingDocId] = useState<string | null>(null);
  const [replaceTitle, setReplaceTitle] = useState('');
  const [replaceUrl, setReplaceUrl] = useState('');

  const [expectedCheckoutDate, setExpectedCheckoutDate] = useState(
    new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<any>('/api/v1/operations/tenant/workspace');
      setStay(res.activeStay);
      setProperty(res.property);
      setRoom(res.room);
      setBed(res.bed);
      setRentCharges(res.rentCharges || []);
      setOutstandingDues(res.outstandingDues || []);
      setFoodMenu(res.foodMenu || []);
      setNotices(res.notices || []);
      setReadNoticeIds(res.readNoticeIds || []);
      setComplaints(res.complaints || []);
      setMaintenanceRequests(res.maintenanceRequests || []);
      setParcels(res.parcels || []);
      setLaundryRequests(res.laundryRequests || []);
      setNearbyBusinesses(res.nearbyBusinesses || []);
      setRoommateExpenses(res.roommateExpenses || []);
      setRoommateTasks(res.roommateTasks || []);
      setDocuments(res.documents || []);
      if (res.mealPreference) {
        setMealPref(res.mealPreference.preference || 'VEG');
        setBreakfastOptIn(res.mealPreference.breakfastOptIn !== false);
        setLunchOptIn(res.mealPreference.lunchOptIn !== false);
        setDinnerOptIn(res.mealPreference.dinnerOptIn !== false);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const submitComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/v1/operations/tenant/complaints', {
        method: 'POST',
        body: JSON.stringify({
          category: cmpCategory,
          priority: cmpPriority,
          description: cmpDesc,
          photoUrl: cmpPhotoUrl.trim() || undefined,
        }),
      });
      setCmpDesc('');
      setCmpPhotoUrl('');
      showToast('Complaint submitted', 'Owner has been notified.');
      await loadData();
    } catch (err: any) {
      showToast('Failed to submit complaint', err.message, 'error');
    }
  };

  const handleComplaintComment = async (id: string) => {
    const note = (commentMap[id] || '').trim();
    if (note.length < 2) return;
    try {
      await apiFetch(`/api/v1/operations/tenant/complaints/${id}/comment`, {
        method: 'POST',
        body: JSON.stringify({ note }),
      });
      setCommentMap({ ...commentMap, [id]: '' });
      showToast('Comment added');
      await loadData();
    } catch (err: any) {
      showToast('Failed to post comment', err.message, 'error');
    }
  };

  const handleConfirmComplaintResolved = async (id: string) => {
    try {
      await apiFetch(`/api/v1/operations/tenant/complaints/${id}/confirm-resolved`, { method: 'POST' });
      showToast('Complaint confirmed closed');
      await loadData();
    } catch (err: any) {
      showToast('Action failed', err.message, 'error');
    }
  };

  const handleCreateMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/v1/operations/tenant/maintenance', {
        method: 'POST',
        body: JSON.stringify({ title: mntTitle, priority: mntPriority }),
      });
      setMntTitle('');
      showToast('Maintenance request logged');
      await loadData();
    } catch (err: any) {
      showToast('Could not submit maintenance request', err.message, 'error');
    }
  };

  const addRoommateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/v1/operations/tenant/roommate-expenses', {
        method: 'POST',
        body: JSON.stringify({
          title: rmTitle,
          amountInr: Number(rmAmount),
          splitCount: Number(rmSplitCount) || 2,
        }),
      });
      setRmTitle('');
      setRmAmount('');
      showToast('Shared expense logged', 'Kept separate from your official PG rent ledger.');
      await loadData();
    } catch (err: any) {
      showToast('Could not log expense', err.message, 'error');
    }
  };

  const toggleExpenseSettled = async (id: string) => {
    await apiFetch(`/api/v1/operations/tenant/roommate-expenses/${id}/settle`, { method: 'POST' });
    showToast('Split settlement updated');
    await loadData();
  };

  const addRoommateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/v1/operations/tenant/roommate-tasks', {
        method: 'POST',
        body: JSON.stringify({ title: taskTitle, type: taskType }),
      });
      setTaskTitle('');
      showToast('Added to shared room list');
      await loadData();
    } catch (err: any) {
      showToast('Could not add item', err.message, 'error');
    }
  };

  const toggleRoommateTask = async (id: string) => {
    await apiFetch(`/api/v1/operations/tenant/roommate-tasks/${id}`, { method: 'PATCH', body: JSON.stringify({}) });
    await loadData();
  };

  const saveMealPreferences = async (
    nextPref: 'VEG' | 'NON_VEG',
    b: boolean,
    l: boolean,
    d: boolean
  ) => {
    setMealPref(nextPref);
    setBreakfastOptIn(b);
    setLunchOptIn(l);
    setDinnerOptIn(d);
    try {
      await apiFetch('/api/v1/operations/tenant/meal-preference', {
        method: 'POST',
        body: JSON.stringify({
          preference: nextPref,
          breakfastOptIn: b,
          lunchOptIn: l,
          dinnerOptIn: d,
        }),
      });
      showToast('Meal plan preferences updated');
    } catch {
      showToast('Could not update meal preferences', undefined, 'error');
    }
  };

  const handleSubmitMealFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/v1/operations/tenant/meal-feedback', {
        method: 'POST',
        body: JSON.stringify({ rating: mealRating, comment: mealComment }),
      });
      setMealComment('');
      showToast('Meal feedback submitted', 'Thank you! Kitchen team and owner can view this.');
    } catch (err: any) {
      showToast('Feedback failed', err.message, 'error');
    }
  };

  const handleUploadDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/v1/operations/tenant/documents', {
        method: 'POST',
        body: JSON.stringify({
          docType,
          title: docTitle,
          fileUrl: docUrl || 'https://storage.pgfinder.in/private/verified-doc.pdf',
        }),
      });
      setDocTitle('');
      setDocUrl('');
      showToast('Private Document Uploaded', 'Visible only to you and your PG Owner for verification.');
      await loadData();
    } catch (err: any) {
      showToast('Upload failed', err.message, 'error');
    }
  };

  const handleReplaceDoc = async (docId: string) => {
    try {
      await apiFetch(`/api/v1/operations/tenant/documents/${docId}/replace`, {
        method: 'POST',
        body: JSON.stringify({
          title: replaceTitle,
          fileUrl: replaceUrl || 'https://storage.pgfinder.in/private/replacement-doc.pdf',
        }),
      });
      setReplacingDocId(null);
      setReplaceTitle('');
      setReplaceUrl('');
      showToast('Replacement uploaded', 'Document returned to pending owner verification.');
      await loadData();
    } catch (err: any) {
      showToast('Replacement failed', err.message, 'error');
    }
  };

  const handleBookLaundry = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/v1/operations/tenant/laundry', {
        method: 'POST',
        body: JSON.stringify({
          serviceName: laundryService,
          pickupDate: laundryDate,
          itemsSummary: laundrySummary,
          estimatedInr: 180,
        }),
      });
      setLaundrySummary('');
      showToast('Laundry pickup requested', `Scheduled for ${laundryDate}`);
      await loadData();
    } catch (err: any) {
      showToast('Booking failed', err.message, 'error');
    }
  };

  const handleRequestCheckout = async () => {
    const ok = await confirmAction({
      title: 'Request PG Checkout?',
      description: `Your stay requires a ${stay?.noticeDays || 30}-day notice period (Target vacate: ${expectedCheckoutDate}). Your bed remains assigned until the owner finalizes settlement.`,
      confirmLabel: 'Submit Checkout Request',
    });
    if (!ok) return;
    try {
      await apiFetch('/api/v1/operations/tenant/checkout/request', {
        method: 'POST',
        body: JSON.stringify({ expectedCheckoutDate }),
      });
      showToast('Checkout Request Submitted', 'Owner will review dues and deposit settlement.');
      await loadData();
    } catch (err: any) {
      showToast('Checkout request failed', err.message, 'error');
    }
  };

  if (loading) return <CardSkeleton rows={3} />;

  if (!stay || !property) {
    return (
      <EmptyState
        icon={Building2}
        title="No Active PG Stay"
        description="Once you join a verified PG and accept its house rules, your stay details, rent ledger, weekly mess menu, documents, complaints, and checkout tools appear here."
        actionLabel="Find a Verified PG"
        onAction={() => navigate('/tenant/explore')}
      />
    );
  }

  const unreadNoticesCount = notices.filter((n) => !readNoticeIds.includes(n.id)).length;
  const tabs = [
    { id: 'stay', label: 'My Stay', icon: BedDouble },
    { id: 'rent', label: 'Rent & Dues', icon: Receipt },
    { id: 'food', label: 'Food & Mess', icon: Utensils },
    { id: 'notices', label: `Notices${unreadNoticesCount > 0 ? ` (${unreadNoticesCount})` : ''}`, icon: Bell },
    { id: 'documents', label: 'KYC & Docs', icon: FileCheck2 },
    { id: 'complaints', label: 'Complaints & Maint', icon: MessageSquareWarning },
    { id: 'services', label: 'Parcels & Laundry', icon: Package },
    { id: 'roommates', label: 'Roommates', icon: Users },
    { id: 'checkout', label: 'Checkout', icon: LogOut },
  ];

  const pendingRentInr = rentCharges
    .filter((rc) => rc.status !== 'WAIVED')
    .reduce((acc, rc) => acc + Math.max(0, rc.amountInr + (rc.lateFeeInr || 0) - rc.paidAmountInr), 0);
  const pendingDuesInr = outstandingDues
    .filter((d) => d.status !== 'SETTLED')
    .reduce((acc, d) => acc + Math.max(0, d.totalAmountInr - d.paidAmountInr), 0);

  const filteredNotices = notices.filter((n) => noticeFilter === 'ALL' || n.category === noticeFilter);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold text-[#111827] dark:text-[#F9FAFB]">
          {property.name} — My Stay Workspace
        </h1>
        <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF]">
          Room {room?.roomNumber || '-'} · Bed {bed?.bedCode || '-'} · Tenant Code{' '}
          <span className="font-mono font-semibold text-[#111827] dark:text-[#F9FAFB]">{stay.tenantCode || stay.id}</span>
        </p>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setSearchParams({ tab: t.id })}
              className={`min-h-[40px] px-3.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 border transition-colors ${
                active
                  ? 'bg-[#047857] dark:bg-[#10B981] text-white dark:text-[#0B1220] border-[#047857] dark:border-[#10B981]'
                  : 'bg-white dark:bg-[#111827] text-[#4B5563] dark:text-[#D1D5DB] border-[#E5E7EB] dark:border-[#374151]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'stay' && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">Room &amp; Sharing</p>
              <p className="mt-1 font-bold text-sm text-[#111827] dark:text-[#F9FAFB]">
                Room {room?.roomNumber || '-'} · {room?.roomType || '-'}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">Assigned Bed</p>
              <p className="mt-1 font-mono font-bold text-sm text-[#047857] dark:text-[#34D399]">{bed?.bedCode || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">Monthly Rent</p>
              <p className="mt-1 font-mono font-bold text-sm text-[#111827] dark:text-[#F9FAFB] tabular-nums">
                {formatInr(stay.monthlyRentInr)}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">Agreement &amp; Notice</p>
              <p className="mt-1 font-semibold text-sm text-[#111827] dark:text-[#F9FAFB]">
                {stay.acceptedAgreementVersion || 'v2.0'} · {stay.noticeDays} days
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-3">
              <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">Property Address &amp; House Rules</h2>
              <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                {property.address}, {property.landmark}, {property.locality}, {property.city} - {property.postalCode}
              </p>
              <ul className="space-y-1.5 text-xs text-[#4B5563] dark:text-[#D1D5DB] list-disc pl-4">
                {property.rules.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-3">
              <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">Stay Timeline</h2>
              <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                Joined: {new Date(stay.createdAt).toLocaleDateString('en-IN')} · Terms Accepted:{' '}
                {new Date(stay.termsAcceptedAt).toLocaleDateString('en-IN')}
              </p>
              <div className="space-y-2">
                {(stay.stayHistory || []).map((ev) => (
                  <div key={ev.id} className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151] text-xs">
                    <p className="font-semibold text-[#111827] dark:text-[#F9FAFB]">{ev.summary}</p>
                    <p className="text-[#6B7280] dark:text-[#9CA3AF] mt-0.5">
                      {ev.actorName} · {new Date(ev.timestamp).toLocaleString('en-IN')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'rent' && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-[#ECFDF5]/60 dark:bg-[#10B981]/10 p-4 text-xs text-[#065F46] dark:text-[#34D399]">
            <strong>Owner-Recorded Rent Ledger:</strong> Online payment gateway checkout is not enabled in this build. Please settle monthly rent directly with your PG Owner via UPI/bank/cash and verify your digital receipt number below.
          </div>

          <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E5E7EB] dark:border-[#374151]">
              <div>
                <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">Security Deposit Held</p>
                <p className="font-mono text-lg font-bold text-[#111827] dark:text-[#F9FAFB] tabular-nums">
                  {formatInr(stay.securityDepositInr)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">Outstanding Rent &amp; Dues</p>
                <p className="font-mono text-lg font-bold text-[#047857] dark:text-[#34D399] tabular-nums">
                  {formatInr(pendingRentInr + pendingDuesInr)}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {rentCharges.map((rc) => (
                <div
                  key={rc.id}
                  className="p-4 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div>
                    <p className="text-sm font-bold text-[#111827] dark:text-[#F9FAFB] tabular-nums">
                      Billing Month: {rc.billingMonth}
                    </p>
                    <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                      Due {rc.dueDate} {rc.receiptNumber ? `· Receipt ${rc.receiptNumber}` : ''}
                      {rc.paymentMode ? ` · ${rc.paymentMode}` : ''}
                      {rc.lateFeeInr ? ` · Late fee ${formatInr(rc.lateFeeInr)}` : ''}
                    </p>
                  </div>
                  <div className="sm:text-right">
                    <p className="font-mono text-sm font-bold text-[#111827] dark:text-[#F9FAFB] tabular-nums">
                      {formatInr(rc.paidAmountInr)} / {formatInr(rc.amountInr + (rc.lateFeeInr || 0))}
                    </p>
                    <StatusIndicator
                      status={rc.status === 'PAID' || rc.status === 'WAIVED' ? 'success' : rc.status === 'OVERDUE' ? 'error' : 'warning'}
                      label={rc.status}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {outstandingDues.length > 0 && (
            <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-3">
              <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">Additional Dues &amp; Utility Charges</h2>
              {outstandingDues.map((d) => (
                <div
                  key={d.id}
                  className="p-3.5 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] flex items-center justify-between gap-2"
                >
                  <div>
                    <p className="text-sm font-bold text-[#111827] dark:text-[#F9FAFB]">{d.description}</p>
                    <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                      {d.category} · Due {d.dueDate}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm font-bold text-[#111827] dark:text-[#F9FAFB] tabular-nums">
                      {formatInr(d.totalAmountInr - d.paidAmountInr)} left
                    </p>
                    <StatusIndicator status={d.status === 'SETTLED' ? 'success' : 'warning'} label={d.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'food' && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E5E7EB] dark:border-[#374151]">
              <div>
                <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">Weekly Mess Schedule &amp; Meal Opt-Ins</h2>
                <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                  Help your kitchen reduce food waste by toggling daily meals you plan to eat.
                </p>
              </div>
              <div className="inline-flex p-1 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937]">
                {(['VEG', 'NON_VEG'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => saveMealPreferences(p, breakfastOptIn, lunchOptIn, dinnerOptIn)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                      mealPref === p ? 'bg-[#047857] dark:bg-[#10B981] text-white dark:text-[#0B1220]' : 'text-[#6B7280] dark:text-[#9CA3AF]'
                    }`}
                  >
                    {p === 'VEG' ? 'Veg' : 'Non-Veg'}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { label: 'Breakfast Opt-In', val: breakfastOptIn, set: (v: boolean) => saveMealPreferences(mealPref, v, lunchOptIn, dinnerOptIn) },
                { label: 'Lunch Opt-In', val: lunchOptIn, set: (v: boolean) => saveMealPreferences(mealPref, breakfastOptIn, v, dinnerOptIn) },
                { label: 'Dinner Opt-In', val: dinnerOptIn, set: (v: boolean) => saveMealPreferences(mealPref, breakfastOptIn, lunchOptIn, v) },
              ].map((m) => (
                <label
                  key={m.label}
                  className="p-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] flex items-center justify-between text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] cursor-pointer"
                >
                  <span>{m.label}</span>
                  <input type="checkbox" checked={m.val} onChange={(e) => m.set(e.target.checked)} />
                </label>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {foodMenu.map((day) => (
                <div
                  key={day.day}
                  className="p-4 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] space-y-1.5"
                >
                  <p className="text-xs font-bold text-[#047857] dark:text-[#34D399]">{day.day}</p>
                  <p className="text-xs text-[#111827] dark:text-[#F9FAFB]">
                    <strong>Breakfast:</strong> {day.breakfast}
                  </p>
                  <p className="text-xs text-[#111827] dark:text-[#F9FAFB]">
                    <strong>Lunch:</strong> {day.lunch}
                  </p>
                  <p className="text-xs text-[#111827] dark:text-[#F9FAFB]">
                    <strong>Dinner:</strong> {day.dinner}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <form
            onSubmit={handleSubmitMealFeedback}
            className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-3"
          >
            <h3 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB] flex items-center gap-2">
              <Star className="w-4 h-4 text-[#D97706]" />
              Share Mess Quality Feedback
            </h3>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setMealRating(r)}
                  className={`min-h-[36px] px-3 rounded-lg text-xs font-bold border ${
                    mealRating === r
                      ? 'bg-[#047857] dark:bg-[#10B981] text-white dark:text-[#0B1220] border-[#047857]'
                      : 'bg-[#F8FAFC] dark:bg-[#1F2937] text-[#111827] dark:text-[#F9FAFB] border-[#E5E7EB] dark:border-[#374151]'
                  }`}
                >
                  {r}★
                </button>
              ))}
            </div>
            <input
              type="text"
              value={mealComment}
              onChange={(e) => setMealComment(e.target.value)}
              placeholder="Share feedback on food hygiene, taste, or timing..."
              required
              className="w-full min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#1F2937] text-sm text-[#111827] dark:text-[#F9FAFB]"
            />
            <button type="submit" className="min-h-[44px] px-5 rounded-xl bg-[#047857] dark:bg-[#10B981] text-white dark:text-[#0B1220] text-sm font-semibold">
              Submit Feedback
            </button>
          </form>
        </div>
      )}

      {activeTab === 'notices' && (
        <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">PG Notice Board</h2>
              <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                {unreadNoticesCount} unread notices from management
              </p>
            </div>
            <select
              aria-label="Filter notices by category"
              value={noticeFilter}
              onChange={(e) => setNoticeFilter(e.target.value)}
              className="min-h-[40px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-xs font-semibold text-[#111827] dark:text-[#F9FAFB]"
            >
              <option value="ALL">All Categories</option>
              <option value="GENERAL">General</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="UTILITIES">Utilities</option>
              <option value="HOUSEKEEPING">Housekeeping</option>
              <option value="RULES">House Rules</option>
              <option value="EVENT_SHARE">Startup Events</option>
            </select>
          </div>

          {filteredNotices.length === 0 ? (
            <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF]">No notices in this category.</p>
          ) : (
            <div className="space-y-3">
              {filteredNotices.map((n) => {
                const isRead = readNoticeIds.includes(n.id);
                return (
                  <div
                    key={n.id}
                    className={`p-4 rounded-xl border ${
                      isRead
                        ? 'bg-[#F8FAFC] dark:bg-[#1F2937] border-[#E5E7EB] dark:border-[#374151]'
                        : 'bg-[#ECFDF5]/50 dark:bg-[#10B981]/10 border-[#047857]/30 dark:border-[#34D399]/40'
                    } space-y-2`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="text-[#6B7280] dark:text-[#9CA3AF]">
                        {n.category.replace(/_/g, ' ')} · {new Date(n.createdAt).toLocaleString('en-IN')}
                      </span>
                      {!isRead ? (
                        <button
                          type="button"
                          onClick={async () => {
                            const res = await apiFetch<{ readNoticeIds: string[] }>(
                              `/api/v1/operations/tenant/notices/${n.id}/read`,
                              { method: 'POST' }
                            );
                            setReadNoticeIds(res.readNoticeIds);
                          }}
                          className="text-xs font-semibold text-[#047857] dark:text-[#34D399] hover:underline"
                        >
                          Mark as Read
                        </button>
                      ) : (
                        <span className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">Read</span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-[#111827] dark:text-[#F9FAFB]">{n.title}</h3>
                    <p className="text-xs text-[#4B5563] dark:text-[#D1D5DB] leading-relaxed">{n.body}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="space-y-5">
          {/* Required Document Slots Checklist */}
          <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-3">
            <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">Required Verification Checklist</h2>
            <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
              Only lawful, non-Aadhaar documents are accepted. Agreement Version{' '}
              <strong>{stay.acceptedAgreementVersion || 'v2.0'}</strong> accepted on{' '}
              {new Date(stay.termsAcceptedAt).toLocaleDateString('en-IN')}.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {REQUIRED_DOC_SLOTS.map((slot) => {
                const match =
                  documents.find((d) => d.docType === slot.key) ||
                  (slot.key === 'DRIVING_LICENSE' ? documents.find((d) => d.docType === 'PASSPORT') : undefined);
                return (
                  <div
                    key={slot.key}
                    className="p-3.5 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937]"
                  >
                    <p className="text-xs font-bold text-[#111827] dark:text-[#F9FAFB]">{slot.label}</p>
                    <div className="mt-2">
                      {match ? (
                        <StatusIndicator
                          status={match.status === 'VERIFIED' ? 'success' : match.status === 'REJECTED' ? 'error' : 'warning'}
                          label={match.status.replace(/_/g, ' ')}
                        />
                      ) : (
                        <StatusIndicator status="neutral" label="NOT SUBMITTED" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <form
              onSubmit={handleUploadDoc}
              className="lg:col-span-5 rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-3"
            >
              <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">Upload Private Verification Document</h2>
              <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                Private to you and your PG Owner. We strictly block Aadhaar uploads or UIDAI numbers.
              </p>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="w-full min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#1F2937] text-sm text-[#111827] dark:text-[#F9FAFB]"
              >
                {Object.entries(LAWFUL_DOCUMENT_LABELS).map(([k, lbl]) => (
                  <option key={k} value={k}>{lbl}</option>
                ))}
              </select>
              <input
                type="text"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                placeholder="Document Label (e.g. Infosys Employee ID)"
                required
                className="w-full min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#1F2937] text-sm text-[#111827] dark:text-[#F9FAFB]"
              />
              <input
                type="text"
                value={docUrl}
                onChange={(e) => setDocUrl(e.target.value)}
                placeholder="Document link or reference (optional)"
                className="w-full min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#1F2937] text-sm text-[#111827] dark:text-[#F9FAFB]"
              />
              <button type="submit" className="w-full min-h-[44px] rounded-xl bg-[#047857] dark:bg-[#10B981] text-white dark:text-[#0B1220] text-sm font-semibold">
                Upload Private Document
              </button>
            </form>

            <div className="lg:col-span-7 rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-3">
              <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">Your Submitted Documents</h2>
              {documents.length === 0 ? (
                <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF]">No documents uploaded yet.</p>
              ) : (
                documents.map((d) => {
                  const needsReplace = d.status === 'REJECTED' || d.status === 'RESUBMISSION_REQUIRED';
                  return (
                    <div
                      key={d.id}
                      className="p-4 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] space-y-2.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-[#111827] dark:text-[#F9FAFB]">{d.title}</p>
                          <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                            {d.docType.replace(/_/g, ' ')} · Uploaded {new Date(d.uploadedAt).toLocaleDateString('en-IN')}
                          </p>
                          {d.notes && <p className="mt-1 text-xs text-[#4B5563] dark:text-[#D1D5DB]">Review Note: {d.notes}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusIndicator
                            status={d.status === 'VERIFIED' ? 'success' : d.status === 'REJECTED' ? 'error' : 'warning'}
                            label={d.status.replace(/_/g, ' ')}
                          />
                          {needsReplace && (
                            <button
                              type="button"
                              onClick={() => {
                                setReplacingDocId(replacingDocId === d.id ? null : d.id);
                                setReplaceTitle(d.title);
                                setReplaceUrl(d.fileUrl);
                              }}
                              className="min-h-[34px] px-3 rounded-lg bg-[#047857] dark:bg-[#10B981] text-white dark:text-[#0B1220] text-xs font-semibold inline-flex items-center gap-1"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              Replace
                            </button>
                          )}
                        </div>
                      </div>

                      {replacingDocId === d.id && (
                        <div className="pt-2 border-t border-[#E5E7EB] dark:border-[#374151] grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <input
                            type="text"
                            value={replaceTitle}
                            onChange={(e) => setReplaceTitle(e.target.value)}
                            placeholder="Updated document title"
                            className="min-h-[38px] px-3 rounded-lg border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] text-xs text-[#111827] dark:text-[#F9FAFB]"
                          />
                          <input
                            type="text"
                            value={replaceUrl}
                            onChange={(e) => setReplaceUrl(e.target.value)}
                            placeholder="New document URL"
                            className="min-h-[38px] px-3 rounded-lg border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] text-xs text-[#111827] dark:text-[#F9FAFB]"
                          />
                          <button
                            type="button"
                            onClick={() => handleReplaceDoc(d.id)}
                            className="min-h-[38px] px-3 rounded-lg bg-[#047857] text-white text-xs font-semibold"
                          >
                            Submit Replacement
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'complaints' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <form
              onSubmit={submitComplaint}
              className="lg:col-span-5 rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-4"
            >
              <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">Submit Complaint</h2>
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={cmpCategory}
                  onChange={(e) => setCmpCategory(e.target.value)}
                  className="min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#1F2937] text-sm text-[#111827] dark:text-[#F9FAFB]"
                >
                  <option value="INTERNET">Internet / Wi-Fi</option>
                  <option value="PLUMBING">Plumbing</option>
                  <option value="ELECTRICAL">Electrical</option>
                  <option value="CLEANING">Housekeeping</option>
                  <option value="FOOD">Food &amp; Mess</option>
                  <option value="SECURITY">Security</option>
                </select>
                <select
                  value={cmpPriority}
                  onChange={(e) => setCmpPriority(e.target.value)}
                  className="min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#1F2937] text-sm text-[#111827] dark:text-[#F9FAFB]"
                >
                  <option value="LOW">Low Priority</option>
                  <option value="MEDIUM">Medium Priority</option>
                  <option value="HIGH">High Priority</option>
                </select>
              </div>
              <textarea
                rows={3}
                value={cmpDesc}
                onChange={(e) => setCmpDesc(e.target.value)}
                placeholder="Describe the issue clearly..."
                required
                className="w-full p-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#1F2937] text-sm text-[#111827] dark:text-[#F9FAFB]"
              />
              <input
                type="text"
                value={cmpPhotoUrl}
                onChange={(e) => setCmpPhotoUrl(e.target.value)}
                placeholder="Photo evidence URL (optional)"
                className="w-full min-h-[42px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#1F2937] text-sm text-[#111827] dark:text-[#F9FAFB]"
              />
              <button type="submit" className="w-full min-h-[44px] rounded-xl bg-[#047857] dark:bg-[#10B981] text-white dark:text-[#0B1220] text-sm font-semibold">
                Submit Complaint
              </button>
            </form>

            <div className="lg:col-span-7 rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-3">
              <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">Your Complaints</h2>
              {complaints.length === 0 ? (
                <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF]">No complaints logged.</p>
              ) : (
                complaints.map((c) => (
                  <div
                    key={c.id}
                    className="p-4 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] space-y-2.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#111827] dark:text-[#F9FAFB]">
                        {c.category} · {c.priority}
                      </span>
                      <StatusIndicator status={c.status === 'RESOLVED' || c.status === 'CLOSED' ? 'success' : 'warning'} label={c.status} />
                    </div>
                    <p className="text-sm text-[#111827] dark:text-[#F9FAFB]">{c.description}</p>
                    {c.resolutionNotes && (
                      <p className="text-xs text-[#047857] dark:text-[#34D399]">Owner Resolution: {c.resolutionNotes}</p>
                    )}

                    {c.timeline && c.timeline.length > 0 && (
                      <div className="space-y-1 pl-3 border-l-2 border-[#E5E7EB] dark:border-[#374151] text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">
                        {c.timeline.map((t) => (
                          <p key={t.id}>
                            <strong className="text-[#111827] dark:text-[#F9FAFB]">{t.actorName}:</strong> {t.note}
                          </p>
                        ))}
                      </div>
                    )}

                    {c.status !== 'CLOSED' && (
                      <div className="pt-2 flex flex-wrap gap-2">
                        <input
                          type="text"
                          value={commentMap[c.id] || ''}
                          onChange={(e) => setCommentMap({ ...commentMap, [c.id]: e.target.value })}
                          placeholder="Add follow-up note..."
                          className="flex-1 min-w-[160px] min-h-[38px] px-3 rounded-lg border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] text-xs text-[#111827] dark:text-[#F9FAFB]"
                        />
                        <button
                          type="button"
                          onClick={() => handleComplaintComment(c.id)}
                          className="min-h-[38px] px-3 rounded-lg border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] text-xs font-semibold"
                        >
                          Reply
                        </button>
                        {c.status === 'RESOLVED' && !c.tenantConfirmedResolved && (
                          <button
                            type="button"
                            onClick={() => handleConfirmComplaintResolved(c.id)}
                            className="min-h-[38px] px-3 rounded-lg bg-[#047857] dark:bg-[#10B981] text-white dark:text-[#0B1220] text-xs font-semibold inline-flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Confirm Resolved
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Room Maintenance Request Module */}
          <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-[#047857] dark:text-[#34D399]" />
              <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">Room Maintenance Requests</h2>
            </div>
            <form onSubmit={handleCreateMaintenance} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <input
                type="text"
                required
                value={mntTitle}
                onChange={(e) => setMntTitle(e.target.value)}
                placeholder="e.g. Ceiling fan regulator noisy in Room 101"
                className="sm:col-span-2 min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-sm text-[#111827] dark:text-[#F9FAFB]"
              />
              <select
                value={mntPriority}
                onChange={(e) => setMntPriority(e.target.value as any)}
                className="min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-sm text-[#111827] dark:text-[#F9FAFB]"
              >
                <option value="LOW">Low Priority</option>
                <option value="MEDIUM">Medium Priority</option>
                <option value="HIGH">High Priority</option>
              </select>
              <button type="submit" className="min-h-[44px] rounded-xl bg-[#047857] dark:bg-[#10B981] text-white dark:text-[#0B1220] text-sm font-semibold">
                Request Maintenance
              </button>
            </form>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {maintenanceRequests.map((m) => (
                <div
                  key={m.id}
                  className="p-3.5 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] flex items-center justify-between gap-2"
                >
                  <div>
                    <p className="text-sm font-bold text-[#111827] dark:text-[#F9FAFB]">{m.title}</p>
                    <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                      Room {m.roomNumber || '-'} · Due {m.dueDate}
                    </p>
                  </div>
                  <StatusIndicator
                    status={m.status === 'COMPLETED' ? 'success' : 'warning'}
                    label={m.status.replace(/_/g, ' ')}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'services' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <form
              onSubmit={handleBookLaundry}
              className="lg:col-span-5 rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-3"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#047857] dark:text-[#34D399]" />
                <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">Book Laundry Pickup</h2>
              </div>
              <input
                type="text"
                value={laundryService}
                onChange={(e) => setLaundryService(e.target.value)}
                required
                className="w-full min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-sm text-[#111827] dark:text-[#F9FAFB]"
              />
              <input
                type="date"
                value={laundryDate}
                onChange={(e) => setLaundryDate(e.target.value)}
                required
                className="w-full min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-sm text-[#111827] dark:text-[#F9FAFB]"
              />
              <input
                type="text"
                value={laundrySummary}
                onChange={(e) => setLaundrySummary(e.target.value)}
                placeholder="e.g. 5kg Wash & Fold + 4 Formal Shirts Iron"
                required
                className="w-full min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-sm text-[#111827] dark:text-[#F9FAFB]"
              />
              <button type="submit" className="w-full min-h-[44px] rounded-xl bg-[#047857] dark:bg-[#10B981] text-white dark:text-[#0B1220] text-sm font-semibold">
                Schedule Pickup
              </button>
            </form>

            <div className="lg:col-span-7 rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-4">
              <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">Reception Parcels &amp; Laundry History</h2>
              {parcels.map((p) => (
                <div
                  key={p.id}
                  className="p-3.5 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] flex items-center justify-between gap-2"
                >
                  <div>
                    <p className="text-sm font-bold text-[#111827] dark:text-[#F9FAFB]">
                      Parcel: {p.carrier} · #{p.trackingSuffix}
                    </p>
                    <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                      {p.pickedUpAt ? `Picked up ${new Date(p.pickedUpAt).toLocaleDateString('en-IN')}` : 'Waiting at PG reception'}
                    </p>
                  </div>
                  {!p.pickedUpAt ? (
                    <button
                      type="button"
                      onClick={async () => {
                        await apiFetch(`/api/v1/operations/tenant/parcels/${p.id}/pickup`, { method: 'POST' });
                        showToast('Parcel marked picked up');
                        await loadData();
                      }}
                      className="min-h-[36px] px-3 rounded-lg bg-[#047857] text-white text-xs font-semibold"
                    >
                      Mark Picked Up
                    </button>
                  ) : (
                    <StatusIndicator status="success" label="Picked Up" />
                  )}
                </div>
              ))}

              {laundryRequests.map((l) => (
                <div
                  key={l.id}
                  className="p-3.5 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] flex items-center justify-between gap-2"
                >
                  <div>
                    <p className="text-sm font-bold text-[#111827] dark:text-[#F9FAFB]">{l.serviceName}</p>
                    <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                      {l.itemsSummary} · Pickup {l.pickupDate} · Est. {formatInr(l.estimatedInr)}
                    </p>
                  </div>
                  <StatusIndicator status={l.status === 'DELIVERED' ? 'success' : 'info'} label={l.status} />
                </div>
              ))}
            </div>
          </div>

          {nearbyBusinesses.length > 0 && (
            <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">Nearby Local Offers</h2>
                <Link to="/tenant/connect" className="text-xs font-semibold text-[#047857] dark:text-[#34D399] hover:underline">
                  View all local services
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {nearbyBusinesses.slice(0, 3).map((b) => (
                  <div key={b.id} className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151]">
                    <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                      {b.category} · {b.locality}
                    </p>
                    <p className="mt-0.5 text-sm font-bold text-[#111827] dark:text-[#F9FAFB]">{b.name}</p>
                    <p className="mt-1 text-xs font-semibold text-[#047857] dark:text-[#34D399]">{b.offerText}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'roommates' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-4">
            <div>
              <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">Roommate Shared Expenses</h2>
              <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                Shared room groceries &amp; utility splits are kept separate from official PG rent accounting.
              </p>
            </div>
            <form onSubmit={addRoommateExpense} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <input
                type="text"
                value={rmTitle}
                onChange={(e) => setRmTitle(e.target.value)}
                placeholder="e.g. Water cans & detergent"
                required
                className="sm:col-span-2 min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#1F2937] text-sm text-[#111827] dark:text-[#F9FAFB]"
              />
              <input
                type="number"
                value={rmAmount}
                onChange={(e) => setRmAmount(e.target.value)}
                placeholder="Amount (₹)"
                required
                className="min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#1F2937] text-sm text-[#111827] dark:text-[#F9FAFB] tabular-nums"
              />
              <button type="submit" className="min-h-[44px] rounded-xl bg-[#047857] dark:bg-[#10B981] text-white dark:text-[#0B1220] text-sm font-semibold">
                Add Split
              </button>
            </form>
            <div className="flex items-center gap-2 text-xs text-[#6B7280] dark:text-[#9CA3AF]">
              <span>Split count:</span>
              <input
                type="number"
                min={1}
                max={6}
                value={rmSplitCount}
                onChange={(e) => setRmSplitCount(e.target.value)}
                className="w-16 min-h-[34px] px-2 rounded-lg border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-[#111827] dark:text-[#F9FAFB] tabular-nums"
              />
              <span>roommates</span>
            </div>
            <div className="space-y-2">
              {roommateExpenses.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] flex flex-wrap items-center justify-between gap-3"
                >
                  <div>
                    <p className={`text-sm font-semibold ${item.isSettled ? 'line-through text-[#6B7280]' : 'text-[#111827] dark:text-[#F9FAFB]'}`}>
                      {item.title}
                    </p>
                    <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                      Added by {item.addedByName} · {formatInr(item.amountInr / item.splitCount)}/person
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-[#111827] dark:text-[#F9FAFB] tabular-nums">
                      {formatInr(item.amountInr)}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleExpenseSettled(item.id)}
                      className={`min-h-[34px] px-3 rounded-lg text-xs font-semibold border ${
                        item.isSettled
                          ? 'bg-[#ECFDF5] dark:bg-[#10B981]/15 border-[#047857] text-[#047857] dark:text-[#34D399]'
                          : 'bg-white dark:bg-[#111827] border-[#E5E7EB] dark:border-[#374151] text-[#111827] dark:text-[#F9FAFB]'
                      }`}
                    >
                      {item.isSettled ? 'Settled' : 'Mark Settled'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5 rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-4">
            <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">Shared Groceries &amp; Room Tasks</h2>
            <form onSubmit={addRoommateTask} className="space-y-2.5">
              <div className="flex gap-2">
                <select
                  value={taskType}
                  onChange={(e) => setTaskType(e.target.value as any)}
                  className="min-h-[42px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-xs font-semibold text-[#111827] dark:text-[#F9FAFB]"
                >
                  <option value="GROCERY">Grocery Item</option>
                  <option value="TASK">Room Chore</option>
                </select>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g. Refill RO water can"
                  className="flex-1 min-h-[42px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-xs text-[#111827] dark:text-[#F9FAFB]"
                />
              </div>
              <button type="submit" className="w-full min-h-[40px] rounded-xl bg-[#047857] dark:bg-[#10B981] text-white dark:text-[#0B1220] text-xs font-semibold">
                Add to Room List
              </button>
            </form>
            <div className="space-y-2">
              {roommateTasks.map((t) => (
                <label
                  key={t.id}
                  className="p-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] flex items-center justify-between gap-2 cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <input type="checkbox" checked={t.completed} onChange={() => toggleRoommateTask(t.id)} />
                    <div>
                      <p className={`text-xs font-semibold ${t.completed ? 'line-through text-[#6B7280]' : 'text-[#111827] dark:text-[#F9FAFB]'}`}>
                        {t.title}
                      </p>
                      <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">
                        {t.type} · {t.assignedToName || t.addedByName}
                      </p>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'checkout' && (
        <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-6 space-y-5">
          <h2 className="text-lg font-bold text-[#111827] dark:text-[#F9FAFB]">Checkout &amp; Deposit Settlement</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151]">
              <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">Notice Period</p>
              <p className="mt-1 font-mono text-lg font-bold text-[#111827] dark:text-[#F9FAFB]">{stay.noticeDays} days</p>
            </div>
            <div className="p-4 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151]">
              <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">Pending Rent &amp; Dues</p>
              <p className="mt-1 font-mono text-lg font-bold text-[#111827] dark:text-[#F9FAFB] tabular-nums">
                {formatInr(pendingRentInr + pendingDuesInr)}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151]">
              <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">Estimated Deposit Refund</p>
              <p className="mt-1 font-mono text-lg font-bold text-[#047857] dark:text-[#34D399] tabular-nums">
                {formatInr(Math.max(0, stay.securityDepositInr - pendingRentInr - pendingDuesInr))}
              </p>
            </div>
          </div>

          {stay.depositSettlementHistory && stay.depositSettlementHistory.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-[#111827] dark:text-[#F9FAFB]">Deposit Ledger</p>
              {stay.depositSettlementHistory.map((item) => (
                <div key={item.id} className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151] flex items-center justify-between text-xs">
                  <span>{item.type} · {item.label}</span>
                  <span className="font-mono font-bold tabular-nums">{formatInr(item.amountInr)}</span>
                </div>
              ))}
            </div>
          )}

          {stay.status === 'CHECKOUT_REQUESTED' ? (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 space-y-1">
              <StatusIndicator status="warning" label="Checkout requested — awaiting owner finalization and bed release." />
              {stay.expectedCheckoutDate && (
                <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                  Expected vacate date: <strong>{stay.expectedCheckoutDate}</strong>
                </p>
              )}
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-end gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] mb-1">
                  Expected Move-out Date
                </label>
                <input
                  type="date"
                  value={expectedCheckoutDate}
                  onChange={(e) => setExpectedCheckoutDate(e.target.value)}
                  className="min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-sm text-[#111827] dark:text-[#F9FAFB]"
                />
              </div>
              <button
                type="button"
                onClick={handleRequestCheckout}
                className="min-h-[44px] px-5 rounded-xl bg-[#DC2626] hover:bg-red-700 text-white text-sm font-semibold"
              >
                Request Checkout
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
