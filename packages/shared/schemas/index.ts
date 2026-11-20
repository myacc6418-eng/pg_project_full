import { z } from 'zod';
import { ExpenseCategory, PropertyGenderType, UserRole } from '../types';

export const loginSchema = z.object({
  identifier: z.string().min(3, 'Enter your email or phone number'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  rememberMe: z.boolean().optional(),
});

export const registerSchema = z
  .object({
    role: z.enum([UserRole.TENANT, UserRole.PG_OWNER]),
    fullName: z.string().min(2, 'Full name is required'),
    email: z.string().email('Enter a valid email address'),
    phone: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
    businessName: z.string().optional(),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(6, 'Confirm your password'),
    acceptTerms: z.literal(true, {
      message: 'You must accept the terms & privacy policy',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const createPropertySchema = z.object({
  name: z.string().min(3, 'Property name is required'),
  description: z.string().min(15, 'Add a brief description (at least 15 characters)'),
  genderType: z.nativeEnum(PropertyGenderType),
  address: z.string().min(6, 'Complete street address is required'),
  landmark: z.string().min(2, 'Nearby landmark is required'),
  locality: z.string().min(2, 'Locality is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  postalCode: z.string().regex(/^\d{6}$/, 'Enter a valid 6-digit PIN code'),
  googleMapsUrl: z.string().url('Enter a valid URL').optional().or(z.literal('')),
  ownerLat: z.coerce.number().min(-90).max(90),
  ownerLng: z.coerce.number().min(-180).max(180),
  startingRentInr: z.coerce.number().int().min(1500, 'Minimum rent ₹1,500'),
  securityDepositInr: z.coerce.number().int().min(0),
  amenities: z.array(z.string()).min(1, 'Select at least 1 amenity'),
  rules: z.array(z.string()).min(1, 'Specify at least 1 house rule'),
  submitImmediately: z.boolean().optional(),
});

export const updatePropertySchema = z.object({
  name: z.string().min(3).optional(),
  description: z.string().min(10).optional(),
  genderType: z.nativeEnum(PropertyGenderType).optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal('')),
  address: z.string().min(6).optional(),
  landmark: z.string().min(2).optional(),
  locality: z.string().min(2).optional(),
  city: z.string().min(2).optional(),
  state: z.string().min(2).optional(),
  postalCode: z.string().regex(/^\d{6}$/).optional(),
  googleMapsUrl: z.string().optional(),
  ownerLat: z.coerce.number().min(-90).max(90).optional(),
  ownerLng: z.coerce.number().min(-180).max(180).optional(),
  startingRentInr: z.coerce.number().int().min(1000).optional(),
  securityDepositInr: z.coerce.number().int().min(0).optional(),
  amenities: z.array(z.string()).optional(),
  rules: z.array(z.string()).optional(),
  images: z.array(z.string()).optional(),
  extraCharges: z
    .array(
      z.object({
        id: z.string(),
        title: z.string().min(2),
        amountInr: z.coerce.number().int().min(0),
        frequency: z.enum(['MONTHLY', 'ONE_TIME']),
      })
    )
    .optional(),
});

export const createExpenseSchema = z.object({
  propertyId: z.string().min(1, 'Select a property'),
  category: z.nativeEnum(ExpenseCategory),
  amountInr: z.coerce.number().int().min(1, 'Amount must be at least ₹1'),
  date: z.string().min(4),
  notes: z.string().min(2, 'Add expense notes'),
});

export const createJoiningRequestSchema = z.object({
  propertyId: z.string().min(1),
  preferredRoomType: z.enum(['SINGLE', 'TWIN', 'TRIPLE', 'FOUR_SHARING']),
  moveInDate: z.string().min(4),
  notes: z.string().max(400).optional(),
  origin: z.enum(['DIRECT', 'QR']).optional(),
  consentAccepted: z.boolean().optional(),
});

export const updateProfileSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').optional(),
  businessName: z.string().max(120).optional(),
  businessDescription: z.string().max(500).optional(),
  city: z.string().max(80).optional(),
  avatarUrl: z.string().max(500).optional(),
  language: z.string().max(20).optional(),
  occupationStatus: z.enum(['STUDENT', 'WORKING_PROFESSIONAL', 'FOUNDER', 'OTHER']).optional(),
  emergencyContactName: z.string().max(100).optional(),
  emergencyContactPhone: z.string().max(20).optional(),
  consentPersonalizedAds: z.boolean().optional(),
  notificationPreferences: z
    .object({
      emailAlerts: z.boolean(),
      smsAlerts: z.boolean(),
      joiningRequests: z.boolean(),
      rentReminders: z.boolean(),
      maintenanceAlerts: z.boolean(),
    })
    .optional(),
  privacySettings: z
    .object({
      showBusinessPhonePublicly: z.boolean(),
      showEmailPublicly: z.boolean(),
    })
    .optional(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(6, 'New password must be at least 6 characters'),
    confirmPassword: z.string().min(6),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'New passwords do not match',
    path: ['confirmPassword'],
  });

export const createComplaintSchema = z.object({
  category: z.enum(['PLUMBING', 'ELECTRICAL', 'INTERNET', 'CLEANING', 'FOOD', 'SECURITY', 'OTHER']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  description: z.string().min(8, 'Describe the issue in at least 8 characters'),
  photoUrl: z.string().max(500).optional().or(z.literal('')),
});

export const createEventSchema = z.object({
  title: z.string().min(4, 'Event title is required'),
  category: z.string().min(2),
  city: z.string().min(2),
  venue: z.string().min(3),
  dateTime: z.string().min(4),
  organizer: z.string().min(2),
  description: z.string().min(12),
  capacity: z.coerce.number().int().min(5).max(5000),
  isFree: z.boolean(),
  externalRegistrationUrl: z.string().url().optional().or(z.literal('')),
  publishNow: z.boolean().optional(),
  scheduledPublishAt: z.string().optional().nullable(),
});

export const updateEventSchema = createEventSchema.partial();

export const createSupportTicketSchema = z.object({
  subject: z.string().min(4, 'Enter a concise ticket subject'),
  category: z.enum(['DISPUTE', 'PAYMENT', 'ACCOUNT', 'LISTING', 'SAFETY', 'OTHER']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
  message: z.string().min(10, 'Provide clear details (min 10 characters)'),
  propertyId: z.string().optional(),
});

export const createLocalAdSchema = z.object({
  name: z.string().min(2),
  category: z.enum([
    'Affordable Food',
    'Groceries',
    'Laundry',
    'Fitness',
    'Local Services',
    'Transportation',
    'Daily Essentials',
    'Nearby Deals',
  ]),
  title: z.string().min(4),
  description: z.string().min(8),
  city: z.string().min(2),
  locality: z.string().min(2),
  offerText: z.string().min(3),
  isSponsored: z.boolean().default(true),
  packageLabel: z.string().optional(),
  status: z.enum(['ACTIVE', 'PAUSED', 'PENDING_APPROVAL']).optional(),
});

export const createBroadcastSchema = z.object({
  title: z.string().min(3, 'Notification title is required'),
  body: z.string().min(8, 'Message body is required'),
  targetAudience: z.enum(['ALL', 'TENANTS', 'PG_OWNERS']),
  category: z.string().default('ANNOUNCEMENT'),
  scheduledAt: z.string().optional().nullable(),
});

export const ownerOnboardTenantSchema = z.object({
  propertyId: z.string().min(1),
  bedId: z.string().min(1),
  fullName: z.string().min(2, 'Tenant full name is required'),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number'),
  email: z.string().email().optional().or(z.literal('')),
  monthlyRentInr: z.coerce.number().int().min(1000).optional(),
  securityDepositInr: z.coerce.number().int().min(0).optional(),
  depositPaid: z.boolean().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
});
