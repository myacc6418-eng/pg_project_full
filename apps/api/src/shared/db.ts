import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import {
  ActivityLogEntry,
  AdMobSettings,
  AuditLogEntry,
  Bed,
  BedStatus,
  BedTransfer,
  BroadcastNotificationRecord,
  Complaint,
  ComplaintStatus,
  DocumentVerificationStatus,
  EventPublicationStatus,
  EventRegistration,
  EventRegistrationStatus,
  EventStatus,
  Expense,
  ExpenseCategory,
  Floor,
  FoodMenuDay,
  JoiningRequest,
  JoiningRequestStatus,
  LaundryRequest,
  LocalBusinessListing,
  LocationVerificationStatus,
  MaintenanceRequest,
  MaintenanceStatus,
  MealFeedback,
  MealPreference,
  Notice,
  NotificationItem,
  NotificationPreferences,
  OutstandingDue,
  OwnerSubscription,
  ParcelNotice,
  PaymentTransaction,
  PayrollRecord,
  PlatformCmsContent,
  PrivacySettings,
  Property,
  PropertyApprovalStatus,
  PropertyDocument,
  PropertyGenderType,
  PropertyReview,
  RentCharge,
  Room,
  RoommateExpense,
  RoommateTaskItem,
  StaffMember,
  StaffTask,
  StartupEvent,
  StayStatus,
  SubscriptionStatus,
  SubscriptionTier,
  SupportTicket,
  TenantDocument,
  TenantStay,
  UserRole,
} from '../../../../packages/shared/types';

export interface StoredUser {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  passwordHash: string;
  role: UserRole;
  isVerified: boolean;
  isSuspended: boolean;
  businessName?: string;
  businessDescription?: string;
  city?: string;
  avatarUrl?: string;
  language?: string;
  occupationStatus?: 'STUDENT' | 'WORKING_PROFESSIONAL' | 'FOUNDER' | 'OTHER';
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  consentPersonalizedAds?: boolean;
  notificationPreferences?: NotificationPreferences;
  privacySettings?: PrivacySettings;
  deletionRequestedAt?: string | null;
  createdAt: string;
}

export interface RefreshSession {
  id: string;
  userId: string;
  tokenHash: string;
  deviceLabel?: string;
  createdAt?: string;
  expiresAt: string;
  revoked: boolean;
}

export interface OtpChallenge {
  identifier: string;
  code: string;
  expiresAt: number;
  attempts: number;
  lastSentAt: number;
}

export interface DatabaseState {
  users: StoredUser[];
  sessions: RefreshSession[];
  properties: Property[];
  floors: Floor[];
  rooms: Room[];
  beds: Bed[];
  bedTransfers: BedTransfer[];
  propertyDocuments: PropertyDocument[];
  tenantDocuments: TenantDocument[];
  joiningRequests: JoiningRequest[];
  stays: TenantStay[];
  rentCharges: RentCharge[];
  outstandingDues: OutstandingDue[];
  expenses: Expense[];
  notices: Notice[];
  foodMenus: FoodMenuDay[];
  mealPreferences: MealPreference[];
  mealFeedbacks: MealFeedback[];
  complaints: Complaint[];
  maintenanceRequests: MaintenanceRequest[];
  parcels: ParcelNotice[];
  roommateExpenses: RoommateExpense[];
  roommateTasks: RoommateTaskItem[];
  laundryRequests: LaundryRequest[];
  staff: StaffMember[];
  staffTasks: StaffTask[];
  payrollRecords: PayrollRecord[];
  reviews: PropertyReview[];
  subscriptions: OwnerSubscription[];
  transactions: PaymentTransaction[];
  events: StartupEvent[];
  eventRegistrations: EventRegistration[];
  savedEventIds: Record<string, string[]>;
  savedPropertyIds: Record<string, string[]>;
  recentPropertyIds: Record<string, string[]>;
  readNoticeIds: Record<string, string[]>;
  localBusinesses: LocalBusinessListing[];
  notifications: NotificationItem[];
  supportTickets: SupportTicket[];
  cmsContent: PlatformCmsContent;
  broadcasts: BroadcastNotificationRecord[];
  auditLogs: AuditLogEntry[];
  activityLogs: ActivityLogEntry[];
  admobSettings: AdMobSettings;
}

const DATA_DIR = path.resolve(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'pgfinder-db.json');

function createSeedState(): DatabaseState {
  const demoPassHash = bcrypt.hashSync('Password@123', 8);
  const now = new Date('2026-11-18T10:00:00.000Z').toISOString();

  return {
    users: [
      {
        id: 'usr_tenant_ananya',
        fullName: 'Ananya Sharma',
        email: 'ananya.sharma@demo.pgfinder.in',
        phone: '9876543210',
        passwordHash: demoPassHash,
        role: UserRole.TENANT,
        isVerified: true,
        isSuspended: false,
        city: 'Hyderabad',
        occupationStatus: 'WORKING_PROFESSIONAL',
        emergencyContactName: 'Rajesh Sharma',
        emergencyContactPhone: '9876500001',
        consentPersonalizedAds: false,
        createdAt: now,
      },
      {
        id: 'usr_tenant_rohit',
        fullName: 'Rohit Verma',
        email: 'rohit.verma@demo.pgfinder.in',
        phone: '9876543211',
        passwordHash: demoPassHash,
        role: UserRole.TENANT,
        isVerified: true,
        isSuspended: false,
        city: 'Hyderabad',
        createdAt: now,
      },
      {
        id: 'usr_owner_vikram',
        fullName: 'Vikram Reddy',
        email: 'vikram.reddy@demo.pgfinder.in',
        phone: '9876543220',
        passwordHash: demoPassHash,
        role: UserRole.PG_OWNER,
        isVerified: true,
        isSuspended: false,
        businessName: 'Reddy Urban Living Spaces',
        businessDescription: 'Professionally managed student and working-professional co-living homes across Hyderabad IT corridors.',
        city: 'Hyderabad',
        language: 'en',
        notificationPreferences: {
          emailAlerts: true,
          smsAlerts: true,
          joiningRequests: true,
          rentReminders: true,
          maintenanceAlerts: true,
        },
        privacySettings: {
          showBusinessPhonePublicly: true,
          showEmailPublicly: true,
        },
        deletionRequestedAt: null,
        createdAt: now,
      },
      {
        id: 'usr_owner_kavya',
        fullName: 'Kavya Nair',
        email: 'kavya.nair@demo.pgfinder.in',
        phone: '9876543221',
        passwordHash: demoPassHash,
        role: UserRole.PG_OWNER,
        isVerified: true,
        isSuspended: false,
        businessName: 'Nair Comfort Homes',
        city: 'Bengaluru',
        createdAt: now,
      },
      {
        id: 'usr_admin_root',
        fullName: 'Arjun Menon (Super Admin)',
        email: 'admin@pgfinder.in',
        phone: '9999999999',
        passwordHash: demoPassHash,
        role: UserRole.SUPER_ADMIN,
        isVerified: true,
        isSuspended: false,
        city: 'Hyderabad',
        createdAt: now,
      },
    ],
    sessions: [],
    properties: [
      {
        id: 'pg_green_nest',
        ownerId: 'usr_owner_vikram',
        name: 'Green Nest PG',
        description:
          'Thoughtfully maintained co-living PG near Durgam Cheruvu Metro with ergonomic study desks, fresh 3-time Andhra & North Indian meals, and biometric entry.',
        genderType: PropertyGenderType.COLIVING,
        contactPhone: '9876543220',
        contactEmail: 'greennest@reddyurban.in',
        address: 'Plot 42, Kavuri Hills Phase 2, Madhapur',
        landmark: 'Near Durgam Cheruvu Metro Station',
        locality: 'Madhapur',
        city: 'Hyderabad',
        state: 'Telangana',
        postalCode: '500081',
        googleMapsUrl: 'https://maps.google.com/?q=17.4416,78.3879',
        ownerLat: 17.4412,
        ownerLng: 78.3874,
        verifiedLat: 17.4416,
        verifiedLng: 78.3879,
        startingRentInr: 9500,
        securityDepositInr: 10000,
        extraCharges: [
          { id: 'chg_gn_elec', title: 'AC Sub-meter Maintenance', amountInr: 500, frequency: 'MONTHLY' },
          { id: 'chg_gn_onboard', title: 'Biometric Keycard Issuance', amountInr: 250, frequency: 'ONE_TIME' },
        ],
        amenities: [
          'High-Speed Wi-Fi',
          '3-Time Homely Meals',
          'Power Backup',
          'CCTV Security',
          'Washing Machine',
          'Biometric Access',
          'RO Drinking Water',
          'Housekeeping',
        ],
        rules: [
          'Main gate biometric access active 24/7; visitors allowed in lounge until 9:00 PM',
          'Quiet study hours observed after 11:00 PM',
          '30-day advance checkout notice required for full deposit settlement',
          'No smoking inside rooms or balconies',
        ],
        images: ['/src/assets/images/pg_green_nest_1795149981855.jpg'],
        approvalStatus: PropertyApprovalStatus.APPROVED,
        approvalReason: 'Safety compliance, fire extinguisher check, and room photos verified.',
        approvalHistory: [
          {
            id: 'app_h1',
            actorId: 'usr_admin_root',
            actorName: 'Arjun Menon (Super Admin)',
            previousStatus: PropertyApprovalStatus.PENDING_APPROVAL,
            newStatus: PropertyApprovalStatus.APPROVED,
            reason: 'Verified property compliance and room standards.',
            timestamp: now,
          },
        ],
        locationStatus: LocationVerificationStatus.VERIFIED,
        locationNotes: 'Pin aligned with Kavuri Hills Phase 2 entrance.',
        locationHistory: [
          {
            id: 'loc_h1',
            actorId: 'usr_admin_root',
            actorName: 'Arjun Menon (Super Admin)',
            previousStatus: LocationVerificationStatus.PENDING_VERIFICATION,
            newStatus: LocationVerificationStatus.VERIFIED,
            notes: 'Coordinates cross-checked with street landmark.',
            timestamp: now,
          },
        ],
        hasLifetimeListing: true,
        coveredBySubscription: true,
        isPromoted: false,
        isArchived: false,
        rating: 4.7,
        reviewCount: 38,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'pg_urban_stay',
        ownerId: 'usr_owner_vikram',
        name: 'Urban Stay PG',
        description:
          'Modern working-professional residence in Gachibowli featuring a sunlit coworking dining lounge, backup fiber internet, and private balconies.',
        genderType: PropertyGenderType.BOYS,
        contactPhone: '9876543220',
        contactEmail: 'urbanstay@reddyurban.in',
        address: 'Road No. 4, Financial District Approach, Gachibowli',
        landmark: 'Opposite Wipro Circle Tech Park',
        locality: 'Gachibowli',
        city: 'Hyderabad',
        state: 'Telangana',
        postalCode: '500032',
        googleMapsUrl: 'https://maps.google.com/?q=17.4401,78.3489',
        ownerLat: 17.4404,
        ownerLng: 78.3491,
        verifiedLat: 17.4401,
        verifiedLng: 78.3489,
        startingRentInr: 10500,
        securityDepositInr: 12000,
        extraCharges: [],
        amenities: [
          'High-Speed Wi-Fi',
          '3-Time Homely Meals',
          'Power Backup',
          'Study Lounge',
          'Air Conditioning',
          'Parking',
          'CCTV Security',
        ],
        rules: [
          'Two-wheeler parking sticker mandatory',
          'Rent due by 5th of every month',
          '30-day notice period prior to move-out',
        ],
        images: ['/src/assets/images/pg_urban_stay_1795149981665.jpg'],
        approvalStatus: PropertyApprovalStatus.APPROVED,
        approvalReason: 'All room configurations and hygiene documents verified.',
        approvalHistory: [
          {
            id: 'app_h2',
            actorId: 'usr_admin_root',
            actorName: 'Arjun Menon (Super Admin)',
            previousStatus: PropertyApprovalStatus.PENDING_APPROVAL,
            newStatus: PropertyApprovalStatus.APPROVED,
            reason: 'Approved for marketplace listing.',
            timestamp: now,
          },
        ],
        locationStatus: LocationVerificationStatus.VERIFIED,
        locationNotes: 'Verified opposite Wipro Circle approach.',
        locationHistory: [
          {
            id: 'loc_h2',
            actorId: 'usr_admin_root',
            actorName: 'Arjun Menon (Super Admin)',
            previousStatus: LocationVerificationStatus.PENDING_VERIFICATION,
            newStatus: LocationVerificationStatus.VERIFIED,
            notes: 'Pin confirmed on Gachibowli Road No. 4.',
            timestamp: now,
          },
        ],
        hasLifetimeListing: false,
        coveredBySubscription: true,
        isPromoted: true,
        promotionEndsAt: '2026-12-18T23:59:59.000Z',
        isArchived: false,
        rating: 4.8,
        reviewCount: 54,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'pg_comfort_living',
        ownerId: 'usr_owner_vikram',
        name: 'Comfort Living PG',
        description:
          'Quiet, secure women-focused residence in Kondapur with balcony studio rooms, daily housekeeping, and in-house nutritious kitchen.',
        genderType: PropertyGenderType.GIRLS,
        contactPhone: '9876543220',
        contactEmail: 'comfort@reddyurban.in',
        address: '18, Botanical Garden Road, Kondapur',
        landmark: '300m from Kondapur Botanical Garden',
        locality: 'Kondapur',
        city: 'Hyderabad',
        state: 'Telangana',
        postalCode: '500084',
        googleMapsUrl: 'https://maps.google.com/?q=17.4622,78.3568',
        ownerLat: 17.4619,
        ownerLng: 78.3564,
        verifiedLat: 17.4622,
        verifiedLng: 78.3568,
        startingRentInr: 11000,
        securityDepositInr: 11000,
        extraCharges: [],
        amenities: [
          'High-Speed Wi-Fi',
          '3-Time Homely Meals',
          'Biometric Access',
          'CCTV Security',
          'Washing Machine',
          'Housekeeping',
          'Air Conditioning',
        ],
        rules: [
          'Women-only residence; female guests permitted in common reception until 8:30 PM',
          'No pets allowed',
          '30-day notice period for deposit refund',
        ],
        images: ['/src/assets/images/pg_comfort_living_1795149981588.jpg'],
        approvalStatus: PropertyApprovalStatus.APPROVED,
        approvalReason: 'Security protocols and female warden verification completed.',
        approvalHistory: [
          {
            id: 'app_h3',
            actorId: 'usr_admin_root',
            actorName: 'Arjun Menon (Super Admin)',
            previousStatus: PropertyApprovalStatus.PENDING_APPROVAL,
            newStatus: PropertyApprovalStatus.APPROVED,
            reason: 'Approved.',
            timestamp: now,
          },
        ],
        locationStatus: LocationVerificationStatus.VERIFIED,
        locationNotes: 'Verified near Botanical Garden gate.',
        locationHistory: [
          {
            id: 'loc_h3',
            actorId: 'usr_admin_root',
            actorName: 'Arjun Menon (Super Admin)',
            previousStatus: LocationVerificationStatus.PENDING_VERIFICATION,
            newStatus: LocationVerificationStatus.VERIFIED,
            notes: 'Verified.',
            timestamp: now,
          },
        ],
        hasLifetimeListing: true,
        coveredBySubscription: true,
        isPromoted: false,
        isArchived: false,
        rating: 4.9,
        reviewCount: 41,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'pg_elite_residency',
        ownerId: 'usr_owner_vikram',
        name: 'Elite Residency PG',
        description:
          'Newly outfitted executive PG near Mindspace Hitech City awaiting final Super Admin property review and location pin verification.',
        genderType: PropertyGenderType.COLIVING,
        contactPhone: '9876543220',
        contactEmail: 'elite@reddyurban.in',
        address: 'Plot 9, Patrika Nagar, Hitech City',
        landmark: 'Behind Mindspace Cyber Towers',
        locality: 'Hitech City',
        city: 'Hyderabad',
        state: 'Telangana',
        postalCode: '500081',
        googleMapsUrl: 'https://maps.google.com/?q=17.4485,78.3816',
        ownerLat: 17.4485,
        ownerLng: 78.3816,
        verifiedLat: null,
        verifiedLng: null,
        startingRentInr: 12000,
        securityDepositInr: 15000,
        extraCharges: [],
        amenities: ['High-Speed Wi-Fi', 'Power Backup', 'Air Conditioning', 'Study Lounge', 'CCTV Security'],
        rules: ['Standard 30-day checkout notice', 'Visitors allowed until 9:00 PM'],
        images: ['/src/assets/images/hero_pg_living_1795149981776.jpg'],
        approvalStatus: PropertyApprovalStatus.PENDING_APPROVAL,
        approvalHistory: [],
        locationStatus: LocationVerificationStatus.PENDING_VERIFICATION,
        locationHistory: [],
        hasLifetimeListing: false,
        coveredBySubscription: false,
        isPromoted: false,
        isArchived: false,
        rating: 0,
        reviewCount: 0,
        createdAt: now,
        updatedAt: now,
      },
    ],
    floors: [
      { id: 'flr_gn_2', propertyId: 'pg_green_nest', floorNumber: 2, label: '2nd Floor', createdAt: now },
      { id: 'flr_us_1', propertyId: 'pg_urban_stay', floorNumber: 1, label: '1st Floor', createdAt: now },
      { id: 'flr_cl_3', propertyId: 'pg_comfort_living', floorNumber: 3, label: '3rd Floor', createdAt: now },
      { id: 'flr_er_1', propertyId: 'pg_elite_residency', floorNumber: 1, label: '1st Floor', createdAt: now },
    ],
    rooms: [
      {
        id: 'rm_gn_201',
        propertyId: 'pg_green_nest',
        floorId: 'flr_gn_2',
        floorNumber: 2,
        roomNumber: '201',
        roomType: 'TWIN',
        monthlyRentInr: 9500,
        depositInr: 10000,
        isActive: true,
      },
      {
        id: 'rm_gn_202',
        propertyId: 'pg_green_nest',
        floorId: 'flr_gn_2',
        floorNumber: 2,
        roomNumber: '202',
        roomType: 'SINGLE',
        monthlyRentInr: 14500,
        depositInr: 15000,
        isActive: true,
      },
      {
        id: 'rm_us_101',
        propertyId: 'pg_urban_stay',
        floorId: 'flr_us_1',
        floorNumber: 1,
        roomNumber: '101',
        roomType: 'TWIN',
        monthlyRentInr: 10500,
        depositInr: 12000,
        isActive: true,
      },
      {
        id: 'rm_us_102',
        propertyId: 'pg_urban_stay',
        floorId: 'flr_us_1',
        floorNumber: 1,
        roomNumber: '102',
        roomType: 'TRIPLE',
        monthlyRentInr: 8500,
        depositInr: 10000,
        isActive: true,
      },
      {
        id: 'rm_cl_301',
        propertyId: 'pg_comfort_living',
        floorId: 'flr_cl_3',
        floorNumber: 3,
        roomNumber: '301',
        roomType: 'SINGLE',
        monthlyRentInr: 14000,
        depositInr: 14000,
        isActive: true,
      },
      {
        id: 'rm_cl_302',
        propertyId: 'pg_comfort_living',
        floorId: 'flr_cl_3',
        floorNumber: 3,
        roomNumber: '302',
        roomType: 'TWIN',
        monthlyRentInr: 11000,
        depositInr: 11000,
        isActive: true,
      },
      {
        id: 'rm_er_101',
        propertyId: 'pg_elite_residency',
        floorId: 'flr_er_1',
        floorNumber: 1,
        roomNumber: '101',
        roomType: 'TWIN',
        monthlyRentInr: 12000,
        depositInr: 15000,
        isActive: true,
      },
    ],
    beds: [
      { id: 'bed_gn_201a', propertyId: 'pg_green_nest', roomId: 'rm_gn_201', bedCode: '201-A', status: BedStatus.OCCUPIED, assignedTenantId: 'usr_tenant_ananya', monthlyRentOverrideInr: null },
      { id: 'bed_gn_201b', propertyId: 'pg_green_nest', roomId: 'rm_gn_201', bedCode: '201-B', status: BedStatus.AVAILABLE, assignedTenantId: null, monthlyRentOverrideInr: null },
      { id: 'bed_gn_202a', propertyId: 'pg_green_nest', roomId: 'rm_gn_202', bedCode: '202-A', status: BedStatus.AVAILABLE, assignedTenantId: null, monthlyRentOverrideInr: null },
      { id: 'bed_us_101a', propertyId: 'pg_urban_stay', roomId: 'rm_us_101', bedCode: '101-A', status: BedStatus.AVAILABLE, assignedTenantId: null, monthlyRentOverrideInr: null },
      { id: 'bed_us_101b', propertyId: 'pg_urban_stay', roomId: 'rm_us_101', bedCode: '101-B', status: BedStatus.AVAILABLE, assignedTenantId: null, monthlyRentOverrideInr: null },
      { id: 'bed_us_102a', propertyId: 'pg_urban_stay', roomId: 'rm_us_102', bedCode: '102-A', status: BedStatus.AVAILABLE, assignedTenantId: null, monthlyRentOverrideInr: null },
      { id: 'bed_us_102b', propertyId: 'pg_urban_stay', roomId: 'rm_us_102', bedCode: '102-B', status: BedStatus.MAINTENANCE, assignedTenantId: null, monthlyRentOverrideInr: null },
      { id: 'bed_cl_301a', propertyId: 'pg_comfort_living', roomId: 'rm_cl_301', bedCode: '301-A', status: BedStatus.AVAILABLE, assignedTenantId: null, monthlyRentOverrideInr: null },
      { id: 'bed_cl_302a', propertyId: 'pg_comfort_living', roomId: 'rm_cl_302', bedCode: '302-A', status: BedStatus.AVAILABLE, assignedTenantId: null, monthlyRentOverrideInr: null },
      { id: 'bed_cl_302b', propertyId: 'pg_comfort_living', roomId: 'rm_cl_302', bedCode: '302-B', status: BedStatus.AVAILABLE, assignedTenantId: null, monthlyRentOverrideInr: null },
      { id: 'bed_er_101a', propertyId: 'pg_elite_residency', roomId: 'rm_er_101', bedCode: '101-A', status: BedStatus.AVAILABLE, assignedTenantId: null, monthlyRentOverrideInr: null },
      { id: 'bed_er_101b', propertyId: 'pg_elite_residency', roomId: 'rm_er_101', bedCode: '101-B', status: BedStatus.AVAILABLE, assignedTenantId: null, monthlyRentOverrideInr: null },
    ],
    bedTransfers: [],
    propertyDocuments: [
      {
        id: 'pdoc_gn_1',
        propertyId: 'pg_green_nest',
        ownerId: 'usr_owner_vikram',
        docType: 'FIRE_SAFETY',
        title: 'GHMC Fire & Safety NOC 2026',
        fileUrl: 'https://storage.pgfinder.in/docs/gn-fire-noc.pdf',
        status: DocumentVerificationStatus.VERIFIED,
        notes: 'Verified by platform safety check.',
        uploadedAt: now,
      },
    ],
    tenantDocuments: [
      {
        id: 'tdoc_ananya_1',
        stayId: 'stay_ananya_gn',
        tenantId: 'usr_tenant_ananya',
        propertyId: 'pg_green_nest',
        docType: 'INSTITUTION_ID',
        title: 'TechCorp Software Engineer ID',
        fileUrl: 'https://storage.pgfinder.in/private/ananya-emp-id.pdf',
        status: DocumentVerificationStatus.VERIFIED,
        notes: 'Employer badge verified on move-in.',
        verificationHistory: [
          {
            id: 'dvh_1',
            actorId: 'usr_owner_vikram',
            actorName: 'Vikram Reddy',
            previousStatus: DocumentVerificationStatus.PENDING,
            newStatus: DocumentVerificationStatus.VERIFIED,
            notes: 'Verified physically at check-in.',
            timestamp: '2026-09-01T10:00:00.000Z',
          },
        ],
        uploadedAt: '2026-09-01T09:15:00.000Z',
      },
    ],
    joiningRequests: [
      {
        id: 'jr_demo_1',
        tenantId: 'usr_tenant_rohit',
        tenantName: 'Rohit Verma',
        tenantPhone: '9876543211',
        tenantEmail: 'rohit.verma@demo.pgfinder.in',
        propertyId: 'pg_urban_stay',
        preferredRoomType: 'TWIN',
        moveInDate: '2026-12-01',
        notes: 'Working near Wipro Circle, looking for quiet twin-sharing room.',
        origin: 'QR',
        status: JoiningRequestStatus.PENDING,
        createdAt: now,
        updatedAt: now,
      },
    ],
    stays: [
      {
        id: 'stay_ananya_gn',
        tenantCode: 'PGF-TEN-1001',
        tenantId: 'usr_tenant_ananya',
        tenantName: 'Ananya Sharma',
        tenantPhone: '9876543210',
        tenantEmail: 'ananya.sharma@demo.pgfinder.in',
        emergencyContactName: 'Rajesh Sharma (Father)',
        emergencyContactPhone: '9811122233',
        propertyId: 'pg_green_nest',
        roomId: 'rm_gn_201',
        bedId: 'bed_gn_201a',
        monthlyRentInr: 9500,
        securityDepositInr: 10000,
        depositPaid: true,
        termsAcceptedAt: '2026-09-01T09:00:00.000Z',
        status: StayStatus.ACTIVE,
        noticeDays: 30,
        stayHistory: [
          {
            id: 'sh_1',
            eventType: 'JOINED',
            summary: 'Accepted house rules & activated stay in Room 201 · Bed 201-A',
            actorName: 'Ananya Sharma',
            timestamp: '2026-09-01T09:00:00.000Z',
          },
        ],
        depositSettlementHistory: [
          {
            id: 'dep_1',
            type: 'RECEIVED',
            label: 'Initial Security Deposit Paid',
            amountInr: 10000,
            notes: 'Collected via UPI on onboarding',
            createdAt: '2026-09-01T09:05:00.000Z',
          },
        ],
        createdAt: '2026-09-01T09:00:00.000Z',
      },
    ],
    rentCharges: [
      {
        id: 'rc_2026_10',
        stayId: 'stay_ananya_gn',
        tenantId: 'usr_tenant_ananya',
        propertyId: 'pg_green_nest',
        billingMonth: '2026-10',
        amountInr: 9500,
        lateFeeInr: 0,
        paidAmountInr: 9500,
        dueDate: '2026-10-05',
        status: 'PAID',
        paymentMode: 'UPI',
        receiptNumber: 'RCPT-2026-1042',
        paidAt: '2026-10-03T11:20:00.000Z',
      },
      {
        id: 'rc_2026_11',
        stayId: 'stay_ananya_gn',
        tenantId: 'usr_tenant_ananya',
        propertyId: 'pg_green_nest',
        billingMonth: '2026-11',
        amountInr: 9500,
        lateFeeInr: 0,
        paidAmountInr: 0,
        dueDate: '2026-11-25',
        status: 'DUE',
      },
    ],
    outstandingDues: [
      {
        id: 'due_demo_1',
        propertyId: 'pg_green_nest',
        stayId: 'stay_ananya_gn',
        tenantId: 'usr_tenant_ananya',
        tenantName: 'Ananya Sharma',
        isFormerTenant: false,
        category: 'ELECTRICITY',
        description: 'October AC Sub-meter Extra Usage Share',
        totalAmountInr: 650,
        paidAmountInr: 0,
        dueDate: '2026-11-25',
        status: 'OPEN',
        createdAt: now,
      },
    ],
    expenses: [
      {
        id: 'exp_1',
        propertyId: 'pg_green_nest',
        ownerId: 'usr_owner_vikram',
        category: ExpenseCategory.GROCERIES,
        amountInr: 18400,
        date: '2026-11-12',
        notes: 'Weekly vegetables, rice, and dairy supply for mess kitchen',
        createdAt: now,
      },
      {
        id: 'exp_2',
        propertyId: 'pg_green_nest',
        ownerId: 'usr_owner_vikram',
        category: ExpenseCategory.ELECTRICITY,
        amountInr: 7200,
        date: '2026-11-08',
        notes: 'TSSPDCL commercial meter bill for October cycle',
        createdAt: now,
      },
      {
        id: 'exp_3',
        propertyId: 'pg_urban_stay',
        ownerId: 'usr_owner_vikram',
        category: ExpenseCategory.INTERNET,
        amountInr: 2499,
        date: '2026-11-05',
        notes: 'ACT Fibernet dual-WAN 500 Mbps business broadband',
        createdAt: now,
      },
    ],
    notices: [
      {
        id: 'not_1',
        propertyId: 'pg_green_nest',
        authorId: 'usr_owner_vikram',
        title: 'Overhead Water Tank Cleaning Schedule',
        category: 'UTILITIES',
        body: 'Routine RO & overhead tank sanitization scheduled this Sunday between 11:00 AM and 1:00 PM. Please store drinking water beforehand.',
        createdAt: now,
      },
      {
        id: 'not_2',
        propertyId: 'pg_green_nest',
        authorId: 'usr_owner_vikram',
        title: 'Sunday Special Dinner & Filter Coffee',
        category: 'GENERAL',
        body: 'This Sunday dinner includes Hyderabadi Veg Dum Biryani, Mirchi Ka Salan, and Gulab Jamun from 7:45 PM onwards.',
        createdAt: now,
      },
    ],
    foodMenus: [
      {
        propertyId: 'pg_green_nest',
        day: 'Mon',
        breakfast: 'Idli, Medu Vada, Coconut Chutney & Sambar',
        lunch: 'Phulka, Jeera Rice, Dal Tadka, Aloo Gobi & Curd',
        dinner: 'Chapati, Paneer Butter Masala, Steamed Rice & Rasam',
      },
      {
        propertyId: 'pg_green_nest',
        day: 'Tue',
        breakfast: 'Pesarattu Dosa, Ginger Chutney & Boiled Eggs',
        lunch: 'Steamed Rice, Tomato Pappu, Bhindi Fry & Buttermilk',
        dinner: 'Phulka, Chana Masala, Veg Pulao & Raita',
      },
      {
        propertyId: 'pg_green_nest',
        day: 'Wed',
        breakfast: 'Aloo Paratha, Curd & Pickle',
        lunch: 'Rice, Sambar, Beans Poriyal, Papad & Curd',
        dinner: 'Chapati, Egg Curry / Veg Kofta & Jeera Rice',
      },
      {
        propertyId: 'pg_green_nest',
        day: 'Thu',
        breakfast: 'Masala Upma, Chutney & Tea/Coffee',
        lunch: 'Phulka, Rajma Masala, Rice & Salad',
        dinner: 'Chapati, Mix Veg Kadai, Dal Fry & Rice',
      },
      {
        propertyId: 'pg_green_nest',
        day: 'Fri',
        breakfast: 'Onion Uttapam & Groundnut Chutney',
        lunch: 'Rice, Palak Dal, Crispy Karela & Curd',
        dinner: 'Phulka, Mushroom Masala, Baghara Rice',
      },
      {
        propertyId: 'pg_green_nest',
        day: 'Sat',
        breakfast: 'Puri Bhaji & Sprouts Salad',
        lunch: 'Steamed Rice, Drumstick Sambar & Cabbage Fry',
        dinner: 'Chapati, Dal Makhani, Peas Pulao',
      },
      {
        propertyId: 'pg_green_nest',
        day: 'Sun',
        breakfast: 'Masala Dosa, Chutney & Filter Coffee',
        lunch: 'Plain Rice, Gongura Pappu, Crispy Aloo & Curd',
        dinner: 'Hyderabadi Veg Dum Biryani, Mirchi Ka Salan & Gulab Jamun',
      },
    ],
    mealPreferences: [
      {
        id: 'mp_ananya',
        propertyId: 'pg_green_nest',
        tenantId: 'usr_tenant_ananya',
        tenantName: 'Ananya Sharma',
        preference: 'VEG',
        updatedAt: now,
      },
    ],
    mealFeedbacks: [
      {
        id: 'mf_1',
        propertyId: 'pg_green_nest',
        tenantId: 'usr_tenant_ananya',
        tenantName: 'Ananya Sharma',
        rating: 5,
        comment: 'Sunday Hyderabadi Biryani and sambar quality have been great this week!',
        createdAt: now,
      },
    ],
    complaints: [
      {
        id: 'cmp_1',
        propertyId: 'pg_green_nest',
        tenantId: 'usr_tenant_ananya',
        tenantName: 'Ananya Sharma',
        category: 'INTERNET',
        priority: 'MEDIUM',
        description: '2nd floor corner repeater drops 5GHz Wi-Fi signal briefly after 10 PM.',
        status: ComplaintStatus.IN_PROGRESS,
        assignedStaffId: 'stf_1',
        assignedStaffName: 'Ramesh Babu',
        resolutionNotes: 'Technician scheduled to replace Mesh node firmware tomorrow at 4 PM.',
        timeline: [
          {
            id: 'cmpt_1',
            actorName: 'Ananya Sharma',
            status: ComplaintStatus.OPEN,
            note: 'Complaint raised by resident.',
            timestamp: now,
          },
          {
            id: 'cmpt_2',
            actorName: 'Vikram Reddy',
            status: ComplaintStatus.IN_PROGRESS,
            note: 'Assigned to Ramesh Babu · Technician scheduled.',
            timestamp: now,
          },
        ],
        createdAt: now,
        updatedAt: now,
      },
    ],
    maintenanceRequests: [
      {
        id: 'mnt_1',
        propertyId: 'pg_green_nest',
        requestedBy: 'Ananya Sharma',
        title: 'Inspect Room 201 balcony sliding latch',
        category: 'CARPENTRY',
        priority: 'MEDIUM',
        roomNumber: '201',
        assignedStaffName: 'Ramesh Babu',
        dueDate: '2026-11-22',
        estimatedCostInr: 450,
        status: MaintenanceStatus.PENDING,
        createdAt: now,
      },
    ],
    parcels: [
      {
        id: 'prc_1',
        propertyId: 'pg_green_nest',
        tenantId: 'usr_tenant_ananya',
        carrier: 'BlueDart Express',
        trackingSuffix: '8841',
        receivedAt: '2026-11-19T14:20:00.000Z',
        pickedUpAt: null,
      },
    ],
    roommateExpenses: [
      {
        id: 'rme_1',
        propertyId: 'pg_green_nest',
        roomId: 'rm_gn_201',
        addedByTenantId: 'usr_tenant_ananya',
        addedByName: 'Ananya Sharma',
        title: '20L Bisleri dispenser jar + room handwash',
        amountInr: 240,
        splitCount: 2,
        createdAt: now,
      },
    ],
    staff: [
      {
        id: 'stf_1',
        ownerId: 'usr_owner_vikram',
        propertyId: 'pg_green_nest',
        fullName: 'Ramesh Babu',
        roleTitle: 'CARETAKER',
        phone: '9848011223',
        monthlySalaryInr: 18000,
        attendanceDaysThisMonth: 18,
        permissions: ['VIEW_RESIDENTS', 'LOG_PARCELS', 'UPDATE_MAINTENANCE'],
        activeTaskCount: 1,
      },
      {
        id: 'stf_2',
        ownerId: 'usr_owner_vikram',
        propertyId: 'pg_green_nest',
        fullName: 'Lakshmi Devi',
        roleTitle: 'COOK',
        phone: '9848011224',
        monthlySalaryInr: 16500,
        attendanceDaysThisMonth: 19,
        permissions: ['VIEW_MEAL_COUNT'],
        activeTaskCount: 1,
      },
    ],
    staffTasks: [
      {
        id: 'stsk_1',
        ownerId: 'usr_owner_vikram',
        propertyId: 'pg_green_nest',
        staffId: 'stf_1',
        staffName: 'Ramesh Babu',
        title: 'Verify RO filter cartridge pressure & log reading',
        dueDate: '2026-11-22',
        priority: 'MEDIUM',
        status: 'PENDING',
        createdAt: now,
      },
      {
        id: 'stsk_2',
        ownerId: 'usr_owner_vikram',
        propertyId: 'pg_green_nest',
        staffId: 'stf_2',
        staffName: 'Lakshmi Devi',
        title: 'Prepare Sunday special dinner inventory list',
        dueDate: '2026-11-21',
        priority: 'LOW',
        status: 'IN_PROGRESS',
        createdAt: now,
      },
    ],
    payrollRecords: [
      {
        id: 'pay_stf_1_oct',
        ownerId: 'usr_owner_vikram',
        propertyId: 'pg_green_nest',
        staffId: 'stf_1',
        staffName: 'Ramesh Babu',
        month: '2026-10',
        baseSalaryInr: 18000,
        bonusInr: 1000,
        deductionInr: 0,
        netPaidInr: 19000,
        status: 'PAID',
        paidAt: '2026-11-01T10:00:00.000Z',
      },
    ],
    reviews: [
      {
        id: 'rev_1',
        propertyId: 'pg_green_nest',
        tenantId: 'usr_tenant_ananya',
        tenantName: 'Ananya Sharma',
        rating: 5,
        comment: 'Very clean rooms, reliable biometric entry, and super close to Durgam Cheruvu Metro.',
        ownerReply: 'Thank you Ananya! Glad you are enjoying the community and meals at Green Nest PG.',
        repliedAt: now,
        createdAt: now,
      },
      {
        id: 'rev_2',
        propertyId: 'pg_urban_stay',
        tenantId: 'usr_tenant_rohit',
        tenantName: 'Rohit Verma',
        rating: 4,
        comment: 'Spacious coworking lounge and great high-speed backup fiber.',
        ownerReply: null,
        repliedAt: null,
        createdAt: now,
      },
    ],
    subscriptions: [
      {
        ownerId: 'usr_owner_vikram',
        tier: SubscriptionTier.PRO,
        status: SubscriptionStatus.ACTIVE,
        renewalDate: '2026-12-18',
        maxListings: 5,
      },
      {
        ownerId: 'usr_owner_kavya',
        tier: SubscriptionTier.BASIC,
        status: SubscriptionStatus.ACTIVE,
        renewalDate: '2026-12-31',
        maxListings: 0,
      },
    ],
    transactions: [
      {
        id: 'txn_1',
        userId: 'usr_owner_vikram',
        propertyId: 'pg_green_nest',
        type: 'LIFETIME_LISTING',
        amountInr: 199,
        provider: 'demo_gateway',
        status: 'SUCCEEDED',
        description: 'Lifetime listing activation — Green Nest PG',
        createdAt: now,
      },
      {
        id: 'txn_2',
        userId: 'usr_owner_vikram',
        type: 'SUBSCRIPTION',
        amountInr: 199,
        provider: 'demo_gateway',
        status: 'SUCCEEDED',
        description: 'Pro Plan Monthly Subscription (up to 5 PG listings)',
        createdAt: now,
      },
      {
        id: 'txn_3',
        userId: 'usr_owner_vikram',
        propertyId: 'pg_urban_stay',
        type: 'FEATURED_PROMOTION',
        amountInr: 799,
        provider: 'demo_gateway',
        status: 'SUCCEEDED',
        description: '30-Day Featured PG Promotion — Urban Stay PG',
        createdAt: now,
      },
    ],
    events: [
      {
        id: 'evt_hyd_founders',
        title: 'Hyderabad SaaS & AI Founders Mixer',
        category: 'Founder Meetups',
        city: 'Hyderabad',
        venue: 'T-Hub Phase 2 Atrium, Raidurgam',
        dateTime: '2026-11-28T17:30:00.000Z',
        organizer: 'Deccan Founders Guild',
        description:
          'An evening networking session for early-stage builders, product engineers, and first-time founders living across Hyderabad tech corridors.',
        agenda: [
          '05:30 PM — Check-in & Filter Coffee',
          '06:15 PM — Fireside: Building from 0 to 100 Paid B2B Customers',
          '07:15 PM — Open Founder Pitch & Peer Matching',
        ],
        speakers: [
          { name: 'Siddharth Rao', title: 'Co-founder, FinStack India' },
          { name: 'Meera Krishnan', title: 'Principal, Deccan Seed Fund' },
        ],
        bannerUrl: '/src/assets/images/event_startup_meetup_1795149981771.jpg',
        isFree: true,
        mapsUrl: 'https://maps.google.com/?q=T-Hub+Hyderabad',
        capacity: 120,
        publicationStatus: EventPublicationStatus.PUBLISHED,
        eventStatus: EventStatus.UPCOMING,
        isFeatured: true,
        createdAt: now,
      },
      {
        id: 'evt_ai_buildathon',
        title: 'Applied GenAI Weekend Buildathon',
        category: 'AI & Technology',
        city: 'Hyderabad',
        venue: 'IIIT Hyderabad CIE Auditorium, Gachibowli',
        dateTime: '2026-12-06T09:30:00.000Z',
        organizer: 'HydAI Collective',
        description:
          'Full-day practical workshop and hackathon focused on voice agents, RAG workflows, and mobile deployment for student & working-pro builders.',
        agenda: [
          '09:30 AM — Team Formation & Problem Tracks',
          '12:30 PM — Architecture Mentorship Round',
          '05:00 PM — Live Demo Showcase',
        ],
        speakers: [{ name: 'Dr. Karthik Varma', title: 'AI Systems Lead' }],
        bannerUrl: '/src/assets/images/event_startup_meetup_1795149981771.jpg',
        isFree: true,
        mapsUrl: 'https://maps.google.com/?q=IIIT+Hyderabad',
        capacity: 80,
        publicationStatus: EventPublicationStatus.PUBLISHED,
        eventStatus: EventStatus.UPCOMING,
        isFeatured: false,
        createdAt: now,
      },
      {
        id: 'evt_blr_investor',
        title: 'Bengaluru Seed Investor & Operator Roundtable',
        category: 'Investor Networking',
        city: 'Bengaluru',
        venue: '91springboard Koramangala 8th Block',
        dateTime: '2026-12-12T18:00:00.000Z',
        organizer: 'Indus Angel Network',
        description:
          'Curated founder-investor mixer covering pre-seed metrics, unit economics, and GTM playbooks for Indian consumer & SaaS teams.',
        agenda: [
          '06:00 PM — Introductions',
          '06:45 PM — Term Sheet Red Flags Panel',
          '07:45 PM — Networking Dinner',
        ],
        speakers: [{ name: 'Neha Kulkarni', title: 'Partner, Indus Angels' }],
        bannerUrl: '/src/assets/images/event_startup_meetup_1795149981771.jpg',
        isFree: false,
        externalRegistrationUrl: 'https://example.org/events/blr-roundtable',
        mapsUrl: 'https://maps.google.com/?q=Koramangala+Bengaluru',
        capacity: 60,
        publicationStatus: EventPublicationStatus.PUBLISHED,
        eventStatus: EventStatus.UPCOMING,
        isFeatured: false,
        createdAt: now,
      },
    ],
    eventRegistrations: [
      {
        id: 'ereg_1',
        eventId: 'evt_hyd_founders',
        userId: 'usr_tenant_ananya',
        userName: 'Ananya Sharma',
        userRole: UserRole.TENANT,
        status: EventRegistrationStatus.REGISTERED,
        attended: false,
        createdAt: now,
      },
    ],
    savedEventIds: {
      usr_tenant_ananya: ['evt_ai_buildathon'],
    },
    savedPropertyIds: {
      usr_tenant_rohit: ['pg_green_nest', 'pg_urban_stay'],
    },
    recentPropertyIds: {
      usr_tenant_rohit: ['pg_green_nest'],
    },
    readNoticeIds: {
      usr_tenant_ananya: [],
    },
    roommateTasks: [
      {
        id: 'rmt_1',
        propertyId: 'pg_green_nest',
        roomId: 'rm_gn_101',
        addedByTenantId: 'usr_tenant_ananya',
        addedByName: 'Ananya Sharma',
        type: 'GROCERY',
        title: '20L Drinking Water Can refill',
        assignedToName: 'Ananya Sharma',
        completed: false,
        createdAt: now,
      },
      {
        id: 'rmt_2',
        propertyId: 'pg_green_nest',
        roomId: 'rm_gn_101',
        addedByTenantId: 'usr_tenant_ananya',
        addedByName: 'Ananya Sharma',
        type: 'TASK',
        title: 'Desk & balcony weekly tidy-up',
        assignedToName: 'Room 101',
        completed: true,
        createdAt: now,
      },
    ],
    laundryRequests: [
      {
        id: 'lnd_1',
        propertyId: 'pg_green_nest',
        tenantId: 'usr_tenant_ananya',
        tenantName: 'Ananya Sharma',
        serviceName: 'SpinFresh Express Laundry',
        pickupDate: '2026-11-21',
        itemsSummary: '3.2 kg regular wash & fold',
        estimatedInr: 220,
        status: 'PICKED_UP',
        createdAt: now,
      },
    ],
    localBusinesses: [
      {
        id: 'loc_biz_1',
        name: 'Tiffins & Bowls Co.',
        category: 'Affordable Food',
        title: '15% Off Monthly Homestyle Tiffin Add-on',
        description: 'Fresh millet rotis and protein bowls delivered near Madhapur & Kavuri Hills.',
        city: 'Hyderabad',
        locality: 'Madhapur',
        offerText: 'Code PGFINDER15 · Starts ₹89/meal',
        isSponsored: true,
        status: 'ACTIVE',
        packageLabel: 'City Featured Card',
        clicks: 42,
        impressions: 610,
      },
      {
        id: 'loc_biz_2',
        name: 'SpinFresh Express Laundry',
        category: 'Laundry',
        title: 'Wash, Steam Iron & 24h Doorstep Return',
        description: 'Per-kg wash & fold service covering Kavuri Hills, Madhapur, and Gachibowli.',
        city: 'Hyderabad',
        locality: 'Madhapur',
        offerText: '₹69/kg for PG Finder residents',
        isSponsored: false,
        status: 'ACTIVE',
        clicks: 28,
        impressions: 390,
      },
      {
        id: 'loc_biz_3',
        name: 'IronCore Fitness Studio',
        category: 'Fitness',
        title: 'Flexible Monthly Gym Pass — Zero Joining Fee',
        description: 'Open 5:30 AM – 10:30 PM, 400m from Durgam Cheruvu Metro.',
        city: 'Hyderabad',
        locality: 'Madhapur',
        offerText: '₹1,199/month student & resident rate',
        isSponsored: true,
        status: 'ACTIVE',
        packageLabel: 'Locality Banner',
        clicks: 34,
        impressions: 480,
      },
      {
        id: 'loc_biz_4',
        name: 'QuickMart Daily Groceries',
        category: 'Groceries',
        title: '15-Minute Milk, Fruits & Pantry Delivery',
        description: 'Zero delivery fee on orders above ₹199 for PG clusters in Kondapur & Gachibowli.',
        city: 'Hyderabad',
        locality: 'Gachibowli',
        offerText: 'Free delivery above ₹199',
        isSponsored: false,
        status: 'ACTIVE',
        clicks: 19,
        impressions: 295,
      },
      {
        id: 'loc_biz_5',
        name: 'MetroBike Commute Pass',
        category: 'Transportation',
        title: 'Last-Mile Electric Scooter Pass to HITEC City',
        description: 'Dock stations at Durgam Cheruvu & Mindspace Gate 3.',
        city: 'Hyderabad',
        locality: 'Madhapur',
        offerText: '₹399/week unlimited 20-min rides',
        isSponsored: false,
        status: 'ACTIVE',
        clicks: 15,
        impressions: 240,
      },
      {
        id: 'loc_biz_6',
        name: 'PureDrop Drinking Water & Essentials',
        category: 'Daily Essentials',
        title: '20L Bisleri Can & Toiletries Desk Drop',
        description: 'Same-day evening drop to PG reception desks.',
        city: 'Hyderabad',
        locality: 'Madhapur',
        offerText: '₹45/20L refill · No deposit',
        isSponsored: false,
        status: 'ACTIVE',
        clicks: 11,
        impressions: 185,
      },
      {
        id: 'loc_biz_7',
        name: 'Campus Study Café & Print Hub',
        category: 'Nearby Deals',
        title: '50% Off Unlimited Filter Coffee + Wi-Fi Day Pass',
        description: 'Quiet study booths open till 11 PM near Cyber Towers.',
        city: 'Hyderabad',
        locality: 'Madhapur',
        offerText: '₹149 Day Pass with 2 coffees',
        isSponsored: true,
        status: 'ACTIVE',
        packageLabel: 'Nearby Deals Spotlight',
        clicks: 24,
        impressions: 330,
      },
    ],
    notifications: [
      {
        id: 'ntf_1',
        userId: 'usr_tenant_ananya',
        title: 'Parcel Received at Desk',
        body: 'BlueDart Express parcel (tracking ending 8841) arrived for you at Green Nest PG reception.',
        category: 'PARCEL',
        read: false,
        createdAt: now,
      },
      {
        id: 'ntf_2',
        userId: 'usr_owner_vikram',
        title: 'New Joining Request',
        body: 'Rohit Verma requested a Twin bed at Urban Stay PG (Move-in: Dec 1).',
        category: 'JOINING',
        read: false,
        createdAt: now,
      },
    ],
    supportTickets: [
      {
        id: 'tkt_1',
        userId: 'usr_tenant_ananya',
        userName: 'Ananya Sharma',
        userRole: UserRole.TENANT,
        propertyId: 'pg_green_nest',
        propertyName: 'Green Nest PG',
        subject: 'Clarification on AC Sub-meter Billing Cycle',
        category: 'PAYMENT',
        priority: 'LOW',
        status: 'IN_PROGRESS',
        assignedTo: 'Arjun Menon (Super Admin)',
        messages: [
          {
            id: 'tmsg_1',
            senderId: 'usr_tenant_ananya',
            senderName: 'Ananya Sharma',
            senderRole: UserRole.TENANT,
            body: 'Could you confirm whether AC sub-meter maintenance is billed on the 1st or 28th of each month?',
            createdAt: now,
          },
        ],
        createdAt: now,
        updatedAt: now,
      },
    ],
    cmsContent: {
      announcementBanner: {
        enabled: true,
        title: 'Verified PG Onboarding & QR Desk Check-in',
        message: 'Scan any verified PG reception QR code to request joining with transparent house rules and deposit receipts.',
        audience: 'ALL',
      },
      landingHighlights: [
        {
          id: 'hl_1',
          title: 'Two-Gate PG Verification',
          description: 'Every public PG passes both property compliance review and independent coordinate verification.',
        },
        {
          id: 'hl_2',
          title: 'Private Document Handling',
          description: 'Verification IDs remain private between tenant and PG owner with zero Aadhaar collection by default.',
        },
        {
          id: 'hl_3',
          title: 'Single Modular Ledger',
          description: 'Tenants, owners, and administrators operate on one synchronized source of truth.',
        },
      ],
      faqs: [
        {
          id: 'faq_1',
          question: 'Are all PG properties on PG Finder verified?',
          answer: 'Every property must pass two independent Super Admin checks—Property Compliance Approval and Physical Location Coordinate Verification—plus hold an active listing entitlement before appearing in public search.',
          audience: 'ALL',
        },
        {
          id: 'faq_2',
          question: 'How does the ₹199 Basic lifetime listing work for PG owners?',
          answer: 'PG owners start on Basic at ₹0/month with access to full tenant, rent, and expense management. Each approved and location-verified PG can be published permanently for a one-time ₹199 fee.',
          audience: 'PG_OWNERS',
        },
        {
          id: 'faq_3',
          question: 'Can a tenant hold multiple active PG stays at once?',
          answer: 'No. PG Finder enforces one active stay per tenant to keep bed availability, monthly rent ledgers, and checkout settlements accurate.',
          audience: 'TENANTS',
        },
      ],
      policies: {
        termsSummary: 'PG Finder connects verified PG operators and residents with transparent rent, deposit, and house rule tracking. Platform listing fees and owner rent ledgers are accounted separately.',
        privacySummary: 'We never collect Aadhaar numbers/scans by default, never run continuous background GPS tracking, and never expose resident room or bed assignments in public startup event feeds.',
        residentRulesTemplate: 'Standard 30-day checkout notice period; quiet hours after 10:30 PM; visitor sign-in at reception; timely monthly rent settlement by the 28th.',
        updatedAt: now,
      },
    },
    broadcasts: [],
    auditLogs: [
      {
        id: 'aud_1',
        actorId: 'usr_admin_root',
        actorName: 'Arjun Menon (Super Admin)',
        actorRole: UserRole.SUPER_ADMIN,
        action: 'PROPERTY_APPROVED',
        targetType: 'PROPERTY',
        targetId: 'pg_green_nest',
        details: 'Approved Green Nest PG after compliance & photo verification.',
        createdAt: now,
      },
    ],
    activityLogs: [
      {
        id: 'act_1',
        ownerId: 'usr_owner_vikram',
        propertyId: 'pg_green_nest',
        actorId: 'usr_owner_vikram',
        actorName: 'Vikram Reddy',
        actorRole: UserRole.PG_OWNER,
        action: 'DOCUMENT_VERIFIED',
        entityType: 'TENANT_DOCUMENT',
        entityId: 'tdoc_ananya_1',
        previousValue: 'PENDING',
        newValue: 'VERIFIED',
        timestamp: '2026-09-01T10:00:00.000Z',
      },
    ],
    admobSettings: {
      enabled: true,
      environment: 'test',
      bannerEnabled: true,
      nativeEnabled: true,
      interstitialEnabled: false,
      rewardedEnabled: true,
      dailyInterstitialCap: 2,
      adFreeCheckoutAndPayments: true,
      appId: 'ca-app-pub-3940256099942544~3347511713',
      bannerUnitId: 'ca-app-pub-3940256099942544/6300978111',
      nativeUnitId: 'ca-app-pub-3940256099942544/2247696110',
      interstitialUnitId: 'ca-app-pub-3940256099942544/1033173712',
      rewardedUnitId: 'ca-app-pub-3940256099942544/5224354917',
      appOpenUnitId: 'ca-app-pub-3940256099942544/9257395921',
      childDirectedTreatment: false,
    },
  };
}

class Repository {
  private state: DatabaseState;
  public otpStore: Map<string, OtpChallenge> = new Map();
  public loginAttempts: Map<string, { count: number; resetAt: number }> = new Map();

  constructor() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw) as Partial<DatabaseState>;
        const seed = createSeedState();
        this.state = {
          ...seed,
          ...parsed,
          floors: parsed.floors ?? seed.floors,
          bedTransfers: parsed.bedTransfers ?? seed.bedTransfers,
          propertyDocuments: parsed.propertyDocuments ?? seed.propertyDocuments,
          tenantDocuments: parsed.tenantDocuments ?? seed.tenantDocuments,
          outstandingDues: parsed.outstandingDues ?? seed.outstandingDues,
          mealPreferences: parsed.mealPreferences ?? seed.mealPreferences,
          mealFeedbacks: parsed.mealFeedbacks ?? seed.mealFeedbacks,
          staffTasks: parsed.staffTasks ?? seed.staffTasks,
          payrollRecords: parsed.payrollRecords ?? seed.payrollRecords,
          reviews: parsed.reviews ?? seed.reviews,
          activityLogs: parsed.activityLogs ?? seed.activityLogs,
          roommateTasks: parsed.roommateTasks ?? seed.roommateTasks,
          laundryRequests: parsed.laundryRequests ?? seed.laundryRequests,
          supportTickets: parsed.supportTickets ?? seed.supportTickets,
          cmsContent: parsed.cmsContent ?? seed.cmsContent,
          broadcasts: parsed.broadcasts ?? seed.broadcasts,
          readNoticeIds: parsed.readNoticeIds ?? seed.readNoticeIds,
          recentPropertyIds: parsed.recentPropertyIds ?? seed.recentPropertyIds,
          admobSettings: { ...seed.admobSettings, ...(parsed.admobSettings || {}) },
        };
      } catch {
        this.state = createSeedState();
        this.persist();
      }
    } else {
      this.state = createSeedState();
      this.persist();
    }
  }

  public getState(): DatabaseState {
    return this.state;
  }

  public recordActivity(entry: Omit<ActivityLogEntry, 'id' | 'timestamp'>): void {
    this.state.activityLogs.unshift({
      ...entry,
      id: `act_${crypto.randomUUID().slice(0, 8)}`,
      timestamp: new Date().toISOString(),
    });
  }

  public persist(): void {
    fs.writeFileSync(DB_FILE, JSON.stringify(this.state, null, 2), 'utf-8');
  }

  public resetSeed(): void {
    this.state = createSeedState();
    this.persist();
  }
}

export const db = new Repository();
