import { Router } from 'express';
import crypto from 'crypto';
import {
  LocationVerificationStatus,
  PropertyApprovalStatus,
  SubscriptionStatus,
  SubscriptionTier,
  UserRole,
} from '../../../../../packages/shared/types';
import {
  BUSINESS_AD_PACKAGES,
  PROMOTION_PACKAGES,
  SUBSCRIPTION_PLANS,
} from '../../../../../packages/shared/constants';
import { createLocalAdSchema } from '../../../../../packages/shared/schemas';
import { db } from '../../shared/db';
import { AuthenticatedRequest, optionalAuth, requireAuth, requireRole } from '../../middleware/auth';

const router = Router();

router.get('/plans', (_req, res) => {
  res.json({
    plans: Object.values(SUBSCRIPTION_PLANS),
    promotionPackages: PROMOTION_PACKAGES,
    businessAdPackages: BUSINESS_AD_PACKAGES,
  });
});

router.get('/owner/billing', requireAuth, requireRole(UserRole.PG_OWNER), (req: AuthenticatedRequest, res) => {
  const state = db.getState();
  const ownerId = req.auth!.sub;
  const subscription = state.subscriptions.find((s) => s.ownerId === ownerId);
  const transactions = state.transactions.filter((t) => t.userId === ownerId);
  const properties = state.properties.filter((p) => p.ownerId === ownerId);
  res.json({ subscription, transactions, properties });
});

// Change owner subscription tier (Basic / Pro / Business)
router.post('/owner/subscribe', requireAuth, requireRole(UserRole.PG_OWNER), (req: AuthenticatedRequest, res) => {
  const tier = req.body?.tier as SubscriptionTier;
  if (!Object.values(SubscriptionTier).includes(tier)) {
    res.status(400).json({ error: 'Invalid subscription tier. Allowed: BASIC, PRO, BUSINESS.' });
    return;
  }

  const state = db.getState();
  const ownerId = req.auth!.sub;
  const plan = SUBSCRIPTION_PLANS[tier];
  const now = new Date();
  const renewalDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  let sub = state.subscriptions.find((s) => s.ownerId === ownerId);
  if (!sub) {
    sub = {
      ownerId,
      tier,
      status: SubscriptionStatus.ACTIVE,
      renewalDate,
      maxListings: plan.maxActiveListings ?? 0,
    };
    state.subscriptions.push(sub);
  } else {
    sub.tier = tier;
    sub.status = SubscriptionStatus.ACTIVE;
    sub.renewalDate = renewalDate;
    sub.maxListings = plan.maxActiveListings ?? 0;
  }

  // Enforce listing limits cleanly while preserving previously purchased lifetime listings
  const ownerProps = state.properties.filter((p) => p.ownerId === ownerId);
  let coveredCount = 0;
  for (const prop of ownerProps) {
    if (tier === SubscriptionTier.BASIC) {
      prop.coveredBySubscription = false;
    } else if (coveredCount < (plan.maxActiveListings ?? 0)) {
      prop.coveredBySubscription = true;
      coveredCount += 1;
    } else {
      prop.coveredBySubscription = false;
    }
  }

  if (plan.monthlyPriceInr > 0) {
    state.transactions.unshift({
      id: `txn_${crypto.randomUUID().slice(0, 8)}`,
      userId: ownerId,
      type: 'SUBSCRIPTION',
      amountInr: plan.monthlyPriceInr,
      provider: 'demo_gateway',
      status: 'SUCCEEDED',
      description: `${plan.name} Plan Subscription (${plan.maxActiveListings} listings)`,
      createdAt: now.toISOString(),
    });
  }

  db.persist();
  res.json({ subscription: sub, properties: ownerProps });
});

// Purchase ₹199 one-time lifetime listing for a specific property
router.post('/owner/lifetime-listing/:propertyId', requireAuth, requireRole(UserRole.PG_OWNER), (req: AuthenticatedRequest, res) => {
  const state = db.getState();
  const property = state.properties.find(
    (p) => p.id === req.params.propertyId && p.ownerId === req.auth!.sub
  );
  if (!property) {
    res.status(404).json({ error: 'Property not found or unauthorized' });
    return;
  }
  if (property.hasLifetimeListing) {
    res.status(409).json({ error: 'This property already has an active lifetime listing right.' });
    return;
  }
  if (
    property.approvalStatus !== PropertyApprovalStatus.APPROVED ||
    property.locationStatus !== LocationVerificationStatus.VERIFIED
  ) {
    res.status(400).json({
      error: 'Lifetime listing activation requires both Super Admin property approval and location verification.',
    });
    return;
  }

  property.hasLifetimeListing = true;
  state.transactions.unshift({
    id: `txn_${crypto.randomUUID().slice(0, 8)}`,
    userId: req.auth!.sub,
    propertyId: property.id,
    type: 'LIFETIME_LISTING',
    amountInr: 199,
    provider: 'demo_gateway',
    status: 'SUCCEEDED',
    description: `One-time Lifetime Listing — ${property.name}`,
    createdAt: new Date().toISOString(),
  });
  db.persist();
  res.json({ property });
});

// Purchase Featured PG Promotion
router.post('/owner/promote/:propertyId', requireAuth, requireRole(UserRole.PG_OWNER), (req: AuthenticatedRequest, res) => {
  const state = db.getState();
  const property = state.properties.find(
    (p) => p.id === req.params.propertyId && p.ownerId === req.auth!.sub
  );
  if (!property) {
    res.status(404).json({ error: 'Property not found' });
    return;
  }
  if (
    property.approvalStatus !== PropertyApprovalStatus.APPROVED ||
    property.locationStatus !== LocationVerificationStatus.VERIFIED
  ) {
    res.status(400).json({
      error: 'Featured placement cannot override approval or location verification requirements.',
    });
    return;
  }

  const pkg = PROMOTION_PACKAGES.find((p: { id: string }) => p.id === req.body?.packageId);
  if (!pkg) {
    res.status(400).json({ error: 'Select a valid promotion package' });
    return;
  }

  const endsAt = new Date(Date.now() + pkg.days * 24 * 60 * 60 * 1000).toISOString();
  property.isPromoted = true;
  property.promotionEndsAt = endsAt;

  state.transactions.unshift({
    id: `txn_${crypto.randomUUID().slice(0, 8)}`,
    userId: req.auth!.sub,
    propertyId: property.id,
    type: 'FEATURED_PROMOTION',
    amountInr: pkg.priceInr,
    provider: 'demo_gateway',
    status: 'SUCCEEDED',
    description: `${pkg.label} Featured Promotion — ${property.name}`,
    createdAt: new Date().toISOString(),
  });

  db.persist();
  res.json({ property });
});

// Local Business Discovery & Sponsored Ads
router.get('/local-businesses', optionalAuth, (req: AuthenticatedRequest, res) => {
  const { city, locality, category, q, includeAll } = req.query;
  let items = [...db.getState().localBusinesses];
  if (!(includeAll === 'true' && req.auth?.role === UserRole.SUPER_ADMIN)) {
    items = items.filter((b) => (b.status || 'ACTIVE') === 'ACTIVE');
  }
  if (city && city !== 'ALL') {
    items = items.filter((b) => b.city.toLowerCase() === String(city).toLowerCase());
  }
  if (locality) {
    items = items.filter((b) => b.locality.toLowerCase().includes(String(locality).toLowerCase()));
  }
  if (category && category !== 'ALL') {
    items = items.filter((b) => b.category === String(category));
  }
  if (q) {
    const query = String(q).toLowerCase();
    items = items.filter(
      (b) =>
        b.name.toLowerCase().includes(query) ||
        b.title.toLowerCase().includes(query) ||
        b.description.toLowerCase().includes(query) ||
        b.locality.toLowerCase().includes(query)
    );
  }
  items.sort((a, b) => Number(b.isSponsored) - Number(a.isSponsored));
  res.json({ businesses: items });
});

router.post('/local-businesses/:id/click', (req, res) => {
  const biz = db.getState().localBusinesses.find((b) => b.id === req.params.id);
  if (biz) {
    biz.clicks += 1;
    db.persist();
  }
  res.json({ ok: true });
});

router.post('/admin/local-businesses', requireAuth, requireRole(UserRole.SUPER_ADMIN), (req: AuthenticatedRequest, res) => {
  const parsed = createLocalAdSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid local ad payload' });
    return;
  }
  const state = db.getState();
  const admin = state.users.find((u) => u.id === req.auth!.sub)!;
  const biz = {
    id: `loc_biz_${crypto.randomUUID().slice(0, 6)}`,
    name: parsed.data.name.trim(),
    category: parsed.data.category,
    title: parsed.data.title.trim(),
    description: parsed.data.description.trim(),
    city: parsed.data.city.trim(),
    locality: parsed.data.locality.trim(),
    offerText: parsed.data.offerText.trim(),
    isSponsored: parsed.data.isSponsored,
    status: parsed.data.status || ('ACTIVE' as const),
    packageLabel: parsed.data.packageLabel || 'City Featured Card',
    clicks: 0,
    impressions: 1,
  };
  state.localBusinesses.unshift(biz);
  state.auditLogs.unshift({
    id: `aud_${crypto.randomUUID().slice(0, 6)}`,
    actorId: admin.id,
    actorName: admin.fullName,
    actorRole: admin.role,
    action: 'LOCAL_AD_CREATED',
    targetType: 'LOCAL_BUSINESS',
    targetId: biz.id,
    details: `${biz.name} (${biz.category} · ${biz.locality}, ${biz.city})`,
    createdAt: new Date().toISOString(),
  });
  db.persist();
  res.status(201).json({ business: biz });
});

router.patch('/admin/local-businesses/:id', requireAuth, requireRole(UserRole.SUPER_ADMIN), (req: AuthenticatedRequest, res) => {
  const state = db.getState();
  const biz = state.localBusinesses.find((b) => b.id === req.params.id);
  if (!biz) {
    res.status(404).json({ error: 'Local business listing not found' });
    return;
  }
  if (req.body?.status && ['ACTIVE', 'PAUSED', 'PENDING_APPROVAL'].includes(req.body.status)) {
    biz.status = req.body.status;
  }
  if (typeof req.body?.isSponsored === 'boolean') biz.isSponsored = req.body.isSponsored;
  if (req.body?.offerText) biz.offerText = String(req.body.offerText).trim();
  if (req.body?.title) biz.title = String(req.body.title).trim();
  const admin = state.users.find((u) => u.id === req.auth!.sub)!;
  state.auditLogs.unshift({
    id: `aud_${crypto.randomUUID().slice(0, 6)}`,
    actorId: admin.id,
    actorName: admin.fullName,
    actorRole: admin.role,
    action: 'LOCAL_AD_UPDATED',
    targetType: 'LOCAL_BUSINESS',
    targetId: biz.id,
    details: `${biz.name} status=${biz.status || 'ACTIVE'}, sponsored=${biz.isSponsored}`,
    createdAt: new Date().toISOString(),
  });
  db.persist();
  res.json({ business: biz });
});

router.post('/admin/transactions/:id/refund', requireAuth, requireRole(UserRole.SUPER_ADMIN), (req: AuthenticatedRequest, res) => {
  const state = db.getState();
  const txn = state.transactions.find((t) => t.id === req.params.id);
  if (!txn) {
    res.status(404).json({ error: 'Transaction not found' });
    return;
  }
  const admin = state.users.find((u) => u.id === req.auth!.sub)!;
  txn.status = 'FAILED';
  txn.description = `${txn.description} (Refunded by Admin)`;
  state.auditLogs.unshift({
    id: `aud_${crypto.randomUUID().slice(0, 6)}`,
    actorId: admin.id,
    actorName: admin.fullName,
    actorRole: admin.role,
    action: 'PLATFORM_TRANSACTION_REFUNDED',
    targetType: 'TRANSACTION',
    targetId: txn.id,
    details: `Marked ${txn.id} (₹${txn.amountInr}) refunded in platform billing ledger.`,
    createdAt: new Date().toISOString(),
  });
  db.persist();
  res.json({ transaction: txn });
});

router.get('/admob/config', (_req, res) => {
  res.json({ settings: db.getState().admobSettings });
});

router.post('/admin/admob/config', requireAuth, requireRole(UserRole.SUPER_ADMIN), (req: AuthenticatedRequest, res) => {
  const state = db.getState();
  const current = state.admobSettings;
  state.admobSettings = {
    ...current,
    ...req.body,
    dailyInterstitialCap: Math.max(0, Math.min(10, Number(req.body?.dailyInterstitialCap ?? current.dailyInterstitialCap))),
    // Always enforce ad-free checkout/payments
    adFreeCheckoutAndPayments: true,
  };
  const admin = state.users.find((u) => u.id === req.auth!.sub)!;
  state.auditLogs.unshift({
    id: `aud_${crypto.randomUUID().slice(0, 6)}`,
    actorId: admin.id,
    actorName: admin.fullName,
    actorRole: admin.role,
    action: 'ADMOB_CONFIG_UPDATED',
    targetType: 'SYSTEM_CONFIG',
    targetId: 'admob',
    details: `Mode=${state.admobSettings.environment}, Enabled=${state.admobSettings.enabled}, Cap=${state.admobSettings.dailyInterstitialCap}`,
    createdAt: new Date().toISOString(),
  });
  db.persist();
  res.json({ settings: state.admobSettings });
});

export default router;
