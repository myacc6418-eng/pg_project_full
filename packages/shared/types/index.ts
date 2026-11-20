export enum UserRole {
  TENANT = 'TENANT',
  PG_OWNER = 'PG_OWNER',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

export enum PropertyGenderType {
  BOYS = 'BOYS',
  GIRLS = 'GIRLS',
  COLIVING = 'COLIVING',
}

export enum PropertyApprovalStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  UNDER_REVIEW = 'UNDER_REVIEW',
  CORRECTIONS_REQUIRED = 'CORRECTIONS_REQUIRED',
  RESUBMITTED = 'RESUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  SUSPENDED = 'SUSPENDED',
}

export enum LocationVerificationStatus {
  DRAFT = 'DRAFT',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
  UNDER_REVIEW = 'UNDER_REVIEW',
  CORRECTIONS_REQUIRED = 'CORRECTIONS_REQUIRED',
  RESUBMITTED = 'RESUBMITTED',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
  REVERIFICATION_REQUIRED = 'REVERIFICATION_REQUIRED',
}

export enum BedStatus {
  AVAILABLE = 'AVAILABLE',
  OCCUPIED = 'OCCUPIED',
  RESERVED = 'RESERVED',
  MAINTENANCE = 'MAINTENANCE',
  INACTIVE = 'INACTIVE',
}

export enum JoiningRequestStatus {
  PENDING = 'PENDING',
  INFO_REQUESTED = 'INFO_REQUESTED',
  APPROVED_AWAITING_TERMS = 'APPROVED_AWAITING_TERMS',
  ACTIVE = 'ACTIVE',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export enum StayStatus {
  ACTIVE = 'ACTIVE',
  CHECKOUT_REQUESTED = 'CHECKOUT_REQUESTED',
  CHECKED_OUT = 'CHECKED_OUT',
}

export enum SubscriptionTier {
  BASIC = 'BASIC',
  PRO = 'PRO',
  BUSINESS = 'BUSINESS',
}

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  GRACE_PERIOD = 'GRACE_PERIOD',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export enum ExpenseCategory {
  GROCERIES = 'GROCERIES',
  ELECTRICITY = 'ELECTRICITY',
  WATER = 'WATER',
  INTERNET = 'INTERNET',
  SALARIES = 'SALARIES',
  MAINTENANCE = 'MAINTENANCE',
  CLEANING = 'CLEANING',
  RENT = 'RENT',
  SUPPLIES = 'SUPPLIES',
  OTHER = 'OTHER',
}

export enum ComplaintStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  WAITING = 'WAITING',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export enum MaintenanceStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

export enum DocumentVerificationStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
  RESUBMISSION_REQUIRED = 'RESUBMISSION_REQUIRED',
}

export type LawfulDocumentType =
  | 'INSTITUTION_ID'
  | 'DRIVING_LICENSE'
  | 'PASSPORT'
  | 'LOCAL_POLICE_VERIFICATION'
  | 'SIGNED_AGREEMENT'
  | 'OTHER';

export enum EventPublicationStatus {
  DRAFT = 'DRAFT',
  SCHEDULED = 'SCHEDULED',
  PUBLISHED = 'PUBLISHED',
  UNPUBLISHED = 'UNPUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export enum EventStatus {
  UPCOMING = 'UPCOMING',
  ONGOING = 'ONGOING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum EventRegistrationStatus {
  REGISTERED = 'REGISTERED',
  WAITLISTED = 'WAITLISTED',
  CANCELLED = 'CANCELLED',
}

export interface NotificationPreferences {
  emailAlerts: boolean;
  smsAlerts: boolean;
  joiningRequests: boolean;
  rentReminders: boolean;
  maintenanceAlerts: boolean;
}

export interface PrivacySettings {
  showBusinessPhonePublicly: boolean;
  showEmailPublicly: boolean;
}

export interface PublicUser {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  isVerified: boolean;
  isSuspended: boolean;
  businessName?: string;
  businessDescription?: string;
  city?: string;
  avatarUrl?: string;
  language?: string;
  notificationPreferences?: NotificationPreferences;
  privacySettings?: PrivacySettings;
  occupationStatus?: 'STUDENT' | 'WORKING_PROFESSIONAL' | 'FOUNDER' | 'OTHER';
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  consentPersonalizedAds?: boolean;
  deletionRequestedAt?: string | null;
  createdAt: string;
}

export interface UserSessionInfo {
  id: string;
  deviceLabel: string;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

export interface Floor {
  id: string;
  propertyId: string;
  floorNumber: number;
  label: string;
  createdAt: string;
}

export interface Room {
  id: string;
  propertyId: string;
  floorId?: string;
  floorNumber: number;
  roomNumber: string;
  roomType: 'SINGLE' | 'TWIN' | 'TRIPLE' | 'FOUR_SHARING';
  monthlyRentInr: number;
  depositInr: number;
  isActive?: boolean;
  notes?: string;
}

export interface Bed {
  id: string;
  propertyId: string;
  roomId: string;
  bedCode: string;
  status: BedStatus;
  assignedTenantId?: string | null;
  monthlyRentOverrideInr?: number | null;
  reservedForRequestId?: string | null;
  notes?: string;
}

export interface BedTransfer {
  id: string;
  stayId: string;
  tenantId: string;
  tenantName: string;
  propertyId: string;
  fromRoomId: string;
  fromBedId: string;
  fromBedCode: string;
  toRoomId: string;
  toBedId: string;
  toBedCode: string;
  reason: string;
  actorName: string;
  createdAt: string;
}

export interface ApprovalHistoryItem {
  id: string;
  actorId: string;
  actorName: string;
  previousStatus: PropertyApprovalStatus;
  newStatus: PropertyApprovalStatus;
  reason: string;
  timestamp: string;
}

export interface LocationHistoryItem {
  id: string;
  actorId: string;
  actorName: string;
  previousStatus: LocationVerificationStatus;
  newStatus: LocationVerificationStatus;
  notes: string;
  timestamp: string;
}

export interface PropertyExtraCharge {
  id: string;
  title: string;
  amountInr: number;
  frequency: 'MONTHLY' | 'ONE_TIME';
}

export interface PropertyDocument {
  id: string;
  propertyId: string;
  ownerId: string;
  docType: 'OWNERSHIP_DEED' | 'FIRE_SAFETY' | 'TRADE_LICENSE' | 'HOUSE_RULES_PDF' | 'OTHER';
  title: string;
  fileUrl: string;
  status: DocumentVerificationStatus;
  notes?: string;
  uploadedAt: string;
}

export interface Property {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  genderType: PropertyGenderType;
  contactPhone?: string;
  contactEmail?: string;
  address: string;
  landmark: string;
  locality: string;
  city: string;
  state: string;
  postalCode: string;
  googleMapsUrl?: string;
  ownerLat: number;
  ownerLng: number;
  verifiedLat?: number | null;
  verifiedLng?: number | null;
  startingRentInr: number;
  securityDepositInr: number;
  extraCharges?: PropertyExtraCharge[];
  amenities: string[];
  rules: string[];
  images: string[];
  approvalStatus: PropertyApprovalStatus;
  approvalReason?: string;
  approvalHistory: ApprovalHistoryItem[];
  locationStatus: LocationVerificationStatus;
  locationNotes?: string;
  locationHistory: LocationHistoryItem[];
  hasLifetimeListing: boolean;
  coveredBySubscription: boolean;
  isPromoted: boolean;
  promotionEndsAt?: string | null;
  isArchived?: boolean;
  rating: number;
  reviewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface JoiningRequest {
  id: string;
  tenantId: string;
  tenantName: string;
  tenantPhone: string;
  tenantEmail?: string;
  propertyId: string;
  preferredRoomType: 'SINGLE' | 'TWIN' | 'TRIPLE' | 'FOUR_SHARING';
  moveInDate: string;
  notes?: string;
  ownerNotes?: string;
  origin?: 'DIRECT' | 'QR';
  status: JoiningRequestStatus;
  assignedRoomId?: string;
  assignedRoomNumber?: string;
  assignedBedId?: string;
  assignedBedCode?: string;
  cancellationReason?: string;
  acceptedAgreementVersion?: string;
  acceptedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DepositSettlementItem {
  id: string;
  type: 'RECEIVED' | 'DEDUCTION' | 'REFUND';
  label: string;
  amountInr: number;
  notes?: string;
  createdAt: string;
}

export interface StayHistoryItem {
  id: string;
  eventType: string;
  summary: string;
  actorName: string;
  timestamp: string;
}

export interface TenantStay {
  id: string;
  tenantCode?: string;
  tenantId: string;
  tenantName: string;
  tenantPhone?: string;
  tenantEmail?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  propertyId: string;
  roomId: string;
  bedId: string;
  monthlyRentInr: number;
  securityDepositInr: number;
  depositPaid: boolean;
  termsAcceptedAt: string;
  acceptedAgreementVersion?: string;
  status: StayStatus;
  noticeDays: number;
  expectedCheckoutDate?: string | null;
  checkoutRequestedAt?: string | null;
  checkedOutAt?: string | null;
  stayHistory?: StayHistoryItem[];
  depositSettlementHistory?: DepositSettlementItem[];
  createdAt: string;
}

export interface TenantDocument {
  id: string;
  stayId: string;
  tenantId: string;
  propertyId: string;
  docType: LawfulDocumentType;
  title: string;
  fileUrl: string;
  status: DocumentVerificationStatus;
  notes?: string;
  expiresAt?: string | null;
  verificationHistory: {
    id: string;
    actorId: string;
    actorName: string;
    previousStatus: DocumentVerificationStatus;
    newStatus: DocumentVerificationStatus;
    notes: string;
    timestamp: string;
  }[];
  uploadedAt: string;
}

export interface RentCharge {
  id: string;
  stayId: string;
  tenantId: string;
  propertyId: string;
  billingMonth: string; // YYYY-MM
  amountInr: number;
  lateFeeInr?: number;
  paidAmountInr: number;
  dueDate: string;
  status: 'UPCOMING' | 'DUE' | 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'WAIVED';
  paymentMode?: 'UPI' | 'BANK_TRANSFER' | 'CASH' | 'CARD';
  receiptNumber?: string;
  paidAt?: string | null;
  reminderSentAt?: string | null;
}

export interface OutstandingDue {
  id: string;
  propertyId: string;
  tenantId: string;
  tenantName: string;
  stayId?: string;
  isFormerTenant: boolean;
  category: 'RENT' | 'ELECTRICITY' | 'DAMAGE' | 'LATE_FEE' | 'OTHER';
  description: string;
  totalAmountInr: number;
  paidAmountInr: number;
  dueDate: string;
  status: 'OPEN' | 'PARTIAL' | 'SETTLED';
  createdAt: string;
}

export interface Expense {
  id: string;
  propertyId: string;
  ownerId: string;
  category: ExpenseCategory;
  amountInr: number;
  date: string;
  notes: string;
  receiptUrl?: string;
  createdAt: string;
}

export interface Notice {
  id: string;
  propertyId: string;
  authorId: string;
  title: string;
  category: 'GENERAL' | 'MAINTENANCE' | 'UTILITIES' | 'HOUSEKEEPING' | 'RULES' | 'EVENT_SHARE';
  body: string;
  linkedEventId?: string;
  createdAt: string;
}

export interface FoodMenuDay {
  propertyId: string;
  day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
  breakfast: string;
  lunch: string;
  dinner: string;
}

export interface MealPreference {
  id: string;
  propertyId: string;
  tenantId: string;
  tenantName: string;
  preference: 'VEG' | 'NON_VEG';
  breakfastOptIn?: boolean;
  lunchOptIn?: boolean;
  dinnerOptIn?: boolean;
  updatedAt: string;
}

export interface MealFeedback {
  id: string;
  propertyId: string;
  tenantId: string;
  tenantName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface Complaint {
  id: string;
  propertyId: string;
  tenantId: string;
  tenantName: string;
  category: 'PLUMBING' | 'ELECTRICAL' | 'INTERNET' | 'CLEANING' | 'FOOD' | 'SECURITY' | 'OTHER';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  description: string;
  photoUrl?: string;
  status: ComplaintStatus;
  assignedStaffId?: string | null;
  assignedStaffName?: string | null;
  resolutionNotes?: string;
  tenantConfirmedResolved?: boolean;
  escalatedToAdmin?: boolean;
  timeline?: {
    id: string;
    actorName: string;
    status: ComplaintStatus;
    note: string;
    timestamp: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface MaintenanceRequest {
  id: string;
  propertyId: string;
  requestedBy: string;
  title: string;
  category?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  roomNumber?: string;
  assignedStaffName?: string;
  dueDate: string;
  estimatedCostInr: number;
  status: MaintenanceStatus;
  notes?: string;
  createdAt: string;
}

export interface ParcelNotice {
  id: string;
  propertyId: string;
  tenantId: string;
  carrier: string;
  trackingSuffix: string;
  receivedAt: string;
  pickedUpAt?: string | null;
}

export interface RoommateExpense {
  id: string;
  propertyId: string;
  roomId: string;
  addedByTenantId: string;
  addedByName: string;
  title: string;
  amountInr: number;
  splitCount: number;
  isSettled?: boolean;
  settledAt?: string | null;
  createdAt: string;
}

export interface RoommateTaskItem {
  id: string;
  propertyId: string;
  roomId: string;
  addedByTenantId: string;
  addedByName: string;
  type: 'GROCERY' | 'TASK';
  title: string;
  assignedToName?: string;
  completed: boolean;
  createdAt: string;
}

export interface LaundryRequest {
  id: string;
  propertyId: string;
  tenantId: string;
  tenantName: string;
  serviceName: string;
  pickupDate: string;
  itemsSummary: string;
  estimatedInr: number;
  status: 'REQUESTED' | 'PICKED_UP' | 'DELIVERED' | 'CANCELLED';
  createdAt: string;
}

export interface StaffMember {
  id: string;
  ownerId: string;
  propertyId: string;
  fullName: string;
  roleTitle: 'CARETAKER' | 'COOK' | 'HOUSEKEEPING' | 'MAINTENANCE';
  phone: string;
  monthlySalaryInr: number;
  attendanceDaysThisMonth: number;
  permissions: string[];
  activeTaskCount: number;
}

export interface StaffTask {
  id: string;
  ownerId: string;
  propertyId: string;
  staffId: string;
  staffName: string;
  title: string;
  dueDate: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  createdAt: string;
}

export interface PayrollRecord {
  id: string;
  ownerId: string;
  propertyId: string;
  staffId: string;
  staffName: string;
  month: string;
  baseSalaryInr: number;
  bonusInr: number;
  deductionInr: number;
  netPaidInr: number;
  status: 'PENDING' | 'PAID';
  paidAt?: string | null;
}

export interface PropertyReview {
  id: string;
  propertyId: string;
  tenantId: string;
  tenantName: string;
  rating: number;
  comment: string;
  ownerReply?: string | null;
  repliedAt?: string | null;
  createdAt: string;
}

export interface OwnerSubscription {
  ownerId: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  renewalDate: string;
  graceEndsAt?: string | null;
  maxListings: number;
}

export interface PaymentTransaction {
  id: string;
  userId: string;
  propertyId?: string;
  type: 'SUBSCRIPTION' | 'LIFETIME_LISTING' | 'FEATURED_PROMOTION' | 'BUSINESS_AD';
  amountInr: number;
  provider: string;
  status: 'SUCCEEDED' | 'PENDING' | 'FAILED';
  description: string;
  createdAt: string;
}

export interface StartupEvent {
  id: string;
  title: string;
  category: string;
  city: string;
  venue: string;
  dateTime: string;
  organizer: string;
  description: string;
  agenda: string[];
  speakers: { name: string; title: string }[];
  bannerUrl: string;
  isFree: boolean;
  externalRegistrationUrl?: string;
  mapsUrl?: string;
  capacity: number;
  publicationStatus: EventPublicationStatus;
  scheduledPublishAt?: string | null;
  eventStatus: EventStatus;
  isFeatured: boolean;
  createdAt: string;
}

export interface EventRegistration {
  id: string;
  eventId: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  status: EventRegistrationStatus;
  attended: boolean;
  createdAt: string;
}

export interface LocalBusinessListing {
  id: string;
  name: string;
  category:
    | 'Affordable Food'
    | 'Groceries'
    | 'Laundry'
    | 'Fitness'
    | 'Local Services'
    | 'Transportation'
    | 'Daily Essentials'
    | 'Nearby Deals';
  title: string;
  description: string;
  city: string;
  locality: string;
  offerText: string;
  isSponsored: boolean;
  status?: 'ACTIVE' | 'PAUSED' | 'PENDING_APPROVAL';
  packageLabel?: string;
  endsAt?: string | null;
  clicks: number;
  impressions: number;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  body: string;
  category: string;
  read: boolean;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  targetType: string;
  targetId: string;
  details: string;
  createdAt: string;
}

export interface ActivityLogEntry {
  id: string;
  ownerId: string;
  propertyId?: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  entityType: string;
  entityId: string;
  previousValue?: string;
  newValue?: string;
  timestamp: string;
}

export interface AdMobSettings {
  enabled: boolean;
  environment: 'test' | 'production';
  bannerEnabled: boolean;
  nativeEnabled: boolean;
  interstitialEnabled: boolean;
  rewardedEnabled: boolean;
  dailyInterstitialCap: number;
  adFreeCheckoutAndPayments: boolean;
  appId?: string;
  bannerUnitId?: string;
  nativeUnitId?: string;
  interstitialUnitId?: string;
  rewardedUnitId?: string;
  appOpenUnitId?: string;
  childDirectedTreatment?: boolean;
}

export interface SupportTicketMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  body: string;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  propertyId?: string;
  propertyName?: string;
  subject: string;
  category: 'DISPUTE' | 'PAYMENT' | 'ACCOUNT' | 'LISTING' | 'SAFETY' | 'OTHER';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'OPEN' | 'IN_PROGRESS' | 'WAITING_FOR_RESPONSE' | 'RESOLVED' | 'CLOSED';
  assignedTo?: string;
  resolutionNotes?: string;
  messages: SupportTicketMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface PlatformCmsContent {
  announcementBanner: {
    enabled: boolean;
    title: string;
    message: string;
    audience: 'ALL' | 'TENANTS' | 'PG_OWNERS';
  };
  landingHighlights: {
    id: string;
    title: string;
    description: string;
  }[];
  faqs: {
    id: string;
    question: string;
    answer: string;
    audience: 'ALL' | 'TENANTS' | 'PG_OWNERS';
  }[];
  policies: {
    termsSummary: string;
    privacySummary: string;
    residentRulesTemplate: string;
    updatedAt: string;
  };
}

export interface BroadcastNotificationRecord {
  id: string;
  title: string;
  body: string;
  targetAudience: 'ALL' | 'TENANTS' | 'PG_OWNERS';
  category: string;
  scheduledAt?: string | null;
  sentCount: number;
  createdBy: string;
  createdAt: string;
}
