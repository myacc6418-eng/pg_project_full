import { Router } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import {
  BedStatus,
  ComplaintStatus,
  DocumentVerificationStatus,
  JoiningRequestStatus,
  LocationVerificationStatus,
  MaintenanceStatus,
  PropertyApprovalStatus,
  StayStatus,
  SubscriptionTier,
  UserRole,
} from '../../../../../packages/shared/types';
import {
  createComplaintSchema,
  createExpenseSchema,
  createJoiningRequestSchema,
  createSupportTicketSchema,
  ownerOnboardTenantSchema,
} from '../../../../../packages/shared/schemas';
import { isPropertyPubliclyVisible } from '../../../../../packages/shared/permissions';
import { db } from '../../shared/db';
import { AuthenticatedRequest, requireAuth, requireRole } from '../../middleware/auth';

const router = Router();

function ensureNotAadhaar(text: string): boolean {
  const lower = text.toLowerCase();
  return !lower.includes('aadhaar') && !lower.includes('aadhar') && !lower.includes('uidai');
}

// ==================== TENANT WORKSPACE & STAY ====================

router.get('/tenant/workspace', requireAuth, requireRole(UserRole.TENANT), (req: AuthenticatedRequest, res) => {
  const state = db.getState();
  const tenantId = req.auth!.sub;

  const activeStay = state.stays.find(
    (s) => s.tenantId === tenantId && (s.status === StayStatus.ACTIVE || s.status === StayStatus.CHECKOUT_REQUESTED)
  );
  const propMap = new Map(state.properties.map((p) => [p.id, p]));
  const roomMap = new Map(state.rooms.map((r) => [r.id, r]));
  const bedMap = new Map(state.beds.map((b) => [b.id, b]));

  const joiningRequests = state.joiningRequests
    .filter((j) => j.tenantId === tenantId)
    .map((j) => ({
      ...j,
      propertyName: propMap.get(j.propertyId)?.name || j.propertyId,
      assignedRoomNumber: j.assignedRoomId ? roomMap.get(j.assignedRoomId)?.roomNumber : undefined,
      assignedBedCode: j.assignedBedId ? bedMap.get(j.assignedBedId)?.bedCode : undefined,
    }));
  const pastStays = state.stays.filter((s) => s.tenantId === tenantId && s.status === StayStatus.CHECKED_OUT);
  const notifications = state.notifications.filter((n) => n.userId === tenantId);
  const supportTickets = state.supportTickets.filter((t) => t.userId === tenantId);
  const readNoticeIds = state.readNoticeIds[tenantId] || [];
  const nearbyBusinesses = state.localBusinesses
    .filter((b) => (b.status || 'ACTIVE') === 'ACTIVE')
    .slice(0, 4);

  if (!activeStay) {
    res.json({
      activeStay: null,
      property: null,
      room: null,
      bed: null,
      joiningRequests,
      pastStays,
      rentCharges: [],
      outstandingDues: state.outstandingDues.filter((d) => d.tenantId === tenantId),
      notices: [],
      readNoticeIds,
      foodMenu: [],
      complaints: [],
      maintenanceRequests: [],
      parcels: [],
      laundryRequests: state.laundryRequests.filter((l) => l.tenantId === tenantId),
      roommateExpenses: [],
      roommateTasks: [],
      documents: state.tenantDocuments.filter((d) => d.tenantId === tenantId),
      mealPreference: null,
      supportTickets,
      notifications,
      nearbyBusinesses,
    });
    return;
  }

  const property = state.properties.find((p) => p.id === activeStay.propertyId) || null;
  const room = state.rooms.find((r) => r.id === activeStay.roomId) || null;
  const bed = state.beds.find((b) => b.id === activeStay.bedId) || null;

  res.json({
    activeStay,
    property,
    room,
    bed,
    joiningRequests,
    pastStays,
    rentCharges: state.rentCharges.filter((rc) => rc.stayId === activeStay.id),
    outstandingDues: state.outstandingDues.filter((d) => d.tenantId === tenantId),
    notices: state.notices.filter((n) => n.propertyId === activeStay.propertyId),
    readNoticeIds,
    foodMenu: state.foodMenus.filter((f) => f.propertyId === activeStay.propertyId),
    complaints: state.complaints.filter((c) => c.tenantId === tenantId && c.propertyId === activeStay.propertyId),
    maintenanceRequests: state.maintenanceRequests.filter((m) => m.propertyId === activeStay.propertyId),
    parcels: state.parcels.filter((p) => p.tenantId === tenantId && p.propertyId === activeStay.propertyId),
    laundryRequests: state.laundryRequests.filter((l) => l.tenantId === tenantId && l.propertyId === activeStay.propertyId),
    roommateExpenses: state.roommateExpenses.filter((re) => re.roomId === activeStay.roomId),
    roommateTasks: state.roommateTasks.filter((rt) => rt.roomId === activeStay.roomId),
    documents: state.tenantDocuments.filter((d) => d.stayId === activeStay.id && d.tenantId === tenantId),
    mealPreference:
      state.mealPreferences.find((m) => m.tenantId === tenantId && m.propertyId === activeStay.propertyId) || null,
    supportTickets,
    notifications,
    nearbyBusinesses: state.localBusinesses
      .filter((b) => (b.status || 'ACTIVE') === 'ACTIVE' && (!property || b.city.toLowerCase() === property.city.toLowerCase()))
      .slice(0, 6),
  });
});

// Tenant submits joining request (via discovery or QR /join/:pgId)
router.post('/joining-requests', requireAuth, requireRole(UserRole.TENANT), (req: AuthenticatedRequest, res) => {
  const parsed = createJoiningRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid joining request' });
    return;
  }

  const state = db.getState();
  const tenantId = req.auth!.sub;
  const existingActiveStay = state.stays.find(
    (s) => s.tenantId === tenantId && s.status !== StayStatus.CHECKED_OUT
  );
  if (existingActiveStay) {
    res.status(409).json({
      error: 'You already have an active PG stay. Complete checkout before joining another PG.',
    });
    return;
  }

  const duplicatePending = state.joiningRequests.find(
    (jr) =>
      jr.tenantId === tenantId &&
      jr.propertyId === parsed.data.propertyId &&
      (jr.status === JoiningRequestStatus.PENDING ||
        jr.status === JoiningRequestStatus.INFO_REQUESTED ||
        jr.status === JoiningRequestStatus.APPROVED_AWAITING_TERMS)
  );
  if (duplicatePending) {
    res.status(409).json({ error: 'You already have an open joining request for this PG.' });
    return;
  }

  const property = state.properties.find((p) => p.id === parsed.data.propertyId);
  if (!property || property.isArchived || !isPropertyPubliclyVisible(property)) {
    res.status(404).json({ error: 'This PG is not available for joining.' });
    return;
  }

  const availableBedsCount = state.beds.filter(
    (b) => b.propertyId === property.id && b.status === BedStatus.AVAILABLE
  ).length;
  if (availableBedsCount === 0) {
    res.status(409).json({ error: 'This PG currently has no vacant beds available.' });
    return;
  }

  const tenant = state.users.find((u) => u.id === tenantId)!;
  const now = new Date().toISOString();
  const origin: 'QR' | 'DIRECT' = parsed.data.origin === 'QR' ? 'QR' : 'DIRECT';
  const jr = {
    id: `jr_${crypto.randomUUID().slice(0, 8)}`,
    tenantId,
    tenantName: tenant.fullName,
    tenantPhone: tenant.phone,
    tenantEmail: tenant.email,
    propertyId: property.id,
    preferredRoomType: parsed.data.preferredRoomType,
    moveInDate: parsed.data.moveInDate,
    notes: parsed.data.notes,
    origin,
    status: JoiningRequestStatus.PENDING,
    createdAt: now,
    updatedAt: now,
  };

  state.joiningRequests.unshift(jr);
  state.notifications.unshift({
    id: `ntf_${crypto.randomUUID().slice(0, 6)}`,
    userId: property.ownerId,
    title: origin === 'QR' ? 'New QR Onboarding Request' : 'New Tenant Joining Request',
    body: `${tenant.fullName} requested ${parsed.data.preferredRoomType} accommodation at ${property.name}${origin === 'QR' ? ' via QR code' : ''}.`,
    category: 'JOINING',
    read: false,
    createdAt: now,
  });
  db.recordActivity({
    ownerId: property.ownerId,
    propertyId: property.id,
    actorId: tenant.id,
    actorName: tenant.fullName,
    actorRole: UserRole.TENANT,
    action: origin === 'QR' ? 'QR_JOINING_REQUEST_CREATED' : 'JOINING_REQUEST_CREATED',
    entityType: 'JOINING_REQUEST',
    entityId: jr.id,
    newValue: `${tenant.fullName} (${parsed.data.preferredRoomType})`,
  });
  db.persist();
  res.status(201).json({ joiningRequest: jr });
});

// Tenant accepts PG terms to activate stay
router.post('/joining-requests/:id/accept-terms', requireAuth, requireRole(UserRole.TENANT), (req: AuthenticatedRequest, res) => {
  const state = db.getState();
  const tenantId = req.auth!.sub;
  const jr = state.joiningRequests.find((j) => j.id === req.params.id && j.tenantId === tenantId);
  if (!jr || jr.status !== JoiningRequestStatus.APPROVED_AWAITING_TERMS || !jr.assignedBedId || !jr.assignedRoomId) {
    res.status(400).json({ error: 'Joining request is not awaiting terms acceptance.' });
    return;
  }

  const existingStay = state.stays.find((s) => s.tenantId === tenantId && s.status !== StayStatus.CHECKED_OUT);
  if (existingStay) {
    res.status(409).json({ error: 'Only one active PG stay is permitted at a time.' });
    return;
  }

  const bed = state.beds.find((b) => b.id === jr.assignedBedId);
  const room = state.rooms.find((r) => r.id === jr.assignedRoomId);
  if (!bed || !room || (bed.status !== BedStatus.RESERVED && bed.status !== BedStatus.AVAILABLE)) {
    res.status(409).json({ error: 'Assigned bed is no longer available.' });
    return;
  }

  const tenantUser = state.users.find((u) => u.id === tenantId)!;
  const property = state.properties.find((p) => p.id === jr.propertyId);
  const now = new Date().toISOString();
  const agreementVersion = String(req.body?.agreementVersion || 'v2.0');
  bed.status = BedStatus.OCCUPIED;
  bed.assignedTenantId = tenantId;
  bed.reservedForRequestId = null;
  jr.status = JoiningRequestStatus.ACTIVE;
  jr.acceptedAgreementVersion = agreementVersion;
  jr.acceptedAt = now;
  jr.updatedAt = now;

  const stayId = `stay_${crypto.randomUUID().slice(0, 8)}`;
  const effectiveRent = bed.monthlyRentOverrideInr || room.monthlyRentInr;
  const stay = {
    id: stayId,
    tenantCode: `PGF-TEN-${1000 + state.stays.length + 1}`,
    tenantId,
    tenantName: jr.tenantName,
    tenantPhone: tenantUser.phone,
    tenantEmail: tenantUser.email,
    propertyId: jr.propertyId,
    roomId: room.id,
    bedId: bed.id,
    monthlyRentInr: effectiveRent,
    securityDepositInr: room.depositInr,
    depositPaid: true,
    termsAcceptedAt: now,
    acceptedAgreementVersion: agreementVersion,
    status: StayStatus.ACTIVE,
    noticeDays: 30,
    stayHistory: [
      {
        id: `sh_${crypto.randomUUID().slice(0, 6)}`,
        eventType: 'JOINED',
        summary: `Accepted house rules (${agreementVersion}) & activated stay in Room ${room.roomNumber} · Bed ${bed.bedCode}`,
        actorName: tenantUser.fullName,
        timestamp: now,
      },
    ],
    depositSettlementHistory: [
      {
        id: `dep_${crypto.randomUUID().slice(0, 6)}`,
        type: 'RECEIVED' as const,
        label: 'Initial Security Deposit',
        amountInr: room.depositInr,
        notes: 'Recorded upon stay activation',
        createdAt: now,
      },
    ],
    createdAt: now,
  };
  state.stays.unshift(stay);

  const monthStr = now.slice(0, 7);
  state.rentCharges.unshift({
    id: `rc_${crypto.randomUUID().slice(0, 8)}`,
    stayId,
    tenantId,
    propertyId: jr.propertyId,
    billingMonth: monthStr,
    amountInr: effectiveRent,
    lateFeeInr: 0,
    paidAmountInr: 0,
    dueDate: `${monthStr}-28`,
    status: 'DUE',
  });

  if (property) {
    db.recordActivity({
      ownerId: property.ownerId,
      propertyId: property.id,
      actorId: tenantUser.id,
      actorName: tenantUser.fullName,
      actorRole: UserRole.TENANT,
      action: 'TENANT_STAY_ACTIVATED',
      entityType: 'TENANT_STAY',
      entityId: stayId,
      newValue: `${tenantUser.fullName} → Bed ${bed.bedCode}`,
    });
  }

  db.persist();
  res.json({ stay, joiningRequest: jr });
});

// Tenant responds when owner requested more info on a joining request
router.post('/joining-requests/:id/respond', requireAuth, requireRole(UserRole.TENANT), (req: AuthenticatedRequest, res) => {
  const state = db.getState();
  const jr = state.joiningRequests.find((j) => j.id === req.params.id && j.tenantId === req.auth!.sub);
  if (!jr || (jr.status !== JoiningRequestStatus.INFO_REQUESTED && jr.status !== JoiningRequestStatus.PENDING)) {
    res.status(400).json({ error: 'Joining request is not open for clarification.' });
    return;
  }
  const reply = String(req.body?.notes || '').trim();
  if (reply.length < 3) {
    res.status(400).json({ error: 'Provide your clarification details.' });
    return;
  }
  const now = new Date().toISOString();
  jr.notes = jr.notes ? `${jr.notes}\n[Tenant Reply]: ${reply}` : reply;
  jr.status = JoiningRequestStatus.PENDING;
  jr.updatedAt = now;
  const property = state.properties.find((p) => p.id === jr.propertyId);
  if (property) {
    state.notifications.unshift({
      id: `ntf_${crypto.randomUUID().slice(0, 6)}`,
      userId: property.ownerId,
      title: 'Tenant Provided Requested Details',
      body: `${jr.tenantName} updated their joining request for ${property.name}.`,
      category: 'JOINING',
      read: false,
      createdAt: now,
    });
  }
  db.persist();
  res.json({ joiningRequest: jr });
});

// Tenant cancels pending / info-requested joining request
router.post('/joining-requests/:id/cancel', requireAuth, requireRole(UserRole.TENANT), (req: AuthenticatedRequest, res) => {
  const state = db.getState();
  const jr = state.joiningRequests.find((j) => j.id === req.params.id && j.tenantId === req.auth!.sub);
  if (!jr) {
    res.status(404).json({ error: 'Joining request not found' });
    return;
  }
  if (jr.status === JoiningRequestStatus.ACTIVE || jr.status === JoiningRequestStatus.CANCELLED) {
    res.status(400).json({ error: 'This joining request cannot be cancelled.' });
    return;
  }
  if (jr.assignedBedId) {
    const bed = state.beds.find((b) => b.id === jr.assignedBedId && b.reservedForRequestId === jr.id);
    if (bed && bed.status === BedStatus.RESERVED) {
      bed.status = BedStatus.AVAILABLE;
      bed.reservedForRequestId = null;
    }
  }
  const now = new Date().toISOString();
  jr.status = JoiningRequestStatus.CANCELLED;
  jr.cancellationReason = String(req.body?.reason || 'Cancelled by tenant').trim();
  jr.updatedAt = now;
  const property = state.properties.find((p) => p.id === jr.propertyId);
  if (property) {
    db.recordActivity({
      ownerId: property.ownerId,
      propertyId: property.id,
      actorId: req.auth!.sub,
      actorName: jr.tenantName,
      actorRole: UserRole.TENANT,
      action: 'JOINING_REQUEST_CANCELLED',
      entityType: 'JOINING_REQUEST',
      entityId: jr.id,
      newValue: jr.cancellationReason,
    });
  }
  db.persist();
  res.json({ joiningRequest: jr });
});

// Tenant saves Veg/Non-Veg meal preference and meal participation toggles
router.post('/tenant/meal-preference', requireAuth, requireRole(UserRole.TENANT), (req: AuthenticatedRequest, res) => {
  const state = db.getState();
  const activeStay = state.stays.find((s) => s.tenantId === req.auth!.sub && s.status !== StayStatus.CHECKED_OUT);
  if (!activeStay) {
    res.status(400).json({ error: 'Active stay required' });
    return;
  }
  const preference = req.body?.preference === 'NON_VEG' ? 'NON_VEG' : 'VEG';
  const breakfastOptIn = req.body?.breakfastOptIn !== undefined ? Boolean(req.body.breakfastOptIn) : true;
  const lunchOptIn = req.body?.lunchOptIn !== undefined ? Boolean(req.body.lunchOptIn) : true;
  const dinnerOptIn = req.body?.dinnerOptIn !== undefined ? Boolean(req.body.dinnerOptIn) : true;
  const user = state.users.find((u) => u.id === req.auth!.sub)!;
  const now = new Date().toISOString();
  let existing = state.mealPreferences.find(
    (m) => m.tenantId === user.id && m.propertyId === activeStay.propertyId
  );
  if (existing) {
    existing.preference = preference;
    if (req.body?.breakfastOptIn !== undefined) existing.breakfastOptIn = breakfastOptIn;
    if (req.body?.lunchOptIn !== undefined) existing.lunchOptIn = lunchOptIn;
    if (req.body?.dinnerOptIn !== undefined) existing.dinnerOptIn = dinnerOptIn;
    existing.updatedAt = now;
  } else {
    existing = {
      id: `mp_${crypto.randomUUID().slice(0, 6)}`,
      propertyId: activeStay.propertyId,
      tenantId: user.id,
      tenantName: user.fullName,
      preference,
      breakfastOptIn,
      lunchOptIn,
      dinnerOptIn,
      updatedAt: now,
    };
    state.mealPreferences.push(existing);
  }
  db.persist();
  res.json({ mealPreference: existing });
});

// Tenant submits meal feedback
router.post('/tenant/meal-feedback', requireAuth, requireRole(UserRole.TENANT), (req: AuthenticatedRequest, res) => {
  const state = db.getState();
  const activeStay = state.stays.find((s) => s.tenantId === req.auth!.sub && s.status !== StayStatus.CHECKED_OUT);
  if (!activeStay) {
    res.status(400).json({ error: 'Active stay required' });
    return;
  }
  const rating = Math.min(5, Math.max(1, Math.round(Number(req.body?.rating || 5))));
  const comment = String(req.body?.comment || '').trim();
  if (comment.length < 3) {
    res.status(400).json({ error: 'Feedback comment is required' });
    return;
  }
  const user = state.users.find((u) => u.id === req.auth!.sub)!;
  const feedback = {
    id: `mf_${crypto.randomUUID().slice(0, 6)}`,
    propertyId: activeStay.propertyId,
    tenantId: user.id,
    tenantName: user.fullName,
    rating,
    comment,
    createdAt: new Date().toISOString(),
  };
  state.mealFeedbacks.unshift(feedback);
  db.persist();
  res.status(201).json({ feedback });
});

// Tenant uploads private verification document (non-Aadhaar only)
router.post('/tenant/documents', requireAuth, requireRole(UserRole.TENANT), (req: AuthenticatedRequest, res) => {
  const state = db.getState();
  const activeStay = state.stays.find((s) => s.tenantId === req.auth!.sub && s.status !== StayStatus.CHECKED_OUT);
  if (!activeStay) {
    res.status(400).json({ error: 'Active stay required to upload verification documents.' });
    return;
  }
  const docType = (req.body?.docType || 'INSTITUTION_ID') as any;
  const title = String(req.body?.title || '').trim();
  const fileUrl = String(req.body?.fileUrl || 'https://storage.pgfinder.in/private/doc.pdf').trim();

  if (title.length < 3 || !ensureNotAadhaar(title) || !ensureNotAadhaar(String(docType))) {
    res.status(400).json({
      error: 'Provide a valid non-Aadhaar document title (College/Employer ID, Driving License, Passport, or Local Verification).',
    });
    return;
  }

  const doc = {
    id: `tdoc_${crypto.randomUUID().slice(0, 6)}`,
    stayId: activeStay.id,
    tenantId: activeStay.tenantId,
    propertyId: activeStay.propertyId,
    docType,
    title,
    fileUrl,
    status: DocumentVerificationStatus.PENDING,
    expiresAt: req.body?.expiresAt ? String(req.body.expiresAt) : null,
    verificationHistory: [],
    uploadedAt: new Date().toISOString(),
  };
  state.tenantDocuments.unshift(doc);
  db.persist();
  res.status(201).json({ document: doc });
});

// Tenant replaces rejected / resubmission-required document
router.post('/tenant/documents/:id/replace', requireAuth, requireRole(UserRole.TENANT), (req: AuthenticatedRequest, res) => {
  const state = db.getState();
  const doc = state.tenantDocuments.find((d) => d.id === req.params.id && d.tenantId === req.auth!.sub);
  if (!doc) {
    res.status(404).json({ error: 'Document not found' });
    return;
  }
  const title = String(req.body?.title || doc.title).trim();
  const fileUrl = String(req.body?.fileUrl || doc.fileUrl).trim();
  if (title.length < 3 || !ensureNotAadhaar(title) || !ensureNotAadhaar(fileUrl)) {
    res.status(400).json({ error: 'Provide a valid non-Aadhaar document title and file reference.' });
    return;
  }
  const user = state.users.find((u) => u.id === req.auth!.sub)!;
  const prev = doc.status;
  doc.title = title;
  doc.fileUrl = fileUrl;
  doc.status = DocumentVerificationStatus.PENDING;
  doc.uploadedAt = new Date().toISOString();
  doc.verificationHistory.unshift({
    id: `vh_${crypto.randomUUID().slice(0, 6)}`,
    actorId: user.id,
    actorName: user.fullName,
    previousStatus: prev,
    newStatus: DocumentVerificationStatus.PENDING,
    notes: 'Tenant uploaded replacement document for review.',
    timestamp: doc.uploadedAt,
  });
  db.persist();
  res.json({ document: doc });
});

// Tenant submits complaint
router.post('/tenant/complaints', requireAuth, requireRole(UserRole.TENANT), (req: AuthenticatedRequest, res) => {
  const parsed = createComplaintSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid complaint' });
    return;
  }
  const state = db.getState();
  const activeStay = state.stays.find(
    (s) => s.tenantId === req.auth!.sub && s.status !== StayStatus.CHECKED_OUT
  );
  if (!activeStay) {
    res.status(400).json({ error: 'Active PG stay required to submit a complaint.' });
    return;
  }
  const user = state.users.find((u) => u.id === req.auth!.sub)!;
  const now = new Date().toISOString();
  const complaint = {
    id: `cmp_${crypto.randomUUID().slice(0, 8)}`,
    propertyId: activeStay.propertyId,
    tenantId: user.id,
    tenantName: user.fullName,
    category: parsed.data.category,
    priority: parsed.data.priority,
    description: parsed.data.description,
    photoUrl: parsed.data.photoUrl || undefined,
    status: ComplaintStatus.OPEN,
    timeline: [
      {
        id: `cmpt_${crypto.randomUUID().slice(0, 6)}`,
        actorName: user.fullName,
        status: ComplaintStatus.OPEN,
        note: 'Complaint submitted by resident.',
        timestamp: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };
  state.complaints.unshift(complaint);
  db.persist();
  res.status(201).json({ complaint });
});

// Tenant adds comment or escalates/confirms complaint resolution
router.post('/tenant/complaints/:id/comment', requireAuth, requireRole(UserRole.TENANT), (req: AuthenticatedRequest, res) => {
  const state = db.getState();
  const cmp = state.complaints.find((c) => c.id === req.params.id && c.tenantId === req.auth!.sub);
  if (!cmp) {
    res.status(404).json({ error: 'Complaint not found' });
    return;
  }
  const note = String(req.body?.note || '').trim();
  if (note.length < 2) {
    res.status(400).json({ error: 'Comment cannot be empty' });
    return;
  }
  const user = state.users.find((u) => u.id === req.auth!.sub)!;
  const now = new Date().toISOString();
  cmp.timeline = cmp.timeline || [];
  cmp.timeline.push({
    id: `cmpt_${crypto.randomUUID().slice(0, 6)}`,
    actorName: user.fullName,
    status: cmp.status,
    note,
    timestamp: now,
  });
  cmp.updatedAt = now;
  db.persist();
  res.json({ complaint: cmp });
});

router.post('/tenant/complaints/:id/confirm-resolved', requireAuth, requireRole(UserRole.TENANT), (req: AuthenticatedRequest, res) => {
  const state = db.getState();
  const cmp = state.complaints.find((c) => c.id === req.params.id && c.tenantId === req.auth!.sub);
  if (!cmp) {
    res.status(404).json({ error: 'Complaint not found' });
    return;
  }
  const user = state.users.find((u) => u.id === req.auth!.sub)!;
  const now = new Date().toISOString();
  cmp.tenantConfirmedResolved = true;
  cmp.status = ComplaintStatus.CLOSED;
  cmp.updatedAt = now;
  cmp.timeline = cmp.timeline || [];
  cmp.timeline.push({
    id: `cmpt_${crypto.randomUUID().slice(0, 6)}`,
    actorName: user.fullName,
    status: ComplaintStatus.CLOSED,
    note: 'Resident confirmed issue is resolved.',
    timestamp: now,
  });
  db.persist();
  res.json({ complaint: cmp });
});

// Tenant raises maintenance request for their room
router.post('/tenant/maintenance', requireAuth, requireRole(UserRole.TENANT), (req: AuthenticatedRequest, res) => {
  const state = db.getState();
  const activeStay = state.stays.find((s) => s.tenantId === req.auth!.sub && s.status !== StayStatus.CHECKED_OUT);
  if (!activeStay) {
    res.status(400).json({ error: 'Active stay required to request maintenance.' });
    return;
  }
  const title = String(req.body?.title || '').trim();
  if (title.length < 4) {
    res.status(400).json({ error: 'Describe the maintenance issue clearly.' });
    return;
  }
  const user = state.users.find((u) => u.id === req.auth!.sub)!;
  const room = state.rooms.find((r) => r.id === activeStay.roomId);
  const now = new Date().toISOString();
  const item = {
    id: `mnt_${crypto.randomUUID().slice(0, 6)}`,
    propertyId: activeStay.propertyId,
    requestedBy: user.fullName,
    title,
    category: String(req.body?.category || 'ROOM_REPAIR'),
    priority: (['LOW', 'MEDIUM', 'HIGH'].includes(req.body?.priority) ? req.body.priority : 'MEDIUM') as
      | 'LOW'
      | 'MEDIUM'
      | 'HIGH',
    roomNumber: room?.roomNumber || '-',
    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    estimatedCostInr: 0,
    status: MaintenanceStatus.PENDING,
    notes: req.body?.notes ? String(req.body.notes).trim() : undefined,
    createdAt: now,
  };
  state.maintenanceRequests.unshift(item);
  db.persist();
  res.status(201).json({ maintenanceRequest: item });
});

// Tenant marks PG notice as read
router.post('/tenant/notices/:id/read', requireAuth, requireRole(UserRole.TENANT), (req: AuthenticatedRequest, res) => {
  const state = db.getState();
  const uid = req.auth!.sub;
  const current = state.readNoticeIds[uid] || [];
  if (!current.includes(req.params.id)) {
    state.readNoticeIds[uid] = [...current, req.params.id];
    db.persist();
  }
  res.json({ readNoticeIds: state.readNoticeIds[uid] });
});

// Tenant logs roommate shared expense
router.post('/tenant/roommate-expenses', requireAuth, requireRole(UserRole.TENANT), (req: AuthenticatedRequest, res) => {
  const state = db.getState();
  const activeStay = state.stays.find((s) => s.tenantId === req.auth!.sub && s.status !== StayStatus.CHECKED_OUT);
  if (!activeStay) {
    res.status(400).json({ error: 'Active stay required.' });
    return;
  }
  const title = String(req.body?.title || '').trim();
  const amountInr = Math.round(Number(req.body?.amountInr || 0));
  const splitCount = Math.max(1, Math.round(Number(req.body?.splitCount || 2)));
  if (title.length < 2 || amountInr <= 0) {
    res.status(400).json({ error: 'Enter a valid item title and amount.' });
    return;
  }
  const user = state.users.find((u) => u.id === req.auth!.sub)!;
  const item = {
    id: `rme_${crypto.randomUUID().slice(0, 6)}`,
    propertyId: activeStay.propertyId,
    roomId: activeStay.roomId,
    addedByTenantId: user.id,
    addedByName: user.fullName,
    title,
    amountInr,
    splitCount,
    isSettled: false,
    settledAt: null,
    createdAt: new Date().toISOString(),
  };
  state.roommateExpenses.unshift(item);
  db.persist();
  res.status(201).json({ roommateExpense: item });
});

router.post('/tenant/roommate-expenses/:id/settle', requireAuth, requireRole(UserRole.TENANT), (req: AuthenticatedRequest, res) => {
  const state = db.getState();
  const activeStay = state.stays.find((s) => s.tenantId === req.auth!.sub && s.status !== StayStatus.CHECKED_OUT);
  const item = state.roommateExpenses.find((r) => r.id === req.params.id && activeStay && r.roomId === activeStay.roomId);
  if (!item) {
    res.status(404).json({ error: 'Roommate expense not found' });
    return;
  }
  item.isSettled = !Boolean(item.isSettled);
  item.settledAt = item.isSettled ? new Date().toISOString() : null;
  db.persist();
  res.json({ roommateExpense: item });
});

// Tenant roommate shared grocery & task list
router.post('/tenant/roommate-tasks', requireAuth, requireRole(UserRole.TENANT), (req: AuthenticatedRequest, res) => {
  const state = db.getState();
  const activeStay = state.stays.find((s) => s.tenantId === req.auth!.sub && s.status !== StayStatus.CHECKED_OUT);
  if (!activeStay) {
    res.status(400).json({ error: 'Active stay required.' });
    return;
  }
  const title = String(req.body?.title || '').trim();
  if (title.length < 2) {
    res.status(400).json({ error: 'Task or grocery item title required.' });
    return;
  }
  const user = state.users.find((u) => u.id === req.auth!.sub)!;
  const item = {
    id: `rmt_${crypto.randomUUID().slice(0, 6)}`,
    propertyId: activeStay.propertyId,
    roomId: activeStay.roomId,
    addedByTenantId: user.id,
    addedByName: user.fullName,
    type: req.body?.type === 'GROCERY' ? ('GROCERY' as const) : ('TASK' as const),
    title,
    assignedToName: req.body?.assignedToName ? String(req.body.assignedToName).trim() : user.fullName,
    completed: false,
    createdAt: new Date().toISOString(),
  };
  state.roommateTasks.unshift(item);
  db.persist();
  res.status(201).json({ task: item });
});

router.patch('/tenant/roommate-tasks/:id', requireAuth, requireRole(UserRole.TENANT), (req: AuthenticatedRequest, res) => {
  const state = db.getState();
  const activeStay = state.stays.find((s) => s.tenantId === req.auth!.sub && s.status !== StayStatus.CHECKED_OUT);
  const task = state.roommateTasks.find((t) => t.id === req.params.id && activeStay && t.roomId === activeStay.roomId);
  if (!task) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }
  task.completed = req.body?.completed !== undefined ? Boolean(req.body.completed) : !task.completed;
  db.persist();
  res.json({ task });
});

// Tenant laundry pickup booking
router.post('/tenant/laundry', requireAuth, requireRole(UserRole.TENANT), (req: AuthenticatedRequest, res) => {
  const state = db.getState();
  const activeStay = state.stays.find((s) => s.tenantId === req.auth!.sub && s.status !== StayStatus.CHECKED_OUT);
  if (!activeStay) {
    res.status(400).json({ error: 'Active stay required.' });
    return;
  }
  const itemsSummary = String(req.body?.itemsSummary || '').trim();
  if (itemsSummary.length < 3) {
    res.status(400).json({ error: 'Describe laundry items or estimated kg.' });
    return;
  }
  const user = state.users.find((u) => u.id === req.auth!.sub)!;
  const reqItem = {
    id: `lnd_${crypto.randomUUID().slice(0, 6)}`,
    propertyId: activeStay.propertyId,
    tenantId: user.id,
    tenantName: user.fullName,
    serviceName: String(req.body?.serviceName || 'SpinFresh Express Laundry'),
    pickupDate: String(req.body?.pickupDate || new Date().toISOString().slice(0, 10)),
    itemsSummary,
    estimatedInr: Math.max(50, Math.round(Number(req.body?.estimatedInr || 180))),
    status: 'REQUESTED' as const,
    createdAt: new Date().toISOString(),
  };
  state.laundryRequests.unshift(reqItem);
  db.persist();
  res.status(201).json({ laundryRequest: reqItem });
});

// Tenant marks parcel as picked up
router.post('/tenant/parcels/:id/pickup', requireAuth, requireRole(UserRole.TENANT), (req: AuthenticatedRequest, res) => {
  const state = db.getState();
  const parcel = state.parcels.find((p) => p.id === req.params.id && p.tenantId === req.auth!.sub);
  if (!parcel) {
    res.status(404).json({ error: 'Parcel not found' });
    return;
  }
  parcel.pickedUpAt = new Date().toISOString();
  db.persist();
  res.json({ parcel });
});

// Tenant requests checkout (with optional expectedCheckoutDate)
router.post('/tenant/checkout/request', requireAuth, requireRole(UserRole.TENANT), (req: AuthenticatedRequest, res) => {
  const state = db.getState();
  const stay = state.stays.find((s) => s.tenantId === req.auth!.sub && s.status === StayStatus.ACTIVE);
  if (!stay) {
    res.status(400).json({ error: 'No active stay eligible for checkout.' });
    return;
  }
  const now = new Date().toISOString();
  stay.status = StayStatus.CHECKOUT_REQUESTED;
  stay.checkoutRequestedAt = now;
  stay.expectedCheckoutDate = req.body?.expectedCheckoutDate ? String(req.body.expectedCheckoutDate) : null;
  stay.stayHistory = stay.stayHistory || [];
  stay.stayHistory.unshift({
    id: `sh_${crypto.randomUUID().slice(0, 6)}`,
    eventType: 'CHECKOUT_REQUESTED',
    summary: stay.expectedCheckoutDate
      ? `Resident submitted checkout request (Expected vacate: ${stay.expectedCheckoutDate})`
      : 'Resident submitted checkout request',
    actorName: stay.tenantName,
    timestamp: now,
  });

  const property = state.properties.find((p) => p.id === stay.propertyId);
  if (property) {
    state.notifications.unshift({
      id: `ntf_${crypto.randomUUID().slice(0, 6)}`,
      userId: property.ownerId,
      title: 'Checkout Requested',
      body: `${stay.tenantName} requested checkout from ${property.name}. Review dues before finalizing.`,
      category: 'CHECKOUT',
      read: false,
      createdAt: now,
    });
  }
  db.persist();
  res.json({ stay });
});

// Shared Support Tickets (Tenants & Owners create/view; Admin resolves via /admin/support-tickets)
router.get('/support-tickets', requireAuth, (req: AuthenticatedRequest, res) => {
  const state = db.getState();
  const tickets =
    req.auth!.role === UserRole.SUPER_ADMIN
      ? state.supportTickets
      : state.supportTickets.filter((t) => t.userId === req.auth!.sub);
  res.json({ tickets });
});

router.post('/support-tickets', requireAuth, (req: AuthenticatedRequest, res) => {
  const parsed = createSupportTicketSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid support ticket' });
    return;
  }
  const state = db.getState();
  const user = state.users.find((u) => u.id === req.auth!.sub)!;
  const property = parsed.data.propertyId
    ? state.properties.find((p) => p.id === parsed.data.propertyId)
    : undefined;
  const now = new Date().toISOString();
  const ticket = {
    id: `tkt_${crypto.randomUUID().slice(0, 6)}`,
    userId: user.id,
    userName: user.fullName,
    userRole: user.role,
    propertyId: property?.id,
    propertyName: property?.name,
    subject: parsed.data.subject.trim(),
    category: parsed.data.category,
    priority: parsed.data.priority,
    status: 'OPEN' as const,
    messages: [
      {
        id: `tmsg_${crypto.randomUUID().slice(0, 6)}`,
        senderId: user.id,
        senderName: user.fullName,
        senderRole: user.role,
        body: parsed.data.message.trim(),
        createdAt: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };
  state.supportTickets.unshift(ticket);
  db.persist();
  res.status(201).json({ ticket });
});

router.post('/support-tickets/:id/reply', requireAuth, (req: AuthenticatedRequest, res) => {
  const state = db.getState();
  const ticket = state.supportTickets.find((t) => t.id === req.params.id);
  if (!ticket) {
    res.status(404).json({ error: 'Support ticket not found' });
    return;
  }
  if (req.auth!.role !== UserRole.SUPER_ADMIN && ticket.userId !== req.auth!.sub) {
    res.status(403).json({ error: 'Unauthorized ticket access' });
    return;
  }
  const body = String(req.body?.message || '').trim();
  if (body.length < 2) {
    res.status(400).json({ error: 'Reply message is required' });
    return;
  }
  const user = state.users.find((u) => u.id === req.auth!.sub)!;
  const now = new Date().toISOString();
  ticket.messages.push({
    id: `tmsg_${crypto.randomUUID().slice(0, 6)}`,
    senderId: user.id,
    senderName: user.fullName,
    senderRole: user.role,
    body,
    createdAt: now,
  });
  ticket.updatedAt = now;
  db.persist();
  res.json({ ticket });
});

// ==================== OWNER OPERATIONS OVERVIEW ====================

router.get('/owner/overview', requireAuth, requireRole(UserRole.PG_OWNER), (req: AuthenticatedRequest, res) => {
  const state = db.getState();
  const ownerId = req.auth!.sub;
  const propertyFilterId = req.query.propertyId ? String(req.query.propertyId) : 'ALL';

  const ownerProperties = state.properties.filter((p) => p.ownerId === ownerId);
  const scopedProperties =
    propertyFilterId !== 'ALL'
      ? ownerProperties.filter((p) => p.id === propertyFilterId)
      : ownerProperties;
  const scopedIds = new Set(scopedProperties.map((p) => p.id));

  const floors = state.floors.filter((f) => scopedIds.has(f.propertyId));
  const rooms = state.rooms.filter((r) => scopedIds.has(r.propertyId));
  const beds = state.beds.filter((b) => scopedIds.has(b.propertyId));
  const stays = state.stays.filter((s) => scopedIds.has(s.propertyId));
  const joiningRequests = state.joiningRequests.filter((j) => scopedIds.has(j.propertyId));
  const rentCharges = state.rentCharges.filter((rc) => scopedIds.has(rc.propertyId));
  const outstandingDues = state.outstandingDues.filter((d) => scopedIds.has(d.propertyId));
  const expenses = state.expenses.filter((e) => scopedIds.has(e.propertyId));
  const complaints = state.complaints.filter((c) => scopedIds.has(c.propertyId));
  const maintenanceRequests = state.maintenanceRequests.filter((m) => scopedIds.has(m.propertyId));
  const notices = state.notices.filter((n) => scopedIds.has(n.propertyId));
  const staff = state.staff.filter(
    (st) => st.ownerId === ownerId && (propertyFilterId === 'ALL' || st.propertyId === propertyFilterId)
  );
  const staffTasks = state.staffTasks.filter(
    (t) => t.ownerId === ownerId && (propertyFilterId === 'ALL' || t.propertyId === propertyFilterId)
  );
  const payrollRecords = state.payrollRecords.filter(
    (p) => p.ownerId === ownerId && (propertyFilterId === 'ALL' || p.propertyId === propertyFilterId)
  );
  const foodMenus = state.foodMenus.filter((f) => scopedIds.has(f.propertyId));
  const mealPreferences = state.mealPreferences.filter((m) => scopedIds.has(m.propertyId));
  const mealFeedbacks = state.mealFeedbacks.filter((m) => scopedIds.has(m.propertyId));
  const reviews = state.reviews.filter((r) => scopedIds.has(r.propertyId));
  const tenantDocuments = state.tenantDocuments.filter((d) => scopedIds.has(d.propertyId));
  const bedTransfers = state.bedTransfers.filter((t) => scopedIds.has(t.propertyId));
  const activityLogs = state.activityLogs.filter(
    (l) => l.ownerId === ownerId && (propertyFilterId === 'ALL' || !l.propertyId || l.propertyId === propertyFilterId)
  );
  const subscription = state.subscriptions.find((s) => s.ownerId === ownerId);

  const currentMonth = new Date().toISOString().slice(0, 7);
  const rentCollectedInr = rentCharges.reduce((acc, r) => acc + r.paidAmountInr, 0);
  const rentCollectedThisMonthInr = rentCharges
    .filter((r) => r.billingMonth === currentMonth || r.paidAt?.startsWith(currentMonth))
    .reduce((acc, r) => acc + r.paidAmountInr, 0);
  const pendingRentInr = rentCharges
    .filter((r) => r.status !== 'WAIVED')
    .reduce((acc, r) => acc + Math.max(0, r.amountInr + (r.lateFeeInr || 0) - r.paidAmountInr), 0);
  const totalExpensesInr = expenses.reduce((acc, e) => acc + e.amountInr, 0);
  const monthlyExpensesInr = expenses
    .filter((e) => e.date.startsWith(currentMonth) || e.date.startsWith('2026-11'))
    .reduce((acc, e) => acc + e.amountInr, 0);
  const outstandingDuesInr = outstandingDues
    .filter((d) => d.status !== 'SETTLED')
    .reduce((acc, d) => acc + Math.max(0, d.totalAmountInr - d.paidAmountInr), 0);

  const totalBeds = beds.length;
  const occupiedBeds = beds.filter((b) => b.status === BedStatus.OCCUPIED).length;
  const vacantBeds = beds.filter((b) => b.status === BedStatus.AVAILABLE).length;
  const occupancyRatePct = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

  const pendingJoiningRequests = joiningRequests.filter((j) => j.status === JoiningRequestStatus.PENDING).length;
  const openComplaints = complaints.filter(
    (c) => c.status !== ComplaintStatus.RESOLVED && c.status !== ComplaintStatus.CLOSED
  ).length;
  const pendingMaintenance = maintenanceRequests.filter((m) => m.status !== MaintenanceStatus.COMPLETED).length;
  const upcomingCheckouts = stays.filter((s) => s.status === StayStatus.CHECKOUT_REQUESTED).length;
  const pendingProperties = scopedProperties.filter(
    (p) =>
      p.approvalStatus === PropertyApprovalStatus.PENDING_APPROVAL ||
      p.approvalStatus === PropertyApprovalStatus.UNDER_REVIEW ||
      p.approvalStatus === PropertyApprovalStatus.CORRECTIONS_REQUIRED ||
      p.locationStatus === LocationVerificationStatus.PENDING_VERIFICATION ||
      p.locationStatus === LocationVerificationStatus.REVERIFICATION_REQUIRED
  ).length;

  const openRentChargesCount = rentCharges.filter(
    (rc) => rc.status !== 'PAID' && rc.status !== 'WAIVED' && rc.amountInr + (rc.lateFeeInr || 0) > rc.paidAmountInr
  ).length;
  const openStaffTasksCount = staffTasks.filter((t) => t.status !== 'COMPLETED').length;

  res.json({
    properties: ownerProperties,
    scopedPropertyIds: Array.from(scopedIds),
    subscription,
    metrics: {
      totalProperties: scopedProperties.length,
      approvedProperties: scopedProperties.filter((p) => p.approvalStatus === PropertyApprovalStatus.APPROVED).length,
      pendingProperties,
      pendingApprovals: pendingProperties,
      totalRooms: rooms.length,
      totalBeds,
      occupiedBeds,
      vacantBeds,
      occupancyRatePct,
      activeTenants: stays.filter((s) => s.status !== StayStatus.CHECKED_OUT).length,
      pendingJoiningRequests,
      rentCollectedInr,
      rentCollectedThisMonthInr: rentCollectedThisMonthInr || rentCollectedInr,
      pendingRentInr,
      totalExpensesInr,
      monthlyExpensesInr: monthlyExpensesInr || totalExpensesInr,
      outstandingDuesInr,
      netOperatingInr: rentCollectedInr - totalExpensesInr,
      openComplaints,
      pendingMaintenance,
      upcomingCheckouts,
    },
    todaysOperations: [
      {
        id: 'op_rent',
        title: 'Rent Payments Due',
        count: openRentChargesCount,
        summary: `${openRentChargesCount} billing records awaiting payment (${pendingRentInr > 0 ? `₹${pendingRentInr.toLocaleString('en-IN')}` : 'All clear'})`,
        route: '/owner/rent',
        severity: openRentChargesCount > 0 ? 'warning' : 'success',
      },
      {
        id: 'op_joining',
        title: 'Joining Requests Awaiting Approval',
        count: pendingJoiningRequests,
        summary: `${pendingJoiningRequests} resident applications ready for bed assignment`,
        route: '/owner/joining-requests',
        severity: pendingJoiningRequests > 0 ? 'warning' : 'success',
      },
      {
        id: 'op_vacant',
        title: 'Vacant Beds Requiring Attention',
        count: vacantBeds,
        summary: `${vacantBeds} available beds open across ${rooms.length} rooms`,
        route: '/owner/vacancies',
        severity: vacantBeds > 0 ? 'info' : 'success',
      },
      {
        id: 'op_maintenance',
        title: 'Maintenance Requests',
        count: pendingMaintenance,
        summary: `${pendingMaintenance} open property maintenance tickets`,
        route: '/owner/maintenance',
        severity: pendingMaintenance > 0 ? 'warning' : 'success',
      },
      {
        id: 'op_complaints',
        title: 'Complaints Awaiting Response',
        count: openComplaints,
        summary: `${openComplaints} resident complaints need action or staff assignment`,
        route: '/owner/complaints',
        severity: openComplaints > 0 ? 'error' : 'success',
      },
      {
        id: 'op_staff',
        title: 'Staff Tasks',
        count: openStaffTasksCount,
        summary: `${openStaffTasksCount} active caretaker & kitchen tasks`,
        route: '/owner/staff',
        severity: 'info',
      },
      {
        id: 'op_checkouts',
        title: 'Checkout Requests',
        count: upcomingCheckouts,
        summary: `${upcomingCheckouts} stays awaiting final settlement & bed release`,
        route: '/owner/checkouts',
        severity: upcomingCheckouts > 0 ? 'warning' : 'success',
      },
      {
        id: 'op_approvals',
        title: 'Property Approval & Location Updates',
        count: pendingProperties,
        summary: `${pendingProperties} properties pending review or location re-verification`,
        route: '/owner/approvals',
        severity: pendingProperties > 0 ? 'warning' : 'success',
      },
    ],
    floors,
    rooms,
    beds,
    bedTransfers,
    stays,
    joiningRequests,
    rentCharges,
    outstandingDues,
    expenses,
    complaints,
    maintenanceRequests,
    notices,
    foodMenus,
    mealPreferences,
    mealFeedbacks,
    staff,
    staffTasks,
    payrollRecords,
    reviews,
    tenantDocuments,
    activityLogs,
  });
});

// ==================== FLOORS, ROOMS, BEDS & VACANCIES ====================

router.post('/owner/floors', requireAuth, requireRole(UserRole.PG_OWNER), (req: AuthenticatedRequest, res) => {
  const state = db.getState();
  const propertyId = String(req.body?.propertyId || '');
  const property = state.properties.find((p) => p.id === propertyId && p.ownerId === req.auth!.sub);
  if (!property) {
    res.status(403).json({ error: 'Property not found or unauthorized' });
    return;
  }
  const floorNumber = Math.max(0, Math.round(Number(req.body?.floorNumber ?? 1)));
  const label = String(req.body?.label || `Floor ${floorNumber}`).trim();
  const duplicate = state.floors.find((f) => f.propertyId === propertyId && f.floorNumber === floorNumber);
  if (duplicate) {
    res.status(409).json({ error: `Floor ${floorNumber} already exists in ${property.name}.` });
    return;
  }
  const floor = {
    id: `flr_${crypto.randomUUID().slice(0, 6)}`,
    propertyId,
    floorNumber,
    label,
    createdAt: new Date().toISOString(),
  };
  state.floors.push(floor);
  const actor = state.users.find((u) => u.id === req.auth!.sub)!;
  db.recordActivity({
    ownerId: property.ownerId,
    propertyId,
    actorId: actor.id,
    actorName: actor.fullName,
    actorRole: actor.role,
    action: 'FLOOR_CREATED',
    entityType: 'FLOOR',
    entityId: floor.id,
    newValue: `${label} (#${floorNumber})`,
  });
  db.persist();
  res.status(201).json({ floor });
});

router.patch('/owner/floors/:id', requireAuth, requireRole(UserRole.PG_OWNER), (req: AuthenticatedRequest, res) => {
  const state = db.getState();
  const floor = state.floors.find((f) => f.id === req.params.id);
  if (!floor) {
    res.status(404).json({ error: 'Floor not found' });
    return;
  }
  const property = state.properties.find((p) => p.id === floor.propertyId && p.ownerId === req.auth!.sub);
  if (!property) {
    res.status(403).json({ error: 'Unauthorized property access' });
    return;
  }
  if (req.body?.label) floor.label = String(req.body.label).trim();
  db.persist();
  res.json({ floor });
});

router.delete('/owner/floors/:id', requireAuth, requireRole(UserRole.PG_OWNER), (req: AuthenticatedRequest, res) => {
  const state = db.getState();
  const floor = state.floors.find((f) => f.id === req.params.id);
  if (!floor) {
    res.status(404).json({ error: 'Floor not found' });
    return;
  }
  const property = state.properties.find((p) => p.id === floor.propertyId && p.ownerId === req.auth!.sub);
  if (!property) {
    res.status(403).json({ error: 'Unauthorized property access' });
    return;
  }
  const roomsOnFloor = state.rooms.filter(
    (r) => r.propertyId === floor.propertyId && (r.floorId === floor.id || r.floorNumber === floor.floorNumber)
  );
  if (roomsOnFloor.length > 0) {
    res.status(409).json({
      error: `Cannot delete ${floor.label} because ${roomsOnFloor.length} room(s) still exist on this floor.`,
    });
    return;
  }
  state.floors = state.floors.filter((f) => f.id !== floor.id);
  db.persist();
  res.json({ ok: true });
});

// Owner adds a room & beds
router.post('/owner/rooms', requireAuth, requireRole(UserRole.PG_OWNER), (req: AuthenticatedRequest, res) => {
  const state = db.getState();
  const propertyId = String(req.body?.propertyId || '');
  const property = state.properties.find((p) => p.id === propertyId && p.ownerId === req.auth!.sub);
  if (!property) {
    res.status(403).json({ error: 'Property not found or unauthorized' });
    return;
  }
  const roomNumber = String(req.body?.roomNumber || '').trim();
  const floorNumber = Math.max(0, Math.round(Number(req.body?.floorNumber ?? 1)));
  const roomType = (req.body?.roomType || 'TWIN') as 'SINGLE' | 'TWIN' | 'TRIPLE' | 'FOUR_SHARING';
  const monthlyRentInr = Math.max(1500, Math.round(Number(req.body?.monthlyRentInr || property.startingRentInr)));
  const depositInr = Math.max(0, Math.round(Number(req.body?.depositInr ?? property.securityDepositInr)));
  const bedCount = Math.min(Math.max(1, Math.round(Number(req.body?.bedCount || 2))), 6);

  if (!roomNumber) {
    res.status(400).json({ error: 'Room number is required' });
    return;
  }
  const duplicateRoom = state.rooms.find((r) => r.propertyId === propertyId && r.roomNumber === roomNumber);
  if (duplicateRoom) {
    res.status(409).json({ error: `Room ${roomNumber} already exists in this property.` });
    return;
  }

  let floor = state.floors.find((f) => f.propertyId === propertyId && f.floorNumber === floorNumber);
  if (!floor) {
    floor = {
      id: `flr_${crypto.randomUUID().slice(0, 6)}`,
      propertyId,
      floorNumber,
      label: floorNumber === 0 ? 'Ground Floor' : `Floor ${floorNumber}`,
      createdAt: new Date().toISOString(),
    };
    state.floors.push(floor);
  }

  const roomId = `rm_${crypto.randomUUID().slice(0, 6)}`;
  const room = {
    id: roomId,
    propertyId,
    floorId: floor.id,
    floorNumber,
    roomNumber,
    roomType,
    monthlyRentInr,
    depositInr,
    isActive: true,
    notes: req.body?.notes ? String(req.body.notes).trim() : undefined,
  };
  state.rooms.push(room);

  const createdBeds = [];
  for (let i = 1; i <= bedCount; i++) {
    const bed = {
      id: `bed_${crypto.randomUUID().slice(0, 6)}`,
      propertyId,
      roomId,
      bedCode: `${roomNumber}-${String.fromCharCode(64 + i)}`,
      status: BedStatus.AVAILABLE,
      assignedTenantId: null,
      monthlyRentOverrideInr: null,
    };
    state.beds.push(bed);
    createdBeds.push(bed);
  }

  const actor = state.users.find((u) => u.id === req.auth!.sub)!;
  db.recordActivity({
    ownerId: property.ownerId,
    propertyId,
    actorId: actor.id,
    actorName: actor.fullName,
    actorRole: actor.role,
    action: 'ROOM_CREATED',
    entityType: 'ROOM',
    entityId: roomId,
    newValue: `Room ${roomNumber} (${bedCount} beds, ₹${monthlyRentInr})`,
  });

  db.persist();
  res.status(201).json({ room, beds: createdBeds });
});

router.patch('/owner/rooms/:id', requireAuth, requireRole(UserRole.PG_OWNER), (req: AuthenticatedRequest, res) => {
  const state = db.getState();
  const room = state.rooms.find((r) => r.id === req.params.id);
  if (!room) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }
  const property = state.properties.find((p) => p.id === room.propertyId && p.ownerId === req.auth!.sub);
  if (!property) {
    res.status(403).json({ error: 'Unauthorized property access' });
    return;
  }

  if (req.body?.isActive === false) {
    const hasOccupied = state.beds.some((b) => b.roomId === room.id && b.status === BedStatus.OCCUPIED);
    if (hasOccupied) {
      res.status(409).json({ error: 'Cannot disable a room with occupied beds.' });
      return;
    }
    room.isActive = false;
    state.beds.filter((b) => b.roomId === room.id && b.status === BedStatus.AVAILABLE).forEach((b) => {
      b.status = BedStatus.INACTIVE;
    });
  } else if (req.body?.isActive === true) {
    room.isActive = true;
    state.beds.filter((b) => b.roomId === room.id && b.status === BedStatus.INACTIVE).forEach((b) => {
      b.status = BedStatus.AVAILABLE;
    });
  }

  if (req.body?.roomType) room.roomType = req.body.roomType;
  if (req.body?.monthlyRentInr !== undefined) room.monthlyRentInr = Math.max(1500, Math.round(Number(req.body.monthlyRentInr)));
  if (req.body?.depositInr !== undefined) room.depositInr = Math.max(0, Math.round(Number(req.body.depositInr)));
  if (req.body?.notes !== undefined) room.notes = String(req.body.notes).trim();

  db.persist();
  res.json({ room });
});

// Add individual bed to existing room
router.post('/owner/beds', requireAuth, requireRole(UserRole.PG_OWNER), (req: AuthenticatedRequest, res) => {
  const state = db.getState();
  const roomId = String(req.body?.roomId || '');
  const room = state.rooms.find((r) => r.id === roomId);
  if (!room) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }
  const property = state.properties.find((p) => p.id === room.propertyId && p.ownerId === req.auth!.sub);
  if (!property) {
    res.status(403).json({ error: 'Unauthorized property access' });
    return;
  }
  const existingCount = state.beds.filter((b) => b.roomId === room.id).length;
  const bedCode = String(req.body?.bedCode || `${room.roomNumber}-${String.fromCharCode(65 + existingCount)}`).trim();
  if (state.beds.some((b) => b.roomId === room.id && b.bedCode === bedCode)) {
    res.status(409).json({ error: `Bed ${bedCode} already exists in Room ${room.roomNumber}.` });
    return;
  }
  const bed = {
    id: `bed_${crypto.randomUUID().slice(0, 6)}`,
    propertyId: room.propertyId,
    roomId: room.id,
    bedCode,
    status: BedStatus.AVAILABLE,
    assignedTenantId: null,
    monthlyRentOverrideInr: req.body?.monthlyRentOverrideInr ? Number(req.body.monthlyRentOverrideInr) : null,
  };
  state.beds.push(bed);
  db.persist();
  res.status(201).json({ bed });
});

router.patch('/owner/beds/:id', requireAuth, requireRole(UserRole.PG_OWNER), (req: AuthenticatedRequest, res) => {
  const state = db.getState();
  const bed = state.beds.find((b) => b.id === req.params.id);
  if (!bed) {
    res.status(404).json({ error: 'Bed not found' });
    return;
  }
  const property = state.properties.find((p) => p.id === bed.propertyId && p.ownerId === req.auth!.sub);
  if (!property) {
    res.status(403).json({ error: 'Unauthorized property access' });
    return;
  }

  if (req.body?.status && req.body.status !== bed.status) {
    if (bed.status === BedStatus.OCCUPIED) {
      res.status(409).json({ error: 'Cannot manually change status of an occupied bed. Transfer or finalize checkout first.' });
      return;
    }
    const allowedManual = [BedStatus.AVAILABLE, BedStatus.RESERVED, BedStatus.MAINTENANCE, BedStatus.INACTIVE];
    if (!allowedManual.includes(req.body.status)) {
      res.status(400).json({ error: 'Invalid bed status update.' });
      return;
    }
    bed.status = req.body.status;
  }

  if (req.body?.monthlyRentOverrideInr !== undefined) {
    bed.monthlyRentOverrideInr = req.body.monthlyRentOverrideInr ? Math.round(Number(req.body.monthlyRentOverrideInr)) : null;
  }
  if (req.body?.notes !== undefined) bed.notes = String(req.body.notes).trim();

  db.persist();
  res.json({ bed });
});

router.delete('/owner/beds/:id', requireAuth, requireRole(UserRole.PG_OWNER), (req: AuthenticatedRequest, res) => {
  const state = db.getState();
  const bed = state.beds.find((b) => b.id === req.params.id);
  if (!bed) {
    res.status(404).json({ error: 'Bed not found' });
    return;
  }
  const property = state.properties.find((p) => p.id === bed.propertyId && p.ownerId === req.auth!.sub);
  if (!property) {
    res.status(403).json({ error: 'Unauthorized property access' });
    return;
  }
  if (bed.status === BedStatus.OCCUPIED || bed.status === BedStatus.RESERVED || bed.assignedTenantId) {
    res.status(409).json({ error: 'Cannot delete an occupied or reserved bed. Release or transfer the tenant first.' });
    return;
  }
  state.beds = state.beds.filter((b) => b.id !== bed.id);
  db.persist();
  res.json({ ok: true });
});

// Live Vacancies computed from bed statuses
router.get('/owner/vacancies', requireAuth, requireRole(UserRole.PG_OWNER), (req: AuthenticatedRequest, res) => {
  const state = db.getState();
  const ownerProps = state.properties.filter((p) => p.ownerId === req.auth!.sub);
  const propMap = new Map(ownerProps.map((p) => [p.id, p]));
  const roomMap = new Map(state.rooms.map((r) => [r.id, r]));

  const vacancies = state.beds
    .filter((b) => propMap.has(b.propertyId) && b.status === BedStatus.AVAILABLE)
    .map((b) => {
      const prop = propMap.get(b.propertyId)!;
      const room = roomMap.get(b.roomId);
      return {
        bedId: b.id,
        bedCode: b.bedCode,
        status: b.status,
        propertyId: prop.id,
        propertyName: prop.name,
        genderType: prop.genderType,
        roomId: b.roomId,
        roomNumber: room?.roomNumber || '-',
        floorNumber: room?.floorNumber ?? 1,
        roomType: room?.roomType || 'TWIN',
        monthlyRentInr: b.monthlyRentOverrideInr || room?.monthlyRentInr || prop.startingRentInr,
        depositInr: room?.depositInr ?? prop.securityDepositInr,
      };
    });

  res.json({ vacancies });
});

// ==================== JOINING REQUESTS & TENANT MANAGEMENT ====================

router.post('/owner/joining-requests/:id/decision', requireAuth, requireRole(UserRole.PG_OWNER), (req: AuthenticatedRequest, res) => {
  const state = db.getState();
  const jr = state.joiningRequests.find((j) => j.id === req.params.id);
  if (!jr) {
    res.status(404).json({ error: 'Joining request not found' });
    return;
  }
  const property = state.properties.find((p) => p.id === jr.propertyId && p.ownerId === req.auth!.sub);
  if (!property) {
    res.status(403).json({ error: 'Unauthorized property access' });
    return;
  }

  const decision = String(req.body?.decision || '');
  const now = new Date().toISOString();
  const actor = state.users.find((u) => u.id === req.auth!.sub)!;

  if (decision === 'REQUEST_INFO') {
    const infoNote = String(req.body?.notes || '').trim();
    if (infoNote.length < 4) {
      res.status(400).json({ error: 'Provide a clear note specifying what information is needed.' });
      return;
    }
    jr.status = JoiningRequestStatus.INFO_REQUESTED;
    jr.ownerNotes = infoNote;
    jr.updatedAt = now;
    state.notifications.unshift({
      id: `ntf_${crypto.randomUUID().slice(0, 6)}`,
      userId: jr.tenantId,
      title: 'Additional Information Requested',
      body: `${property.name} requested clarification on your joining request: ${infoNote}`,
      category: 'JOINING',
      read: false,
      createdAt: now,
    });
    db.recordActivity({
      ownerId: property.ownerId,
      propertyId: property.id,
      actorId: actor.id,
      actorName: actor.fullName,
      actorRole: actor.role,
      action: 'JOINING_REQUEST_INFO_REQUESTED',
      entityType: 'JOINING_REQUEST',
      entityId: jr.id,
      newValue: infoNote,
    });
    db.persist();
    res.json({ joiningRequest: jr });
    return;
  }

  if (decision === 'REJECT') {
    jr.status = JoiningRequestStatus.REJECTED;
    if (req.body?.notes) jr.ownerNotes = String(req.body.notes).trim();
    jr.updatedAt = now;
    state.notifications.unshift({
      id: `ntf_${crypto.randomUUID().slice(0, 6)}`,
      userId: jr.tenantId,
      title: 'Joining Request Declined',
      body: `${property.name} could not accommodate your joining request at this time.`,
      category: 'JOINING',
      read: false,
      createdAt: now,
    });
    db.recordActivity({
      ownerId: property.ownerId,
      propertyId: property.id,
      actorId: actor.id,
      actorName: actor.fullName,
      actorRole: actor.role,
      action: 'JOINING_REQUEST_REJECTED',
      entityType: 'JOINING_REQUEST',
      entityId: jr.id,
      newValue: jr.tenantName,
    });
    db.persist();
    res.json({ joiningRequest: jr });
    return;
  }

  const bedId = String(req.body?.bedId || '');
  const bed = state.beds.find((b) => b.id === bedId && b.propertyId === property.id);
  if (!bed || bed.status !== BedStatus.AVAILABLE) {
    res.status(409).json({ error: 'Selected bed is not available for assignment.' });
    return;
  }

  bed.status = BedStatus.RESERVED;
  bed.reservedForRequestId = jr.id;
  jr.assignedBedId = bed.id;
  jr.assignedRoomId = bed.roomId;
  jr.status = JoiningRequestStatus.APPROVED_AWAITING_TERMS;
  jr.updatedAt = now;

  state.notifications.unshift({
    id: `ntf_${crypto.randomUUID().slice(0, 6)}`,
    userId: jr.tenantId,
    title: 'Joining Request Approved',
    body: `${property.name} assigned bed ${bed.bedCode}. Accept house rules to activate your stay.`,
    category: 'JOINING',
    read: false,
    createdAt: now,
  });

  db.recordActivity({
    ownerId: property.ownerId,
    propertyId: property.id,
    actorId: actor.id,
    actorName: actor.fullName,
    actorRole: actor.role,
    action: 'JOINING_REQUEST_APPROVED',
    entityType: 'JOINING_REQUEST',
    entityId: jr.id,
    newValue: `${jr.tenantName} → Reserved ${bed.bedCode}`,
  });

  db.persist();
  res.json({ joiningRequest: jr });
});

// Owner-assisted tenant onboarding directly onto an available bed
router.post('/owner/tenants/onboard', requireAuth, requireRole(UserRole.PG_OWNER), (req: AuthenticatedRequest, res) => {
  const parsed = ownerOnboardTenantSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid tenant onboarding details' });
    return;
  }

  const state = db.getState();
  const data = parsed.data;
  const property = state.properties.find((p) => p.id === data.propertyId && p.ownerId === req.auth!.sub);
  if (!property) {
    res.status(403).json({ error: 'Property not found or unauthorized' });
    return;
  }
  const bed = state.beds.find((b) => b.id === data.bedId && b.propertyId === property.id);
  const room = bed ? state.rooms.find((r) => r.id === bed.roomId) : null;
  if (!bed || !room || bed.status !== BedStatus.AVAILABLE) {
    res.status(409).json({ error: 'Selected bed is not available.' });
    return;
  }

  const now = new Date().toISOString();
  let tenantUser = state.users.find(
    (u) => u.phone === data.phone || (data.email && u.email.toLowerCase() === data.email.toLowerCase())
  );

  if (tenantUser) {
    const existingStay = state.stays.find(
      (s) => s.tenantId === tenantUser!.id && s.status !== StayStatus.CHECKED_OUT
    );
    if (existingStay) {
      res.status(409).json({
        error: `${tenantUser.fullName} already has an active PG stay (${existingStay.propertyId}). Complete checkout before reassigning.`,
      });
      return;
    }
  } else {
    const email = data.email && data.email.trim() ? data.email.trim().toLowerCase() : `tenant.${data.phone}@pgfinder.in`;
    tenantUser = {
      id: `usr_ten_${crypto.randomUUID().slice(0, 6)}`,
      fullName: data.fullName.trim(),
      email,
      phone: data.phone.trim(),
      passwordHash: bcrypt.hashSync('Password@123', 8),
      role: UserRole.TENANT,
      isVerified: true,
      isSuspended: false,
      city: property.city,
      createdAt: now,
    };
    state.users.push(tenantUser);
  }

  const actor = state.users.find((u) => u.id === req.auth!.sub)!;
  const rent = data.monthlyRentInr ?? bed.monthlyRentOverrideInr ?? room.monthlyRentInr;
  const deposit = data.securityDepositInr ?? room.depositInr;
  const stayId = `stay_${crypto.randomUUID().slice(0, 8)}`;

  bed.status = BedStatus.OCCUPIED;
  bed.assignedTenantId = tenantUser.id;

  const stay = {
    id: stayId,
    tenantCode: `PGF-TEN-${1000 + state.stays.length + 1}`,
    tenantId: tenantUser.id,
    tenantName: tenantUser.fullName,
    tenantPhone: tenantUser.phone,
    tenantEmail: tenantUser.email,
    emergencyContactName: data.emergencyContactName?.trim() || undefined,
    emergencyContactPhone: data.emergencyContactPhone?.trim() || undefined,
    propertyId: property.id,
    roomId: room.id,
    bedId: bed.id,
    monthlyRentInr: rent,
    securityDepositInr: deposit,
    depositPaid: data.depositPaid !== false,
    termsAcceptedAt: now,
    status: StayStatus.ACTIVE,
    noticeDays: 30,
    stayHistory: [
      {
        id: `sh_${crypto.randomUUID().slice(0, 6)}`,
        eventType: 'OWNER_ONBOARDED',
        summary: `Owner-assisted check-in to Room ${room.roomNumber} · Bed ${bed.bedCode}`,
        actorName: actor.fullName,
        timestamp: now,
      },
    ],
    depositSettlementHistory:
      deposit > 0 && data.depositPaid !== false
        ? [
            {
              id: `dep_${crypto.randomUUID().slice(0, 6)}`,
              type: 'RECEIVED' as const,
              label: 'Initial Security Deposit Collected',
              amountInr: deposit,
              notes: 'Collected during owner onboarding',
              createdAt: now,
            },
          ]
        : [],
    createdAt: now,
  };
  state.stays.unshift(stay);

  const billingMonth = now.slice(0, 7);
  state.rentCharges.unshift({
    id: `rc_${crypto.randomUUID().slice(0, 8)}`,
    stayId,
    tenantId: tenantUser.id,
    propertyId: property.id,
    billingMonth,
    amountInr: rent,
    lateFeeInr: 0,
    paidAmountInr: 0,
    dueDate: `${billingMonth}-28`,
    status: 'DUE',
  });

  db.recordActivity({
    ownerId: property.ownerId,
    propertyId: property.id,
    actorId: actor.id,
    actorName: actor.fullName,
    actorRole: actor.role,
    action: 'TENANT_ONBOARDED',
    entityType: 'TENANT_STAY',
    entityId: stayId,
    newValue: `${tenantUser.fullName} → Bed ${bed.bedCode}`,
  });

  db.persist();
  res.status(201).json({ stay });
});

// Owner: 9-tab Tenant Detail endpoint
router.get('/owner/tenants/:stayId', requireAuth, requireRole(UserRole.PG_OWNER), (req: AuthenticatedRequest, res) => {
  const state = db.getState();
  const stay = state.stays.find((s) => s.id === req.params.stayId);
  if (!stay) {
    res.status(404).json({ error: 'Tenant stay not found' });
    return;
  }
  const property = state.properties.find((p) => p.id === stay.propertyId && p.ownerId === req.auth!.sub);
  if (!property) {
    res.status(403).json({ error: 'Unauthorized property access' });
    return;
  }

  const tenantUser = state.users.find((u) => u.id === stay.tenantId);
  const room = state.rooms.find((r) => r.id === stay.roomId) || null;
  const bed = state.beds.find((b) => b.id === stay.bedId) || null;
  const availableBeds = state.beds
    .filter((b) => b.propertyId === property.id && b.status === BedStatus.AVAILABLE)
    .map((b) => {
      const rm = state.rooms.find((r) => r.id === b.roomId);
      return { ...b, roomNumber: rm?.roomNumber || '-', roomRent: rm?.monthlyRentInr || property.startingRentInr };
    });

  res.json({
    stay: {
      ...stay,
      tenantPhone: stay.tenantPhone || tenantUser?.phone,
      tenantEmail: stay.tenantEmail || tenantUser?.email,
    },
    property,
    room,
    bed,
    availableBeds,
    documents: state.tenantDocuments.filter((d) => d.stayId === stay.id),
    bedTransfers: state.bedTransfers.filter((t) => t.stayId === stay.id),
    rentCharges: state.rentCharges.filter((rc) => rc.stayId === stay.id),
    outstandingDues: state.outstandingDues.filter((d) => d.stayId === stay.id || d.tenantId === stay.tenantId),
    complaints: state.complaints.filter((c) => c.tenantId === stay.tenantId && c.propertyId === property.id),
    maintenanceRequests: state.maintenanceRequests.filter((m) => m.propertyId === property.id),
    notices: state.notices.filter((n) => n.propertyId === property.id),
    staff: state.staff.filter((st) => st.propertyId === property.id),
  });
});

// Owner: Transfer tenant bed within property
router.post('/owner/stays/:id/transfer-bed', requireAuth, requireRole(UserRole.PG_OWNER), (req: AuthenticatedRequest, res) => {
  const state = db.getState();
  const stay = state.stays.find((s) => s.id === req.params.id);
  if (!stay || stay.status === StayStatus.CHECKED_OUT) {
    res.status(404).json({ error: 'Active stay not found' });
    return;
  }
  const property = state.properties.find((p) => p.id === stay.propertyId && p.ownerId === req.auth!.sub);
  if (!property) {
    res.status(403).json({ error: 'Unauthorized property access' });
    return;
  }

  const targetBedId = String(req.body?.targetBedId || '');
  const targetBed = state.beds.find((b) => b.id === targetBedId && b.propertyId === property.id);
  const targetRoom = targetBed ? state.rooms.find((r) => r.id === targetBed.roomId) : null;
  if (!targetBed || !targetRoom || targetBed.status !== BedStatus.AVAILABLE) {
    res.status(409).json({ error: 'Target bed is not available for transfer.' });
    return;
  }

  const oldBed = state.beds.find((b) => b.id === stay.bedId);
  const oldRoomId = stay.roomId;
  const oldBedCode = oldBed?.bedCode || stay.bedId;
  const reason = String(req.body?.reason || 'Room / bed change requested').trim();
  const updateRentToNewRoom = Boolean(req.body?.updateRentToNewRoom);
  const actor = state.users.find((u) => u.id === req.auth!.sub)!;
  const now = new Date().toISOString();

  if (oldBed) {
    oldBed.status = BedStatus.AVAILABLE;
    oldBed.assignedTenantId = null;
  }
  targetBed.status = BedStatus.OCCUPIED;
  targetBed.assignedTenantId = stay.tenantId;

  stay.roomId = targetRoom.id;
  stay.bedId = targetBed.id;
  if (updateRentToNewRoom) {
    stay.monthlyRentInr = targetBed.monthlyRentOverrideInr || targetRoom.monthlyRentInr;
  }

  const transfer = {
    id: `trf_${crypto.randomUUID().slice(0, 6)}`,
    stayId: stay.id,
    tenantId: stay.tenantId,
    tenantName: stay.tenantName,
    propertyId: property.id,
    fromRoomId: oldRoomId,
    fromBedId: oldBed?.id || '',
    fromBedCode: oldBedCode,
    toRoomId: targetRoom.id,
    toBedId: targetBed.id,
    toBedCode: targetBed.bedCode,
    reason,
    actorName: actor.fullName,
    createdAt: now,
  };
  state.bedTransfers.unshift(transfer);

  stay.stayHistory = stay.stayHistory || [];
  stay.stayHistory.unshift({
    id: `sh_${crypto.randomUUID().slice(0, 6)}`,
    eventType: 'BED_TRANSFER',
    summary: `Transferred from Bed ${oldBedCode} → Room ${targetRoom.roomNumber} (${targetBed.bedCode}). Reason: ${reason}`,
    actorName: actor.fullName,
    timestamp: now,
  });

  db.recordActivity({
    ownerId: property.ownerId,
    propertyId: property.id,
    actorId: actor.id,
    actorName: actor.fullName,
    actorRole: actor.role,
    action: 'BED_TRANSFERRED',
    entityType: 'TENANT_STAY',
    entityId: stay.id,
    previousValue: oldBedCode,
    newValue: targetBed.bedCode,
  });

  db.persist();
  res.json({ stay, transfer });
});

// Owner: Security Deposit adjustment / deduction / refund entry
router.post('/owner/stays/:id/deposit-adjustment', requireAuth, requireRole(UserRole.PG_OWNER), (req: AuthenticatedRequest, res) => {
  const state = db.getState();
  const stay = state.stays.find((s) => s.id === req.params.id);
  if (!stay) {
    res.status(404).json({ error: 'Stay not found' });
    return;
  }
  const property = state.properties.find((p) => p.id === stay.propertyId && p.ownerId === req.auth!.sub);
  if (!property) {
    res.status(403).json({ error: 'Unauthorized property access' });
    return;
  }

  const type = (req.body?.type || 'DEDUCTION') as 'RECEIVED' | 'DEDUCTION' | 'REFUND';
  const label = String(req.body?.label || '').trim();
  const amountInr = Math.round(Number(req.body?.amountInr || 0));
  if (label.length < 2 || amountInr <= 0) {
    res.status(400).json({ error: 'Provide a valid label and positive amount.' });
    return;
  }

  stay.depositSettlementHistory = stay.depositSettlementHistory || [];
  const item = {
    id: `dep_${crypto.randomUUID().slice(0, 6)}`,
    type,
    label,
    amountInr,
    notes: req.body?.notes ? String(req.body.notes).trim() : undefined,
    createdAt: new Date().toISOString(),
  };
  stay.depositSettlementHistory.unshift(item);

  const actor = state.users.find((u) => u.id === req.auth!.sub)!;
  db.recordActivity({
    ownerId: property.ownerId,
    propertyId: property.id,
    actorId: actor.id,
    actorName: actor.fullName,
    actorRole: actor.role,
    action: `DEPOSIT_${type}`,
    entityType: 'TENANT_STAY',
    entityId: stay.id,
    newValue: `${label} ₹${amountInr}`,
  });

  db.persist();
  res.status(201).json({ item, stay });
});

// ==================== PRIVATE TENANT DOCUMENTS (RBAC PROTECTED) ====================

router.post('/owner/tenants/:stayId/documents', requireAuth, requireRole(UserRole.PG_OWNER), (req: AuthenticatedRequest, res) => {
  const state = db.getState();
  const stay = state.stays.find((s) => s.id === req.params.stayId);
  if (!stay) {
    res.status(404).json({ error: 'Stay not found' });
    return;
  }
  const property = state.properties.find((p) => p.id === stay.propertyId && p.ownerId === req.auth!.sub);
  if (!property) {
    res.status(403).json({ error: 'Unauthorized property access' });
    return;
  }

  const docType = (req.body?.docType || 'SIGNED_AGREEMENT') as any;
  const title = String(req.body?.title || '').trim();
  const fileUrl = String(req.body?.fileUrl || 'https://storage.pgfinder.in/private/agreement.pdf').trim();
  if (title.length < 3 || !ensureNotAadhaar(title) || !ensureNotAadhaar(String(docType))) {
    res.status(400).json({ error: 'Provide a valid non-Aadhaar document title.' });
    return;
  }

  const doc = {
    id: `tdoc_${crypto.randomUUID().slice(0, 6)}`,
    stayId: stay.id,
    tenantId: stay.tenantId,
    propertyId: property.id,
    docType,
    title,
    fileUrl,
    status: DocumentVerificationStatus.PENDING,
    verificationHistory: [],
    uploadedAt: new Date().toISOString(),
  };
  state.tenantDocuments.unshift(doc);
  db.persist();
  res.status(201).json({ document: doc });
});

router.post('/owner/documents/:docId/review', requireAuth, requireRole(UserRole.PG_OWNER), (req: AuthenticatedRequest, res) => {
  const state = db.getState();
  const doc = state.tenantDocuments.find((d) => d.id === req.params.docId);
  if (!doc) {
    res.status(404).json({ error: 'Document not found' });
    return;
  }
  const property = state.properties.find((p) => p.id === doc.propertyId && p.ownerId === req.auth!.sub);
  if (!property) {
    res.status(403).json({ error: 'Unauthorized document review access' });
    return;
  }

  const status = req.body?.status as DocumentVerificationStatus;
  const allowed = [
    DocumentVerificationStatus.VERIFIED,
    DocumentVerificationStatus.REJECTED,
    DocumentVerificationStatus.RESUBMISSION_REQUIRED,
  ];
  const notes = String(req.body?.notes || '').trim();
  if (!allowed.includes(status) || notes.length < 3) {
    res.status(400).json({ error: 'Valid verification status and review notes are required.' });
    return;
  }

  const actor = state.users.find((u) => u.id === req.auth!.sub)!;
  const prevStatus = doc.status;
  const now = new Date().toISOString();
  doc.status = status;
  doc.notes = notes;
  doc.verificationHistory.unshift({
    id: `dvh_${crypto.randomUUID().slice(0, 6)}`,
    actorId: actor.id,
    actorName: actor.fullName,
    previousStatus: prevStatus,
    newStatus: status,
    notes,
    timestamp: now,
  });

  state.auditLogs.unshift({
    id: `aud_${crypto.randomUUID().slice(0, 6)}`,
    actorId: actor.id,
    actorName: actor.fullName,
    actorRole: actor.role,
    action: `TENANT_DOC_${status}`,
    targetType: 'TENANT_DOCUMENT',
    targetId: doc.id,
    details: `${doc.title}: ${prevStatus} → ${status}. Notes: ${notes}`,
    createdAt: now,
  });

  db.recordActivity({
    ownerId: property.ownerId,
    propertyId: property.id,
    actorId: actor.id,
    actorName: actor.fullName,
    actorRole: actor.role,
    action: `DOCUMENT_${status}`,
    entityType: 'TENANT_DOCUMENT',
    entityId: doc.id,
    previousValue: prevStatus,
    newValue: status,
  });

  state.notifications.unshift({
    id: `ntf_${crypto.randomUUID().slice(0, 6)}`,
    userId: doc.tenantId,
    title: `Document Review: ${status.replace(/_/g, ' ')}`,
    body: `Your document "${doc.title}" was marked ${status.replace(/_/g, ' ')}. Note: ${notes}`,
    category: 'DOCUMENTS',
    read: false,
    createdAt: now,
  });

  db.persist();
  res.json({ document: doc });
});

// Strict RBAC document fetch: ONLY owning PG_OWNER or the owning TENANT
router.get('/owner/documents/:docId', requireAuth, (req: AuthenticatedRequest, res) => {
  const state = db.getState();
  const doc = state.tenantDocuments.find((d) => d.id === req.params.docId);
  if (!doc) {
    res.status(404).json({ error: 'Document not found' });
    return;
  }
  const property = state.properties.find((p) => p.id === doc.propertyId);
  const isOwner = req.auth!.role === UserRole.PG_OWNER && property?.ownerId === req.auth!.sub;
  const isOwningTenant = req.auth!.role === UserRole.TENANT && doc.tenantId === req.auth!.sub;
  if (!isOwner && !isOwningTenant) {
    res.status(403).json({ error: 'Private KYC documents are strictly restricted to the resident and owning PG operator.' });
    return;
  }
  res.json({ document: doc });
});

// ==================== RENT, DUES & EXPENSES ====================

router.post('/owner/rent/generate-month', requireAuth, requireRole(UserRole.PG_OWNER), (req: AuthenticatedRequest, res) => {
  const state = db.getState();
  const billingMonth = String(req.body?.billingMonth || new Date().toISOString().slice(0, 7));
  const propertyId = req.body?.propertyId ? String(req.body.propertyId) : 'ALL';
  if (!/^\d{4}-\d{2}$/.test(billingMonth)) {
    res.status(400).json({ error: 'Billing month must use YYYY-MM format.' });
    return;
  }

  const ownedIds = new Set(
    state.properties
      .filter((p) => p.ownerId === req.auth!.sub && (propertyId === 'ALL' || p.id === propertyId))
      .map((p) => p.id)
  );

  const activeStays = state.stays.filter(
    (s) => ownedIds.has(s.propertyId) && s.status !== StayStatus.CHECKED_OUT
  );
  let createdCount = 0;

  for (const stay of activeStays) {
    const exists = state.rentCharges.some(
      (rc) => rc.stayId === stay.id && rc.billingMonth === billingMonth
    );
    if (!exists) {
      state.rentCharges.unshift({
        id: `rc_${crypto.randomUUID().slice(0, 8)}`,
        stayId: stay.id,
        tenantId: stay.tenantId,
        propertyId: stay.propertyId,
        billingMonth,
        amountInr: stay.monthlyRentInr,
        lateFeeInr: 0,
        paidAmountInr: 0,
        dueDate: `${billingMonth}-05`,
        status: 'DUE',
      });
      createdCount += 1;
    }
  }

  const actor = state.users.find((u) => u.id === req.auth!.sub)!;
  db.recordActivity({
    ownerId: req.auth!.sub,
    propertyId: propertyId === 'ALL' ? undefined : propertyId,
    actorId: actor.id,
    actorName: actor.fullName,
    actorRole: actor.role,
    action: 'MONTHLY_RENT_GENERATED',
    entityType: 'RENT_CHARGE',
    entityId: billingMonth,
    newValue: `${createdCount} bill(s) generated for ${billingMonth}`,
  });

  db.persist();
  res.json({ createdCount, billingMonth });
});

router.post('/owner/rent/:chargeId/record-payment', requireAuth, requireRole(UserRole.PG_OWNER), (req: AuthenticatedRequest, res) => {
  const state = db.getState();
  const charge = state.rentCharges.find((rc) => rc.id === req.params.chargeId);
  if (!charge) {
    res.status(404).json({ error: 'Rent charge not found' });
    return;
  }
  const property = state.properties.find((p) => p.id === charge.propertyId && p.ownerId === req.auth!.sub);
  if (!property) {
    res.status(403).json({ error: 'Unauthorized property access' });
    return;
  }

  const actor = state.users.find((u) => u.id === req.auth!.sub)!;
  const now = new Date().toISOString();

  if (req.body?.lateFeeInr !== undefined) {
    charge.lateFeeInr = Math.max(0, Math.round(Number(req.body.lateFeeInr)));
  }

  if (req.body?.waive === true) {
    charge.status = 'WAIVED';
    charge.paidAt = now;
    db.recordActivity({
      ownerId: property.ownerId,
      propertyId: property.id,
      actorId: actor.id,
      actorName: actor.fullName,
      actorRole: actor.role,
      action: 'RENT_WAIVED',
      entityType: 'RENT_CHARGE',
      entityId: charge.id,
      newValue: `${charge.billingMonth} waived`,
    });
    db.persist();
    res.json({ rentCharge: charge });
    return;
  }

  const totalDue = charge.amountInr + (charge.lateFeeInr || 0);
  const paymentAmount = Math.round(Number(req.body?.amountInr || Math.max(0, totalDue - charge.paidAmountInr)));
  if (paymentAmount <= 0) {
    res.status(400).json({ error: 'Payment amount must be positive' });
    return;
  }

  charge.paidAmountInr = Math.min(totalDue, charge.paidAmountInr + paymentAmount);
  charge.status = charge.paidAmountInr >= totalDue ? 'PAID' : 'PARTIAL';
  charge.paymentMode = (req.body?.paymentMode || 'UPI') as any;
  charge.paidAt = now;
  charge.receiptNumber =
    charge.receiptNumber || `RCPT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  state.notifications.unshift({
    id: `ntf_${crypto.randomUUID().slice(0, 6)}`,
    userId: charge.tenantId,
    title: 'Rent Payment Receipt Issued',
    body: `Payment of ₹${paymentAmount.toLocaleString('en-IN')} recorded for ${charge.billingMonth}. Receipt: ${charge.receiptNumber}`,
    category: 'RENT',
    read: false,
    createdAt: now,
  });

  db.recordActivity({
    ownerId: property.ownerId,
    propertyId: property.id,
    actorId: actor.id,
    actorName: actor.fullName,
    actorRole: actor.role,
    action: 'RENT_PAYMENT_RECORDED',
    entityType: 'RENT_CHARGE',
    entityId: charge.id,
    newValue: `₹${paymentAmount} (${charge.status}) · ${charge.receiptNumber}`,
  });

  db.persist();
  res.json({ rentCharge: charge });
});

router.post('/owner/rent/:chargeId/remind', requireAuth, requireRole(UserRole.PG_OWNER), (req: AuthenticatedRequest, res) => {
  const state = db.getState();
  const charge = state.rentCharges.find((rc) => rc.id === req.params.chargeId);
  if (!charge) {
    res.status(404).json({ error: 'Rent charge not found' });
    return;
  }
  const property = state.properties.find((p) => p.id === charge.propertyId && p.ownerId === req.auth!.sub);
  if (!property) {
    res.status(403).json({ error: 'Unauthorized property access' });
    return;
  }
  const now = new Date().toISOString();
  charge.reminderSentAt = now;
  const remaining = Math.max(0, charge.amountInr + (charge.lateFeeInr || 0) - charge.paidAmountInr);
  state.notifications.unshift({
    id: `ntf_${crypto.randomUUID().slice(0, 6)}`,
    userId: charge.tenantId,
    title: 'Rent Payment Reminder',
    body: `Reminder from ${property.name}: ₹${remaining.toLocaleString('en-IN')} due for ${charge.billingMonth} (Due ${charge.dueDate}).`,
    category: 'RENT',
    read: false,
    createdAt: now,
  });
  db.persist();
  res.json({ rentCharge: charge });
});

// Outstanding Dues (Active & Former Tenants)
router.get('/owner/dues', requireAuth, requireRole(UserRole.PG_OWNER), (req: AuthenticatedRequest, res) => {
  const state = db.getState();
  const ownedIds = new Set(state.properties.filter((p) => p.ownerId === req.auth!.sub).map((p) => p.id));
  const dues = state.outstandingDues.filter((d) => ownedIds.has(d.propertyId));
  res.json({ dues });
});

router.post('/owner/dues', requireAuth, requireRole(UserRole.PG_OWNER), (req: AuthenticatedRequest, res) => {
  const state = db.getState();
  const propertyId = String(req.body?.propertyId || '');
  const property = state.properties.find((p) => p.id === propertyId && p.ownerId === req.auth!.sub);
  if (!property) {
    res.status(403).json({ error: 'Unauthorized property access' });
    return;
  }
  const stayId = req.body?.stayId ? String(req.body.stayId) : undefined;
  const stay = stayId ? state.stays.find((s) => s.id === stayId && s.propertyId === propertyId) : undefined;
  const totalAmountInr = Math.round(Number(req.body?.totalAmountInr || 0));
  const description = String(req.body?.description || '').trim();
  if (totalAmountInr <= 0 || description.length < 3) {
    res.status(400).json({ error: 'Valid amount and description required' });
    return;
  }

  const due = {
    id: `due_${crypto.randomUUID().slice(0, 6)}`,
    propertyId,
    stayId: stay?.id,
    tenantId: stay?.tenantId || String(req.body?.tenantId || 'manual'),
    tenantName: stay?.tenantName || String(req.body?.tenantName || 'Resident'),
    isFormerTenant: stay ? stay.status === StayStatus.CHECKED_OUT : Boolean(req.body?.isFormerTenant),
    category: (req.body?.category || 'OTHER') as any,
    description,
    totalAmountInr,
    paidAmountInr: 0,
    dueDate: String(req.body?.dueDate || new Date().toISOString().slice(0, 10)),
    status: 'OPEN' as const,
    createdAt: new Date().toISOString(),
  };
  state.outstandingDues.unshift(due);
  db.persist();
  res.status(201).json({ due });
});

router.post('/owner/dues/:id/payment', requireAuth, requireRole(UserRole.PG_OWNER), (req: AuthenticatedRequest, res) => {
  const state = db.getState();
  const due = state.outstandingDues.find((d) => d.id === req.params.id);
  if (!due) {
    res.status(404).json({ error: 'Due record not found' });
    return;
  }
  const property = state.properties.find((p) => p.id === due.propertyId && p.ownerId === req.auth!.sub);
  if (!property) {
    res.status(403).json({ error: 'Unauthorized property access' });
    return;
  }

  const amount = Math.round(Number(req.body?.amountInr || Math.max(0, due.totalAmountInr - due.paidAmountInr)));
  if (amount <= 0) {
    res.status(400).json({ error: 'Positive settlement amount required' });
    return;
  }
  due.paidAmountInr = Math.min(due.totalAmountInr, due.paidAmountInr + amount);
  due.status = due.paidAmountInr >= due.totalAmountInr ? 'SETTLED' : 'PARTIAL';

  const actor = state.users.find((u) => u.id === req.auth!.sub)!;
  db.recordActivity({
    ownerId: property.ownerId,
    propertyId: property.id,
    actorId: actor.id,
    actorName: actor.fullName,
    actorRole: actor.role,
    action: 'OUTSTANDING_DUE_SETTLED',
    entityType: 'OUTSTANDING_DUE',
    entityId: due.id,
    newValue: `${due.tenantName} paid ₹${amount} (${due.status})`,
  });

  db.persist();
  res.json({ due });
});

// Expenses (Create / Edit / Delete available to ALL plans including BASIC)
router.post('/owner/expenses', requireAuth, requireRole(UserRole.PG_OWNER), (req: AuthenticatedRequest, res) => {
  const parsed = createExpenseSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid expense' });
    return;
  }
  const state = db.getState();
  const property = state.properties.find(
    (p) => p.id === parsed.data.propertyId && p.ownerId === req.auth!.sub
  );
  if (!property) {
    res.status(403).json({ error: 'Unauthorized property access' });
    return;
  }
  const expense = {
    id: `exp_${crypto.randomUUID().slice(0, 8)}`,
    propertyId: property.id,
    ownerId: req.auth!.sub,
    category: parsed.data.category,
    amountInr: parsed.data.amountInr,
    date: parsed.data.date,
    notes: parsed.data.notes.trim(),
    createdAt: new Date().toISOString(),
  };
  state.expenses.unshift(expense);

  const actor = state.users.find((u) => u.id === req.auth!.sub)!;
  db.recordActivity({
    ownerId: property.ownerId,
    propertyId: property.id,
    actorId: actor.id,
    actorName: actor.fullName,
    actorRole: actor.role,
    action: 'EXPENSE_LOGGED',
    entityType: 'EXPENSE',
    entityId: expense.id,
    newValue: `${expense.category} ₹${expense.amountInr}`,
  });

  db.persist();
  res.status(201).json({ expense });
});

router.patch('/owner/expenses/:id', requireAuth, requireRole(UserRole.PG_OWNER), (req: AuthenticatedRequest, res) => {
  const state = db.getState();
  const expense = state.expenses.find((e) => e.id === req.params.id && e.ownerId === req.auth!.sub);
  if (!expense) {
    res.status(404).json({ error: 'Expense not found' });
    return;
  }
  if (req.body?.category) expense.category = req.body.category;
  if (req.body?.amountInr !== undefined) expense.amountInr = Math.max(1, Math.round(Number(req.body.amountInr)));
  if (req.body?.date) expense.date = String(req.body.date);
  if (req.body?.notes !== undefined) expense.notes = String(req.body.notes).trim();
  db.persist();
  res.json({ expense });
});

router.delete('/owner/expenses/:id', requireAuth, requireRole(UserRole.PG_OWNER), (req: AuthenticatedRequest, res) => {
  const state = db.getState();
  const idx = state.expenses.findIndex((e) => e.id === req.params.id && e.ownerId === req.auth!.sub);
  if (idx === -1) {
    res.status(404).json({ error: 'Expense not found' });
    return;
  }
  const [removed] = state.expenses.splice(idx, 1);
  const actor = state.users.find((u) => u.id === req.auth!.sub)!;
  db.recordActivity({
    ownerId: req.auth!.sub,
    propertyId: removed.propertyId,
    actorId: actor.id,
    actorName: actor.fullName,
    actorRole: actor.role,
    action: 'EXPENSE_DELETED',
    entityType: 'EXPENSE',
    entityId: removed.id,
    previousValue: `${removed.category} ₹${removed.amountInr}`,
  });
  db.persist();
  res.json({ ok: true });
});

// ==================== FOOD & MESS ====================

router.put('/owner/food-menu', requireAuth, requireRole(UserRole.PG_OWNER), (req: AuthenticatedRequest, res) => {
  const state = db.getState();
  const propertyId = String(req.body?.propertyId || '');
  const property = state.properties.find((p) => p.id === propertyId && p.ownerId === req.auth!.sub);
  if (!property) {
    res.status(403).json({ error: 'Unauthorized property access' });
    return;
  }
  const days = Array.isArray(req.body?.days) ? req.body.days : [];
  if (days.length === 0) {
    res.status(400).json({ error: 'Provide weekly menu entries.' });
    return;
  }

  for (const entry of days) {
    const existing = state.foodMenus.find((f) => f.propertyId === propertyId && f.day === entry.day);
    if (existing) {
      existing.breakfast = String(entry.breakfast || '').trim();
      existing.lunch = String(entry.lunch || '').trim();
      existing.dinner = String(entry.dinner || '').trim();
    } else {
      state.foodMenus.push({
        propertyId,
        day: entry.day,
        breakfast: String(entry.breakfast || '').trim(),
        lunch: String(entry.lunch || '').trim(),
        dinner: String(entry.dinner || '').trim(),
      });
    }
  }

  const actor = state.users.find((u) => u.id === req.auth!.sub)!;
  db.recordActivity({
    ownerId: property.ownerId,
    propertyId: property.id,
    actorId: actor.id,
    actorName: actor.fullName,
    actorRole: actor.role,
    action: 'FOOD_MENU_UPDATED',
    entityType: 'FOOD_MENU',
    entityId: property.id,
    newValue: `${days.length} day schedule synced to tenant portal`,
  });

  db.persist();
  res.json({ foodMenus: state.foodMenus.filter((f) => f.propertyId === propertyId) });
});

// ==================== NOTICES, COMPLAINTS & MAINTENANCE ====================

router.post('/owner/notices', requireAuth, requireRole(UserRole.PG_OWNER), (req: AuthenticatedRequest, res) => {
  const state = db.getState();
  const propertyId = String(req.body?.propertyId || '');
  const property = state.properties.find((p) => p.id === propertyId && p.ownerId === req.auth!.sub);
  if (!property) {
    res.status(403).json({ error: 'Unauthorized property access' });
    return;
  }
  const notice = {
    id: `not_${crypto.randomUUID().slice(0, 8)}`,
    propertyId,
    authorId: req.auth!.sub,
    title: String(req.body?.title || 'PG Notice').trim(),
    category: (req.body?.category || 'GENERAL') as any,
    body: String(req.body?.body || '').trim(),
    linkedEventId: req.body?.linkedEventId ? String(req.body.linkedEventId) : undefined,
    createdAt: new Date().toISOString(),
  };
  if (notice.body.length < 4) {
    res.status(400).json({ error: 'Notice body must be at least 4 characters.' });
    return;
  }
  state.notices.unshift(notice);
  db.persist();
  res.status(201).json({ notice });
});

router.post('/owner/complaints/:id/update', requireAuth, requireRole(UserRole.PG_OWNER), (req: AuthenticatedRequest, res) => {
  const state = db.getState();
  const complaint = state.complaints.find((c) => c.id === req.params.id);
  if (!complaint) {
    res.status(404).json({ error: 'Complaint not found' });
    return;
  }
  const property = state.properties.find((p) => p.id === complaint.propertyId && p.ownerId === req.auth!.sub);
  if (!property) {
    res.status(403).json({ error: 'Unauthorized property access' });
    return;
  }

  const actor = state.users.find((u) => u.id === req.auth!.sub)!;
  const now = new Date().toISOString();
  const nextStatus = (req.body?.status || ComplaintStatus.RESOLVED) as ComplaintStatus;
  const note = String(req.body?.resolutionNotes || complaint.resolutionNotes || `Status updated to ${nextStatus}`).trim();

  if (req.body?.assignedStaffId !== undefined) {
    const st = state.staff.find((s) => s.id === req.body.assignedStaffId && s.ownerId === req.auth!.sub);
    complaint.assignedStaffId = st?.id || null;
    complaint.assignedStaffName = st?.fullName || null;
  }

  complaint.status = nextStatus;
  complaint.resolutionNotes = note;
  complaint.updatedAt = now;
  complaint.timeline = complaint.timeline || [];
  complaint.timeline.push({
    id: `cmpt_${crypto.randomUUID().slice(0, 6)}`,
    actorName: actor.fullName,
    status: nextStatus,
    note,
    timestamp: now,
  });

  state.notifications.unshift({
    id: `ntf_${crypto.randomUUID().slice(0, 6)}`,
    userId: complaint.tenantId,
    title: `Complaint Update: ${nextStatus.replace(/_/g, ' ')}`,
    body: `${complaint.category} ticket updated by ${property.name}: ${note}`,
    category: 'COMPLAINT',
    read: false,
    createdAt: now,
  });

  db.recordActivity({
    ownerId: property.ownerId,
    propertyId: property.id,
    actorId: actor.id,
    actorName: actor.fullName,
    actorRole: actor.role,
    action: 'COMPLAINT_UPDATED',
    entityType: 'COMPLAINT',
    entityId: complaint.id,
    newValue: `${nextStatus}${complaint.assignedStaffName ? ` (${complaint.assignedStaffName})` : ''}`,
  });

  db.persist();
  res.json({ complaint });
});

router.post('/owner/maintenance', requireAuth, requireRole(UserRole.PG_OWNER), (req: AuthenticatedRequest, res) => {
  const state = db.getState();
  const propertyId = String(req.body?.propertyId || '');
  const property = state.properties.find((p) => p.id === propertyId && p.ownerId === req.auth!.sub);
  if (!property) {
    res.status(403).json({ error: 'Unauthorized property access' });
    return;
  }
  const title = String(req.body?.title || '').trim();
  if (title.length < 3) {
    res.status(400).json({ error: 'Maintenance title required' });
    return;
  }

  const actor = state.users.find((u) => u.id === req.auth!.sub)!;
  const item = {
    id: `mnt_${crypto.randomUUID().slice(0, 6)}`,
    propertyId,
    requestedBy: String(req.body?.requestedBy || actor.fullName),
    title,
    category: String(req.body?.category || 'GENERAL'),
    priority: (req.body?.priority || 'MEDIUM') as any,
    roomNumber: req.body?.roomNumber ? String(req.body.roomNumber) : undefined,
    assignedStaffName: req.body?.assignedStaffName ? String(req.body.assignedStaffName) : undefined,
    dueDate: String(req.body?.dueDate || new Date().toISOString().slice(0, 10)),
    estimatedCostInr: Math.max(0, Math.round(Number(req.body?.estimatedCostInr || 0))),
    status: MaintenanceStatus.PENDING,
    createdAt: new Date().toISOString(),
  };
  state.maintenanceRequests.unshift(item);
  db.persist();
  res.status(201).json({ maintenanceRequest: item });
});

router.patch('/owner/maintenance/:id', requireAuth, requireRole(UserRole.PG_OWNER), (req: AuthenticatedRequest, res) => {
  const state = db.getState();
  const item = state.maintenanceRequests.find((m) => m.id === req.params.id);
  if (!item) {
    res.status(404).json({ error: 'Maintenance task not found' });
    return;
  }
  const property = state.properties.find((p) => p.id === item.propertyId && p.ownerId === req.auth!.sub);
  if (!property) {
    res.status(403).json({ error: 'Unauthorized property access' });
    return;
  }
  if (req.body?.status) item.status = req.body.status;
  if (req.body?.assignedStaffName !== undefined) item.assignedStaffName = String(req.body.assignedStaffName);
  if (req.body?.estimatedCostInr !== undefined) item.estimatedCostInr = Math.max(0, Math.round(Number(req.body.estimatedCostInr)));
  if (req.body?.notes !== undefined) item.notes = String(req.body.notes);

  if (req.body?.logAsExpense && item.estimatedCostInr > 0) {
    state.expenses.unshift({
      id: `exp_${crypto.randomUUID().slice(0, 8)}`,
      propertyId: property.id,
      ownerId: property.ownerId,
      category: 'MAINTENANCE' as any,
      amountInr: item.estimatedCostInr,
      date: new Date().toISOString().slice(0, 10),
      notes: `Maintenance: ${item.title}`,
      createdAt: new Date().toISOString(),
    });
  }

  db.persist();
  res.json({ maintenanceRequest: item });
});

// ==================== CHECKOUT MANAGEMENT (PRESERVING UNPAID DUES) ====================

router.post('/owner/stays/:id/finalize-checkout', requireAuth, requireRole(UserRole.PG_OWNER), (req: AuthenticatedRequest, res) => {
  const state = db.getState();
  const stay = state.stays.find((s) => s.id === req.params.id);
  if (!stay) {
    res.status(404).json({ error: 'Stay record not found' });
    return;
  }
  const property = state.properties.find((p) => p.id === stay.propertyId && p.ownerId === req.auth!.sub);
  if (!property) {
    res.status(403).json({ error: 'Unauthorized property access' });
    return;
  }
  if (stay.status === StayStatus.CHECKED_OUT) {
    res.status(400).json({ error: 'Checkout is already finalized.' });
    return;
  }

  const now = new Date().toISOString();
  const actor = state.users.find((u) => u.id === req.auth!.sub)!;
  const deductionInr = Math.max(0, Math.round(Number(req.body?.deductionInr || 0)));
  const deductionReason = String(req.body?.deductionReason || 'Checkout maintenance / damage adjustment').trim();

  // Compute unpaid rent charges on this stay
  const unpaidRentCharges = state.rentCharges.filter(
    (rc) =>
      rc.stayId === stay.id &&
      rc.status !== 'PAID' &&
      rc.status !== 'WAIVED' &&
      rc.amountInr + (rc.lateFeeInr || 0) - rc.paidAmountInr > 0
  );
  const unpaidRentTotal = unpaidRentCharges.reduce(
    (acc, rc) => acc + Math.max(0, rc.amountInr + (rc.lateFeeInr || 0) - rc.paidAmountInr),
    0
  );

  const refundableDeposit = stay.depositPaid ? stay.securityDepositInr : 0;
  const totalLiability = unpaidRentTotal + deductionInr;
  const depositApplied = Math.min(refundableDeposit, totalLiability);
  const refundBalance = Math.max(0, refundableDeposit - depositApplied);
  const remainingUnpaidDebt = Math.max(0, totalLiability - depositApplied);

  stay.depositSettlementHistory = stay.depositSettlementHistory || [];
  if (deductionInr > 0) {
    stay.depositSettlementHistory.unshift({
      id: `dep_${crypto.randomUUID().slice(0, 6)}`,
      type: 'DEDUCTION',
      label: deductionReason,
      amountInr: deductionInr,
      createdAt: now,
    });
  }
  if (refundBalance > 0) {
    stay.depositSettlementHistory.unshift({
      id: `dep_${crypto.randomUUID().slice(0, 6)}`,
      type: 'REFUND',
      label: 'Final Security Deposit Refund',
      amountInr: refundBalance,
      notes: 'Settled during checkout',
      createdAt: now,
    });
  }

  // Convert remaining unpaid balance (or existing unpaid rent if deposit didn't cover it) into persistent OutstandingDue
  let createdDue = null;
  if (remainingUnpaidDebt > 0) {
    createdDue = {
      id: `due_${crypto.randomUUID().slice(0, 6)}`,
      propertyId: property.id,
      stayId: stay.id,
      tenantId: stay.tenantId,
      tenantName: stay.tenantName,
      isFormerTenant: true,
      category: 'RENT' as const,
      description: `Post-checkout unpaid balance (${unpaidRentCharges.map((r) => r.billingMonth).join(', ') || 'Final settlement'})`,
      totalAmountInr: remainingUnpaidDebt,
      paidAmountInr: 0,
      dueDate: now.slice(0, 10),
      status: 'OPEN' as const,
      createdAt: now,
    };
    state.outstandingDues.unshift(createdDue);
  }

  // Also flag any existing open OutstandingDue records for this tenant as former tenant
  state.outstandingDues
    .filter((d) => d.stayId === stay.id || (d.tenantId === stay.tenantId && d.propertyId === property.id))
    .forEach((d) => {
      d.isFormerTenant = true;
    });

  stay.status = StayStatus.CHECKED_OUT;
  stay.checkedOutAt = now;
  stay.stayHistory = stay.stayHistory || [];
  stay.stayHistory.unshift({
    id: `sh_${crypto.randomUUID().slice(0, 6)}`,
    eventType: 'CHECKED_OUT',
    summary: `Checkout finalized. Deposit refunded: ₹${refundBalance}. Carried-forward dues: ₹${remainingUnpaidDebt}.`,
    actorName: actor.fullName,
    timestamp: now,
  });

  const bed = state.beds.find((b) => b.id === stay.bedId);
  if (bed) {
    bed.status = BedStatus.AVAILABLE;
    bed.assignedTenantId = null;
  }

  db.recordActivity({
    ownerId: property.ownerId,
    propertyId: property.id,
    actorId: actor.id,
    actorName: actor.fullName,
    actorRole: actor.role,
    action: 'CHECKOUT_FINALIZED',
    entityType: 'TENANT_STAY',
    entityId: stay.id,
    newValue: `${stay.tenantName} checked out (Bed ${bed?.bedCode || stay.bedId} released)`,
  });

  db.persist();
  res.json({ stay, bedReleased: true, refundBalance, remainingUnpaidDebt, createdDue });
});

// ==================== STAFF, TASKS, ATTENDANCE & PAYROLL (BUSINESS PLAN) ====================

function requireBusinessTier(ownerId: string): boolean {
  const sub = db.getState().subscriptions.find((s) => s.ownerId === ownerId);
  return Boolean(sub && sub.tier === SubscriptionTier.BUSINESS);
}

router.post('/owner/staff', requireAuth, requireRole(UserRole.PG_OWNER), (req: AuthenticatedRequest, res) => {
  if (!requireBusinessTier(req.auth!.sub)) {
    res.status(403).json({ error: 'Staff accounts and permissions require the Business plan.' });
    return;
  }
  const state = db.getState();
  const propertyId = String(req.body?.propertyId || '');
  const property = state.properties.find((p) => p.id === propertyId && p.ownerId === req.auth!.sub);
  if (!property) {
    res.status(403).json({ error: 'Invalid property selection.' });
    return;
  }
  const staffMember = {
    id: `stf_${crypto.randomUUID().slice(0, 6)}`,
    ownerId: req.auth!.sub,
    propertyId,
    fullName: String(req.body?.fullName || '').trim(),
    roleTitle: (req.body?.roleTitle || 'CARETAKER') as any,
    phone: String(req.body?.phone || '').trim(),
    monthlySalaryInr: Math.max(5000, Math.round(Number(req.body?.monthlySalaryInr || 15000))),
    attendanceDaysThisMonth: 0,
    permissions: Array.isArray(req.body?.permissions) ? req.body.permissions : ['VIEW_RESIDENTS'],
    activeTaskCount: 0,
  };
  if (!staffMember.fullName || staffMember.phone.length < 10) {
    res.status(400).json({ error: 'Staff name and 10-digit phone are required.' });
    return;
  }
  state.staff.push(staffMember);
  db.persist();
  res.status(201).json({ staffMember });
});

router.patch('/owner/staff/:id', requireAuth, requireRole(UserRole.PG_OWNER), (req: AuthenticatedRequest, res) => {
  if (!requireBusinessTier(req.auth!.sub)) {
    res.status(403).json({ error: 'Staff management requires the Business plan.' });
    return;
  }
  const state = db.getState();
  const st = state.staff.find((s) => s.id === req.params.id && s.ownerId === req.auth!.sub);
  if (!st) {
    res.status(404).json({ error: 'Staff member not found' });
    return;
  }
  if (req.body?.roleTitle) st.roleTitle = req.body.roleTitle;
  if (req.body?.monthlySalaryInr !== undefined) st.monthlySalaryInr = Math.max(5000, Math.round(Number(req.body.monthlySalaryInr)));
  if (Array.isArray(req.body?.permissions)) st.permissions = req.body.permissions;
  db.persist();
  res.json({ staffMember: st });
});

router.post('/owner/staff/:id/attendance', requireAuth, requireRole(UserRole.PG_OWNER), (req: AuthenticatedRequest, res) => {
  if (!requireBusinessTier(req.auth!.sub)) {
    res.status(403).json({ error: 'Staff attendance requires the Business plan.' });
    return;
  }
  const state = db.getState();
  const st = state.staff.find((s) => s.id === req.params.id && s.ownerId === req.auth!.sub);
  if (!st) {
    res.status(404).json({ error: 'Staff member not found' });
    return;
  }
  st.attendanceDaysThisMonth = Math.min(31, st.attendanceDaysThisMonth + 1);
  db.persist();
  res.json({ staffMember: st });
});

router.post('/owner/staff/tasks', requireAuth, requireRole(UserRole.PG_OWNER), (req: AuthenticatedRequest, res) => {
  if (!requireBusinessTier(req.auth!.sub)) {
    res.status(403).json({ error: 'Staff task management requires the Business plan.' });
    return;
  }
  const state = db.getState();
  const st = state.staff.find((s) => s.id === req.body?.staffId && s.ownerId === req.auth!.sub);
  if (!st) {
    res.status(404).json({ error: 'Staff member not found' });
    return;
  }
  const title = String(req.body?.title || '').trim();
  if (title.length < 3) {
    res.status(400).json({ error: 'Task title is required' });
    return;
  }
  const task = {
    id: `stsk_${crypto.randomUUID().slice(0, 6)}`,
    ownerId: req.auth!.sub,
    propertyId: st.propertyId,
    staffId: st.id,
    staffName: st.fullName,
    title,
    dueDate: String(req.body?.dueDate || new Date().toISOString().slice(0, 10)),
    priority: (req.body?.priority || 'MEDIUM') as any,
    status: 'PENDING' as const,
    createdAt: new Date().toISOString(),
  };
  state.staffTasks.unshift(task);
  st.activeTaskCount += 1;
  db.persist();
  res.status(201).json({ task });
});

router.patch('/owner/staff/tasks/:taskId', requireAuth, requireRole(UserRole.PG_OWNER), (req: AuthenticatedRequest, res) => {
  if (!requireBusinessTier(req.auth!.sub)) {
    res.status(403).json({ error: 'Staff task management requires the Business plan.' });
    return;
  }
  const state = db.getState();
  const task = state.staffTasks.find((t) => t.id === req.params.taskId && t.ownerId === req.auth!.sub);
  if (!task) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }
  const prev = task.status;
  if (req.body?.status) task.status = req.body.status;
  if (prev !== 'COMPLETED' && task.status === 'COMPLETED') {
    const st = state.staff.find((s) => s.id === task.staffId);
    if (st) st.activeTaskCount = Math.max(0, st.activeTaskCount - 1);
  }
  db.persist();
  res.json({ task });
});

router.post('/owner/staff/payroll', requireAuth, requireRole(UserRole.PG_OWNER), (req: AuthenticatedRequest, res) => {
  if (!requireBusinessTier(req.auth!.sub)) {
    res.status(403).json({ error: 'Staff payroll requires the Business plan.' });
    return;
  }
  const state = db.getState();
  const st = state.staff.find((s) => s.id === req.body?.staffId && s.ownerId === req.auth!.sub);
  if (!st) {
    res.status(404).json({ error: 'Staff member not found' });
    return;
  }
  const month = String(req.body?.month || new Date().toISOString().slice(0, 7));
  const bonusInr = Math.max(0, Math.round(Number(req.body?.bonusInr || 0)));
  const deductionInr = Math.max(0, Math.round(Number(req.body?.deductionInr || 0)));
  const netPaidInr = Math.max(0, st.monthlySalaryInr + bonusInr - deductionInr);
  const record = {
    id: `pay_${crypto.randomUUID().slice(0, 6)}`,
    ownerId: req.auth!.sub,
    propertyId: st.propertyId,
    staffId: st.id,
    staffName: st.fullName,
    month,
    baseSalaryInr: st.monthlySalaryInr,
    bonusInr,
    deductionInr,
    netPaidInr,
    status: 'PAID' as const,
    paidAt: new Date().toISOString(),
  };
  state.payrollRecords.unshift(record);
  state.expenses.unshift({
    id: `exp_${crypto.randomUUID().slice(0, 8)}`,
    propertyId: st.propertyId,
    ownerId: req.auth!.sub,
    category: 'SALARIES' as any,
    amountInr: netPaidInr,
    date: new Date().toISOString().slice(0, 10),
    notes: `Payroll payout for ${st.fullName} (${month})`,
    createdAt: new Date().toISOString(),
  });
  db.persist();
  res.status(201).json({ payrollRecord: record });
});

// ==================== REVIEWS, TRACKING CENTER, REPORTS, PROFILE ====================

router.get('/owner/reviews', requireAuth, requireRole(UserRole.PG_OWNER), (req: AuthenticatedRequest, res) => {
  const state = db.getState();
  const ownedIds = new Set(state.properties.filter((p) => p.ownerId === req.auth!.sub).map((p) => p.id));
  const reviews = state.reviews.filter((r) => ownedIds.has(r.propertyId));
  res.json({ reviews });
});

router.post('/owner/reviews/:id/reply', requireAuth, requireRole(UserRole.PG_OWNER), (req: AuthenticatedRequest, res) => {
  const state = db.getState();
  const review = state.reviews.find((r) => r.id === req.params.id);
  if (!review) {
    res.status(404).json({ error: 'Review not found' });
    return;
  }
  const property = state.properties.find((p) => p.id === review.propertyId && p.ownerId === req.auth!.sub);
  if (!property) {
    res.status(403).json({ error: 'Unauthorized property access' });
    return;
  }
  const reply = String(req.body?.reply || '').trim();
  if (reply.length < 3) {
    res.status(400).json({ error: 'Reply text is required' });
    return;
  }
  review.ownerReply = reply;
  review.repliedAt = new Date().toISOString();
  db.persist();
  res.json({ review });
});

router.get('/owner/tracking', requireAuth, requireRole(UserRole.PG_OWNER), (req: AuthenticatedRequest, res) => {
  const state = db.getState();
  const ownerId = req.auth!.sub;
  const sub = state.subscriptions.find((s) => s.ownerId === ownerId);
  const tier = sub?.tier || SubscriptionTier.BASIC;
  const properties = state.properties.filter((p) => p.ownerId === ownerId);
  const ownedIds = new Set(properties.map((p) => p.id));

  res.json({
    tier,
    capabilities: {
      basicTracking: true,
      advancedTimelineAndFollowups: tier === SubscriptionTier.PRO || tier === SubscriptionTier.BUSINESS,
      multiPropertyAndStaffTracking: tier === SubscriptionTier.BUSINESS,
    },
    approvals: properties.map((p) => ({
      propertyId: p.id,
      propertyName: p.name,
      status: p.approvalStatus,
      reason: p.approvalReason,
      history: tier === SubscriptionTier.BASIC ? p.approvalHistory.slice(-1) : p.approvalHistory,
    })),
    locations: properties.map((p) => ({
      propertyId: p.id,
      propertyName: p.name,
      status: p.locationStatus,
      notes: p.locationNotes,
      history: tier === SubscriptionTier.BASIC ? p.locationHistory.slice(-1) : p.locationHistory,
    })),
    beds: state.beds.filter((b) => ownedIds.has(b.propertyId)),
    joiningRequests: state.joiningRequests.filter((j) => ownedIds.has(j.propertyId)),
    rentCharges: state.rentCharges.filter((rc) => ownedIds.has(rc.propertyId)),
    outstandingDues:
      tier === SubscriptionTier.BASIC
        ? state.outstandingDues.filter((d) => ownedIds.has(d.propertyId)).slice(0, 5)
        : state.outstandingDues.filter((d) => ownedIds.has(d.propertyId)),
    complaints: state.complaints.filter((c) => ownedIds.has(c.propertyId)),
    maintenanceRequests: state.maintenanceRequests.filter((m) => ownedIds.has(m.propertyId)),
    checkouts: state.stays.filter((s) => ownedIds.has(s.propertyId) && s.status !== StayStatus.ACTIVE),
    staffTasks: tier === SubscriptionTier.BUSINESS ? state.staffTasks.filter((t) => t.ownerId === ownerId) : [],
    subscriptions: sub,
    transactions: state.transactions.filter((t) => t.userId === ownerId),
  });
});

router.get('/owner/reports', requireAuth, requireRole(UserRole.PG_OWNER), (req: AuthenticatedRequest, res) => {
  const state = db.getState();
  const ownerProps = state.properties.filter((p) => p.ownerId === req.auth!.sub);

  const byProperty = ownerProps.map((p) => {
    const beds = state.beds.filter((b) => b.propertyId === p.id);
    const occupied = beds.filter((b) => b.status === BedStatus.OCCUPIED).length;
    const rentCollected = state.rentCharges
      .filter((rc) => rc.propertyId === p.id)
      .reduce((acc, rc) => acc + rc.paidAmountInr, 0);
    const rentPending = state.rentCharges
      .filter((rc) => rc.propertyId === p.id && rc.status !== 'WAIVED')
      .reduce((acc, rc) => acc + Math.max(0, rc.amountInr + (rc.lateFeeInr || 0) - rc.paidAmountInr), 0);
    const expenses = state.expenses
      .filter((e) => e.propertyId === p.id)
      .reduce((acc, e) => acc + e.amountInr, 0);
    const dues = state.outstandingDues
      .filter((d) => d.propertyId === p.id && d.status !== 'SETTLED')
      .reduce((acc, d) => acc + Math.max(0, d.totalAmountInr - d.paidAmountInr), 0);
    const openComplaints = state.complaints.filter(
      (c) => c.propertyId === p.id && c.status !== ComplaintStatus.RESOLVED && c.status !== ComplaintStatus.CLOSED
    ).length;

    return {
      propertyId: p.id,
      propertyName: p.name,
      totalBeds: beds.length,
      occupiedBeds: occupied,
      occupancyRatePct: beds.length > 0 ? Math.round((occupied / beds.length) * 100) : 0,
      rentCollectedInr: rentCollected,
      rentPendingInr: rentPending,
      expensesInr: expenses,
      netProfitInr: rentCollected - expenses,
      outstandingDuesInr: dues,
      openComplaints,
    };
  });

  res.json({ byProperty });
});

router.get('/owner/profile-summary', requireAuth, requireRole(UserRole.PG_OWNER), (req: AuthenticatedRequest, res) => {
  const state = db.getState();
  const ownerId = req.auth!.sub;
  const properties = state.properties.filter((p) => p.ownerId === ownerId);
  const propIds = new Set(properties.map((p) => p.id));
  const beds = state.beds.filter((b) => propIds.has(b.propertyId));
  const stays = state.stays.filter((s) => propIds.has(s.propertyId));
  const subscription = state.subscriptions.find((s) => s.ownerId === ownerId) || null;
  const transactions = state.transactions.filter((t) => t.userId === ownerId);
  const qrRequests = state.joiningRequests.filter((j) => propIds.has(j.propertyId) && j.origin === 'QR');

  res.json({
    stats: {
      totalProperties: properties.length,
      approvedProperties: properties.filter((p) => p.approvalStatus === PropertyApprovalStatus.APPROVED).length,
      totalBeds: beds.length,
      occupiedBeds: beds.filter((b) => b.status === BedStatus.OCCUPIED).length,
      activeTenants: stays.filter((s) => s.status !== StayStatus.CHECKED_OUT).length,
      qrRequestsCount: qrRequests.length,
    },
    subscription,
    transactions,
  });
});

router.patch('/owner/profile', requireAuth, requireRole(UserRole.PG_OWNER), (req: AuthenticatedRequest, res) => {
  const state = db.getState();
  const owner = state.users.find((u) => u.id === req.auth!.sub);
  if (!owner) {
    res.status(404).json({ error: 'Owner account not found' });
    return;
  }
  if (req.body?.fullName) owner.fullName = String(req.body.fullName).trim();
  if (req.body?.businessName !== undefined) owner.businessName = String(req.body.businessName).trim();
  if (req.body?.businessDescription !== undefined) owner.businessDescription = String(req.body.businessDescription).trim();
  if (req.body?.city !== undefined) owner.city = String(req.body.city).trim();
  if (req.body?.avatarUrl !== undefined) owner.avatarUrl = String(req.body.avatarUrl).trim() || undefined;
  if (req.body?.language !== undefined) owner.language = String(req.body.language).trim();
  if (req.body?.notificationPreferences !== undefined) owner.notificationPreferences = req.body.notificationPreferences;
  if (req.body?.privacySettings !== undefined) owner.privacySettings = req.body.privacySettings;
  db.persist();
  const { passwordHash: _pw, ...publicUser } = owner;
  res.json({ user: publicUser });
});

export default router;
