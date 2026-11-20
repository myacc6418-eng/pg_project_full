import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Search,
  MapPin,
  ShieldCheck,
  Check,
  ChevronDown,
  ArrowRight,
  CalendarDays,
  Store,
} from 'lucide-react';
import { PublicHeader, PublicFooter } from '../../layouts/PublicShell';
import { SafeImage } from '../../components/ui/SafeImage';
import { formatInr, StatusIndicator } from '../../components/ui/CommonUI';
import { apiFetch } from '../../services/api';
import { Property, PropertyGenderType, StartupEvent } from '../../../packages/shared/types';
import { INDIAN_CITIES, SUBSCRIPTION_PLANS } from '../../../packages/shared/constants';

interface EnrichedPublicProperty extends Property {
  availableBeds: number;
  totalBeds: number;
}

const FAQS = [
  {
    q: 'Are all PG properties on PG Finder verified?',
    a: 'Every property must pass two independent Super Admin checks—Property Compliance Approval and Physical Location Coordinate Verification—plus hold an active listing entitlement before appearing in public search.',
  },
  {
    q: 'How does the ₹199 Basic lifetime listing work for PG owners?',
    a: 'PG owners start on Basic at ₹0/month with access to full tenant, rent, and expense management. Each approved and location-verified PG can be published permanently for a one-time ₹199 fee.',
  },
  {
    q: 'Can a PG owner access the dashboard immediately after signing up?',
    a: 'Yes. Owner accounts do not wait for Super Admin account approval. Once verified via OTP, you can access the Owner Dashboard immediately and submit your first property.',
  },
  {
    q: 'Can a tenant hold multiple active PG stays at once?',
    a: 'No. PG Finder enforces one active stay per tenant to keep bed availability, monthly rent ledgers, and checkout settlements accurate.',
  },
];

export function LandingPage() {
  const navigate = useNavigate();
  const [featuredProps, setFeaturedProps] = useState<EnrichedPublicProperty[]>([]);
  const [events, setEvents] = useState<StartupEvent[]>([]);
  const [searchCity, setSearchCity] = useState('Hyderabad');
  const [searchLocality, setSearchLocality] = useState('');
  const [searchGender, setSearchGender] = useState('ALL');
  const [searchBudget, setSearchBudget] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    apiFetch<{ properties: EnrichedPublicProperty[] }>('/api/v1/properties/public')
      .then((res) => setFeaturedProps(res.properties.slice(0, 3)))
      .catch(() => {});
    apiFetch<{ events: StartupEvent[] }>('/api/v1/events/published')
      .then((res) => setEvents(res.events.slice(0, 2)))
      .catch(() => {});
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchCity !== 'ALL') params.set('city', searchCity);
    if (searchLocality.trim()) params.set('locality', searchLocality.trim());
    if (searchGender !== 'ALL') params.set('genderType', searchGender);
    if (searchBudget) params.set('maxRent', searchBudget);
    navigate(`/explore?${params.toString()}`);
  };

  return (
    <div className="h-[100dvh] overflow-y-auto overflow-x-hidden bg-[#F8FAFC] dark:bg-[#0B1220] flex flex-col transition-colors">
      <PublicHeader />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-white dark:bg-[#111827] border-b border-[#E5E7EB] dark:border-[#374151]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-16 lg:py-20 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="lg:col-span-6 flex flex-col justify-center"
            >
              <p className="text-xs font-semibold tracking-wide text-[#047857] dark:text-[#34D399]">
                Verified PG Living Across India · Demo Preview Environment
              </p>
              <h1 className="mt-3 font-display text-3xl sm:text-5xl font-extrabold text-[#111827] dark:text-[#F9FAFB] leading-[1.12] tracking-tight text-balance">
                Find Your Perfect PG. Live Smarter.
              </h1>
              <p className="mt-4 text-base sm:text-lg text-[#6B7280] dark:text-[#9CA3AF] leading-relaxed max-w-xl">
                Discover verified PG accommodations, manage your stay, explore local services, and connect with new opportunities — all in one place.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link
                  to="/explore"
                  className="min-h-[48px] px-6 py-3 rounded-xl bg-[#047857] hover:bg-[#065F46] dark:bg-[#10B981] dark:hover:bg-[#059669] text-white dark:text-[#0B1220] text-sm font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
                >
                  Explore PGs
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/register?role=PG_OWNER"
                  className="min-h-[48px] px-6 py-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#1F2937] hover:bg-[#F8FAFC] dark:hover:bg-[#374151] text-[#111827] dark:text-[#F9FAFB] text-sm font-semibold inline-flex items-center transition-colors whitespace-nowrap shrink-0"
                >
                  List Your PG
                </Link>
              </div>
            </motion.div>

            <div className="lg:col-span-6">
              <div className="h-64 sm:h-80 lg:h-full min-h-[320px] rounded-2xl overflow-hidden border border-[#E5E7EB] dark:border-[#374151]">
                <SafeImage
                  src="/src/assets/images/hero_pg_living_1795149981776.jpg"
                  alt="Sunlit modern Indian co-living PG lounge and study workspace"
                  fallbackTitle="Modern Co-Living Residence"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>

          {/* Search Strip */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-10">
            <form
              onSubmit={handleSearch}
              className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3"
            >
              <div>
                <label className="block text-xs font-medium text-[#6B7280] dark:text-[#9CA3AF] mb-1">City</label>
                <select
                  value={searchCity}
                  onChange={(e) => setSearchCity(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-xl bg-white dark:bg-[#111827] border border-[#E5E7EB] dark:border-[#374151] text-sm text-[#111827] dark:text-[#F9FAFB]"
                >
                  <option value="ALL">All Cities</option>
                  {INDIAN_CITIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#6B7280] dark:text-[#9CA3AF] mb-1">Locality</label>
                <input
                  type="text"
                  placeholder="Madhapur, Gachibowli..."
                  value={searchLocality}
                  onChange={(e) => setSearchLocality(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-xl bg-white dark:bg-[#111827] border border-[#E5E7EB] dark:border-[#374151] text-sm text-[#111827] dark:text-[#F9FAFB]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#6B7280] dark:text-[#9CA3AF] mb-1">Preference</label>
                <select
                  value={searchGender}
                  onChange={(e) => setSearchGender(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-xl bg-white dark:bg-[#111827] border border-[#E5E7EB] dark:border-[#374151] text-sm text-[#111827] dark:text-[#F9FAFB]"
                >
                  <option value="ALL">Boys / Girls / Co-living</option>
                  <option value={PropertyGenderType.COLIVING}>Co-living</option>
                  <option value={PropertyGenderType.BOYS}>Boys PG</option>
                  <option value={PropertyGenderType.GIRLS}>Girls PG</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#6B7280] dark:text-[#9CA3AF] mb-1">Max Budget (₹)</label>
                <input
                  type="number"
                  placeholder="e.g. 12000"
                  value={searchBudget}
                  onChange={(e) => setSearchBudget(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-xl bg-white dark:bg-[#111827] border border-[#E5E7EB] dark:border-[#374151] text-sm text-[#111827] dark:text-[#F9FAFB] tabular-nums"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full min-h-[44px] px-5 rounded-xl bg-[#047857] hover:bg-[#065F46] dark:bg-[#10B981] dark:hover:bg-[#059669] text-white dark:text-[#0B1220] text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
                >
                  <Search className="w-4 h-4" />
                  Search Verified PGs
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* Featured Approved Properties */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#111827] dark:text-[#F9FAFB]">
                Featured Approved PGs
              </h2>
              <p className="mt-1.5 text-sm text-[#6B7280] dark:text-[#9CA3AF]">
                Fictional demo properties passing approval, location verification, and listing entitlement checks.
              </p>
            </div>
            <Link
              to="/explore"
              className="text-sm font-semibold text-[#047857] dark:text-[#34D399] hover:underline inline-flex items-center gap-1 whitespace-nowrap"
            >
              View all listings
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            {featuredProps.map((pg) => (
              <Link
                key={pg.id}
                to={`/pg/${pg.id}`}
                className="group rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] overflow-hidden hover:border-[#047857]/40 dark:hover:border-[#34D399]/50 transition-colors flex flex-col"
              >
                <div className="aspect-[4/3] overflow-hidden bg-[#ECFDF5] dark:bg-[#1F2937]">
                  <SafeImage
                    src={pg.images[0]}
                    alt={pg.name}
                    fallbackTitle={pg.name}
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                  />
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex items-center justify-between gap-2 text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                    <span>
                      {pg.locality}, {pg.city} · {pg.genderType === 'COLIVING' ? 'Co-living' : pg.genderType === 'BOYS' ? 'Boys' : 'Girls'}
                    </span>
                    {pg.isPromoted && <span className="font-semibold text-[#047857] dark:text-[#34D399]">Sponsored</span>}
                  </div>
                  <h3 className="mt-1.5 text-lg font-bold text-[#111827] dark:text-[#F9FAFB]">{pg.name}</h3>
                  <p className="mt-1 text-xs text-[#6B7280] dark:text-[#9CA3AF] line-clamp-2">{pg.amenities.slice(0, 4).join(' · ')}</p>

                  <div className="mt-4 pt-4 border-t border-[#E5E7EB] dark:border-[#374151] flex items-center justify-between">
                    <div>
                      <span className="font-mono text-lg font-bold text-[#111827] dark:text-[#F9FAFB] tabular-nums">
                        {formatInr(pg.startingRentInr)}
                      </span>
                      <span className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">/mo</span>
                    </div>
                    <div className="text-right">
                      <StatusIndicator status="success" label="Verified Location" />
                      <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] tabular-nums mt-0.5">
                        {pg.availableBeds} {pg.availableBeds === 1 ? 'bed' : 'beds'} open
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="bg-white dark:bg-[#111827] border-y border-[#E5E7EB] dark:border-[#374151]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div>
              <p className="text-xs font-semibold text-[#047857] dark:text-[#34D399]">For Tenants</p>
              <h2 className="mt-1.5 font-display text-2xl font-bold text-[#111827] dark:text-[#F9FAFB]">
                From discovery to daily stay management
              </h2>
              <ol className="mt-6 space-y-4">
                {[
                  ['01. Explore PGs', 'Filter verified properties by city, locality, rent budget, and open beds.'],
                  ['02. Compare Accommodation', 'Inspect room types, deposits, weekly mess menus, and house rules.'],
                  ['03. Request to Join', 'Submit a joining request online or scan a PG QR code at the desk.'],
                  ['04. Complete Onboarding', 'Owner assigns your bed and you accept clear PG terms digitally.'],
                  ['05. Manage Daily PG Life', 'Track rent receipts, menus, notices, parcels, complaints, and checkout.'],
                ].map(([title, desc]) => (
                  <li key={title} className="pb-4 border-b border-[#E5E7EB] dark:border-[#374151] last:border-b-0">
                    <h3 className="text-sm font-bold text-[#111827] dark:text-[#F9FAFB]">{title}</h3>
                    <p className="mt-1 text-sm text-[#6B7280] dark:text-[#9CA3AF]">{desc}</p>
                  </li>
                ))}
              </ol>
            </div>

            <div id="for-owners">
              <p className="text-xs font-semibold text-[#047857] dark:text-[#34D399]">For PG Owners</p>
              <h2 className="mt-1.5 font-display text-2xl font-bold text-[#111827] dark:text-[#F9FAFB]">
                Structured onboarding with real operational control
              </h2>
              <ol className="mt-6 space-y-4">
                {[
                  ['01. Create Owner Account', 'Register and verify via OTP — instant dashboard access even with 0 properties.'],
                  ['02. Add PG Property', 'Use the 10-step wizard to configure floors, rooms, beds, pricing, and rules.'],
                  ['03. Request Location Verification', 'Submit exact address and pin for independent coordinate verification.'],
                  ['04. Property Approval', 'Super Admin reviews compliance and records transparent audit feedback.'],
                  ['05. Activate Listing Entitlement', 'Publish via ₹199 one-time lifetime fee or active Pro/Business plan.'],
                  ['06. Manage Operations & Finance', 'Track rent, expenses, complaints, maintenance, and staff in one ledger.'],
                ].map(([title, desc]) => (
                  <li key={title} className="pb-4 border-b border-[#E5E7EB] dark:border-[#374151] last:border-b-0">
                    <h3 className="text-sm font-bold text-[#111827] dark:text-[#F9FAFB]">{title}</h3>
                    <p className="mt-1 text-sm text-[#6B7280] dark:text-[#9CA3AF]">{desc}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* Startup Events & Local Services */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14 grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-[#047857] dark:text-[#34D399]">
                <CalendarDays className="w-5 h-5" />
                <h2 className="font-display text-xl font-bold text-[#111827] dark:text-[#F9FAFB]">Startup Events &amp; Networking</h2>
              </div>
              <Link to="/events" className="text-sm font-semibold text-[#047857] dark:text-[#34D399] hover:underline whitespace-nowrap">
                Browse all events
              </Link>
            </div>
            <p className="mt-2 text-sm text-[#6B7280] dark:text-[#9CA3AF]">
              Shared calendar of founder meetups, AI hackathons, and workshops curated for PG residents and owners.
            </p>
            <div className="mt-5 space-y-3">
              {events.map((ev) => (
                <div key={ev.id} className="p-4 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151]">
                  <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                    {ev.category} · {ev.city} · {new Date(ev.dateTime).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </p>
                  <h3 className="mt-1 text-sm font-bold text-[#111827] dark:text-[#F9FAFB]">{ev.title}</h3>
                  <p className="mt-0.5 text-xs text-[#6B7280] dark:text-[#9CA3AF]">{ev.venue}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5 rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-[#047857] dark:text-[#34D399]">
                <Store className="w-5 h-5" />
                <h2 className="font-display text-xl font-bold text-[#111827] dark:text-[#F9FAFB]">PG Finder Local</h2>
              </div>
              <p className="mt-2 text-sm text-[#6B7280] dark:text-[#9CA3AF] leading-relaxed">
                Explore nearby tiffin kitchens, laundry pickup, groceries, gyms, and commute options around Madhapur, Gachibowli, and Kondapur—without continuous background GPS tracking.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-[#111827] dark:text-[#F9FAFB]">
                <li className="flex items-center gap-2"><MapPin className="w-4 h-4 text-[#047857] dark:text-[#34D399]" /> City &amp; locality-scoped neighbourhood offers</li>
                <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-[#047857] dark:text-[#34D399]" /> Sponsored deals clearly labeled apart from organic listings</li>
              </ul>
            </div>
            <Link
              to="/events"
              className="mt-6 min-h-[44px] px-4 py-2.5 rounded-xl bg-[#ECFDF5] dark:bg-[#10B981]/15 text-[#047857] dark:text-[#34D399] hover:bg-[#D1FAE5] dark:hover:bg-[#10B981]/25 text-sm font-semibold inline-flex items-center justify-center transition-colors"
            >
              Explore Events &amp; Local Services
            </Link>
          </div>
        </section>

        {/* Owner Pricing */}
        <section id="pricing" className="bg-white dark:bg-[#111827] border-y border-[#E5E7EB] dark:border-[#374151]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
            <div className="max-w-2xl">
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#111827] dark:text-[#F9FAFB]">
                Transparent Owner Plans
              </h2>
              <p className="mt-2 text-sm text-[#6B7280] dark:text-[#9CA3AF]">
                Expense tracking and core financial reports are included on every plan—including Basic. Subscriptions never bypass property approval or location verification.
              </p>
            </div>

            <div className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
              {Object.values(SUBSCRIPTION_PLANS).map((plan) => (
                <div
                  key={plan.tier}
                  className={`rounded-2xl border p-6 flex flex-col justify-between ${
                    plan.tier === 'PRO'
                      ? 'border-[#047857] dark:border-[#34D399] bg-[#ECFDF5]/40 dark:bg-[#10B981]/10'
                      : 'border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#1F2937]'
                  }`}
                >
                  <div>
                    <p className="text-xs font-semibold text-[#047857] dark:text-[#34D399]">{plan.audience}</p>
                    <h3 className="mt-1 font-display text-xl font-bold text-[#111827] dark:text-[#F9FAFB]">{plan.name}</h3>
                    <div className="mt-4 flex items-baseline gap-1">
                      <span className="font-mono text-3xl font-bold text-[#111827] dark:text-[#F9FAFB] tabular-nums">
                        {formatInr(plan.monthlyPriceInr)}
                      </span>
                      <span className="text-sm text-[#6B7280] dark:text-[#9CA3AF]">/month</span>
                    </div>
                    <p className="mt-1 text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                      {plan.maxActiveListings
                        ? `Up to ${plan.maxActiveListings} active listings while subscribed`
                        : `₹${plan.lifetimeFeePerPropertyInr} one-time lifetime listing per approved PG`}
                    </p>
                    <ul className="mt-6 space-y-3">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2.5 text-sm text-[#374151] dark:text-[#D1D5DB]">
                          <Check className="w-4 h-4 text-[#047857] dark:text-[#34D399] shrink-0 mt-0.5" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Link
                    to="/register?role=PG_OWNER"
                    className={`mt-8 min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center transition-colors ${
                      plan.tier === 'PRO'
                        ? 'bg-[#047857] dark:bg-[#10B981] text-white dark:text-[#0B1220] hover:bg-[#065F46] dark:hover:bg-[#059669]'
                        : 'border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] text-[#111827] dark:text-[#F9FAFB] hover:bg-[#F8FAFC] dark:hover:bg-[#1F2937]'
                    }`}
                  >
                    Start with {plan.name}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
          <h2 className="font-display text-2xl font-bold text-[#111827] dark:text-[#F9FAFB] text-center">
            Frequently Asked Questions
          </h2>
          <div className="mt-8 space-y-3">
            {FAQS.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={item.q} className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full min-h-[52px] px-5 py-4 text-left flex items-center justify-between gap-4"
                  >
                    <span className="text-sm font-semibold text-[#111827] dark:text-[#F9FAFB]">{item.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-[#6B7280] dark:text-[#9CA3AF] shrink-0 transition-transform ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-4 text-sm text-[#6B7280] dark:text-[#9CA3AF] leading-relaxed border-t border-[#E5E7EB] dark:border-[#374151] pt-3">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
