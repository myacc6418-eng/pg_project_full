import { Router } from 'express';
import crypto from 'crypto';
import {
  EventPublicationStatus,
  EventRegistrationStatus,
  EventStatus,
  UserRole,
} from '../../../../../packages/shared/types';
import { createEventSchema, updateEventSchema } from '../../../../../packages/shared/schemas';
import { db } from '../../shared/db';
import { AuthenticatedRequest, optionalAuth, requireAuth, requireRole } from '../../middleware/auth';

const router = Router();

// Public / Tenant / Owner: Browse published startup events
router.get('/published', optionalAuth, (req: AuthenticatedRequest, res) => {
  const { city, category, q, dateFilter, savedOnly, registeredOnly } = req.query;
  const state = db.getState();

  let list = state.events.filter(
    (e) =>
      e.publicationStatus === EventPublicationStatus.PUBLISHED ||
      (e.publicationStatus === EventPublicationStatus.SCHEDULED &&
        e.scheduledPublishAt &&
        new Date(e.scheduledPublishAt).getTime() <= Date.now())
  );
  if (city && city !== 'ALL') {
    list = list.filter((e) => e.city.toLowerCase() === String(city).toLowerCase());
  }
  if (category && category !== 'ALL') {
    list = list.filter((e) => e.category === String(category));
  }
  if (dateFilter === 'THIS_WEEK') {
    const now = Date.now();
    const weekLater = now + 7 * 24 * 60 * 60 * 1000;
    list = list.filter((e) => {
      const ts = new Date(e.dateTime).getTime();
      return ts >= now - 86400000 && ts <= weekLater;
    });
  } else if (dateFilter === 'THIS_MONTH') {
    const now = new Date();
    const ym = now.toISOString().slice(0, 7);
    list = list.filter((e) => e.dateTime.startsWith(ym));
  }
  if (q) {
    const query = String(q).toLowerCase();
    list = list.filter(
      (e) =>
        e.title.toLowerCase().includes(query) ||
        e.venue.toLowerCase().includes(query) ||
        e.organizer.toLowerCase().includes(query)
    );
  }

  const userRegs = req.auth
    ? state.eventRegistrations.filter((r) => r.userId === req.auth!.sub)
    : [];
  const savedIds = req.auth ? state.savedEventIds[req.auth.sub] || [] : [];

  let enriched = list.map((ev) => {
    const regCount = state.eventRegistrations.filter(
      (r) => r.eventId === ev.id && r.status === EventRegistrationStatus.REGISTERED
    ).length;
    const myReg = userRegs.find((r) => r.eventId === ev.id && r.status !== EventRegistrationStatus.CANCELLED);
    return {
      ...ev,
      registeredCount: regCount,
      myRegistrationStatus: myReg?.status || null,
      isSaved: savedIds.includes(ev.id),
    };
  });

  if (savedOnly === 'true') {
    enriched = enriched.filter((e) => e.isSaved);
  }
  if (registeredOnly === 'true') {
    enriched = enriched.filter((e) => Boolean(e.myRegistrationStatus));
  }

  res.json({ events: enriched });
});

// Tenant / Owner: Register for free published event (enforces capacity & waitlist)
router.post('/:id/register', requireAuth, requireRole(UserRole.TENANT, UserRole.PG_OWNER), (req: AuthenticatedRequest, res) => {
  const state = db.getState();
  const ev = state.events.find((e) => e.id === req.params.id && e.publicationStatus === EventPublicationStatus.PUBLISHED);
  if (!ev) {
    res.status(404).json({ error: 'Published event not found' });
    return;
  }
  if (ev.eventStatus === EventStatus.CANCELLED) {
    res.status(400).json({ error: 'This event has been cancelled.' });
    return;
  }

  const existing = state.eventRegistrations.find(
    (r) => r.eventId === ev.id && r.userId === req.auth!.sub && r.status !== EventRegistrationStatus.CANCELLED
  );
  if (existing) {
    res.status(409).json({ error: 'You are already registered for this event.' });
    return;
  }

  const activeCount = state.eventRegistrations.filter(
    (r) => r.eventId === ev.id && r.status === EventRegistrationStatus.REGISTERED
  ).length;

  const user = state.users.find((u) => u.id === req.auth!.sub)!;
  const regStatus =
    activeCount < ev.capacity ? EventRegistrationStatus.REGISTERED : EventRegistrationStatus.WAITLISTED;

  const registration = {
    id: `ereg_${crypto.randomUUID().slice(0, 8)}`,
    eventId: ev.id,
    userId: user.id,
    userName: user.fullName,
    userRole: user.role,
    status: regStatus,
    attended: false,
    createdAt: new Date().toISOString(),
  };

  state.eventRegistrations.unshift(registration);
  db.persist();
  res.status(201).json({ registration });
});

router.post('/:id/cancel-registration', requireAuth, (req: AuthenticatedRequest, res) => {
  const state = db.getState();
  const reg = state.eventRegistrations.find(
    (r) => r.eventId === req.params.id && r.userId === req.auth!.sub && r.status !== EventRegistrationStatus.CANCELLED
  );
  if (!reg) {
    res.status(404).json({ error: 'Active registration not found' });
    return;
  }
  const wasRegistered = reg.status === EventRegistrationStatus.REGISTERED;
  reg.status = EventRegistrationStatus.CANCELLED;

  // Automatically promote earliest waitlisted attendee if seat freed
  if (wasRegistered) {
    const nextWaitlisted = [...state.eventRegistrations]
      .reverse()
      .find((r) => r.eventId === req.params.id && r.status === EventRegistrationStatus.WAITLISTED);
    if (nextWaitlisted) {
      nextWaitlisted.status = EventRegistrationStatus.REGISTERED;
      state.notifications.unshift({
        id: `ntf_${crypto.randomUUID().slice(0, 6)}`,
        userId: nextWaitlisted.userId,
        title: 'Event Waitlist Confirmed',
        body: 'A seat opened up and your waitlist registration has been confirmed.',
        category: 'EVENT',
        read: false,
        createdAt: new Date().toISOString(),
      });
    }
  }
  db.persist();
  res.json({ registration: reg });
});

router.post('/:id/save', requireAuth, (req: AuthenticatedRequest, res) => {
  const state = db.getState();
  const uid = req.auth!.sub;
  const current = state.savedEventIds[uid] || [];
  const exists = current.includes(req.params.id);
  state.savedEventIds[uid] = exists
    ? current.filter((id) => id !== req.params.id)
    : [...current, req.params.id];
  db.persist();
  res.json({ saved: !exists, savedIds: state.savedEventIds[uid] });
});

// ==================== SUPER ADMIN EVENT MANAGEMENT ====================

router.get('/admin/all', requireAuth, requireRole(UserRole.SUPER_ADMIN), (_req, res) => {
  const state = db.getState();
  const events = state.events.map((ev) => ({
    ...ev,
    registrations: state.eventRegistrations.filter((r) => r.eventId === ev.id),
  }));
  res.json({ events });
});

router.post('/admin', requireAuth, requireRole(UserRole.SUPER_ADMIN), (req: AuthenticatedRequest, res) => {
  const parsed = createEventSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid event data' });
    return;
  }
  const state = db.getState();
  const admin = state.users.find((u) => u.id === req.auth!.sub)!;
  const now = new Date().toISOString();

  const ev = {
    id: `evt_${crypto.randomUUID().slice(0, 8)}`,
    title: parsed.data.title.trim(),
    category: parsed.data.category,
    city: parsed.data.city.trim(),
    venue: parsed.data.venue.trim(),
    dateTime: parsed.data.dateTime,
    organizer: parsed.data.organizer.trim(),
    description: parsed.data.description.trim(),
    agenda: ['Welcome & Networking', 'Main Keynote Session', 'Q&A and Founder Connections'],
    speakers: [{ name: parsed.data.organizer.trim(), title: 'Host & Organizer' }],
    bannerUrl: '/src/assets/images/event_startup_meetup_1795149981771.jpg',
    isFree: parsed.data.isFree,
    externalRegistrationUrl: parsed.data.externalRegistrationUrl || undefined,
    capacity: parsed.data.capacity,
    publicationStatus: parsed.data.publishNow
      ? EventPublicationStatus.PUBLISHED
      : EventPublicationStatus.DRAFT,
    eventStatus: EventStatus.UPCOMING,
    isFeatured: false,
    createdAt: now,
  };

  state.events.unshift(ev);
  state.auditLogs.unshift({
    id: `aud_${crypto.randomUUID().slice(0, 6)}`,
    actorId: admin.id,
    actorName: admin.fullName,
    actorRole: admin.role,
    action: parsed.data.publishNow ? 'EVENT_PUBLISHED' : 'EVENT_DRAFTED',
    targetType: 'STARTUP_EVENT',
    targetId: ev.id,
    details: `${ev.title} (${ev.city})`,
    createdAt: now,
  });
  db.persist();
  res.status(201).json({ event: ev });
});

router.patch('/admin/:id', requireAuth, requireRole(UserRole.SUPER_ADMIN), (req: AuthenticatedRequest, res) => {
  const parsed = updateEventSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid event update payload' });
    return;
  }
  const state = db.getState();
  const ev = state.events.find((e) => e.id === req.params.id);
  if (!ev) {
    res.status(404).json({ error: 'Event not found' });
    return;
  }
  const d = parsed.data;
  if (d.title !== undefined) ev.title = d.title.trim();
  if (d.category !== undefined) ev.category = d.category;
  if (d.city !== undefined) ev.city = d.city.trim();
  if (d.venue !== undefined) ev.venue = d.venue.trim();
  if (d.dateTime !== undefined) ev.dateTime = d.dateTime;
  if (d.organizer !== undefined) ev.organizer = d.organizer.trim();
  if (d.description !== undefined) ev.description = d.description.trim();
  if (d.capacity !== undefined) ev.capacity = d.capacity;
  if (d.scheduledPublishAt !== undefined) {
    ev.scheduledPublishAt = d.scheduledPublishAt;
    if (d.scheduledPublishAt) {
      ev.publicationStatus = EventPublicationStatus.SCHEDULED;
    }
  }
  const admin = state.users.find((u) => u.id === req.auth!.sub)!;
  state.auditLogs.unshift({
    id: `aud_${crypto.randomUUID().slice(0, 6)}`,
    actorId: admin.id,
    actorName: admin.fullName,
    actorRole: admin.role,
    action: 'EVENT_UPDATED',
    targetType: 'STARTUP_EVENT',
    targetId: ev.id,
    details: `Updated ${ev.title} (${ev.city})`,
    createdAt: new Date().toISOString(),
  });
  db.persist();
  res.json({ event: ev });
});

router.post('/admin/:id/status', requireAuth, requireRole(UserRole.SUPER_ADMIN), (req: AuthenticatedRequest, res) => {
  const state = db.getState();
  const ev = state.events.find((e) => e.id === req.params.id);
  if (!ev) {
    res.status(404).json({ error: 'Event not found' });
    return;
  }
  if (req.body?.publicationStatus) {
    ev.publicationStatus = req.body.publicationStatus;
  }
  if (req.body?.eventStatus) {
    ev.eventStatus = req.body.eventStatus;
  }
  if (typeof req.body?.isFeatured === 'boolean') {
    ev.isFeatured = req.body.isFeatured;
  }
  if (req.body?.scheduledPublishAt !== undefined) {
    ev.scheduledPublishAt = req.body.scheduledPublishAt;
  }
  db.persist();
  res.json({ event: ev });
});

router.post('/admin/registrations/:regId/attendance', requireAuth, requireRole(UserRole.SUPER_ADMIN), (req, res) => {
  const reg = db.getState().eventRegistrations.find((r) => r.id === req.params.regId);
  if (!reg) {
    res.status(404).json({ error: 'Registration not found' });
    return;
  }
  reg.attended = Boolean(req.body?.attended);
  db.persist();
  res.json({ registration: reg });
});

router.post('/admin/:id/promote-waitlist', requireAuth, requireRole(UserRole.SUPER_ADMIN), (req, res) => {
  const state = db.getState();
  const ev = state.events.find((e) => e.id === req.params.id);
  if (!ev) {
    res.status(404).json({ error: 'Event not found' });
    return;
  }
  const waitlisted = state.eventRegistrations.filter(
    (r) => r.eventId === ev.id && r.status === EventRegistrationStatus.WAITLISTED
  );
  if (waitlisted.length === 0) {
    res.status(400).json({ error: 'No waitlisted registrations for this event' });
    return;
  }
  const next = waitlisted[waitlisted.length - 1];
  next.status = EventRegistrationStatus.REGISTERED;
  state.notifications.unshift({
    id: `ntf_${crypto.randomUUID().slice(0, 6)}`,
    userId: next.userId,
    title: `Confirmed for ${ev.title}`,
    body: 'Super Admin promoted your waitlisted seat to Registered.',
    category: 'EVENT',
    read: false,
    createdAt: new Date().toISOString(),
  });
  db.persist();
  res.json({ registration: next });
});

export default router;
