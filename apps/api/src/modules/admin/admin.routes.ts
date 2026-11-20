import { Router } from 'express';
import crypto from 'crypto';
import {
  BedStatus,
  ComplaintStatus,
  EventPublicationStatus,
  LocationVerificationStatus,
  PropertyApprovalStatus,
  StayStatus,
  SubscriptionStatus,
  SubscriptionTier,
  UserRole,
} from '../../../../../packages/shared/types';
import { createBroadcastSchema } from '../../../../../packages/shared/schemas';
import { isPropertyPubliclyVisible } from '../../../../../packages/shared/permissions';
import { db } from '../../shared/db';
import { AuthenticatedRequest, requireAuth, requireRole } from '../../middleware/auth';

const router = Router();

// Platform overview metrics derived strictly from repository state
router.get('/overview', requireAuth, requireRole(UserRole.SUPER_ADMIN), (_req, res) => {
  const state = db.getState();
  const owners = state.users.filter((u) => u.role === UserRole.PG_OWNER);
  const tenants = state.users.filter((u) => u.role === UserRole.TENANT);
  const activeStays = state.stays.filter((s) => s.status !== StayStatus.CHECKED_OUT);
  const totalBeds = state.beds.length;
  const occupiedBeds = state.beds.filter((b) => b.status === BedStatus.OCCUPIED).length;
  const reservedBeds = state.beds.filter((b) => b.status === BedStatus.RESERVED).length;
  const maintenanceBeds = state.beds.filter((b) => b.status === BedStatus.MAINTENANCE).length;
  const propMap = new Map(state.properties.map((p) => [p.id, p]));
  const roomMap = new Map(state.rooms.map((r) => [r.id, r]));
  const bedMap = new Map(state.beds.map((b) => [b.id, b]));

  const revenueByType = (type: string) =>
    state.transactions
      .filter((t) => t.status === 'SUCCEEDED' && t.type === type)
      .reduce((acc, t) => acc + t.amountInr, 0);

  const publishedProperties = state.properties.filter((p) => !p.isArchived && isPropertyPubliclyVisible(p));
  const pendingLocations = state.properties.filter(
    (p) =>
      p.locationStatus === LocationVerificationStatus.PENDING_VERIFICATION ||
      p.locationStatus === LocationVerificationStatus.RESUBMITTED ||
      p.locationStatus === LocationVerificationStatus.UNDER_REVIEW ||
      p.locationStatus === LocationVerificationStatus.REVERIFICATION_REQUIRED
  ).length;
  const activePaidSubscriptions = state.subscriptions.filter(
    (s) => s.tier !== SubscriptionTier.BASIC && s.status === SubscriptionStatus.ACTIVE
  ).length;
  const openSupportTickets = state.supportTickets.filter(
    (t) => t.status !== 'RESOLVED' && t.status !== 'CLOSED'
  ).length;
  const openComplaints = state.complaints.filter(
    (c) => c.status !== ComplaintStatus.RESOLVED && c.status !== ComplaintStatus.CLOSED
  ).length;
  const activePromotions = state.properties.filter((p) => p.isPromoted).length;
  const activeLocalAds = state.localBusinesses.filter((b) => (b.status || 'ACTIVE') === 'ACTIVE').length;
  const publishedEvents = state.events.filter(
    (e) => e.publicationStatus === EventPublicationStatus.PUBLISHED
  ).length;

  const ownerRentCollectedInr = state.rentCharges.reduce((acc, r) => acc + r.paidAmountInr, 0);

  res.json({
    metrics: {
      totalOwners: owners.length,
      totalProperties: state.properties.length,
      approvedProperties: state.properties.filter((p) => p.approvalStatus === PropertyApprovalStatus.APPROVED).length,
      publishedProperties: publishedProperties.length,
      pendingApprovals: state.properties.filter(
        (p) =>
          p.approvalStatus === PropertyApprovalStatus.PENDING_APPROVAL ||
          p.approvalStatus === PropertyApprovalStatus.RESUBMITTED ||
          p.approvalStatus === PropertyApprovalStatus.UNDER_REVIEW
      ).length,
      verifiedLocations: state.properties.filter((p) => p.locationStatus === LocationVerificationStatus.VERIFIED).length,
      pendingLocations,
      totalTenants: tenants.length,
      activeStays: activeStays.length,
      totalBeds,
      occupiedBeds,
      reservedBeds,
      maintenanceBeds,
      availableBeds: state.beds.filter((b) => b.status === BedStatus.AVAILABLE).length,
      occupancyRatePct: totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0,
      activeSubscriptions: activePaidSubscriptions,
      lifetimeListings: state.properties.filter((p) => p.hasLifetimeListing).length,
      activePromotions,
      activeLocalAds,
      publishedEvents,
      openSupportTickets,
      openComplaints,
      subscriptionRevenueInr: revenueByType('SUBSCRIPTION'),
      lifetimeListingRevenueInr: revenueByType('LIFETIME_LISTING'),
      promotionRevenueInr: revenueByType('FEATURED_PROMOTION'),
      advertisingRevenueInr: revenueByType('BUSINESS_AD'),
      platformTotalRevenueInr:
        revenueByType('SUBSCRIPTION') +
        revenueByType('LIFETIME_LISTING') +
        revenueByType('FEATURED_PROMOTION') +
        revenueByType('BUSINESS_AD'),
      ownerRentCollectedInr,
      eventRegistrations: state.eventRegistrations.filter((r) => r.status !== 'CANCELLED').length,
    },
    owners: owners.map((o) => {
      const ownedProps = state.properties.filter((p) => p.ownerId === o.id);
      const sub = state.subscriptions.find((s) => s.ownerId === o.id);
      return {
        id: o.id,
        fullName: o.fullName,
        email: o.email,
        phone: o.phone,
        city: o.city || 'Hyderabad',
        businessName: o.businessName,
        isVerified: o.isVerified,
        isSuspended: o.isSuspended,
        propertyCount: ownedProps.length,
        approvedCount: ownedProps.filter((p) => p.approvalStatus === PropertyApprovalStatus.APPROVED).length,
        subscriptionTier: sub?.tier || 'BASIC',
        subscriptionStatus: sub?.status || 'ACTIVE',
        renewalDate: sub?.renewalDate || null,
        createdAt: o.createdAt,
      };
    }),
    tenants: tenants.map((t) => {
      const stay = activeStays.find((s) => s.tenantId === t.id) || state.stays.find((s) => s.tenantId === t.id);
      const stayProp = stay ? propMap.get(stay.propertyId) : null;
      const stayRoom = stay ? roomMap.get(stay.roomId) : null;
      const stayBed = stay ? bedMap.get(stay.bedId) : null;
      const openRent = stay
        ? state.rentCharges.some((rc) => rc.stayId === stay.id && rc.status !== 'PAID' && rc.status !== 'WAIVED')
        : false;
      const docs = state.tenantDocuments.filter((d) => d.tenantId === t.id);
      const docStatus =
        docs.length === 0
          ? 'NONE'
          : docs.every((d) => d.status === 'VERIFIED')
            ? 'VERIFIED'
            : docs.some((d) => d.status === 'REJECTED')
              ? 'REJECTED'
              : 'PENDING';
      return {
        id: t.id,
        tenantCode: stay?.tenantCode || `PGF-USR-${t.id.slice(-4).toUpperCase()}`,
        fullName: t.fullName,
        email: t.email,
        phone: t.phone,
        city: t.city || '-',
        isVerified: t.isVerified,
        isSuspended: t.isSuspended,
        activeStayPropertyId: activeStays.find((s) => s.tenantId === t.id)?.propertyId || null,
        currentPgName: stay && stay.status !== StayStatus.CHECKED_OUT ? stayProp?.name || stay.propertyId : null,
        roomNumber: stay && stay.status !== StayStatus.CHECKED_OUT ? stayRoom?.roomNumber || '-' : '-',
        bedCode: stay && stay.status !== StayStatus.CHECKED_OUT ? stayBed?.bedCode || '-' : '-',
        joiningDate: stay?.createdAt || null,
        stayStatus: stay?.status || 'SEARCHING',
        rentStatus: !stay || stay.status === StayStatus.CHECKED_OUT ? 'N/A' : openRent ? 'DUE' : 'PAID',
        docStatus,
        createdAt: t.createdAt,
      };
    }),
    subscriptions: state.subscriptions.map((s) => {
      const owner = state.users.find((u) => u.id === s.ownerId);
      return {
        ...s,
        ownerName: owner?.fullName || s.ownerId,
        ownerEmail: owner?.email || '',
      };
    }),
    properties: state.properties.map((p) => {
      const owner = state.users.find((u) => u.id === p.ownerId);
      const beds = state.beds.filter((b) => b.propertyId === p.id);
      return {
        id: p.id,
        name: p.name,
        city: p.city,
        locality: p.locality,
        genderType: p.genderType,
        ownerName: owner?.fullName || '',
        approvalStatus: p.approvalStatus,
        locationStatus: p.locationStatus,
        hasLifetimeListing: p.hasLifetimeListing,
        coveredBySubscription: p.coveredBySubscription,
        isPromoted: p.isPromoted,
        promotionEndsAt: p.promotionEndsAt,
        isArchived: p.isArchived,
        totalBeds: beds.length,
        availableBeds: beds.filter((b) => b.status === BedStatus.AVAILABLE).length,
      };
    }),
    transactions: state.transactions,
    auditLogs: state.auditLogs,
    activityLogs: state.activityLogs.slice(0, 100),
    complaints: state.complaints,
    supportTickets: state.supportTickets,
    localBusinesses: state.localBusinesses,
    upcomingEvents: state.events.slice(0, 5),
  });
});

// Detailed Owner inspect
router.get('/owners/:id', requireAuth, requireRole(UserRole.SUPER_ADMIN), (req, res) => {
  const state = db.getState();
  const owner = state.users.find((u) => u.id === req.params.id && u.role === UserRole.PG_OWNER);
  if (!owner) {
    res.status(404).json({ error: 'Owner not found' });
    return;
  }
  const properties = state.properties.filter((p) => p.ownerId === owner.id);
  const subscription = state.subscriptions.find((s) => s.ownerId === owner.id) || null;
  const transactions = state.transactions.filter((t) => t.userId === owner.id);
  const supportTickets = state.supportTickets.filter((t) => t.userId === owner.id);
  const { passwordHash: _pw, ...safeOwner } = owner;
  res.json({ owner: safeOwner, properties, subscription, transactions, supportTickets });
});

// Detailed Tenant inspect (Profile, Stays, Joining Requests, Rent/Deposit Summary, Complaints, Docs)
router.get('/tenants/:id', requireAuth, requireRole(UserRole.SUPER_ADMIN), (req, res) => {
  const state = db.getState();
  const tenant = state.users.find((u) => u.id === req.params.id && u.role === UserRole.TENANT);
  if (!tenant) {
    res.status(404).json({ error: 'Tenant not found' });
    return;
  }
  const stays = state.stays.filter((s) => s.tenantId === tenant.id);
  const joiningRequests = state.joiningRequests.filter((j) => j.tenantId === tenant.id);
  const rentCharges = state.rentCharges.filter((rc) => rc.tenantId === tenant.id);
  const complaints = state.complaints.filter((c) => c.tenantId === tenant.id);
  const documents = state.tenantDocuments.filter((d) => d.tenantId === tenant.id);
  const supportTickets = state.supportTickets.filter((t) => t.userId === tenant.id);
  const { passwordHash: _pw, ...safeTenant } = tenant;
  res.json({ tenant: safeTenant, stays, joiningRequests, rentCharges, complaints, documents, supportTickets });
});

// Audited sensitive tenant document access by Super Admin
router.post('/documents/:docId/inspect', requireAuth, requireRole(UserRole.SUPER_ADMIN), (req: AuthenticatedRequest, res) => {
  const state = db.getState();
  const doc = state.tenantDocuments.find((d) => d.id === req.params.docId);
  if (!doc) {
    res.status(404).json({ error: 'Document not found' });
    return;
  }
  const admin = state.users.find((u) => u.id === req.auth!.sub)!;
  const reason = String(req.body?.reason || 'Support & compliance verification inspection').trim();
  const now = new Date().toISOString();
  state.auditLogs.unshift({
    id: `aud_${crypto.randomUUID().slice(0, 6)}`,
    actorId: admin.id,
    actorName: admin.fullName,
    actorRole: admin.role,
    action: 'SENSITIVE_DOCUMENT_ACCESSED',
    targetType: 'TENANT_DOCUMENT',
    targetId: doc.id,
    details: `Accessed ${doc.title} (${doc.docType}) for tenant ${doc.tenantId}. Reason: ${reason}`,
    createdAt: now,
  });
  db.persist();
  res.json({ document: doc, auditedAt: now });
});

router.post('/owners/:id/toggle-suspend', requireAuth, requireRole(UserRole.SUPER_ADMIN), (req: AuthenticatedRequest, res) => {
  const state = db.getState();
  const owner = state.users.find((u) => u.id === req.params.id && u.role === UserRole.PG_OWNER);
  if (!owner) {
    res.status(404).json({ error: 'PG Owner not found' });
    return;
  }
  owner.isSuspended = !owner.isSuspended;
  const admin = state.users.find((u) => u.id === req.auth!.sub)!;
  state.auditLogs.unshift({
    id: `aud_${crypto.randomUUID().slice(0, 6)}`,
    actorId: admin.id,
    actorName: admin.fullName,
    actorRole: admin.role,
    action: owner.isSuspended ? 'OWNER_SUSPENDED' : 'OWNER_REACTIVATED',
    targetType: 'USER',
    targetId: owner.id,
    details: `Owner ${owner.fullName} (${owner.email})`,
    createdAt: new Date().toISOString(),
  });
  db.persist();
  res.json({ isSuspended: owner.isSuspended });
});

// Admin Operations Oversight (Joining Requests, Stays, Checkouts, Complaints, Vacancies by City/Property, Support Tickets)
router.get('/operations', requireAuth, requireRole(UserRole.SUPER_ADMIN), (_req, res) => {
  const state = db.getState();
  const propMap = new Map(state.properties.map((p) => [p.id, p]));
  const roomMap = new Map(state.rooms.map((r) => [r.id, r]));
  const bedMap = new Map(state.beds.map((b) => [b.id, b]));

  const vacanciesByProperty = state.properties.map((p) => {
    const rooms = state.rooms.filter((r) => r.propertyId === p.id);
    const beds = state.beds.filter((b) => b.propertyId === p.id);
    return {
      propertyId: p.id,
      propertyName: p.name,
      city: p.city,
      locality: p.locality,
      roomsCount: rooms.length,
      totalBeds: beds.length,
      availableBeds: beds.filter((b) => b.status === BedStatus.AVAILABLE).length,
      occupiedBeds: beds.filter((b) => b.status === BedStatus.OCCUPIED).length,
      reservedBeds: beds.filter((b) => b.status === BedStatus.RESERVED).length,
      maintenanceBeds: beds.filter((b) => b.status === BedStatus.MAINTENANCE).length,
      inactiveBeds: beds.filter((b) => b.status === BedStatus.INACTIVE).length,
    };
  });

  res.json({
    joiningRequests: state.joiningRequests.map((j) => ({
      ...j,
      propertyName: propMap.get(j.propertyId)?.name || j.propertyId,
      city: propMap.get(j.propertyId)?.city || '',
    })),
    stays: state.stays.map((s) => ({
      ...s,
      propertyName: propMap.get(s.propertyId)?.name || s.propertyId,
      roomNumber: roomMap.get(s.roomId)?.roomNumber || '-',
      bedCode: bedMap.get(s.bedId)?.bedCode || '-',
    })),
    complaints: state.complaints.map((c) => ({
      ...c,
      propertyName: propMap.get(c.propertyId)?.name || c.propertyId,
    })),
    vacanciesByProperty,
    supportTickets: state.supportTickets,
  });
});

// Admin Support Ticket status, assignment & resolution
router.patch('/support-tickets/:id', requireAuth, requireRole(UserRole.SUPER_ADMIN), (req: AuthenticatedRequest, res) => {
  const state = db.getState();
  const ticket = state.supportTickets.find((t) => t.id === req.params.id);
  if (!ticket) {
    res.status(404).json({ error: 'Support ticket not found' });
    return;
  }
  const admin = state.users.find((u) => u.id === req.auth!.sub)!;
  const now = new Date().toISOString();
  if (req.body?.status) ticket.status = req.body.status;
  if (req.body?.assignedTo !== undefined) ticket.assignedTo = String(req.body.assignedTo).trim() || admin.fullName;
  if (req.body?.resolutionNotes !== undefined) ticket.resolutionNotes = String(req.body.resolutionNotes).trim();
  if (req.body?.reply) {
    ticket.messages.push({
      id: `tmsg_${crypto.randomUUID().slice(0, 6)}`,
      senderId: admin.id,
      senderName: admin.fullName,
      senderRole: admin.role,
      body: String(req.body.reply).trim(),
      createdAt: now,
    });
  }
  ticket.updatedAt = now;

  state.notifications.unshift({
    id: `ntf_${crypto.randomUUID().slice(0, 6)}`,
    userId: ticket.userId,
    title: `Support Ticket Update: ${ticket.subject}`,
    body: `Status updated to ${ticket.status.replace(/_/g, ' ')}${ticket.resolutionNotes ? ` — ${ticket.resolutionNotes}` : ''}`,
    category: 'SUPPORT',
    read: false,
    createdAt: now,
  });

  state.auditLogs.unshift({
    id: `aud_${crypto.randomUUID().slice(0, 6)}`,
    actorId: admin.id,
    actorName: admin.fullName,
    actorRole: admin.role,
    action: 'SUPPORT_TICKET_UPDATED',
    targetType: 'SUPPORT_TICKET',
    targetId: ticket.id,
    details: `${ticket.subject} → ${ticket.status}`,
    createdAt: now,
  });

  db.persist();
  res.json({ ticket });
});

// Public & Admin CMS (structured plain content only — no arbitrary HTML)
router.get('/cms/public', (_req, res) => {
  res.json({ cms: db.getState().cmsContent });
});

router.get('/cms', requireAuth, requireRole(UserRole.SUPER_ADMIN), (_req, res) => {
  res.json({ cms: db.getState().cmsContent });
});

router.put('/cms', requireAuth, requireRole(UserRole.SUPER_ADMIN), (req: AuthenticatedRequest, res) => {
  const state = db.getState();
  const current = state.cmsContent;
  const next = {
    announcementBanner: req.body?.announcementBanner
      ? {
          enabled: Boolean(req.body.announcementBanner.enabled),
          title: String(req.body.announcementBanner.title || current.announcementBanner.title).trim(),
          message: String(req.body.announcementBanner.message || current.announcementBanner.message).trim(),
          audience: (['ALL', 'TENANTS', 'PG_OWNERS'].includes(req.body.announcementBanner.audience)
            ? req.body.announcementBanner.audience
            : 'ALL') as 'ALL' | 'TENANTS' | 'PG_OWNERS',
        }
      : current.announcementBanner,
    landingHighlights: Array.isArray(req.body?.landingHighlights)
      ? req.body.landingHighlights.map((h: any) => ({
          id: String(h.id || `hl_${crypto.randomUUID().slice(0, 6)}`),
          title: String(h.title || '').trim(),
          description: String(h.description || '').trim(),
        }))
      : current.landingHighlights,
    faqs: Array.isArray(req.body?.faqs)
      ? req.body.faqs.map((f: any) => ({
          id: String(f.id || `faq_${crypto.randomUUID().slice(0, 6)}`),
          question: String(f.question || '').trim(),
          answer: String(f.answer || '').trim(),
          audience: (['ALL', 'TENANTS', 'PG_OWNERS'].includes(f.audience) ? f.audience : 'ALL') as
            | 'ALL'
            | 'TENANTS'
            | 'PG_OWNERS',
        }))
      : current.faqs,
    policies: req.body?.policies
      ? {
          termsSummary: String(req.body.policies.termsSummary || current.policies.termsSummary).trim(),
          privacySummary: String(req.body.policies.privacySummary || current.policies.privacySummary).trim(),
          residentRulesTemplate: String(
            req.body.policies.residentRulesTemplate || current.policies.residentRulesTemplate
          ).trim(),
          updatedAt: new Date().toISOString(),
        }
      : current.policies,
  };
  state.cmsContent = next;
  const admin = state.users.find((u) => u.id === req.auth!.sub)!;
  state.auditLogs.unshift({
    id: `aud_${crypto.randomUUID().slice(0, 6)}`,
    actorId: admin.id,
    actorName: admin.fullName,
    actorRole: admin.role,
    action: 'CMS_CONTENT_UPDATED',
    targetType: 'CMS',
    targetId: 'platform_cms',
    details: 'Updated CMS announcement banner, FAQs, or policies.',
    createdAt: new Date().toISOString(),
  });
  db.persist();
  res.json({ cms: state.cmsContent });
});

// Admin Broadcast Notifications (audience targeted + deduplicated)
router.get('/broadcasts', requireAuth, requireRole(UserRole.SUPER_ADMIN), (_req, res) => {
  res.json({ broadcasts: db.getState().broadcasts });
});

router.post('/broadcasts', requireAuth, requireRole(UserRole.SUPER_ADMIN), (req: AuthenticatedRequest, res) => {
  const parsed = createBroadcastSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid broadcast payload' });
    return;
  }
  const state = db.getState();
  const admin = state.users.find((u) => u.id === req.auth!.sub)!;
  const now = new Date().toISOString();

  // Prevent accidental duplicate broadcast within 60 seconds with identical title + audience
  const dup = state.broadcasts.find(
    (b) =>
      b.title === parsed.data.title.trim() &&
      b.targetAudience === parsed.data.targetAudience &&
      Date.now() - new Date(b.createdAt).getTime() < 60_000
  );
  if (dup) {
    res.status(409).json({ error: 'Identical broadcast already sent within the last minute.' });
    return;
  }

  const recipients = state.users.filter((u) => {
    if (u.isSuspended) return false;
    if (parsed.data.targetAudience === 'TENANTS') return u.role === UserRole.TENANT;
    if (parsed.data.targetAudience === 'PG_OWNERS') return u.role === UserRole.PG_OWNER;
    return u.role === UserRole.TENANT || u.role === UserRole.PG_OWNER;
  });

  recipients.forEach((u) => {
    state.notifications.unshift({
      id: `ntf_${crypto.randomUUID().slice(0, 6)}`,
      userId: u.id,
      title: parsed.data.title.trim(),
      body: parsed.data.body.trim(),
      category: parsed.data.category || 'ANNOUNCEMENT',
      read: false,
      createdAt: now,
    });
  });

  const record = {
    id: `brd_${crypto.randomUUID().slice(0, 6)}`,
    title: parsed.data.title.trim(),
    body: parsed.data.body.trim(),
    targetAudience: parsed.data.targetAudience,
    category: parsed.data.category || 'ANNOUNCEMENT',
    scheduledAt: parsed.data.scheduledAt || null,
    sentCount: recipients.length,
    createdBy: admin.fullName,
    createdAt: now,
  };
  state.broadcasts.unshift(record);
  state.auditLogs.unshift({
    id: `aud_${crypto.randomUUID().slice(0, 6)}`,
    actorId: admin.id,
    actorName: admin.fullName,
    actorRole: admin.role,
    action: 'BROADCAST_NOTIFICATION_SENT',
    targetType: 'NOTIFICATION',
    targetId: record.id,
    details: `${record.title} → ${record.targetAudience} (${record.sentCount} recipients)`,
    createdAt: now,
  });
  db.persist();
  res.status(201).json({ broadcast: record });
});

router.get('/notifications', requireAuth, (req: AuthenticatedRequest, res) => {
  const items = db.getState().notifications.filter((n) => n.userId === req.auth!.sub);
  res.json({ notifications: items });
});

router.post('/notifications/read-all', requireAuth, (req: AuthenticatedRequest, res) => {
  db.getState()
    .notifications.filter((n) => n.userId === req.auth!.sub)
    .forEach((n) => {
      n.read = true;
    });
  db.persist();
  res.json({ ok: true });
});

export default router;

