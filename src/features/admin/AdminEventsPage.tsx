import React, { useEffect, useState } from 'react';
import { Download, Edit3, Users } from 'lucide-react';
import { apiFetch } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { BottomSheet, CardSkeleton, StatusIndicator } from '../../components/ui/CommonUI';
import {
  EventPublicationStatus,
  EventRegistration,
  EventRegistrationStatus,
  EventStatus,
  StartupEvent,
} from '../../../packages/shared/types';
import { EVENT_CATEGORIES, INDIAN_CITIES } from '../../../packages/shared/constants';

interface AdminEvent extends StartupEvent {
  registrations: EventRegistration[];
}

export function AdminEventsPage({ mode = 'events' }: { mode?: 'events' | 'registrations' }) {
  const { showToast } = useToast();
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEventRegs, setSelectedEventRegs] = useState<AdminEvent | null>(null);
  const [editingEvent, setEditingEvent] = useState<AdminEvent | null>(null);

  // Create form
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(EVENT_CATEGORIES[0]);
  const [city, setCity] = useState(INDIAN_CITIES[0]);
  const [venue, setVenue] = useState('');
  const [dateTime, setDateTime] = useState('2026-12-15T18:00');
  const [organizer, setOrganizer] = useState('');
  const [description, setDescription] = useState('');
  const [capacity, setCapacity] = useState(100);
  const [publishNow, setPublishNow] = useState(true);

  // Edit form
  const [editTitle, setEditTitle] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editVenue, setEditVenue] = useState('');
  const [editOrganizer, setEditOrganizer] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCapacity, setEditCapacity] = useState(100);
  const [editScheduledAt, setEditScheduledAt] = useState('');

  const loadEvents = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ events: AdminEvent[] }>('/api/v1/events/admin/all');
      setEvents(res.events);
      if (selectedEventRegs) {
        const refreshed = res.events.find((e) => e.id === selectedEventRegs.id);
        if (refreshed) setSelectedEventRegs(refreshed);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [mode]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/v1/events/admin', {
        method: 'POST',
        body: JSON.stringify({
          title,
          category,
          city,
          venue,
          dateTime: new Date(dateTime).toISOString(),
          organizer,
          description,
          capacity: Number(capacity),
          isFree: true,
          publishNow,
        }),
      });
      setTitle('');
      setVenue('');
      setOrganizer('');
      setDescription('');
      showToast(publishNow ? 'Startup Event Published' : 'Saved as Draft');
      await loadEvents();
    } catch (err: any) {
      showToast('Could not create event', err.message, 'error');
    }
  };

  const openEditSheet = (ev: AdminEvent) => {
    setEditingEvent(ev);
    setEditTitle(ev.title);
    setEditCity(ev.city);
    setEditVenue(ev.venue);
    setEditOrganizer(ev.organizer);
    setEditDescription(ev.description);
    setEditCapacity(ev.capacity);
    setEditScheduledAt(ev.scheduledPublishAt ? ev.scheduledPublishAt.slice(0, 16) : '');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent) return;
    try {
      await apiFetch(`/api/v1/events/admin/${editingEvent.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: editTitle,
          city: editCity,
          venue: editVenue,
          organizer: editOrganizer,
          description: editDescription,
          capacity: Number(editCapacity),
          scheduledPublishAt: editScheduledAt ? new Date(editScheduledAt).toISOString() : null,
        }),
      });
      setEditingEvent(null);
      showToast('Startup Event Updated');
      await loadEvents();
    } catch (err: any) {
      showToast('Update failed', err.message, 'error');
    }
  };

  const updateStatus = async (id: string, payload: Record<string, any>) => {
    await apiFetch(`/api/v1/events/admin/${id}/status`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    showToast('Event updated');
    await loadEvents();
  };

  const promoteWaitlist = async (evId: string) => {
    try {
      const res = await apiFetch<{ registration: EventRegistration }>(
        `/api/v1/events/admin/${evId}/promote-waitlist`,
        { method: 'POST' }
      );
      showToast('Waitlist Promoted', `${res.registration.userName} is now Registered`);
      await loadEvents();
    } catch (err: any) {
      showToast('Could not promote', err.message, 'error');
    }
  };

  const exportCsv = (ev: AdminEvent) => {
    const rows = [
      ['Name', 'Role', 'Status', 'Attended', 'Registered At'],
      ...ev.registrations.map((r) => [r.userName, r.userRole, r.status, String(r.attended), r.createdAt]),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${ev.id}-registrations.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <CardSkeleton rows={3} />;

  const inputClass =
    'w-full min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#1F2937] text-sm text-[#111827] dark:text-[#F9FAFB]';

  if (mode === 'registrations') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#111827] dark:text-[#F9FAFB]">
            Event Registrations &amp; Waitlists
          </h1>
          <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF]">
            Track registrations, mark attendance, promote waitlisted seats, and export participant CSVs across all Startup Events.
          </p>
        </div>

        <div className="space-y-4">
          {events.map((ev) => {
            const waitlistedCount = ev.registrations.filter((r) => r.status === EventRegistrationStatus.WAITLISTED).length;
            return (
              <div
                key={ev.id}
                className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">{ev.title}</h2>
                    <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] tabular-nums">
                      {ev.city} · {ev.registrations.length}/{ev.capacity} registrations · {waitlistedCount} waitlisted
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {waitlistedCount > 0 && (
                      <button
                        type="button"
                        onClick={() => promoteWaitlist(ev.id)}
                        className="min-h-[38px] px-3.5 rounded-xl bg-[#047857] text-white text-xs font-semibold"
                      >
                        Promote from Waitlist
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => exportCsv(ev)}
                      className="min-h-[38px] px-3.5 rounded-xl border border-[#E5E7EB] dark:border-[#374151] text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] inline-flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5 text-[#047857] dark:text-[#34D399]" />
                      Export CSV
                    </button>
                  </div>
                </div>

                {ev.registrations.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {ev.registrations.map((reg) => (
                      <div
                        key={reg.id}
                        className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151] flex items-center justify-between gap-2"
                      >
                        <div>
                          <p className="text-xs font-bold text-[#111827] dark:text-[#F9FAFB]">{reg.userName}</p>
                          <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">
                            {reg.userRole} · {reg.status}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            await apiFetch(`/api/v1/events/admin/registrations/${reg.id}/attendance`, {
                              method: 'POST',
                              body: JSON.stringify({ attended: !reg.attended }),
                            });
                            await loadEvents();
                            showToast('Attendance updated');
                          }}
                          className={`min-h-[34px] px-3 rounded-lg text-xs font-semibold ${
                            reg.attended
                              ? 'bg-[#047857] text-white'
                              : 'border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] text-[#111827] dark:text-[#F9FAFB]'
                          }`}
                        >
                          {reg.attended ? 'Attended' : 'Mark Attended'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-[#111827] dark:text-[#F9FAFB]">Startup Events Management</h1>
        <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF]">
          Only Super Admins can create, edit, schedule, publish, feature, archive, cancel, and export registrations for shared Startup Events.
        </p>
      </div>

      <form
        onSubmit={handleCreate}
        className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-4"
      >
        <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">Create New Startup Event</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input type="text" placeholder="Event Title" value={title} onChange={(e) => setTitle(e.target.value)} required className={inputClass} />
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
            {EVENT_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select value={city} onChange={(e) => setCity(e.target.value)} className={inputClass}>
            {INDIAN_CITIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <input type="text" placeholder="Venue" value={venue} onChange={(e) => setVenue(e.target.value)} required className={inputClass} />
          <input type="datetime-local" value={dateTime} onChange={(e) => setDateTime(e.target.value)} required className={inputClass} />
          <input type="text" placeholder="Organizer" value={organizer} onChange={(e) => setOrganizer(e.target.value)} required className={inputClass} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            type="text"
            placeholder="Event Description (min 12 chars)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            className={`sm:col-span-2 ${inputClass}`}
          />
          <input
            type="number"
            placeholder="Seat Capacity"
            value={capacity}
            onChange={(e) => setCapacity(Number(e.target.value))}
            className={`${inputClass} tabular-nums`}
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="inline-flex items-center gap-2 text-xs font-medium text-[#111827] dark:text-[#F9FAFB]">
            <input type="checkbox" checked={publishNow} onChange={(e) => setPublishNow(e.target.checked)} />
            Publish immediately to Tenant &amp; Owner Connect feed
          </label>
          <button type="submit" className="min-h-[44px] px-5 rounded-xl bg-[#047857] text-white text-sm font-semibold">
            Create Event
          </button>
        </div>
      </form>

      <div className="space-y-3">
        {events.map((ev) => (
          <div
            key={ev.id}
            className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
          >
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                <span>
                  {ev.category} · {ev.city} · {ev.registrations.length}/{ev.capacity} registered
                </span>
                {ev.isFeatured && <span className="font-semibold text-[#047857] dark:text-[#34D399]">Featured</span>}
                {ev.scheduledPublishAt && ev.publicationStatus === EventPublicationStatus.SCHEDULED && (
                  <span className="text-[#B45309] dark:text-[#FBBF24]">
                    Scheduled: {new Date(ev.scheduledPublishAt).toLocaleString('en-IN')}
                  </span>
                )}
              </div>
              <h3 className="mt-1 text-base font-bold text-[#111827] dark:text-[#F9FAFB]">{ev.title}</h3>
              <div className="mt-1 flex items-center gap-3">
                <StatusIndicator
                  status={ev.publicationStatus === EventPublicationStatus.PUBLISHED ? 'success' : 'neutral'}
                  label={`Pub: ${ev.publicationStatus}`}
                />
                <StatusIndicator
                  status={ev.eventStatus === EventStatus.CANCELLED ? 'error' : 'info'}
                  label={`Status: ${ev.eventStatus}`}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => openEditSheet(ev)}
                className="min-h-[38px] px-3.5 rounded-xl border border-[#E5E7EB] dark:border-[#374151] text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] inline-flex items-center gap-1.5"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Edit / Schedule
              </button>
              {ev.publicationStatus !== EventPublicationStatus.PUBLISHED ? (
                <button
                  type="button"
                  onClick={() => updateStatus(ev.id, { publicationStatus: EventPublicationStatus.PUBLISHED })}
                  className="min-h-[38px] px-3.5 rounded-xl bg-[#047857] text-white text-xs font-semibold"
                >
                  Publish
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => updateStatus(ev.id, { publicationStatus: EventPublicationStatus.UNPUBLISHED })}
                  className="min-h-[38px] px-3.5 rounded-xl border border-[#E5E7EB] dark:border-[#374151] text-xs font-semibold text-[#111827] dark:text-[#F9FAFB]"
                >
                  Unpublish
                </button>
              )}
              <button
                type="button"
                onClick={() => updateStatus(ev.id, { isFeatured: !ev.isFeatured })}
                className="min-h-[38px] px-3.5 rounded-xl border border-[#E5E7EB] dark:border-[#374151] text-xs font-semibold text-[#111827] dark:text-[#F9FAFB]"
              >
                {ev.isFeatured ? 'Unfeature' : 'Feature'}
              </button>
              <button
                type="button"
                onClick={() => setSelectedEventRegs(ev)}
                className="min-h-[38px] px-3.5 rounded-xl bg-[#ECFDF5] dark:bg-[#10B981]/15 text-[#047857] dark:text-[#34D399] text-xs font-semibold inline-flex items-center gap-1"
              >
                <Users className="w-3.5 h-3.5" />
                Registrations ({ev.registrations.length})
              </button>
              <button
                type="button"
                onClick={() => updateStatus(ev.id, { publicationStatus: EventPublicationStatus.ARCHIVED })}
                className="min-h-[38px] px-3.5 rounded-xl border border-[#E5E7EB] dark:border-[#374151] text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF]"
              >
                Archive
              </button>
              <button
                type="button"
                onClick={() => updateStatus(ev.id, { eventStatus: EventStatus.CANCELLED })}
                className="min-h-[38px] px-3.5 rounded-xl border border-red-200 dark:border-red-900/50 text-[#DC2626] dark:text-red-400 text-xs font-semibold"
              >
                Cancel Event
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit / Schedule Event BottomSheet */}
      <BottomSheet
        open={Boolean(editingEvent)}
        onClose={() => setEditingEvent(null)}
        title={`Edit Event — ${editingEvent?.title || ''}`}
        maxWidthClass="sm:max-w-xl"
      >
        <form onSubmit={handleSaveEdit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold mb-1">Title</label>
            <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} required className={inputClass} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">City</label>
              <input type="text" value={editCity} onChange={(e) => setEditCity(e.target.value)} required className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Venue</label>
              <input type="text" value={editVenue} onChange={(e) => setEditVenue(e.target.value)} required className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Organizer</label>
              <input type="text" value={editOrganizer} onChange={(e) => setEditOrganizer(e.target.value)} required className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Capacity</label>
              <input type="number" value={editCapacity} onChange={(e) => setEditCapacity(Number(e.target.value))} required className={inputClass} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Description</label>
            <textarea rows={3} value={editDescription} onChange={(e) => setEditDescription(e.target.value)} required className="w-full p-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#1F2937] text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Schedule Publish Date &amp; Time (optional)</label>
            <input type="datetime-local" value={editScheduledAt} onChange={(e) => setEditScheduledAt(e.target.value)} className={inputClass} />
          </div>
          <button type="submit" className="w-full min-h-[44px] rounded-xl bg-[#047857] text-white text-sm font-semibold">
            Save Event Changes
          </button>
        </form>
      </BottomSheet>

      {/* Registrations BottomSheet */}
      <BottomSheet
        open={Boolean(selectedEventRegs)}
        onClose={() => setSelectedEventRegs(null)}
        title={`Registrations — ${selectedEventRegs?.title || ''}`}
      >
        {selectedEventRegs && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => exportCsv(selectedEventRegs)}
                className="min-h-[40px] px-3.5 rounded-xl border border-[#E5E7EB] dark:border-[#374151] text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] inline-flex items-center gap-1.5"
              >
                <Download className="w-4 h-4 text-[#047857] dark:text-[#34D399]" />
                Export CSV
              </button>
              {selectedEventRegs.registrations.some((r) => r.status === EventRegistrationStatus.WAITLISTED) && (
                <button
                  type="button"
                  onClick={() => promoteWaitlist(selectedEventRegs.id)}
                  className="min-h-[40px] px-3.5 rounded-xl bg-[#047857] text-white text-xs font-semibold"
                >
                  Promote Next Waitlisted
                </button>
              )}
            </div>

            {selectedEventRegs.registrations.length === 0 ? (
              <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF]">No registrations yet.</p>
            ) : (
              selectedEventRegs.registrations.map((reg) => (
                <div
                  key={reg.id}
                  className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151] flex items-center justify-between gap-2"
                >
                  <div>
                    <p className="text-xs font-bold text-[#111827] dark:text-[#F9FAFB]">{reg.userName}</p>
                    <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">
                      {reg.userRole} · {reg.status}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      await apiFetch(`/api/v1/events/admin/registrations/${reg.id}/attendance`, {
                        method: 'POST',
                        body: JSON.stringify({ attended: !reg.attended }),
                      });
                      await loadEvents();
                      showToast('Attendance updated');
                    }}
                    className={`min-h-[34px] px-3 rounded-lg text-xs font-semibold ${
                      reg.attended
                        ? 'bg-[#047857] text-white'
                        : 'border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] text-[#111827] dark:text-[#F9FAFB]'
                    }`}
                  >
                    {reg.attended ? 'Attended' : 'Mark Attended'}
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
