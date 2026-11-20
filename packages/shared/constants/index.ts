import { ExpenseCategory, LawfulDocumentType, SubscriptionTier } from '../types';

export const SUBSCRIPTION_PLANS: Record<
  SubscriptionTier,
  {
    tier: SubscriptionTier;
    name: string;
    audience: string;
    monthlyPriceInr: number;
    annualSuggestedInr: number;
    maxActiveListings: number | null;
    lifetimeFeePerPropertyInr: number;
    features: string[];
  }
> = {
  [SubscriptionTier.BASIC]: {
    tier: SubscriptionTier.BASIC,
    name: 'Basic',
    audience: 'For individual PG owners starting out',
    monthlyPriceInr: 0,
    annualSuggestedInr: 0,
    maxActiveListings: null,
    lifetimeFeePerPropertyInr: 199,
    features: [
      '₹199 one-time lifetime listing fee per approved & verified PG',
      'Unlimited property submissions & approval tracking',
      'Floors, rooms, beds, tenant joining & checkout workflows',
      'Rent tracking, receipts, full expense ledger & CSV export',
      'Complaints, maintenance & basic Tracking Center',
    ],
  },
  [SubscriptionTier.PRO]: {
    tier: SubscriptionTier.PRO,
    name: 'Pro',
    audience: 'For growing operators with up to 5 PGs',
    monthlyPriceInr: 199,
    annualSuggestedInr: 1999,
    maxActiveListings: 5,
    lifetimeFeePerPropertyInr: 0,
    features: [
      'Up to 5 active PG listings covered while subscribed',
      'No separate ₹199 lifetime listing fee while active',
      'Advanced 11-tab Tracking Center & verification timelines',
      'Automated rent reminders, late fees & maintenance follow-ups',
      'Advanced outstanding dues tracking across active & former tenants',
    ],
  },
  [SubscriptionTier.BUSINESS]: {
    tier: SubscriptionTier.BUSINESS,
    name: 'Business',
    audience: 'For multi-property PG portfolios up to 20 PGs',
    monthlyPriceInr: 499,
    annualSuggestedInr: 4999,
    maxActiveListings: 20,
    lifetimeFeePerPropertyInr: 0,
    features: [
      'Up to 20 active PG listings covered while subscribed',
      'Multi-PG Tracking Center across all properties',
      'Staff accounts, role-limited permissions & task assignments',
      'Staff attendance tracking & monthly payroll payouts',
      'Bulk reminders, activity audits & priority support',
    ],
  },
};

export const PROMOTION_PACKAGES = [
  { id: 'promo_7d', label: '7-Day Boost', days: 7, priceInr: 299 },
  { id: 'promo_30d', label: '30-Day Featured', days: 30, priceInr: 799 },
  { id: 'promo_90d', label: '90-Day Spotlight', days: 90, priceInr: 1999 },
];

export const BUSINESS_AD_PACKAGES = [
  { id: 'ad_7d', label: '7-Day Local Reach', days: 7, priceInr: 499 },
  { id: 'ad_30d', label: '30-Day Neighbourhood', days: 30, priceInr: 1499 },
  { id: 'ad_90d', label: '90-Day Citywide', days: 90, priceInr: 3999 },
];

export const PG_AMENITIES = [
  'High-Speed Wi-Fi',
  '3-Time Homely Meals',
  'Power Backup',
  'CCTV Security',
  'Washing Machine',
  'Biometric Access',
  'RO Drinking Water',
  'Housekeeping',
  'Parking',
  'Air Conditioning',
  'Study Lounge',
  'Refrigerator',
];

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  [ExpenseCategory.GROCERIES]: 'Groceries',
  [ExpenseCategory.ELECTRICITY]: 'Electricity',
  [ExpenseCategory.WATER]: 'Water',
  [ExpenseCategory.INTERNET]: 'Internet',
  [ExpenseCategory.SALARIES]: 'Salaries',
  [ExpenseCategory.MAINTENANCE]: 'Maintenance',
  [ExpenseCategory.CLEANING]: 'Cleaning',
  [ExpenseCategory.RENT]: 'Rent',
  [ExpenseCategory.SUPPLIES]: 'Supplies',
  [ExpenseCategory.OTHER]: 'Other',
};

export const LAWFUL_DOCUMENT_LABELS: Record<LawfulDocumentType, string> = {
  INSTITUTION_ID: 'College / Employer ID Card',
  DRIVING_LICENSE: 'Driving License',
  PASSPORT: 'Passport',
  LOCAL_POLICE_VERIFICATION: 'Local Police Verification / Address Proof',
  SIGNED_AGREEMENT: 'Signed PG Stay Agreement',
  OTHER: 'Other Lawful Document',
};

export const STAFF_PERMISSION_OPTIONS = [
  'VIEW_RESIDENTS',
  'LOG_PARCELS',
  'UPDATE_MAINTENANCE',
  'VIEW_MEAL_COUNT',
  'MANAGE_CLEANING',
  'COLLECT_RENT_RECEIPT',
];

export const EVENT_CATEGORIES = [
  'Startup Networking',
  'Founder Meetups',
  'Entrepreneurship',
  'AI & Technology',
  'Hackathons',
  'Startup Workshops',
  'Investor Networking',
  'Product & Innovation',
  'Business Growth',
];

export const INDIAN_CITIES = ['Hyderabad', 'Bengaluru', 'Pune', 'Chennai', 'Mumbai', 'Delhi NCR'];
