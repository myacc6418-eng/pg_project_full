import { Router } from 'express';
import crypto from 'crypto';
import {
  BedStatus,
  DocumentVerificationStatus,
  LocationVerificationStatus,
  Property,
  PropertyApprovalStatus,
  StayStatus,
  SubscriptionStatus,
  SubscriptionTier,
  UserRole,
} from '../../../../../packages/shared/types';
import { createPropertySchema, updatePropertySchema } from '../../../../../packages/shared/schemas';
import { isPropertyPubliclyVisible } from '../../../../../packages/shared/permissions';
import { db } from '../../shared/db';
import { AuthenticatedRequest, optionalAuth, requireAuth, requireRole } from '../../middleware/auth';

const router = Router();

function enrichProperty(property: Property, includePrivateLocation = false) {
  const state = db.getState();
  const floors = state.floors.filter((f) => f.propertyId === property.id);
  const rooms = state.rooms.filter((r) => r.propertyId === property.id);
  const beds = state.beds.filter((b) => b.propertyId === property.id);
  const availableBeds = beds.filter((b) => b.status === BedStatus.AVAILABLE).length;
  const totalBeds = beds.length;
  const occupiedBeds = beds.filter((b) => b.status === BedStatus.OCCUPIED).length;

  const safeProperty = includePrivateLocation
    ? property
    : {
        ...property,
        ownerLat: property.locationStatus === LocationVerificationStatus.VERIFIED ? property.ownerLat : 0,
        ownerLng: property.locationStatus === LocationVerificationStatus.VERIFIED ? property.ownerLng : 0,
      };

  return {
    ...safeProperty,
    floors,
    rooms,
    beds,
    availableBeds,
    totalBeds,
    occupiedBeds,
    isPubliclyVisible: !property.isArchived && isPropertyPubliclyVisible(property),
  };
}

// Public PG discovery — strictly returns properties meeting approval + location + entitlement + not archived
router.get('/public', optionalAuth, (req: AuthenticatedRequest, res) => {
  const { city, locality, genderType, roomType, maxRent, minBeds, amenity, q, sort } = req.query;
  const state = db.getState();

  let list = state.properties
    .filter((p) => !p.isArchived && isPropertyPubliclyVisible(p))
    .map((p) => enrichProperty(p, false));

  if (city && city !== 'ALL') {
    list = list.filter((p) => p.city.toLowerCase() === String(city).toLowerCase());
  }
  if (locality) {
    list = list.filter((p) => p.locality.toLowerCase().includes(String(locality).toLowerCase()));
  }
  if (genderType && genderType !== 'ALL') {
    list = list.filter((p) => p.genderType === String(genderType));
  }
  if (roomType && roomType !== 'ALL') {
    list = list.filter((p) => p.rooms.some((r) => r.roomType === String(roomType) && r.isActive !== false));
  }
  if (maxRent) {
    const cap = Number(maxRent);
    if (!Number.isNaN(cap) && cap > 0) {
      list = list.filter((p) => p.startingRentInr <= cap);
    }
  }
  if (minBeds) {
    const min = Number(minBeds);
    if (!Number.isNaN(min) && min > 0) {
      list = list.filter((p) => p.availableBeds >= min);
    }
  }
  if (amenity) {
    list = list.filter((p) => p.amenities.includes(String(amenity)));
  }
  if (q) {
    const query = String(q).toLowerCase();
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.locality.toLowerCase().includes(query) ||
        p.city.toLowerCase().includes(query)
    );
  }

  if (sort === 'RENT_ASC') {
    list.sort((a, b) => a.startingRentInr - b.startingRentInr);
  } else if (sort === 'RATING_DESC') {
    list.sort((a, b) => b.rating - a.rating);
  } else {
    list.sort((a, b) => Number(b.isPromoted) - Number(a.isPromoted) || b.rating - a.rating);
  }

  const savedIds = req.auth ? state.savedPropertyIds[req.auth.sub] || [] : [];
  const recentlyViewedIds = req.auth ? state.recentPropertyIds[req.auth.sub] || [] : [];
  res.json({ properties: list, savedIds, recentlyViewedIds });
});

router.get('/public/:id', optionalAuth, (req: AuthenticatedRequest, res) => {
  const state = db.getState();
  const property = state.properties.find((p) => p.id === req.params.id);
  if (!property) {
    res.status(404).json({ error: 'Property not found' });
    return;
  }

  const canViewPrivate =
    req.auth?.role === UserRole.SUPER_ADMIN ||
    (req.auth?.role === UserRole.PG_OWNER && property.ownerId === req.auth?.sub);

  if ((property.isArchived || !isPropertyPubliclyVisible(property)) && !canViewPrivate) {
    res.status(404).json({ error: 'This PG property is not publicly listed yet' });
    return;
  }

  // Record recently viewed property for logged-in tenant
  if (req.auth?.sub) {
    const prev = state.recentPropertyIds[req.auth.sub] || [];
    state.recentPropertyIds[req.auth.sub] = [property.id, ...prev.filter((id) => id !== property.id)].slice(0, 6);
    db.persist();
  }

  const owner = state.users.find((u) => u.id === property.ownerId);
  const foodMenu = state.foodMenus.filter((f) => f.propertyId === property.id);
  const reviews = state.reviews.filter((r) => r.propertyId === property.id);
  const savedIds = req.auth ? state.savedPropertyIds[req.auth.sub] || [] : [];
  const showPhone = owner?.privacySettings?.showBusinessPhonePublicly !== false;
  const showEmail = owner?.privacySettings?.showEmailPublicly !== false;

  const canReview = Boolean(
    req.auth?.role === UserRole.TENANT &&
      state.stays.some((s) => s.tenantId === req.auth!.sub && s.propertyId === property.id)
  );

  res.json({
    property: enrichProperty(property, canViewPrivate),
    ownerName: owner?.businessName || owner?.fullName || 'PG Owner',
    ownerPhone: showPhone ? property.contactPhone || owner?.phone : undefined,
    ownerEmail: showEmail ? property.contactEmail || owner?.email : undefined,
    foodMenu,
    reviews,
    isSaved: savedIds.includes(property.id),
    canReview,
  });
});

// Tenant with active or past stay submits property review
router.post('/public/:id/reviews', requireAuth, requireRole(UserRole.TENANT), (req: AuthenticatedRequest, res) => {
  const state = db.getState();
  const property = state.properties.find((p) => p.id === req.params.id);
  if (!property) {
    res.status(404).json({ error: 'Property not found' });
    return;
  }
  const hasStay = state.stays.some((s) => s.tenantId === req.auth!.sub && s.propertyId === property.id);
  if (!hasStay) {
    res.status(403).json({ error: 'Only verified current or past residents of this PG can submit a review.' });
    return;
  }
  const rating = Math.min(5, Math.max(1, Math.round(Number(req.body?.rating || 5))));
  const comment = String(req.body?.comment || '').trim();
  if (comment.length < 6) {
    res.status(400).json({ error: 'Please write at least 6 characters for your review.' });
    return;
  }
  const tenant = state.users.find((u) => u.id === req.auth!.sub)!;
  const review = {
    id: `rev_${crypto.randomUUID().slice(0, 6)}`,
    propertyId: property.id,
    tenantId: tenant.id,
    tenantName: tenant.fullName,
    rating,
    comment,
    createdAt: new Date().toISOString(),
  };
  state.reviews.unshift(review);
  const propReviews = state.reviews.filter((r) => r.propertyId === property.id);
  property.reviewCount = propReviews.length;
  property.rating = Number(
    (propReviews.reduce((acc, r) => acc + r.rating, 0) / Math.max(1, propReviews.length)).toFixed(1)
  );
  db.persist();
  res.status(201).json({ review, rating: property.rating, reviewCount: property.reviewCount });
});

// Public QR Onboarding lookup — returns basic summary + explicit eligibility status
router.get('/qr/:id', optionalAuth, (req: AuthenticatedRequest, res) => {
  const state = db.getState();
  const property = state.properties.find((p) => p.id === req.params.id);
  if (!property) {
    res.status(404).json({ error: 'PG property not found for this QR code.' });
    return;
  }

  const eligible = !property.isArchived && isPropertyPubliclyVisible(property);
  let ineligibleReason: string | null = null;
  if (property.isArchived) {
    ineligibleReason = 'This property listing has been archived by the owner.';
  } else if (property.approvalStatus !== PropertyApprovalStatus.APPROVED) {
    ineligibleReason = `Property approval is currently ${property.approvalStatus.replace(/_/g, ' ')}.`;
  } else if (property.locationStatus !== LocationVerificationStatus.VERIFIED) {
    ineligibleReason = `Location verification is currently ${property.locationStatus.replace(/_/g, ' ')}.`;
  } else if (!property.hasLifetimeListing && !property.coveredBySubscription) {
    ineligibleReason = 'This PG does not currently have an active listing entitlement.';
  }

  const rooms = state.rooms.filter((r) => r.propertyId === property.id && r.isActive !== false);
  const beds = state.beds.filter((b) => b.propertyId === property.id);
  const availableBeds = beds.filter((b) => b.status === BedStatus.AVAILABLE);

  const roomTypesSummary = (['SINGLE', 'TWIN', 'TRIPLE', 'FOUR_SHARING'] as const)
    .map((type) => {
      const matchingRooms = rooms.filter((r) => r.roomType === type);
      const matchingRoomIds = new Set(matchingRooms.map((r) => r.id));
      const openCount = availableBeds.filter((b) => matchingRoomIds.has(b.roomId)).length;
      const minRent = matchingRooms.length > 0 ? Math.min(...matchingRooms.map((r) => r.monthlyRentInr)) : property.startingRentInr;
      const minDeposit = matchingRooms.length > 0 ? Math.min(...matchingRooms.map((r) => r.depositInr)) : property.securityDepositInr;
      return {
        roomType: type,
        roomCount: matchingRooms.length,
        availableBeds: openCount,
        startingRentInr: minRent,
        depositInr: minDeposit,
      };
    })
    .filter((item) => item.roomCount > 0);

  const owner = state.users.find((u) => u.id === property.ownerId);

  res.json({
    eligible,
    ineligibleReason,
    property: {
      id: property.id,
      name: property.name,
      description: property.description,
      genderType: property.genderType,
      locality: property.locality,
      city: property.city,
      state: property.state,
      address: eligible ? property.address : `${property.locality}, ${property.city}`,
      landmark: property.landmark,
      startingRentInr: property.startingRentInr,
      securityDepositInr: property.securityDepositInr,
      amenities: property.amenities,
      rules: property.rules,
      images: property.images,
      rating: property.rating,
      reviewCount: property.reviewCount,
      availableBeds: availableBeds.length,
      totalBeds: beds.length,
      approvalStatus: property.approvalStatus,
      locationStatus: property.locationStatus,
    },
    ownerName: owner?.businessName || owner?.fullName || 'PG Owner',
    roomTypesSummary,
  });
});

router.post('/saved/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  const state = db.getState();
  const userId = req.auth!.sub;
  const current = state.savedPropertyIds[userId] || [];
  const exists = current.includes(req.params.id);
  state.savedPropertyIds[userId] = exists
    ? current.filter((id) => id !== req.params.id)
    : [...current, req.params.id];
  db.persist();
  res.json({ savedIds: state.savedPropertyIds[userId], saved: !exists });
});

// Owner: List own properties
router.get('/owner/mine', requireAuth, requireRole(UserRole.PG_OWNER), (req: AuthenticatedRequest, res) => {
  const state = db.getState();
  const list = state.properties
    .filter((p) => p.ownerId === req.auth!.sub)
    .map((p) => enrichProperty(p, true));
  const sub = state.subscriptions.find((s) => s.ownerId === req.auth!.sub);
  res.json({ properties: list, subscription: sub });
});

// Owner: Single property detail with documents, reviews, activity logs
router.get('/owner/:id', requireAuth, requireRole(UserRole.PG_OWNER), (req: AuthenticatedRequest, res) => {
  const state = db.getState();
  const property = state.properties.find((p) => p.id === req.params.id && p.ownerId === req.auth!.sub);
  if (!property) {
    res.status(404).json({ error: 'Property not found or unauthorized' });
    return;
  }

  const documents = state.propertyDocuments.filter((d) => d.propertyId === property.id);
  const reviews = state.reviews.filter((r) => r.propertyId === property.id);
  const activeStays = state.stays.filter((s) => s.propertyId === property.id && s.status !== StayStatus.CHECKED_OUT);
  const activityLogs = state.activityLogs.filter((l) => l.ownerId === req.auth!.sub && l.propertyId === property.id);

  res.json({
    property: enrichProperty(property, true),
    documents,
    reviews,
    activeStayCount: activeStays.length,
    activityLogs,
  });
});

// Owner: Create new PG property (via multi-step Add PG Wizard)
router.post('/owner', requireAuth, requireRole(UserRole.PG_OWNER), (req: AuthenticatedRequest, res) => {
  const parsed = createPropertySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid property details' });
    return;
  }

  const state = db.getState();
  const ownerId = req.auth!.sub;
  const actor = state.users.find((u) => u.id === ownerId)!;
  const sub = state.subscriptions.find((s) => s.ownerId === ownerId);
  const activeSubCoveredCount = state.properties.filter(
    (p) => p.ownerId === ownerId && p.coveredBySubscription && !p.isArchived
  ).length;

  let coveredBySubscription = false;
  if (
    sub &&
    sub.status === SubscriptionStatus.ACTIVE &&
    sub.tier !== SubscriptionTier.BASIC &&
    activeSubCoveredCount < sub.maxListings
  ) {
    coveredBySubscription = true;
  }

  const now = new Date().toISOString();
  const propId = `pg_${crypto.randomUUID().slice(0, 8)}`;
  const submitNow = parsed.data.submitImmediately !== false;

  const newProp: Property = {
    id: propId,
    ownerId,
    name: parsed.data.name.trim(),
    description: parsed.data.description.trim(),
    genderType: parsed.data.genderType,
    contactPhone: actor.phone,
    contactEmail: actor.email,
    address: parsed.data.address.trim(),
    landmark: parsed.data.landmark.trim(),
    locality: parsed.data.locality.trim(),
    city: parsed.data.city.trim(),
    state: parsed.data.state.trim(),
    postalCode: parsed.data.postalCode.trim(),
    googleMapsUrl: parsed.data.googleMapsUrl || undefined,
    ownerLat: parsed.data.ownerLat,
    ownerLng: parsed.data.ownerLng,
    verifiedLat: null,
    verifiedLng: null,
    startingRentInr: parsed.data.startingRentInr,
    securityDepositInr: parsed.data.securityDepositInr,
    extraCharges: [],
    amenities: parsed.data.amenities,
    rules: parsed.data.rules,
    images: ['/src/assets/images/pg_green_nest_1795149981855.jpg'],
    approvalStatus: submitNow ? PropertyApprovalStatus.PENDING_APPROVAL : PropertyApprovalStatus.DRAFT,
    approvalHistory: [],
    locationStatus: submitNow
      ? LocationVerificationStatus.PENDING_VERIFICATION
      : LocationVerificationStatus.DRAFT,
    locationHistory: [],
    hasLifetimeListing: false,
    coveredBySubscription,
    isPromoted: false,
    isArchived: false,
    rating: 0,
    reviewCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  state.properties.push(newProp);

  const floorId = `flr_${crypto.randomUUID().slice(0, 6)}`;
  state.floors.push({
    id: floorId,
    propertyId: propId,
    floorNumber: 1,
    label: '1st Floor',
    createdAt: now,
  });

  const initialRoomType = (req.body?.initialRoomType as 'SINGLE' | 'TWIN' | 'TRIPLE') || 'TWIN';
  const initialBedCount = Math.min(Math.max(Number(req.body?.initialBedCount) || 2, 1), 6);
  const roomId = `rm_${crypto.randomUUID().slice(0, 6)}`;
  state.rooms.push({
    id: roomId,
    propertyId: propId,
    floorId,
    floorNumber: 1,
    roomNumber: '101',
    roomType: initialRoomType,
    monthlyRentInr: newProp.startingRentInr,
    depositInr: newProp.securityDepositInr,
    isActive: true,
  });

  for (let i = 1; i <= initialBedCount; i++) {
    state.beds.push({
      id: `bed_${crypto.randomUUID().slice(0, 6)}`,
      propertyId: propId,
      roomId,
      bedCode: `101-${String.fromCharCode(64 + i)}`,
      status: BedStatus.AVAILABLE,
      assignedTenantId: null,
      monthlyRentOverrideInr: null,
    });
  }

  db.recordActivity({
    ownerId,
    propertyId: propId,
    actorId: actor.id,
    actorName: actor.fullName,
    actorRole: actor.role,
    action: submitNow ? 'PROPERTY_CREATED_SUBMITTED' : 'PROPERTY_DRAFT_CREATED',
    entityType: 'PROPERTY',
    entityId: propId,
    newValue: newProp.name,
  });

  db.persist();
  res.status(201).json({ property: enrichProperty(newProp, true) });
});

// Owner: Edit PG property details (triggers REVERIFICATION_REQUIRED if verified location fields change)
router.patch('/owner/:id', requireAuth, requireRole(UserRole.PG_OWNER), (req: AuthenticatedRequest, res) => {
  const parsed = updatePropertySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid property update payload' });
    return;
  }

  const state = db.getState();
  const property = state.properties.find((p) => p.id === req.params.id && p.ownerId === req.auth!.sub);
  if (!property) {
    res.status(404).json({ error: 'Property not found or unauthorized' });
    return;
  }

  const actor = state.users.find((u) => u.id === req.auth!.sub)!;
  const data = parsed.data;
  const now = new Date().toISOString();

  const locationChanged =
    (data.address !== undefined && data.address.trim() !== property.address) ||
    (data.landmark !== undefined && data.landmark.trim() !== property.landmark) ||
    (data.locality !== undefined && data.locality.trim() !== property.locality) ||
    (data.city !== undefined && data.city.trim() !== property.city) ||
    (data.state !== undefined && data.state.trim() !== property.state) ||
    (data.postalCode !== undefined && data.postalCode.trim() !== property.postalCode) ||
    (data.googleMapsUrl !== undefined && (data.googleMapsUrl || '') !== (property.googleMapsUrl || '')) ||
    (data.ownerLat !== undefined && Number(data.ownerLat) !== property.ownerLat) ||
    (data.ownerLng !== undefined && Number(data.ownerLng) !== property.ownerLng);

  const prevSummary = `${property.name} (${property.address}, ₹${property.startingRentInr})`;

  if (data.name !== undefined) property.name = data.name.trim();
  if (data.description !== undefined) property.description = data.description.trim();
  if (data.genderType !== undefined) property.genderType = data.genderType;
  if (data.contactPhone !== undefined) property.contactPhone = data.contactPhone.trim();
  if (data.contactEmail !== undefined) property.contactEmail = data.contactEmail.trim();
  if (data.address !== undefined) property.address = data.address.trim();
  if (data.landmark !== undefined) property.landmark = data.landmark.trim();
  if (data.locality !== undefined) property.locality = data.locality.trim();
  if (data.city !== undefined) property.city = data.city.trim();
  if (data.state !== undefined) property.state = data.state.trim();
  if (data.postalCode !== undefined) property.postalCode = data.postalCode.trim();
  if (data.googleMapsUrl !== undefined) property.googleMapsUrl = data.googleMapsUrl.trim() || undefined;
  if (data.ownerLat !== undefined) property.ownerLat = Number(data.ownerLat);
  if (data.ownerLng !== undefined) property.ownerLng = Number(data.ownerLng);
  if (data.startingRentInr !== undefined) property.startingRentInr = data.startingRentInr;
  if (data.securityDepositInr !== undefined) property.securityDepositInr = data.securityDepositInr;
  if (data.amenities !== undefined) property.amenities = data.amenities;
  if (data.rules !== undefined) property.rules = data.rules;
  if (data.images !== undefined && data.images.length > 0) property.images = data.images;
  if (data.extraCharges !== undefined) property.extraCharges = data.extraCharges;

  let reverificationTriggered = false;
  if (locationChanged && property.locationStatus === LocationVerificationStatus.VERIFIED) {
    const prevLoc = property.locationStatus;
    property.locationStatus = LocationVerificationStatus.REVERIFICATION_REQUIRED;
    property.verifiedLat = null;
    property.verifiedLng = null;
    property.locationNotes = 'Location details edited by owner; Super Admin re-verification required before public listing.';
    property.locationHistory.push({
      id: `loc_${crypto.randomUUID().slice(0, 6)}`,
      actorId: actor.id,
      actorName: actor.fullName,
      previousStatus: prevLoc,
      newStatus: LocationVerificationStatus.REVERIFICATION_REQUIRED,
      notes: 'Owner updated street address or coordinates; location reset to REVERIFICATION_REQUIRED.',
      timestamp: now,
    });
    reverificationTriggered = true;

    state.notifications.unshift({
      id: `ntf_${crypto.randomUUID().slice(0, 6)}`,
      userId: property.ownerId,
      title: 'Location Re-verification Triggered',
      body: `${property.name} location details were modified. Public visibility is paused until Super Admin verifies the updated location.`,
      category: 'LOCATION_VERIFICATION',
      read: false,
      createdAt: now,
    });
  }

  property.updatedAt = now;

  db.recordActivity({
    ownerId: property.ownerId,
    propertyId: property.id,
    actorId: actor.id,
    actorName: actor.fullName,
    actorRole: actor.role,
    action: reverificationTriggered ? 'PROPERTY_LOCATION_MODIFIED' : 'PROPERTY_UPDATED',
    entityType: 'PROPERTY',
    entityId: property.id,
    previousValue: prevSummary,
    newValue: `${property.name} (${property.address}, ₹${property.startingRentInr})`,
  });

  db.persist();
  res.json({ property: enrichProperty(property, true), reverificationTriggered });
});

// Owner: Duplicate property as Draft
router.post('/owner/:id/duplicate', requireAuth, requireRole(UserRole.PG_OWNER), (req: AuthenticatedRequest, res) => {
  const state = db.getState();
  const source = state.properties.find((p) => p.id === req.params.id && p.ownerId === req.auth!.sub);
  if (!source) {
    res.status(404).json({ error: 'Property not found or unauthorized' });
    return;
  }

  const actor = state.users.find((u) => u.id === req.auth!.sub)!;
  const now = new Date().toISOString();
  const newPropId = `pg_${crypto.randomUUID().slice(0, 8)}`;

  const copy: Property = {
    ...source,
    id: newPropId,
    name: `${source.name} (Copy)`,
    verifiedLat: null,
    verifiedLng: null,
    approvalStatus: PropertyApprovalStatus.DRAFT,
    approvalReason: undefined,
    approvalHistory: [],
    locationStatus: LocationVerificationStatus.DRAFT,
    locationNotes: undefined,
    locationHistory: [],
    hasLifetimeListing: false,
    coveredBySubscription: false,
    isPromoted: false,
    promotionEndsAt: null,
    isArchived: false,
    rating: 0,
    reviewCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  state.properties.push(copy);

  const floorIdMap = new Map<string, string>();
  state.floors
    .filter((f) => f.propertyId === source.id)
    .forEach((f) => {
      const nextFlrId = `flr_${crypto.randomUUID().slice(0, 6)}`;
      floorIdMap.set(f.id, nextFlrId);
      state.floors.push({ ...f, id: nextFlrId, propertyId: newPropId, createdAt: now });
    });

  const roomIdMap = new Map<string, string>();
  state.rooms
    .filter((r) => r.propertyId === source.id)
    .forEach((r) => {
      const nextRmId = `rm_${crypto.randomUUID().slice(0, 6)}`;
      roomIdMap.set(r.id, nextRmId);
      state.rooms.push({
        ...r,
        id: nextRmId,
        propertyId: newPropId,
        floorId: r.floorId ? floorIdMap.get(r.floorId) : undefined,
      });
    });

  state.beds
    .filter((b) => b.propertyId === source.id)
    .forEach((b) => {
      state.beds.push({
        ...b,
        id: `bed_${crypto.randomUUID().slice(0, 6)}`,
        propertyId: newPropId,
        roomId: roomIdMap.get(b.roomId) || b.roomId,
        status: BedStatus.AVAILABLE,
        assignedTenantId: null,
        reservedForRequestId: null,
      });
    });

  db.recordActivity({
    ownerId: actor.id,
    propertyId: newPropId,
    actorId: actor.id,
    actorName: actor.fullName,
    actorRole: actor.role,
    action: 'PROPERTY_DUPLICATED',
    entityType: 'PROPERTY',
    entityId: newPropId,
    previousValue: source.name,
    newValue: copy.name,
  });

  db.persist();
  res.status(201).json({ property: enrichProperty(copy, true) });
});

// Owner: Archive / Unarchive property (blocked if active stays exist)
router.post('/owner/:id/archive', requireAuth, requireRole(UserRole.PG_OWNER), (req: AuthenticatedRequest, res) => {
  const state = db.getState();
  const property = state.properties.find((p) => p.id === req.params.id && p.ownerId === req.auth!.sub);
  if (!property) {
    res.status(404).json({ error: 'Property not found or unauthorized' });
    return;
  }

  const nextArchived = !Boolean(property.isArchived);
  if (nextArchived) {
    const activeStay = state.stays.find(
      (s) => s.propertyId === property.id && s.status !== StayStatus.CHECKED_OUT
    );
    if (activeStay) {
      res.status(409).json({
        error: 'Cannot archive a property while active tenant stays exist. Complete checkouts first.',
      });
      return;
    }
  }

  const actor = state.users.find((u) => u.id === req.auth!.sub)!;
  property.isArchived = nextArchived;
  property.updatedAt = new Date().toISOString();

  db.recordActivity({
    ownerId: property.ownerId,
    propertyId: property.id,
    actorId: actor.id,
    actorName: actor.fullName,
    actorRole: actor.role,
    action: nextArchived ? 'PROPERTY_ARCHIVED' : 'PROPERTY_UNARCHIVED',
    entityType: 'PROPERTY',
    entityId: property.id,
    newValue: String(nextArchived),
  });

  db.persist();
  res.json({ property: enrichProperty(property, true) });
});

// Owner: Property compliance & rules documents
router.post('/owner/:id/documents', requireAuth, requireRole(UserRole.PG_OWNER), (req: AuthenticatedRequest, res) => {
  const state = db.getState();
  const property = state.properties.find((p) => p.id === req.params.id && p.ownerId === req.auth!.sub);
  if (!property) {
    res.status(404).json({ error: 'Property not found or unauthorized' });
    return;
  }

  const title = String(req.body?.title || '').trim();
  const docType = (req.body?.docType || 'OTHER') as any;
  const fileUrl = String(req.body?.fileUrl || 'https://storage.pgfinder.in/docs/property-doc.pdf').trim();
  if (title.length < 3) {
    res.status(400).json({ error: 'Document title is required' });
    return;
  }

  const doc = {
    id: `pdoc_${crypto.randomUUID().slice(0, 6)}`,
    propertyId: property.id,
    ownerId: property.ownerId,
    docType,
    title,
    fileUrl,
    status: DocumentVerificationStatus.PENDING,
    notes: String(req.body?.notes || ''),
    uploadedAt: new Date().toISOString(),
  };
  state.propertyDocuments.unshift(doc);
  db.persist();
  res.status(201).json({ document: doc });
});

router.delete('/owner/:id/documents/:docId', requireAuth, requireRole(UserRole.PG_OWNER), (req: AuthenticatedRequest, res) => {
  const state = db.getState();
  const idx = state.propertyDocuments.findIndex(
    (d) => d.id === req.params.docId && d.propertyId === req.params.id && d.ownerId === req.auth!.sub
  );
  if (idx === -1) {
    res.status(404).json({ error: 'Document not found' });
    return;
  }
  state.propertyDocuments.splice(idx, 1);
  db.persist();
  res.json({ ok: true });
});

// Owner: Resubmit property after corrections or reverification
router.post('/owner/:id/resubmit', requireAuth, requireRole(UserRole.PG_OWNER), (req: AuthenticatedRequest, res) => {
  const state = db.getState();
  const property = state.properties.find((p) => p.id === req.params.id);
  if (!property || property.ownerId !== req.auth!.sub) {
    res.status(404).json({ error: 'Property not found or unauthorized' });
    return;
  }

  const actor = state.users.find((u) => u.id === req.auth!.sub)!;
  const now = new Date().toISOString();

  if (
    property.approvalStatus === PropertyApprovalStatus.DRAFT ||
    property.approvalStatus === PropertyApprovalStatus.CORRECTIONS_REQUIRED
  ) {
    const prev = property.approvalStatus;
    property.approvalStatus =
      prev === PropertyApprovalStatus.DRAFT
        ? PropertyApprovalStatus.PENDING_APPROVAL
        : PropertyApprovalStatus.RESUBMITTED;
    property.approvalHistory.push({
      id: `app_${crypto.randomUUID().slice(0, 6)}`,
      actorId: actor.id,
      actorName: actor.fullName,
      previousStatus: prev,
      newStatus: property.approvalStatus,
      reason: String(req.body?.notes || 'Updated property details and resubmitted for review.'),
      timestamp: now,
    });
  }

  if (
    property.locationStatus === LocationVerificationStatus.DRAFT ||
    property.locationStatus === LocationVerificationStatus.CORRECTIONS_REQUIRED ||
    property.locationStatus === LocationVerificationStatus.REVERIFICATION_REQUIRED
  ) {
    const prevLoc = property.locationStatus;
    property.locationStatus =
      prevLoc === LocationVerificationStatus.DRAFT
        ? LocationVerificationStatus.PENDING_VERIFICATION
        : LocationVerificationStatus.RESUBMITTED;
    property.locationHistory.push({
      id: `loc_${crypto.randomUUID().slice(0, 6)}`,
      actorId: actor.id,
      actorName: actor.fullName,
      previousStatus: prevLoc,
      newStatus: property.locationStatus,
      notes: String(req.body?.notes || 'Resubmitted address and coordinates for verification.'),
      timestamp: now,
    });
  }

  property.updatedAt = now;
  db.recordActivity({
    ownerId: property.ownerId,
    propertyId: property.id,
    actorId: actor.id,
    actorName: actor.fullName,
    actorRole: actor.role,
    action: 'PROPERTY_RESUBMITTED',
    entityType: 'PROPERTY',
    entityId: property.id,
    newValue: `${property.approvalStatus} / ${property.locationStatus}`,
  });

  db.persist();
  res.json({ property: enrichProperty(property, true) });
});

// Super Admin: List all properties for review
router.get('/admin/all', requireAuth, requireRole(UserRole.SUPER_ADMIN), (_req, res) => {
  const state = db.getState();
  const list = state.properties.map((p) => {
    const owner = state.users.find((u) => u.id === p.ownerId);
    return {
      ...enrichProperty(p, true),
      ownerName: owner?.fullName || 'Unknown Owner',
      ownerEmail: owner?.email || '',
    };
  });
  res.json({ properties: list });
});

// Super Admin: Property approval workflow transition
router.post('/admin/:id/approval', requireAuth, requireRole(UserRole.SUPER_ADMIN), (req: AuthenticatedRequest, res) => {
  const state = db.getState();
  const property = state.properties.find((p) => p.id === req.params.id);
  if (!property) {
    res.status(404).json({ error: 'Property not found' });
    return;
  }

  const nextStatus = req.body?.status as PropertyApprovalStatus;
  const reason = String(req.body?.reason || '').trim();
  const allowedTargets = [
    PropertyApprovalStatus.UNDER_REVIEW,
    PropertyApprovalStatus.CORRECTIONS_REQUIRED,
    PropertyApprovalStatus.APPROVED,
    PropertyApprovalStatus.REJECTED,
    PropertyApprovalStatus.SUSPENDED,
  ];

  if (!allowedTargets.includes(nextStatus) || reason.length < 4) {
    res.status(400).json({ error: 'Valid target status and decision reason (min 4 chars) are required' });
    return;
  }

  const adminUser = state.users.find((u) => u.id === req.auth!.sub)!;
  const previousStatus = property.approvalStatus;
  const now = new Date().toISOString();

  property.approvalStatus = nextStatus;
  property.approvalReason = reason;
  property.updatedAt = now;
  property.approvalHistory.push({
    id: `app_${crypto.randomUUID().slice(0, 6)}`,
    actorId: adminUser.id,
    actorName: adminUser.fullName,
    previousStatus,
    newStatus: nextStatus,
    reason,
    timestamp: now,
  });

  state.auditLogs.unshift({
    id: `aud_${crypto.randomUUID().slice(0, 6)}`,
    actorId: adminUser.id,
    actorName: adminUser.fullName,
    actorRole: adminUser.role,
    action: `PROPERTY_${nextStatus}`,
    targetType: 'PROPERTY',
    targetId: property.id,
    details: `${property.name}: ${previousStatus} → ${nextStatus}. Reason: ${reason}`,
    createdAt: now,
  });

  state.notifications.unshift({
    id: `ntf_${crypto.randomUUID().slice(0, 6)}`,
    userId: property.ownerId,
    title: `Property Approval: ${nextStatus.replace(/_/g, ' ')}`,
    body: `${property.name} status updated to ${nextStatus.replace(/_/g, ' ')}. Notes: ${reason}`,
    category: 'PROPERTY_APPROVAL',
    read: false,
    createdAt: now,
  });

  db.persist();
  res.json({ property: enrichProperty(property, true) });
});

// Super Admin: Location verification workflow transition
router.post('/admin/:id/location-verify', requireAuth, requireRole(UserRole.SUPER_ADMIN), (req: AuthenticatedRequest, res) => {
  const state = db.getState();
  const property = state.properties.find((p) => p.id === req.params.id);
  if (!property) {
    res.status(404).json({ error: 'Property not found' });
    return;
  }

  const nextStatus = req.body?.status as LocationVerificationStatus;
  const notes = String(req.body?.notes || '').trim();
  const verifiedLat = req.body?.verifiedLat !== undefined ? Number(req.body.verifiedLat) : property.ownerLat;
  const verifiedLng = req.body?.verifiedLng !== undefined ? Number(req.body.verifiedLng) : property.ownerLng;

  const allowedTargets = [
    LocationVerificationStatus.UNDER_REVIEW,
    LocationVerificationStatus.CORRECTIONS_REQUIRED,
    LocationVerificationStatus.VERIFIED,
    LocationVerificationStatus.REJECTED,
    LocationVerificationStatus.REVERIFICATION_REQUIRED,
  ];

  if (!allowedTargets.includes(nextStatus) || notes.length < 4) {
    res.status(400).json({ error: 'Valid verification status and review notes are required' });
    return;
  }

  const adminUser = state.users.find((u) => u.id === req.auth!.sub)!;
  const previousStatus = property.locationStatus;
  const now = new Date().toISOString();

  property.locationStatus = nextStatus;
  property.locationNotes = notes;
  if (nextStatus === LocationVerificationStatus.VERIFIED) {
    property.verifiedLat = verifiedLat;
    property.verifiedLng = verifiedLng;
  }
  property.updatedAt = now;
  property.locationHistory.push({
    id: `loc_${crypto.randomUUID().slice(0, 6)}`,
    actorId: adminUser.id,
    actorName: adminUser.fullName,
    previousStatus,
    newStatus: nextStatus,
    notes,
    timestamp: now,
  });

  state.auditLogs.unshift({
    id: `aud_${crypto.randomUUID().slice(0, 6)}`,
    actorId: adminUser.id,
    actorName: adminUser.fullName,
    actorRole: adminUser.role,
    action: `LOCATION_${nextStatus}`,
    targetType: 'PROPERTY',
    targetId: property.id,
    details: `${property.name}: ${previousStatus} → ${nextStatus}. Notes: ${notes}`,
    createdAt: now,
  });

  state.notifications.unshift({
    id: `ntf_${crypto.randomUUID().slice(0, 6)}`,
    userId: property.ownerId,
    title: `Location Verification: ${nextStatus.replace(/_/g, ' ')}`,
    body: `${property.name} location check updated. ${notes}`,
    category: 'LOCATION_VERIFICATION',
    read: false,
    createdAt: now,
  });

  db.persist();
  res.json({ property: enrichProperty(property, true) });
});

export default router;
