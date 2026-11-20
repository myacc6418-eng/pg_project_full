import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  ShieldCheck,
  QrCode,
  BedDouble,
  Utensils,
  Phone,
  Mail,
  Heart,
  Star,
} from 'lucide-react';
import { PublicHeader, PublicFooter } from '../../layouts/PublicShell';
import { SafeImage } from '../../components/ui/SafeImage';
import { CardSkeleton, formatInr, StatusIndicator } from '../../components/ui/CommonUI';
import { apiFetch } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { Bed, BedStatus, FoodMenuDay, Property, PropertyReview, Room, UserRole } from '../../../packages/shared/types';

interface DetailedProperty extends Property {
  rooms: Room[];
  beds: Bed[];
  availableBeds: number;
}

export function PropertyDetailPage({ embedded = false }: { embedded?: boolean }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [property, setProperty] = useState<DetailedProperty | null>(null);
  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState<string | undefined>(undefined);
  const [ownerEmail, setOwnerEmail] = useState<string | undefined>(undefined);
  const [foodMenu, setFoodMenu] = useState<FoodMenuDay[]>([]);
  const [reviews, setReviews] = useState<PropertyReview[]>([]);
  const [isSaved, setIsSaved] = useState(false);
  const [canReview, setCanReview] = useState(false);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [preferredRoomType, setPreferredRoomType] = useState<'SINGLE' | 'TWIN' | 'TRIPLE' | 'FOUR_SHARING'>('TWIN');
  const [moveInDate, setMoveInDate] = useState('2026-12-01');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [revRating, setRevRating] = useState(5);
  const [revComment, setRevComment] = useState('');
  const [submittingRev, setSubmittingRev] = useState(false);

  const loadDetail = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await apiFetch<{
        property: DetailedProperty;
        ownerName: string;
        ownerPhone?: string;
        ownerEmail?: string;
        foodMenu: FoodMenuDay[];
        reviews: PropertyReview[];
        isSaved?: boolean;
        canReview?: boolean;
      }>(`/api/v1/properties/public/${id}`);
      setProperty(res.property);
      setOwnerName(res.ownerName);
      setOwnerPhone(res.ownerPhone);
      setOwnerEmail(res.ownerEmail);
      setFoodMenu(res.foodMenu || []);
      setReviews(res.reviews || []);
      setIsSaved(Boolean(res.isSaved));
      setCanReview(Boolean(res.canReview));
      setActiveImageIdx(0);
    } catch (err: any) {
      setError(err.message || 'Property unavailable');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
  }, [id]);

  const handleToggleSave = async () => {
    if (!user) {
      showToast('Login to save PGs', 'Sign in to bookmark PGs to your shortlist.', 'info');
      return;
    }
    try {
      const res = await apiFetch<{ saved: boolean }>(`/api/v1/properties/saved/${id}`, { method: 'POST' });
      setIsSaved(res.saved);
      showToast(res.saved ? 'Saved to your shortlist' : 'Removed from saved PGs');
    } catch {
      showToast('Could not update shortlist', undefined, 'error');
    }
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate(`/login?next=/join/${id}`);
      return;
    }
    if (user.role !== UserRole.TENANT) {
      showToast('Tenant account required', 'Switch to a Tenant account to submit a joining request.', 'info');
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch('/api/v1/operations/joining-requests', {
        method: 'POST',
        body: JSON.stringify({
          propertyId: id,
          preferredRoomType,
          moveInDate,
          notes,
        }),
      });
      showToast('Joining request sent', 'The PG owner will review your request and assign a bed.');
      navigate('/tenant/home');
    } catch (err: any) {
      showToast('Could not submit request', err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingRev(true);
    try {
      await apiFetch(`/api/v1/properties/public/${id}/reviews`, {
        method: 'POST',
        body: JSON.stringify({ rating: revRating, comment: revComment }),
      });
      setRevComment('');
      showToast('Review published', 'Thank you for sharing verified resident feedback.');
      await loadDetail();
    } catch (err: any) {
      showToast('Could not submit review', err.message, 'error');
    } finally {
      setSubmittingRev(false);
    }
  };

  const inner = (
    <div className={embedded ? '' : 'max-w-6xl mx-auto px-4 sm:px-6 py-8'}>
      <div className="flex items-center justify-between gap-4 mb-5">
        <Link
          to={embedded ? '/tenant/explore' : '/explore'}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#047857] dark:text-[#34D399] hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to PG Search
        </Link>

        {property && (
          <button
            type="button"
            onClick={handleToggleSave}
            className="min-h-[40px] px-3.5 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] inline-flex items-center gap-1.5"
          >
            <Heart className={`w-4 h-4 ${isSaved ? 'fill-[#DC2626] text-[#DC2626]' : ''}`} />
            {isSaved ? 'Saved' : 'Save PG'}
          </button>
        )}
      </div>

      {loading ? (
        <CardSkeleton rows={3} />
      ) : error || !property ? (
        <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-8 text-center">
          <h2 className="text-lg font-bold text-[#111827] dark:text-[#F9FAFB]">PG Listing Unavailable</h2>
          <p className="mt-1 text-sm text-[#6B7280] dark:text-[#9CA3AF]">{error}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-6">
            <div className="rounded-2xl overflow-hidden border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827]">
              <div className="aspect-[16/9] bg-[#ECFDF5] dark:bg-[#1F2937]">
                <SafeImage
                  src={property.images[activeImageIdx] || property.images[0]}
                  alt={property.name}
                  fallbackTitle={property.name}
                  className="w-full h-full object-cover"
                />
              </div>
              {property.images.length > 1 && (
                <div className="px-6 pt-4 flex items-center gap-2 overflow-x-auto">
                  {property.images.map((img, idx) => (
                    <button
                      key={`${img}-${idx}`}
                      type="button"
                      onClick={() => setActiveImageIdx(idx)}
                      className={`w-20 h-14 rounded-xl overflow-hidden border-2 shrink-0 ${
                        activeImageIdx === idx
                          ? 'border-[#047857] dark:border-[#34D399]'
                          : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      <SafeImage src={img} alt={`${property.name} photo ${idx + 1}`} fallbackTitle={property.name} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              <div className="p-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-medium text-[#6B7280] dark:text-[#9CA3AF]">
                    {property.locality}, {property.city} · {property.genderType} · Managed by {ownerName}
                  </span>
                  <StatusIndicator status="success" label="Approved & Verified Location" />
                </div>
                <h1 className="mt-2 font-display text-2xl sm:text-3xl font-bold text-[#111827] dark:text-[#F9FAFB]">
                  {property.name}
                </h1>
                <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                  <span className="inline-flex items-center gap-1 font-semibold text-[#B45309] dark:text-[#FBBF24] tabular-nums">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    {property.rating > 0 ? `${property.rating.toFixed(1)} (${property.reviewCount} reviews)` : 'New verified listing'}
                  </span>
                  <span>·</span>
                  <span>{foodMenu.length > 0 ? 'Homely Mess Available' : 'Self-catering / Local Food'}</span>
                  <span>·</span>
                  <span>30-day Standard Notice Period</span>
                </div>
                <p className="mt-3 text-sm text-[#4B5563] dark:text-[#D1D5DB] leading-relaxed">{property.description}</p>

                <div className="mt-4 pt-4 border-t border-[#E5E7EB] dark:border-[#374151] flex flex-wrap items-center justify-between gap-4 text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-4 h-4 text-[#047857] dark:text-[#34D399]" />
                    {property.address} ({property.landmark})
                  </span>
                  {property.verifiedLat && property.verifiedLng && (
                    <span className="font-mono tabular-nums">
                      Verified GPS: {property.verifiedLat.toFixed(4)}, {property.verifiedLng.toFixed(4)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-6">
              <div className="flex items-center gap-2">
                <BedDouble className="w-5 h-5 text-[#047857] dark:text-[#34D399]" />
                <h2 className="text-lg font-bold text-[#111827] dark:text-[#F9FAFB]">Room Configurations &amp; Availability</h2>
              </div>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {property.rooms.map((room) => {
                  const roomBeds = property.beds.filter((b) => b.roomId === room.id);
                  const openCount = roomBeds.filter((b) => b.status === BedStatus.AVAILABLE).length;
                  return (
                    <div key={room.id} className="p-4 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937]">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-[#111827] dark:text-[#F9FAFB]">
                          Room {room.roomNumber} · {room.roomType}
                        </span>
                        <span className="text-xs font-semibold text-[#047857] dark:text-[#34D399] tabular-nums">
                          {openCount}/{roomBeds.length} beds open
                        </span>
                      </div>
                      <p className="mt-1 font-mono text-sm font-bold text-[#111827] dark:text-[#F9FAFB] tabular-nums">
                        {formatInr(room.monthlyRentInr)}/mo · Deposit {formatInr(room.depositInr)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">Amenities Included</h2>
                <ul className="mt-3 space-y-2 text-sm text-[#374151] dark:text-[#D1D5DB]">
                  {property.amenities.map((a) => (
                    <li key={a} className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-[#047857] dark:text-[#34D399] shrink-0" />
                      <span>{a}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">House Rules &amp; Policies</h2>
                <ul className="mt-3 space-y-2 text-sm text-[#4B5563] dark:text-[#9CA3AF] list-disc pl-5">
                  {property.rules.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </div>
            </div>

            {foodMenu.length > 0 && (
              <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-6">
                <div className="flex items-center gap-2">
                  <Utensils className="w-5 h-5 text-[#047857] dark:text-[#34D399]" />
                  <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">Sample Mess Menu</h2>
                </div>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {foodMenu.slice(0, 4).map((m) => (
                    <div key={m.day} className="p-3.5 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937]">
                      <p className="text-xs font-bold text-[#047857] dark:text-[#34D399]">{m.day}</p>
                      <p className="mt-1 text-xs text-[#111827] dark:text-[#F9FAFB]">Breakfast: {m.breakfast}</p>
                      <p className="mt-0.5 text-xs text-[#6B7280] dark:text-[#9CA3AF]">Dinner: {m.dinner}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Verified Resident Reviews */}
            <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-[#B45309] dark:text-[#FBBF24]" />
                  <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">
                    Verified Resident Reviews ({reviews.length})
                  </h2>
                </div>
                <span className="font-mono text-sm font-bold text-[#111827] dark:text-[#F9FAFB] tabular-nums">
                  {property.rating > 0 ? `${property.rating.toFixed(1)} / 5.0` : 'No rating yet'}
                </span>
              </div>

              {canReview && (
                <form
                  onSubmit={handleSubmitReview}
                  className="p-4 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] space-y-3"
                >
                  <p className="text-xs font-bold text-[#111827] dark:text-[#F9FAFB]">Write a Verified Resident Review</p>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRevRating(r)}
                        className={`min-h-[36px] px-3 rounded-lg text-xs font-bold border ${
                          revRating === r
                            ? 'bg-[#047857] dark:bg-[#10B981] text-white dark:text-[#0B1220] border-[#047857] dark:border-[#10B981]'
                            : 'bg-white dark:bg-[#111827] text-[#111827] dark:text-[#F9FAFB] border-[#E5E7EB] dark:border-[#374151]'
                        }`}
                      >
                        {r}★
                      </button>
                    ))}
                  </div>
                  <textarea
                    rows={2}
                    required
                    value={revComment}
                    onChange={(e) => setRevComment(e.target.value)}
                    placeholder="Share your honest stay experience regarding rooms, food, safety, and owner responsiveness..."
                    className="w-full p-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] text-sm text-[#111827] dark:text-[#F9FAFB]"
                  />
                  <button
                    type="submit"
                    disabled={submittingRev}
                    className="min-h-[40px] px-4 rounded-xl bg-[#047857] dark:bg-[#10B981] text-white dark:text-[#0B1220] text-xs font-semibold"
                  >
                    {submittingRev ? 'Publishing...' : 'Publish Review'}
                  </button>
                </form>
              )}

              {reviews.length === 0 ? (
                <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF]">
                  No resident reviews published yet. Only tenants with a verified stay can review.
                </p>
              ) : (
                <div className="space-y-3">
                  {reviews.map((rev) => (
                    <div
                      key={rev.id}
                      className="p-4 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-[#111827] dark:text-[#F9FAFB]">{rev.tenantName}</span>
                        <span className="font-mono font-bold text-[#B45309] dark:text-[#FBBF24] tabular-nums">
                          {'★'.repeat(rev.rating)} ({rev.rating}/5)
                        </span>
                      </div>
                      <p className="text-sm text-[#374151] dark:text-[#D1D5DB]">{rev.comment}</p>
                      {rev.ownerReply && (
                        <div className="pl-3 border-l-2 border-[#047857] dark:border-[#34D399] text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                          <strong className="text-[#047857] dark:text-[#34D399]">Owner Response:</strong> {rev.ownerReply}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-4 space-y-4">
            <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-6 sticky top-20">
              <div className="flex items-baseline justify-between pb-4 border-b border-[#E5E7EB] dark:border-[#374151]">
                <div>
                  <span className="font-mono text-2xl font-bold text-[#111827] dark:text-[#F9FAFB] tabular-nums">
                    {formatInr(property.startingRentInr)}
                  </span>
                  <span className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">/month starting</span>
                </div>
                <span className="text-xs font-semibold text-[#047857] dark:text-[#34D399] tabular-nums">
                  {property.availableBeds} beds available
                </span>
              </div>
              <p className="mt-3 text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                Security Deposit: <span className="font-mono font-semibold text-[#111827] dark:text-[#F9FAFB]">{formatInr(property.securityDepositInr)}</span>
              </p>

              {(ownerPhone || ownerEmail) && (
                <div className="mt-4 p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151] space-y-2">
                  <p className="text-xs font-bold text-[#111827] dark:text-[#F9FAFB]">Contact {ownerName}</p>
                  <div className="flex flex-wrap gap-2">
                    {ownerPhone && (
                      <a
                        href={`tel:${ownerPhone}`}
                        className="min-h-[38px] px-3 rounded-lg border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] inline-flex items-center gap-1.5"
                      >
                        <Phone className="w-3.5 h-3.5 text-[#047857] dark:text-[#34D399]" />
                        {ownerPhone}
                      </a>
                    )}
                    {ownerEmail && (
                      <a
                        href={`mailto:${ownerEmail}`}
                        className="min-h-[38px] px-3 rounded-lg border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] inline-flex items-center gap-1.5"
                      >
                        <Mail className="w-3.5 h-3.5 text-[#047857] dark:text-[#34D399]" />
                        Email Owner
                      </a>
                    )}
                  </div>
                </div>
              )}

              <form onSubmit={handleJoinSubmit} className="mt-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] mb-1">
                    Preferred Sharing Type
                  </label>
                  <select
                    value={preferredRoomType}
                    onChange={(e) => setPreferredRoomType(e.target.value as any)}
                    className="w-full min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] text-sm bg-[#F8FAFC] dark:bg-[#1F2937] text-[#111827] dark:text-[#F9FAFB]"
                  >
                    <option value="SINGLE">Single Room</option>
                    <option value="TWIN">Twin Sharing</option>
                    <option value="TRIPLE">Triple Sharing</option>
                    <option value="FOUR_SHARING">Four Sharing</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] mb-1">
                    Preferred Move-in Date
                  </label>
                  <input
                    type="date"
                    value={moveInDate}
                    onChange={(e) => setMoveInDate(e.target.value)}
                    className="w-full min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] text-sm bg-[#F8FAFC] dark:bg-[#1F2937] text-[#111827] dark:text-[#F9FAFB]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] mb-1">
                    Message to Owner (optional)
                  </label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Share your workplace/college or arrival time..."
                    className="w-full p-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] text-sm bg-[#F8FAFC] dark:bg-[#1F2937] text-[#111827] dark:text-[#F9FAFB]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full min-h-[48px] rounded-xl bg-[#047857] hover:bg-[#065F46] dark:bg-[#10B981] dark:hover:bg-[#059669] disabled:opacity-60 text-white dark:text-[#0B1220] text-sm font-semibold transition-colors"
                >
                  {submitting
                    ? 'Submitting Request...'
                    : user
                      ? 'Submit Joining Request'
                      : 'Login to Request Joining'}
                </button>
              </form>

              <div className="mt-5 pt-4 border-t border-[#E5E7EB] dark:border-[#374151] flex items-center justify-between text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                <span className="inline-flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-[#047857] dark:text-[#34D399]" />
                  Direct QR Join Link
                </span>
                <Link to={`/join/${property.id}`} className="font-mono text-[#047857] dark:text-[#34D399] hover:underline">
                  /join/{property.id}
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (embedded) return inner;
  return (
    <div className="h-[100dvh] overflow-y-auto overflow-x-hidden bg-[#F8FAFC] dark:bg-[#0B1220] flex flex-col transition-colors">
      <PublicHeader />
      <main className="flex-1">{inner}</main>
      <PublicFooter />
    </div>
  );
}
