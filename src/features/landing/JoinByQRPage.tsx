import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  QrCode,
  ArrowRight,
  ShieldCheck,
  MapPin,
  BedDouble,
  CheckCircle2,
  AlertTriangle,
  Building2,
  UserCheck,
  ScrollText,
} from 'lucide-react';
import { PublicHeader } from '../../layouts/PublicShell';
import { apiFetch } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { UserRole } from '../../../packages/shared/types';
import { getHomeRouteForRole } from '../../../packages/shared/permissions';
import { CardSkeleton, formatInr, StatusIndicator } from '../../components/ui/CommonUI';

interface QRPropertySummary {
  id: string;
  name: string;
  description: string;
  genderType: 'MALE' | 'FEMALE' | 'CO_ED';
  locality: string;
  city: string;
  state: string;
  address: string;
  landmark: string;
  startingRentInr: number;
  securityDepositInr: number;
  amenities: string[];
  rules: string[];
  images: string[];
  rating: number;
  reviewCount: number;
  availableBeds: number;
  totalBeds: number;
  approvalStatus: string;
  locationStatus: string;
}

interface RoomTypeSummary {
  roomType: 'SINGLE' | 'TWIN' | 'TRIPLE' | 'FOUR_SHARING';
  roomCount: number;
  availableBeds: number;
  startingRentInr: number;
  depositInr: number;
}

interface QRLookupResponse {
  eligible: boolean;
  ineligibleReason: string | null;
  property: QRPropertySummary;
  ownerName: string;
  roomTypesSummary: RoomTypeSummary[];
}

export function JoinByQRPage() {
  const { pgId } = useParams<{ pgId: string }>();
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [lookupError, setLookupError] = useState('');
  const [data, setData] = useState<QRLookupResponse | null>(null);

  const [roomType, setRoomType] = useState<'SINGLE' | 'TWIN' | 'TRIPLE' | 'FOUR_SHARING'>('TWIN');
  const [moveInDate, setMoveInDate] = useState('2026-12-01');
  const [notes, setNotes] = useState('');
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!pgId) return;
    setLoading(true);
    setLookupError('');
    apiFetch<QRLookupResponse>(`/api/v1/properties/qr/${pgId}`)
      .then((res) => {
        setData(res);
        const firstOpen = res.roomTypesSummary.find((r) => r.availableBeds > 0) || res.roomTypesSummary[0];
        if (firstOpen) setRoomType(firstOpen.roomType);
      })
      .catch((err: any) => {
        setLookupError(err.message || 'Could not load PG QR onboarding details.');
      })
      .finally(() => setLoading(false));
  }, [pgId]);

  const handleQuickJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate(`/login?next=/join/${pgId}`);
      return;
    }
    if (user.role !== UserRole.TENANT) {
      showToast('Tenant account required', 'Sign in with a Tenant account to submit a joining request.', 'info');
      return;
    }
    if (!consentAccepted) {
      showToast('Confirm Onboarding Consent', 'Please confirm that you understand owner approval is required.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch('/api/v1/operations/joining-requests', {
        method: 'POST',
        body: JSON.stringify({
          propertyId: pgId,
          preferredRoomType: roomType,
          moveInDate,
          notes: notes.trim() || 'Submitted via PG Property QR Onboarding',
          origin: 'QR',
          consentAccepted: true,
        }),
      });
      showToast('QR Joining Request Submitted', 'The PG owner will review your request and assign your bed.');
      navigate('/tenant/home');
    } catch (err: any) {
      showToast('Could not submit request', err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-[100dvh] bg-[#F8FAFC] dark:bg-[#0B1220] flex flex-col overflow-y-auto overflow-x-hidden transition-colors">
      <PublicHeader />
      <main className="flex-1 px-4 py-6 sm:py-10">
        <div className="max-w-3xl mx-auto space-y-5">
          {loading ? (
            <CardSkeleton rows={3} />
          ) : lookupError || !data ? (
            <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-6 text-center space-y-3">
              <AlertTriangle className="w-8 h-8 text-[#D97706] mx-auto" />
              <h1 className="font-display text-xl font-bold text-[#111827] dark:text-[#F9FAFB]">
                QR Property Unavailable
              </h1>
              <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF]">
                {lookupError || 'This PG QR code could not be found.'}
              </p>
              <Link
                to="/explore"
                className="inline-flex min-h-[42px] px-5 rounded-xl bg-[#047857] text-white text-sm font-semibold items-center gap-2"
              >
                Browse Verified PGs
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <>
              {/* PG Overview Header */}
              <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 sm:p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#047857] dark:text-[#34D399]">
                    <QrCode className="w-4 h-4" />
                    PG QR Digital Onboarding
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusIndicator
                      status={data.eligible ? 'success' : 'warning'}
                      label={data.eligible ? 'Approved & Location Verified' : 'Not Active for QR'}
                    />
                  </div>
                </div>

                <div>
                  <h1 className="font-display text-2xl font-bold text-[#111827] dark:text-[#F9FAFB]">
                    {data.property.name}
                  </h1>
                  <p className="mt-1 text-sm text-[#6B7280] dark:text-[#9CA3AF] flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-4 h-4 text-[#047857] dark:text-[#34D399]" />
                      {data.property.address}
                    </span>
                    <span>·</span>
                    <span>Managed by {data.ownerName}</span>
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-[#E5E7EB] dark:border-[#374151]">
                  <div>
                    <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">Starting Rent</p>
                    <p className="font-mono text-sm font-bold text-[#047857] dark:text-[#34D399] tabular-nums">
                      {formatInr(data.property.startingRentInr)}/mo
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">Security Deposit</p>
                    <p className="font-mono text-sm font-bold text-[#111827] dark:text-[#F9FAFB] tabular-nums">
                      {formatInr(data.property.securityDepositInr)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">Available Beds</p>
                    <p className="font-mono text-sm font-bold text-[#111827] dark:text-[#F9FAFB] tabular-nums">
                      {data.property.availableBeds} / {data.property.totalBeds}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">Resident Type</p>
                    <p className="text-sm font-bold text-[#111827] dark:text-[#F9FAFB]">
                      {data.property.genderType.replace('_', '-')}
                    </p>
                  </div>
                </div>
              </div>

              {!data.eligible ? (
                <div className="rounded-2xl border border-[#D97706]/30 bg-amber-50 dark:bg-amber-950/30 p-5 space-y-2">
                  <div className="flex items-center gap-2 text-[#D97706] dark:text-amber-300 font-bold text-sm">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    QR Onboarding Temporarily Disabled
                  </div>
                  <p className="text-xs text-[#4B5563] dark:text-[#D1D5DB]">
                    {data.ineligibleReason ||
                      'This PG must be approved, location-verified, and active before accepting resident joining requests.'}
                  </p>
                  <Link
                    to="/explore"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#047857] dark:text-[#34D399] hover:underline pt-1"
                  >
                    Browse eligible PGs
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ) : data.property.availableBeds === 0 ? (
                <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-6 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-bold text-[#DC2626] dark:text-red-400">
                    <BedDouble className="w-4 h-4" />
                    No Vacant Beds Currently Available
                  </div>
                  <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                    All {data.property.totalBeds} beds in {data.property.name} are currently occupied or reserved.
                  </p>
                  <Link
                    to="/explore"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#047857] dark:text-[#34D399] hover:underline pt-1"
                  >
                    Explore nearby PGs with vacancies
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                  {/* Left: Room Options & House Rules */}
                  <div className="md:col-span-5 space-y-4">
                    <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-4 space-y-3">
                      <h2 className="text-sm font-bold text-[#111827] dark:text-[#F9FAFB] flex items-center gap-1.5">
                        <BedDouble className="w-4 h-4 text-[#047857] dark:text-[#34D399]" />
                        Sharing &amp; Pricing
                      </h2>
                      <div className="space-y-2">
                        {data.roomTypesSummary.map((rt) => (
                          <button
                            key={rt.roomType}
                            type="button"
                            onClick={() => setRoomType(rt.roomType)}
                            className={`w-full text-left p-3 rounded-xl border transition-colors ${
                              roomType === rt.roomType
                                ? 'border-[#047857] dark:border-[#34D399] bg-[#ECFDF5] dark:bg-[#10B981]/15'
                                : 'border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937]'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-[#111827] dark:text-[#F9FAFB]">
                                {rt.roomType.replace('_', ' ')} Sharing
                              </span>
                              <span className="font-mono text-xs font-bold text-[#047857] dark:text-[#34D399] tabular-nums">
                                {formatInr(rt.startingRentInr)}/mo
                              </span>
                            </div>
                            <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF] mt-0.5 tabular-nums">
                              {rt.availableBeds} beds open · Deposit {formatInr(rt.depositInr)}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {data.property.rules.length > 0 && (
                      <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-4 space-y-2">
                        <h2 className="text-sm font-bold text-[#111827] dark:text-[#F9FAFB] flex items-center gap-1.5">
                          <ScrollText className="w-4 h-4 text-[#047857] dark:text-[#34D399]" />
                          Key House Rules
                        </h2>
                        <ul className="space-y-1.5">
                          {data.property.rules.slice(0, 5).map((r, i) => (
                            <li key={i} className="text-xs text-[#4B5563] dark:text-[#D1D5DB] flex items-start gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#047857] dark:text-[#34D399] shrink-0 mt-0.5" />
                              <span>{r}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Right: Onboarding Request Form / Auth Gate */}
                  <div className="md:col-span-7 rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5">
                    {!user ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-[#047857] dark:text-[#34D399]">
                          <ShieldCheck className="w-5 h-5" />
                          <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">
                            Sign In or Register to Join {data.property.name}
                          </h2>
                        </div>
                        <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                          Verified tenant authentication protects residents and owners. You will return straight to this PG&apos;s onboarding form immediately after sign-in.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                          <Link
                            to={`/login?next=${encodeURIComponent(`/join/${pgId}`)}`}
                            className="min-h-[44px] px-4 rounded-xl bg-[#047857] hover:bg-[#065F46] text-white text-xs font-semibold inline-flex items-center justify-center gap-2"
                          >
                            Sign In as Tenant
                            <ArrowRight className="w-4 h-4" />
                          </Link>
                          <Link
                            to={`/register?role=TENANT&next=${encodeURIComponent(`/join/${pgId}`)}`}
                            className="min-h-[44px] px-4 rounded-xl border border-[#E5E7EB] dark:border-[#374151] text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] hover:bg-[#F8FAFC] dark:hover:bg-[#1F2937] inline-flex items-center justify-center gap-2"
                          >
                            Create Tenant Account
                          </Link>
                        </div>
                      </div>
                    ) : user.role !== UserRole.TENANT ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-[#D97706] font-bold text-sm">
                          <Building2 className="w-4 h-4" />
                          Logged in as {user.role.replace('_', ' ')}
                        </div>
                        <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                          Only verified Tenant accounts can submit resident onboarding requests via QR code.
                        </p>
                        <Link
                          to={getHomeRouteForRole(user.role)}
                          className="inline-flex min-h-[40px] px-4 rounded-xl bg-[#047857] text-white text-xs font-semibold items-center gap-1.5"
                        >
                          Return to Dashboard
                        </Link>
                      </div>
                    ) : (
                      <form onSubmit={handleQuickJoin} className="space-y-4">
                        <div className="flex items-center justify-between pb-2 border-b border-[#E5E7EB] dark:border-[#374151]">
                          <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB] flex items-center gap-1.5">
                            <UserCheck className="w-4 h-4 text-[#047857] dark:text-[#34D399]" />
                            Complete Onboarding Request
                          </h2>
                        </div>

                        <div className="rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151] p-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-[#6B7280] dark:text-[#9CA3AF]">Applicant: </span>
                            <strong className="text-[#111827] dark:text-[#F9FAFB]">{user.fullName}</strong>
                          </div>
                          <div>
                            <span className="text-[#6B7280] dark:text-[#9CA3AF]">Phone: </span>
                            <strong className="font-mono text-[#111827] dark:text-[#F9FAFB]">{user.phone}</strong>
                          </div>
                          <div className="sm:col-span-2">
                            <span className="text-[#6B7280] dark:text-[#9CA3AF]">Email: </span>
                            <strong className="text-[#111827] dark:text-[#F9FAFB]">{user.email}</strong>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] mb-1">
                              Preferred Room Sharing
                            </label>
                            <select
                              value={roomType}
                              onChange={(e) => setRoomType(e.target.value as any)}
                              className="w-full min-h-[42px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] text-sm bg-[#F8FAFC] dark:bg-[#1F2937] text-[#111827] dark:text-[#F9FAFB]"
                            >
                              <option value="SINGLE">Single Occupancy</option>
                              <option value="TWIN">Twin Sharing</option>
                              <option value="TRIPLE">Triple Sharing</option>
                              <option value="FOUR_SHARING">4-Sharing</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] mb-1">
                              Expected Move-in Date
                            </label>
                            <input
                              type="date"
                              value={moveInDate}
                              onChange={(e) => setMoveInDate(e.target.value)}
                              required
                              className="w-full min-h-[42px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] text-sm bg-[#F8FAFC] dark:bg-[#1F2937] text-[#111827] dark:text-[#F9FAFB]"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] mb-1">
                            Note to PG Owner (optional)
                          </label>
                          <textarea
                            rows={2}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Preferred floor, check-in timing, food preference, or workplace/college details..."
                            className="w-full p-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] text-sm bg-[#F8FAFC] dark:bg-[#1F2937] text-[#111827] dark:text-[#F9FAFB]"
                          />
                        </div>

                        <label className="flex items-start gap-2.5 text-xs text-[#4B5563] dark:text-[#D1D5DB] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={consentAccepted}
                            onChange={(e) => setConsentAccepted(e.target.checked)}
                            className="mt-0.5 rounded border-[#E5E7EB]"
                          />
                          <span>
                            I understand this submits a joining request for PG Owner approval, bed assignment, and digital house-rules acceptance before stay activation.
                          </span>
                        </label>

                        <button
                          type="submit"
                          disabled={submitting}
                          className="w-full min-h-[46px] rounded-xl bg-[#047857] hover:bg-[#065F46] dark:bg-[#10B981] dark:hover:bg-[#059669] disabled:opacity-50 text-white dark:text-[#0B1220] text-sm font-semibold inline-flex items-center justify-center gap-2"
                        >
                          {submitting ? 'Submitting Request...' : 'Submit QR Onboarding Request'}
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
