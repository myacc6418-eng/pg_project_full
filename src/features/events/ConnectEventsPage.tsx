import React, { useEffect, useState } from 'react';
import {
  CalendarDays,
  MapPin,
  Bookmark,
  ExternalLink,
  Share2,
  CalendarPlus,
  Store,
  Send,
} from 'lucide-react';
import { PublicHeader, PublicFooter } from '../../layouts/PublicShell';
import { SafeImage } from '../../components/ui/SafeImage';
import { AdSlot } from '../../components/ui/AdSlot';
import { BottomSheet, CardSkeleton, EmptyState, StatusIndicator } from '../../components/ui/CommonUI';
import { apiFetch } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import {
  LocalBusinessListing,
  Property,
  StartupEvent,
  UserRole,
} from '../../../packages/shared/types';
import { EVENT_CATEGORIES, INDIAN_CITIES } from '../../../packages/shared/constants';

interface EnrichedEvent extends StartupEvent {
  registeredCount: number;
  myRegistrationStatus: string | null;
  isSaved: boolean;
}

const LOCAL_CATEGORIES = [
  'ALL',
  'Affordable Food',
  'Groceries',
  'Laundry',
  'Fitness',
  'Local Services',
  'Transportation',
  'Daily Essentials',
  'Nearby Deals',
] as const;

export function ConnectEventsPage({ embedded = false }: { embedded?: boolean }) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [tab, setTab] = useState<'events' | 'local'>('events');
  const [city, setCity] = useState('ALL');
  const [category, setCategory] = useState('ALL');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'THIS_WEEK' | 'THIS_MONTH'>('ALL');
  const [eventScope, setEventScope] = useState<'ALL' | 'SAVED' | 'REGISTERED'>('ALL');
  const [localCategory, setLocalCategory] = useState<string>('ALL');
  const [locality, setLocality] = useState('');
  const [q, setQ] = useState('');

  const [events, setEvents] = useState<EnrichedEvent[]>([]);
  const [localBusinesses, setLocalBusinesses] = useState<LocalBusinessListing[]>([]);
  const [ownerProperties, setOwnerProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedEvent, setSelectedEvent] = useState<EnrichedEvent | null>(null);
  const [shareToPgModal, setShareToPgModal] = useState<EnrichedEvent | null>(null);
  const [sharePropertyId, setSharePropertyId] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (city !== 'ALL') qs.set('city', city);
      if (category !== 'ALL') qs.set('category', category);
      if (dateFilter !== 'ALL') qs.set('dateFilter', dateFilter);
      if (eventScope === 'SAVED') qs.set('savedOnly', 'true');
      if (eventScope === 'REGISTERED') qs.set('registeredOnly', 'true');
      if (q.trim()) qs.set('q', q.trim());

      const bizQs = new URLSearchParams();
      if (city !== 'ALL') bizQs.set('city', city);
      if (locality.trim()) bizQs.set('locality', locality.trim());
      if (localCategory !== 'ALL') bizQs.set('category', localCategory);
      if (q.trim()) bizQs.set('q', q.trim());

      const [evRes, bizRes] = await Promise.all([
        apiFetch<{ events: EnrichedEvent[] }>(`/api/v1/events/published?${qs.toString()}`),
        apiFetch<{ businesses: LocalBusinessListing[] }>(`/api/v1/monetization/local-businesses?${bizQs.toString()}`),
      ]);
      setEvents(evRes.events);
      setLocalBusinesses(bizRes.businesses);

      if (user?.role === UserRole.PG_OWNER) {
        const ownRes = await apiFetch<{ properties: Property[] }>('/api/v1/properties/owner/mine');
        setOwnerProperties(ownRes.properties);
        if (ownRes.properties[0]) setSharePropertyId(ownRes.properties[0].id);
      }
    } catch {
      showToast('Could not load Connect feed', undefined, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [city, category, dateFilter, eventScope, localCategory]);

  const handleRegister = async (ev: EnrichedEvent) => {
    if (!user) {
      showToast('Login required', 'Sign in as a Tenant or PG Owner to register for events.', 'info');
      return;
    }
    try {
      const res = await apiFetch<{ registration: { status: string } }>(
        `/api/v1/events/${ev.id}/register`,
        { method: 'POST' }
      );
      showToast(
        res.registration.status === 'WAITLISTED' ? 'Added to Waitlist' : 'Registration Confirmed',
        `${ev.title} (${res.registration.status})`
      );
      await loadData();
    } catch (err: any) {
      showToast('Registration failed', err.message, 'error');
    }
  };

  const handleCancelReg = async (ev: EnrichedEvent) => {
    try {
      await apiFetch(`/api/v1/events/${ev.id}/cancel-registration`, { method: 'POST' });
      showToast('Registration cancelled', ev.title, 'info');
      await loadData();
    } catch (err: any) {
      showToast('Could not cancel', err.message, 'error');
    }
  };

  const handleSaveToggle = async (ev: EnrichedEvent) => {
    if (!user) {
      showToast('Login to bookmark events', undefined, 'info');
      return;
    }
    const res = await apiFetch<{ saved: boolean }>(`/api/v1/events/${ev.id}/save`, {
      method: 'POST',
    });
    showToast(res.saved ? 'Event saved' : 'Removed from saved events');
    await loadData();
  };

  const handleShareEventToPG = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareToPgModal || !sharePropertyId) return;
    try {
      await apiFetch('/api/v1/operations/owner/notices', {
        method: 'POST',
        body: JSON.stringify({
          propertyId: sharePropertyId,
          title: `Startup Event: ${shareToPgModal.title}`,
          category: 'EVENT_SHARE',
          linkedEventId: shareToPgModal.id,
          body: `${shareToPgModal.category} in ${shareToPgModal.city} at ${shareToPgModal.venue} on ${new Date(
            shareToPgModal.dateTime
          ).toLocaleDateString('en-IN')}. Open Connect in PG Finder to register.`,
        }),
      });
      showToast('Shared with PG Residents', 'Posted to your PG announcements board.');
      setShareToPgModal(null);
    } catch (err: any) {
      showToast('Share failed', err.message, 'error');
    }
  };

  const downloadIcs = (ev: EnrichedEvent) => {
    const start = new Date(ev.dateTime).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `SUMMARY:${ev.title}`,
      `LOCATION:${ev.venue}, ${ev.city}`,
      `DTSTART:${start}`,
      `DESCRIPTION:${ev.description}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${ev.id}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const body = (
    <div className={embedded ? '' : 'max-w-6xl mx-auto px-4 sm:px-6 py-8'}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#111827] dark:text-[#F9FAFB]">
            {tab === 'events' ? 'Startup Events & Networking' : 'PG Finder Local'}
          </h1>
          <p className="mt-1 text-sm text-[#6B7280] dark:text-[#9CA3AF]">
            {tab === 'events'
              ? 'Discover curated founder meetups, AI hackathons, and workshops. Public participation never exposes your PG or room.'
              : 'Explore nearby food, laundry, groceries, fitness, transportation, and local resident offers without GPS tracking.'}
          </p>
        </div>

        <div className="inline-flex p-1 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] self-start">
          <button
            type="button"
            onClick={() => setTab('events')}
            className={`min-h-[40px] px-4 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap ${
              tab === 'events' ? 'bg-[#047857] dark:bg-[#10B981] text-white dark:text-[#0B1220]' : 'text-[#6B7280] dark:text-[#9CA3AF]'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            Startup Events
          </button>
          <button
            type="button"
            onClick={() => setTab('local')}
            className={`min-h-[40px] px-4 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap ${
              tab === 'local' ? 'bg-[#047857] dark:bg-[#10B981] text-white dark:text-[#0B1220]' : 'text-[#6B7280] dark:text-[#9CA3AF]'
            }`}
          >
            <Store className="w-4 h-4" />
            PG Finder Local
          </button>
        </div>
      </div>

      {tab === 'events' && user && (
        <div className="mt-4 flex flex-wrap gap-2">
          {[
            { id: 'ALL' as const, label: 'All Events' },
            { id: 'SAVED' as const, label: 'Saved Events' },
            { id: 'REGISTERED' as const, label: 'My Registrations' },
          ].map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setEventScope(s.id)}
              className={`min-h-[38px] px-3.5 rounded-xl text-xs font-semibold border transition-colors ${
                eventScope === s.id
                  ? 'bg-[#ECFDF5] dark:bg-[#10B981]/15 border-[#047857] dark:border-[#34D399] text-[#047857] dark:text-[#34D399]'
                  : 'bg-white dark:bg-[#111827] border-[#E5E7EB] dark:border-[#374151] text-[#6B7280] dark:text-[#9CA3AF]'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="mt-4 rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={tab === 'events' ? 'Search events or venue...' : 'Search tiffins, gyms, laundry...'}
          className="min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-sm text-[#111827] dark:text-[#F9FAFB]"
        />
        <select
          aria-label="Filter city"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-sm text-[#111827] dark:text-[#F9FAFB]"
        >
          <option value="ALL">All Cities</option>
          {INDIAN_CITIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        {tab === 'events' ? (
          <>
            <select
              aria-label="Filter category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-sm text-[#111827] dark:text-[#F9FAFB]"
            >
              <option value="ALL">All Categories</option>
              {EVENT_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select
              aria-label="Filter date range"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-sm text-[#111827] dark:text-[#F9FAFB]"
            >
              <option value="ALL">Any Date</option>
              <option value="THIS_WEEK">Next 7 Days</option>
              <option value="THIS_MONTH">This Month</option>
            </select>
          </>
        ) : (
          <>
            <input
              type="text"
              value={locality}
              onChange={(e) => setLocality(e.target.value)}
              placeholder="Locality (e.g. Madhapur)"
              className="min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-sm text-[#111827] dark:text-[#F9FAFB]"
            />
            <select
              aria-label="Local service category"
              value={localCategory}
              onChange={(e) => setLocalCategory(e.target.value)}
              className="min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-sm text-[#111827] dark:text-[#F9FAFB]"
            >
              {LOCAL_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c === 'ALL' ? 'All Local Categories' : c}</option>
              ))}
            </select>
          </>
        )}
        <button
          type="button"
          onClick={loadData}
          className="min-h-[44px] px-4 rounded-xl bg-[#047857] dark:bg-[#10B981] text-white dark:text-[#0B1220] text-sm font-semibold"
        >
          Apply Filters
        </button>
      </div>

      {tab === 'local' && (
        <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1">
          {LOCAL_CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setLocalCategory(c)}
              className={`min-h-[38px] px-3.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 border ${
                localCategory === c
                  ? 'bg-[#047857] dark:bg-[#10B981] text-white dark:text-[#0B1220] border-[#047857] dark:border-[#10B981]'
                  : 'bg-white dark:bg-[#111827] text-[#6B7280] dark:text-[#9CA3AF] border-[#E5E7EB] dark:border-[#374151]'
              }`}
            >
              {c === 'ALL' ? 'All Services' : c}
            </button>
          ))}
        </div>
      )}

      <div className="mt-6">
        {loading ? (
          <CardSkeleton rows={3} />
        ) : tab === 'events' ? (
          events.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="No published startup events match"
              description="Try clearing your city, category, or saved filter to view upcoming events."
              actionLabel="Show All Events"
              onAction={() => {
                setCity('ALL');
                setCategory('ALL');
                setDateFilter('ALL');
                setEventScope('ALL');
                setQ('');
              }}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((ev) => (
                <div key={ev.id} className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] overflow-hidden flex flex-col">
                  <div className="aspect-[16/9] bg-[#ECFDF5] dark:bg-[#1F2937]">
                    <SafeImage
                      src={ev.bannerUrl}
                      alt={ev.title}
                      fallbackTitle={ev.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex items-center justify-between gap-2 text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                      <span>
                        {ev.category} · {ev.city}
                      </span>
                      {ev.isFeatured && <span className="font-semibold text-[#047857] dark:text-[#34D399]">Featured</span>}
                    </div>
                    <h2 className="mt-1.5 text-lg font-bold text-[#111827] dark:text-[#F9FAFB]">{ev.title}</h2>
                    <p className="mt-1 text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                      {new Date(ev.dateTime).toLocaleString('en-IN', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}{' '}
                      · {ev.venue}
                    </p>
                    <p className="mt-2 text-xs text-[#4B5563] dark:text-[#D1D5DB] line-clamp-2">{ev.description}</p>

                    <div className="mt-3 text-xs text-[#6B7280] dark:text-[#9CA3AF] tabular-nums">
                      {ev.isFree ? 'Free Registration' : 'Paid via External Partner'} · {ev.registeredCount}/{ev.capacity} seats filled
                    </div>

                    {ev.myRegistrationStatus && (
                      <div className="mt-2">
                        <StatusIndicator
                          status={ev.myRegistrationStatus === 'REGISTERED' ? 'success' : 'warning'}
                          label={`Status: ${ev.myRegistrationStatus}`}
                        />
                      </div>
                    )}

                    <div className="mt-auto pt-4 border-t border-[#E5E7EB] dark:border-[#374151] flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedEvent(ev)}
                        className="min-h-[40px] px-3 py-2 rounded-xl border border-[#E5E7EB] dark:border-[#374151] text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] hover:bg-[#F8FAFC] dark:hover:bg-[#1F2937]"
                      >
                        Details
                      </button>

                      {ev.isFree ? (
                        ev.myRegistrationStatus ? (
                          <button
                            type="button"
                            onClick={() => handleCancelReg(ev)}
                            className="min-h-[40px] px-3 py-2 rounded-xl border border-red-200 dark:border-red-800 text-xs font-semibold text-[#DC2626] dark:text-[#F87171] hover:bg-red-50 dark:hover:bg-red-950/30"
                          >
                            Cancel RSVP
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleRegister(ev)}
                            className="min-h-[40px] px-4 py-2 rounded-xl bg-[#047857] hover:bg-[#065F46] dark:bg-[#10B981] dark:hover:bg-[#059669] text-white dark:text-[#0B1220] text-xs font-semibold"
                          >
                            Register Free
                          </button>
                        )
                      ) : (
                        <a
                          href={ev.externalRegistrationUrl || '#'}
                          target="_blank"
                          rel="noreferrer"
                          className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#047857] dark:bg-[#10B981] text-white dark:text-[#0B1220] text-xs font-semibold inline-flex items-center gap-1"
                        >
                          External Pass <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}

                      <button
                        type="button"
                        onClick={() => handleSaveToggle(ev)}
                        aria-label="Save event"
                        className={`min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl border border-[#E5E7EB] dark:border-[#374151] ${
                          ev.isSaved ? 'text-[#047857] dark:text-[#34D399] bg-[#ECFDF5] dark:bg-[#10B981]/15' : 'text-[#6B7280] dark:text-[#9CA3AF]'
                        }`}
                      >
                        <Bookmark className="w-4 h-4" />
                      </button>

                      {user?.role === UserRole.PG_OWNER && ownerProperties.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setShareToPgModal(ev)}
                          className="min-h-[40px] px-3 py-2 rounded-xl bg-[#ECFDF5] dark:bg-[#10B981]/15 text-[#047857] dark:text-[#34D399] text-xs font-semibold inline-flex items-center gap-1"
                        >
                          <Send className="w-3.5 h-3.5" />
                          Share to PG
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : localBusinesses.length === 0 ? (
          <EmptyState
            icon={Store}
            title="No local listings match"
            description="Try selecting All Cities or another neighbourhood category."
            actionLabel="Reset Local Filters"
            onAction={() => {
              setCity('ALL');
              setLocality('');
              setLocalCategory('ALL');
              setQ('');
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {localBusinesses.map((biz) => (
              <div key={biz.id} className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5">
                <div className="flex items-center justify-between gap-2 text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                  <span>
                    {biz.category} · {biz.locality}, {biz.city}
                  </span>
                  {biz.isSponsored && <span className="font-semibold text-[#047857] dark:text-[#34D399]">Sponsored Ad</span>}
                </div>
                <h3 className="mt-1.5 text-base font-bold text-[#111827] dark:text-[#F9FAFB]">{biz.name}</h3>
                <p className="mt-0.5 text-sm font-semibold text-[#047857] dark:text-[#34D399]">{biz.title}</p>
                <p className="mt-1 text-xs text-[#6B7280] dark:text-[#9CA3AF] leading-relaxed">{biz.description}</p>
                <div className="mt-4 pt-3 border-t border-[#E5E7EB] dark:border-[#374151] flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold text-[#111827] dark:text-[#F9FAFB]">{biz.offerText}</span>
                  <button
                    type="button"
                    onClick={async () => {
                      await apiFetch(`/api/v1/monetization/local-businesses/${biz.id}/click`, {
                        method: 'POST',
                      });
                      showToast(biz.name, `Offer details: ${biz.offerText}`, 'info');
                    }}
                    className="min-h-[38px] px-3.5 rounded-xl bg-[#ECFDF5] dark:bg-[#10B981]/15 text-[#047857] dark:text-[#34D399] text-xs font-semibold"
                  >
                    Claim Offer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AdSlot variant="native" slotId="connect_events_native" className="mt-8" />

      <BottomSheet
        open={Boolean(selectedEvent)}
        onClose={() => setSelectedEvent(null)}
        title={selectedEvent?.title || 'Event Details'}
      >
        {selectedEvent && (
          <div className="space-y-4">
            <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
              {selectedEvent.category} · Organized by {selectedEvent.organizer}
            </p>
            <p className="text-sm text-[#111827] dark:text-[#F9FAFB] leading-relaxed">{selectedEvent.description}</p>
            <div className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151] text-xs space-y-1">
              <p className="font-semibold text-[#111827] dark:text-[#F9FAFB]">
                <MapPin className="w-3.5 h-3.5 inline mr-1 text-[#047857] dark:text-[#34D399]" />
                {selectedEvent.venue}, {selectedEvent.city}
              </p>
              <p className="text-[#6B7280] dark:text-[#9CA3AF]">
                {new Date(selectedEvent.dateTime).toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short' })}
              </p>
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#111827] dark:text-[#F9FAFB]">Agenda</h4>
              <ul className="mt-2 space-y-1.5 text-xs text-[#4B5563] dark:text-[#D1D5DB]">
                {selectedEvent.agenda.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#111827] dark:text-[#F9FAFB]">Speakers</h4>
              <ul className="mt-2 space-y-1 text-xs text-[#4B5563] dark:text-[#D1D5DB]">
                {selectedEvent.speakers.map((s) => (
                  <li key={s.name}>
                    <strong className="text-[#111827] dark:text-[#F9FAFB]">{s.name}</strong> — {s.title}
                  </li>
                ))}
              </ul>
            </div>
            <div className="pt-3 border-t border-[#E5E7EB] dark:border-[#374151] flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => downloadIcs(selectedEvent)}
                className="min-h-[40px] px-3.5 rounded-xl border border-[#E5E7EB] dark:border-[#374151] text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <CalendarPlus className="w-4 h-4 text-[#047857] dark:text-[#34D399]" />
                Add to Calendar
              </button>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(window.location.href);
                  showToast('Event link copied');
                }}
                className="min-h-[40px] px-3.5 rounded-xl border border-[#E5E7EB] dark:border-[#374151] text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <Share2 className="w-4 h-4 text-[#047857] dark:text-[#34D399]" />
                Share Link
              </button>
            </div>
          </div>
        )}
      </BottomSheet>

      <BottomSheet
        open={Boolean(shareToPgModal)}
        onClose={() => setShareToPgModal(null)}
        title="Share Event to PG Announcements"
      >
        <form onSubmit={handleShareEventToPG} className="space-y-4">
          <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF]">
            Post <strong>{shareToPgModal?.title}</strong> to residents of your selected property.
          </p>
          <div>
            <label className="block text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] mb-1">Select Property</label>
            <select
              value={sharePropertyId}
              onChange={(e) => setSharePropertyId(e.target.value)}
              className="w-full min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-sm text-[#111827] dark:text-[#F9FAFB]"
            >
              {ownerProperties.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="w-full min-h-[44px] rounded-xl bg-[#047857] dark:bg-[#10B981] text-white dark:text-[#0B1220] text-sm font-semibold"
          >
            Publish PG Announcement
          </button>
        </form>
      </BottomSheet>
    </div>
  );

  if (embedded) return body;
  return (
    <div className="h-[100dvh] overflow-y-auto overflow-x-hidden bg-[#F8FAFC] dark:bg-[#0B1220] flex flex-col transition-colors">
      <PublicHeader />
      <main className="flex-1">{body}</main>
      <PublicFooter />
    </div>
  );
}
