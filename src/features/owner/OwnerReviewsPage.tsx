import React, { useEffect, useState } from 'react';
import { Star, MessageSquareReply } from 'lucide-react';
import { apiFetch } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { CardSkeleton } from '../../components/ui/CommonUI';
import { Property, PropertyReview } from '../../../packages/shared/types';

export function OwnerReviewsPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<PropertyReview[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

  const loadData = async () => {
    setLoading(true);
    try {
      const [revRes, ovRes] = await Promise.all([
        apiFetch<{ reviews: PropertyReview[] }>('/api/v1/operations/owner/reviews'),
        apiFetch<any>('/api/v1/operations/owner/overview?propertyId=ALL'),
      ]);
      setReviews(revRes.reviews || []);
      setProperties(ovRes.properties || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleReply = async (reviewId: string) => {
    const reply = (replyDrafts[reviewId] || '').trim();
    if (reply.length < 3) {
      showToast('Enter a reply (at least 3 characters)', undefined, 'error');
      return;
    }
    try {
      await apiFetch(`/api/v1/operations/owner/reviews/${reviewId}/reply`, {
        method: 'POST',
        body: JSON.stringify({ reply }),
      });
      showToast('Owner reply posted');
      await loadData();
    } catch (err: any) {
      showToast('Reply failed', err.message, 'error');
    }
  };

  if (loading) return <CardSkeleton rows={3} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2.5">
        <Star className="w-6 h-6 text-[#047857] dark:text-[#34D399]" />
        <div>
          <h1 className="font-display text-2xl font-bold text-[#111827] dark:text-[#F9FAFB]">Resident Reviews</h1>
          <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF]">
            Monitor resident feedback and post official management replies on your verified listings.
          </p>
        </div>
      </div>

      {reviews.length === 0 ? (
        <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-6 text-sm text-[#6B7280] dark:text-[#9CA3AF]">
          No resident reviews submitted yet.
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => {
            const prop = properties.find((p) => p.id === r.propertyId);
            return (
              <div
                key={r.id}
                className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-[#111827] dark:text-[#F9FAFB]">
                      {r.tenantName} · <span className="text-[#047857] dark:text-[#34D399]">{prop?.name}</span>
                    </p>
                    <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                      {new Date(r.createdAt).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-1 font-mono text-sm font-bold text-[#B45309] dark:text-amber-400">
                    <Star className="w-4 h-4 fill-current" />
                    {r.rating}/5
                  </div>
                </div>
                <p className="text-sm text-[#111827] dark:text-[#F9FAFB]">{r.comment}</p>

                {r.ownerReply ? (
                  <div className="p-3.5 rounded-xl bg-[#ECFDF5] dark:bg-[#10B981]/10 border border-[#047857]/20 text-xs">
                    <p className="font-bold text-[#065F46] dark:text-[#34D399]">Owner Response:</p>
                    <p className="mt-0.5 text-[#111827] dark:text-[#F9FAFB]">{r.ownerReply}</p>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Write your official owner reply..."
                      value={replyDrafts[r.id] || ''}
                      onChange={(e) => setReplyDrafts({ ...replyDrafts, [r.id]: e.target.value })}
                      className="flex-1 min-h-[40px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => handleReply(r.id)}
                      className="min-h-[40px] px-4 rounded-xl bg-[#047857] text-white text-xs font-semibold inline-flex items-center gap-1.5"
                    >
                      <MessageSquareReply className="w-3.5 h-3.5" />
                      Reply
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
