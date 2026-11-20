import { Router } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import {
  SubscriptionStatus,
  SubscriptionTier,
  UserRole,
} from '../../../../../packages/shared/types';
import { changePasswordSchema, loginSchema, registerSchema, updateProfileSchema } from '../../../../../packages/shared/schemas';
import { db, StoredUser } from '../../shared/db';
import {
  AuthenticatedRequest,
  requireAuth,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../../middleware/auth';

const router = Router();

const DEFAULT_NOTIF_PREFS = {
  emailAlerts: true,
  smsAlerts: true,
  joiningRequests: true,
  rentReminders: true,
  maintenanceAlerts: true,
};

const DEFAULT_PRIVACY = {
  showBusinessPhonePublicly: true,
  showEmailPublicly: true,
};

function toPublicUser(u: StoredUser) {
  return {
    id: u.id,
    fullName: u.fullName,
    email: u.email,
    phone: u.phone,
    role: u.role,
    isVerified: u.isVerified,
    isSuspended: u.isSuspended,
    businessName: u.businessName,
    businessDescription: u.businessDescription,
    city: u.city,
    avatarUrl: u.avatarUrl,
    language: u.language || 'en',
    notificationPreferences: u.notificationPreferences || DEFAULT_NOTIF_PREFS,
    privacySettings: u.privacySettings || DEFAULT_PRIVACY,
    occupationStatus: u.occupationStatus,
    emergencyContactName: u.emergencyContactName,
    emergencyContactPhone: u.emergencyContactPhone,
    consentPersonalizedAds: Boolean(u.consentPersonalizedAds),
    deletionRequestedAt: u.deletionRequestedAt || null,
    createdAt: u.createdAt,
  };
}

function parseDeviceLabel(req: any): string {
  const ua = String(req?.headers?.['user-agent'] || 'Web Browser');
  if (/iPhone|iPad|iOS/i.test(ua)) return 'iOS Mobile Browser';
  if (/Android/i.test(ua)) return 'Android Mobile Browser';
  if (/Macintosh|Mac OS/i.test(ua)) return 'macOS Desktop Browser';
  if (/Windows/i.test(ua)) return 'Windows Desktop Browser';
  if (/Linux/i.test(ua)) return 'Linux Browser';
  return 'Web Session';
}

function issueSession(user: StoredUser, res: any, req?: any) {
  const jti = crypto.randomUUID();
  const accessToken = signAccessToken({ sub: user.id, role: user.role, email: user.email });
  const refreshToken = signRefreshToken({ sub: user.id, role: user.role, email: user.email, jti });
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

  db.getState().sessions.push({
    id: jti,
    userId: user.id,
    tokenHash,
    deviceLabel: parseDeviceLabel(req),
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    revoked: false,
  });
  db.persist();

  res.cookie('pgfinder_refresh', refreshToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return accessToken;
}

router.post('/login', (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid credentials format' });
    return;
  }

  const key = parsed.data.identifier.trim().toLowerCase();
  const now = Date.now();
  const attempt = db.loginAttempts.get(key);
  if (attempt && attempt.resetAt > now && attempt.count >= 10) {
    res.status(429).json({ error: 'Too many login attempts. Please try again in a few minutes.' });
    return;
  }

  const user = db
    .getState()
    .users.find((u) => u.email.toLowerCase() === key || u.phone === key);

  if (!user || !bcrypt.compareSync(parsed.data.password, user.passwordHash)) {
    const nextCount = attempt && attempt.resetAt > now ? attempt.count + 1 : 1;
    db.loginAttempts.set(key, { count: nextCount, resetAt: now + 5 * 60 * 1000 });
    res.status(401).json({ error: 'Invalid email/phone or password' });
    return;
  }

  if (user.isSuspended) {
    res.status(403).json({ error: 'Your account has been suspended. Contact PG Finder support.' });
    return;
  }

  db.loginAttempts.delete(key);
  const accessToken = issueSession(user, res, req);
  res.json({ accessToken, user: toPublicUser(user) });
});

router.post('/register', (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Validation failed' });
    return;
  }

  // Strictly block public Super Admin registration
  if ((req.body?.role as string) === UserRole.SUPER_ADMIN) {
    res.status(403).json({ error: 'Super Admin accounts cannot be publicly registered.' });
    return;
  }

  const state = db.getState();
  const emailLower = parsed.data.email.trim().toLowerCase();
  const existing = state.users.find(
    (u) => u.email.toLowerCase() === emailLower || u.phone === parsed.data.phone
  );
  if (existing) {
    res.status(409).json({ error: 'An account with this email or phone number already exists' });
    return;
  }

  const newUser: StoredUser = {
    id: `usr_${crypto.randomUUID().slice(0, 8)}`,
    fullName: parsed.data.fullName.trim(),
    email: emailLower,
    phone: parsed.data.phone.trim(),
    passwordHash: bcrypt.hashSync(parsed.data.password, 8),
    role: parsed.data.role,
    isVerified: false,
    isSuspended: false,
    businessName: parsed.data.role === UserRole.PG_OWNER ? parsed.data.businessName?.trim() : undefined,
    city: 'Hyderabad',
    createdAt: new Date().toISOString(),
  };

  state.users.push(newUser);

  // Owners immediately start on BASIC plan and do NOT require Super Admin account approval
  if (newUser.role === UserRole.PG_OWNER) {
    state.subscriptions.push({
      ownerId: newUser.id,
      tier: SubscriptionTier.BASIC,
      status: SubscriptionStatus.ACTIVE,
      renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      maxListings: 0,
    });
  }

  // Generate 6-digit OTP challenge for verification workflow (rate-limited)
  const otpCode = '482910'; // Deterministic dev OTP alongside challenge state
  db.otpStore.set(newUser.email, {
    identifier: newUser.email,
    code: otpCode,
    expiresAt: Date.now() + 10 * 60 * 1000,
    attempts: 0,
    lastSentAt: Date.now(),
  });

  db.persist();
  const accessToken = issueSession(newUser, res, req);

  res.status(201).json({
    accessToken,
    user: toPublicUser(newUser),
    otpRequired: true,
    devOtpHint: '482910',
  });
});

router.post('/otp/send', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = db.getState().users.find((u) => u.id === req.auth!.sub);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  const existing = db.otpStore.get(user.email);
  if (existing && Date.now() - existing.lastSentAt < 20_000) {
    res.status(429).json({ error: 'Please wait 20 seconds before requesting another OTP.' });
    return;
  }
  db.otpStore.set(user.email, {
    identifier: user.email,
    code: '482910',
    expiresAt: Date.now() + 10 * 60 * 1000,
    attempts: 0,
    lastSentAt: Date.now(),
  });
  res.json({ sent: true, devOtpHint: '482910' });
});

router.post('/otp/verify', requireAuth, (req: AuthenticatedRequest, res) => {
  const code = String(req.body?.code || '').trim();
  const user = db.getState().users.find((u) => u.id === req.auth!.sub);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  const challenge = db.otpStore.get(user.email);
  if (!challenge || challenge.expiresAt < Date.now()) {
    res.status(400).json({ error: 'OTP expired. Request a new code.' });
    return;
  }
  if (challenge.attempts >= 5) {
    res.status(429).json({ error: 'Too many invalid attempts. Request a fresh OTP.' });
    return;
  }
  if (challenge.code !== code) {
    challenge.attempts += 1;
    res.status(400).json({ error: 'Invalid verification code' });
    return;
  }

  user.isVerified = true;
  db.otpStore.delete(user.email);
  db.persist();
  res.json({ verified: true, user: toPublicUser(user) });
});

router.post('/refresh', (req, res) => {
  const token = req.cookies?.pgfinder_refresh;
  if (!token) {
    res.status(401).json({ error: 'No refresh session' });
    return;
  }
  const decoded = verifyRefreshToken(token);
  if (!decoded) {
    res.status(401).json({ error: 'Invalid refresh token' });
    return;
  }
  const state = db.getState();
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const session = state.sessions.find((s) => s.id === decoded.jti && s.tokenHash === tokenHash && !s.revoked);
  if (!session) {
    res.status(401).json({ error: 'Session revoked or rotated' });
    return;
  }
  const user = state.users.find((u) => u.id === decoded.sub && !u.isSuspended);
  if (!user) {
    res.status(401).json({ error: 'User unavailable' });
    return;
  }
  // Rotate refresh token
  session.revoked = true;
  const accessToken = issueSession(user, res, req);
  res.json({ accessToken, user: toPublicUser(user) });
});

router.post('/logout', (req, res) => {
  const token = req.cookies?.pgfinder_refresh;
  if (token) {
    const decoded = verifyRefreshToken(token);
    if (decoded) {
      const session = db.getState().sessions.find((s) => s.id === decoded.jti);
      if (session) {
        session.revoked = true;
        db.persist();
      }
    }
  }
  res.clearCookie('pgfinder_refresh');
  res.json({ ok: true });
});

router.get('/me', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = db.getState().users.find((u) => u.id === req.auth!.sub);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json({ user: toPublicUser(user) });
});

router.post('/password-reset/request', (req, res) => {
  const identifier = String(req.body?.identifier || '').trim().toLowerCase();
  if (!identifier) {
    res.status(400).json({ error: 'Provide your registered email or phone number' });
    return;
  }
  res.json({
    sent: true,
    message: 'If an account matches this email or phone, password recovery instructions have been dispatched.',
  });
});

// Update profile & preferences (Owner or Tenant)
router.patch('/profile', requireAuth, (req: AuthenticatedRequest, res) => {
  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid profile update' });
    return;
  }
  const state = db.getState();
  const user = state.users.find((u) => u.id === req.auth!.sub);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  const d = parsed.data;
  if (d.fullName !== undefined) user.fullName = d.fullName.trim();
  if (d.businessName !== undefined) user.businessName = d.businessName.trim();
  if (d.businessDescription !== undefined) user.businessDescription = d.businessDescription.trim();
  if (d.city !== undefined) user.city = d.city.trim();
  if (d.avatarUrl !== undefined) user.avatarUrl = d.avatarUrl.trim() || undefined;
  if (d.language !== undefined) user.language = d.language.trim();
  if (d.occupationStatus !== undefined) user.occupationStatus = d.occupationStatus;
  if (d.emergencyContactName !== undefined) user.emergencyContactName = d.emergencyContactName.trim();
  if (d.emergencyContactPhone !== undefined) user.emergencyContactPhone = d.emergencyContactPhone.trim();
  if (d.consentPersonalizedAds !== undefined) user.consentPersonalizedAds = d.consentPersonalizedAds;
  if (d.notificationPreferences !== undefined) user.notificationPreferences = d.notificationPreferences;
  if (d.privacySettings !== undefined) user.privacySettings = d.privacySettings;

  if (user.role === UserRole.PG_OWNER) {
    db.recordActivity({
      ownerId: user.id,
      actorId: user.id,
      actorName: user.fullName,
      actorRole: user.role,
      action: 'PROFILE_UPDATED',
      entityType: 'USER',
      entityId: user.id,
      newValue: `${user.fullName} (${user.businessName || 'Owner'})`,
    });
  }
  db.persist();
  res.json({ user: toPublicUser(user) });
});

// Verified email or mobile number change request (issues OTP challenge)
router.post('/profile/contact-change/request', requireAuth, (req: AuthenticatedRequest, res) => {
  const field = req.body?.field === 'phone' ? 'phone' : 'email';
  const newValue = String(req.body?.value || '').trim();
  const state = db.getState();
  const user = state.users.find((u) => u.id === req.auth!.sub);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  if (field === 'email') {
    const emailLower = newValue.toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLower)) {
      res.status(400).json({ error: 'Enter a valid email address' });
      return;
    }
    if (state.users.some((u) => u.id !== user.id && u.email.toLowerCase() === emailLower)) {
      res.status(409).json({ error: 'Email is already registered to another account' });
      return;
    }
  } else {
    if (!/^[6-9]\d{9}$/.test(newValue)) {
      res.status(400).json({ error: 'Enter a valid 10-digit Indian mobile number' });
      return;
    }
    if (state.users.some((u) => u.id !== user.id && u.phone === newValue)) {
      res.status(409).json({ error: 'Mobile number is already registered to another account' });
      return;
    }
  }

  const key = `contact_change:${user.id}:${field}:${newValue.toLowerCase()}`;
  db.otpStore.set(key, {
    identifier: key,
    code: '482910',
    expiresAt: Date.now() + 10 * 60 * 1000,
    attempts: 0,
    lastSentAt: Date.now(),
  });
  res.json({ sent: true, field, value: newValue, devOtpHint: '482910' });
});

router.post('/profile/contact-change/verify', requireAuth, (req: AuthenticatedRequest, res) => {
  const field = req.body?.field === 'phone' ? 'phone' : 'email';
  const newValue = String(req.body?.value || '').trim();
  const code = String(req.body?.code || '').trim();
  const state = db.getState();
  const user = state.users.find((u) => u.id === req.auth!.sub);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const key = `contact_change:${user.id}:${field}:${newValue.toLowerCase()}`;
  const challenge = db.otpStore.get(key);
  if (!challenge || challenge.expiresAt < Date.now()) {
    res.status(400).json({ error: 'Verification code expired. Request a new code.' });
    return;
  }
  if (challenge.code !== code) {
    challenge.attempts += 1;
    res.status(400).json({ error: 'Invalid verification code' });
    return;
  }

  const prev = field === 'email' ? user.email : user.phone;
  if (field === 'email') user.email = newValue.toLowerCase();
  else user.phone = newValue;
  user.isVerified = true;
  db.otpStore.delete(key);

  if (user.role === UserRole.PG_OWNER) {
    db.recordActivity({
      ownerId: user.id,
      actorId: user.id,
      actorName: user.fullName,
      actorRole: user.role,
      action: field === 'email' ? 'EMAIL_VERIFIED_CHANGE' : 'PHONE_VERIFIED_CHANGE',
      entityType: 'USER',
      entityId: user.id,
      previousValue: prev,
      newValue,
    });
  }
  db.persist();
  res.json({ user: toPublicUser(user) });
});

// Change password (requires valid current password)
router.post('/password/change', requireAuth, (req: AuthenticatedRequest, res) => {
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid password payload' });
    return;
  }
  const state = db.getState();
  const user = state.users.find((u) => u.id === req.auth!.sub);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  if (!bcrypt.compareSync(parsed.data.currentPassword, user.passwordHash)) {
    res.status(400).json({ error: 'Current password is incorrect' });
    return;
  }
  user.passwordHash = bcrypt.hashSync(parsed.data.newPassword, 8);
  if (user.role === UserRole.PG_OWNER) {
    db.recordActivity({
      ownerId: user.id,
      actorId: user.id,
      actorName: user.fullName,
      actorRole: user.role,
      action: 'PASSWORD_CHANGED',
      entityType: 'USER',
      entityId: user.id,
      newValue: 'Password updated securely',
    });
  }
  db.persist();
  res.json({ ok: true, message: 'Password updated successfully.' });
});

// Active sessions & revoke other devices
router.get('/sessions', requireAuth, (req: AuthenticatedRequest, res) => {
  const state = db.getState();
  const currentCookie = req.cookies?.pgfinder_refresh;
  const currentDecoded = currentCookie ? verifyRefreshToken(currentCookie) : null;
  const nowMs = Date.now();

  const sessions = state.sessions
    .filter((s) => s.userId === req.auth!.sub && !s.revoked && new Date(s.expiresAt).getTime() > nowMs)
    .map((s) => ({
      id: s.id,
      deviceLabel: s.deviceLabel || 'Web Session',
      createdAt: s.createdAt || new Date().toISOString(),
      expiresAt: s.expiresAt,
      isCurrent: Boolean(currentDecoded && currentDecoded.jti === s.id),
    }));

  res.json({ sessions });
});

router.post('/sessions/revoke-others', requireAuth, (req: AuthenticatedRequest, res) => {
  const state = db.getState();
  const currentCookie = req.cookies?.pgfinder_refresh;
  const currentDecoded = currentCookie ? verifyRefreshToken(currentCookie) : null;
  let revokedCount = 0;

  state.sessions.forEach((s) => {
    if (s.userId === req.auth!.sub && !s.revoked) {
      if (!currentDecoded || s.id !== currentDecoded.jti) {
        s.revoked = true;
        revokedCount += 1;
      }
    }
  });
  db.persist();
  res.json({ ok: true, revokedCount });
});

// Non-destructive Account Deletion Request (preserves legal & financial ledger integrity)
router.post('/account/delete-request', requireAuth, (req: AuthenticatedRequest, res) => {
  const state = db.getState();
  const user = state.users.find((u) => u.id === req.auth!.sub);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  const password = String(req.body?.password || '');
  if (!password || !bcrypt.compareSync(password, user.passwordHash)) {
    res.status(400).json({ error: 'Enter your current password to confirm account deletion request.' });
    return;
  }
  const reason = String(req.body?.reason || 'User requested account closure').trim();
  const now = new Date().toISOString();
  user.deletionRequestedAt = now;

  state.auditLogs.unshift({
    id: `aud_${crypto.randomUUID().slice(0, 6)}`,
    actorId: user.id,
    actorName: user.fullName,
    actorRole: user.role,
    action: 'ACCOUNT_DELETION_REQUESTED',
    targetType: 'USER',
    targetId: user.id,
    details: `${user.email} submitted deletion request (${reason}). Financial & stay records preserved for statutory retention.`,
    createdAt: now,
  });

  state.notifications.unshift({
    id: `ntf_${crypto.randomUUID().slice(0, 6)}`,
    userId: user.id,
    title: 'Account Deletion Request Logged',
    body: 'Your account deletion request has been queued for compliance & financial settlement review. No active financial or stay ledgers were erased.',
    category: 'ACCOUNT',
    read: false,
    createdAt: now,
  });

  if (user.role === UserRole.PG_OWNER) {
    db.recordActivity({
      ownerId: user.id,
      actorId: user.id,
      actorName: user.fullName,
      actorRole: user.role,
      action: 'ACCOUNT_DELETION_REQUESTED',
      entityType: 'USER',
      entityId: user.id,
      newValue: reason,
    });
  }

  db.persist();
  res.json({ ok: true, user: toPublicUser(user) });
});

export default router;
