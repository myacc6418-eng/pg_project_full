import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MapPin, Heart, List, Map as MapIcon, SlidersHorizontal, Building2, Star, ShieldCheck } from 'lucide-react';
import { PublicHeader, PublicFooter } from '../../layouts/PublicShell';
import { SafeImage } from '../../components/ui/SafeImage';
import { AdSlot } from '../../components/ui/AdSlot';
import { CardSkeleton, EmptyState, formatInr, StatusIndicator } from '../../components/ui/CommonUI';
import { apiFetch } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { Property, PropertyGenderType } from '../../../packages/shared/types';
import { INDIAN_CITIES, PG_AMENITIES } from '../../../packages/shared/constants';

interface EnrichedPG extends Property {
  availableBeds: number;
  totalBeds: number;
}

export function ExplorePGsPage({ embedded = false }: { embedded?: boolean }) {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [city, setCity] = useState(searchParams.get('city') || 'ALL');
  const [locality, setLocality] = useState(searchParams.get('locality') || '');
  const [genderType, setGenderType] = useState(searchParams.get('genderType') || 'ALL');
  const [roomType, setRoomType] = useState(searchParams.get('roomType') || 'ALL');
  const [maxRent, setMaxRent] = useState(searchParams.get('maxRent') || '');
  const [minBeds, setMinBeds] = useState('');
  const [amenity, setAmenity] = useState('');
  const [sort, setSort] = useState('FEATURED');
  const [listScope, setListScope] = useState<'ALL' | 'SAVED' | 'RECENT'>('ALL');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  const [properties, setProperties] = useState<EnrichedPG[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMapPg, setSelectedMapPg] = useState<EnrichedPG | null>(null);

  const fetchProperties = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (city !== 'ALL') qs.set('city', city);
      if (locality.trim()) qs.set('locality', locality.trim());
      if (genderType !== 'ALL') qs.set('genderType', genderType);
      if (roomType !== 'ALL') qs.set('roomType', roomType);
      if (maxRent) qs.set('maxRent', maxRent);
      if (minBeds) qs.set('minBeds', minBeds);
      if (amenity) qs.set('amenity', amenity);
      if (sort) qs.set('sort', sort);

      const data = await apiFetch<{
        properties: EnrichedPG[];
        savedIds: string[];
        recentlyViewedIds?: string[];
      }>(`/api/v1/properties/public?${qs.toString()}`);
      setProperties(data.properties);
      setSavedIds(data.savedIds || []);
      setRecentlyViewedIds(data.recentlyViewedIds || []);
      if (data.properties.length > 0) setSelectedMapPg(data.properties[0]);
    } catch {
      showToast('Could not load properties', 'Check your connection and retry.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, [city, genderType, roomType, amenity, sort]);

  const toggleSave = async (id: string) => {
    if (!user) {
      showToast('Login to save PGs', 'Sign in to bookmark PGs to your shortlist.', 'info');
      return;
    }
    try {
      const res = await apiFetch<{ savedIds: string[]; saved: boolean }>(`/api/v1/properties/saved/${id}`, {
        method: 'POST',
      });
      setSavedIds(res.savedIds);
      showToast(res.saved ? 'Saved to your shortlist' : 'Removed from saved PGs');
    } catch {
      showToast('Failed to update saved list', undefined, 'error');
    }
  };

  const displayedProperties = properties.filter((pg) => {
    if (listScope === 'SAVED') return savedIds.includes(pg.id);
    if (listScope === 'RECENT') return recentlyViewedIds.includes(pg.id);
    return true;
  });

  const content = (
    <div className={embedded ? '' : 'max-w-7xl mx-auto px-4 sm:px-6 py-8'}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#111827] dark:text-[#F9FAFB]">Explore Verified PGs</h1>
          <p className="mt-1 text-sm text-[#6B7280] dark:text-[#9CA3AF]">
            Showing properties with Super Admin approval, verified coordinates, and active listing entitlement.
          </p>
        </div>

        <div className="inline-flex items-center p-1 bg-white dark:bg-[#111827] border border-[#E5E7EB] dark:border-[#374151] rounded-xl self-start">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap ${
              viewMode === 'list' ? 'bg-[#047857] dark:bg-[#10B981] text-white dark:text-[#0B1220]' : 'text-[#6B7280] dark:text-[#9CA3AF]'
            }`}
          >
            <List className="w-4 h-4" />
            List View
          </button>
          <button
            type="button"
            onClick={() => setViewMode('map')}
            className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap ${
              viewMode === 'map' ? 'bg-[#047857] dark:bg-[#10B981] text-white dark:text-[#0B1220]' : 'text-[#6B7280] dark:text-[#9CA3AF]'
            }`}
          >
            <MapIcon className="w-4 h-4" />
            Map View
          </button>
        </div>
      </div>

      {/* Scope Tabs */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex flex-wrap gap-2">
          {[
            { id: 'ALL' as const, label: `All Verified PGs (${properties.length})` },
            { id: 'SAVED' as const, label: `Saved Shortlist (${savedIds.length})` },
            { id: 'RECENT' as const, label: `Recently Viewed (${recentlyViewedIds.length})` },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setListScope(item.id)}
              className={`min-h-[40px] px-3.5 rounded-xl text-xs font-semibold border transition-colors ${
                listScope === item.id
                  ? 'bg-[#ECFDF5] dark:bg-[#10B981]/15 border-[#047857] dark:border-[#34D399] text-[#047857] dark:text-[#34D399]'
                  : 'bg-white dark:bg-[#111827] border-[#E5E7EB] dark:border-[#374151] text-[#6B7280] dark:text-[#9CA3AF]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <select
          aria-label="Sort PGs"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="min-h-[40px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] text-xs font-semibold bg-white dark:bg-[#111827] text-[#111827] dark:text-[#F9FAFB]"
        >
          <option value="FEATURED">Sort: Featured &amp; Rating</option>
          <option value="RENT_ASC">Sort: Rent Low to High</option>
          <option value="RATING_DESC">Sort: Highest Rated</option>
        </select>
      </div>

      {/* Filters */}
      <div className="mt-4 rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <select
          aria-label="Filter by city"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] text-sm bg-[#F8FAFC] dark:bg-[#1F2937] text-[#111827] dark:text-[#F9FAFB]"
        >
          <option value="ALL">All Cities</option>
          {INDIAN_CITIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Locality (e.g. Madhapur)"
          value={locality}
          onChange={(e) => setLocality(e.target.value)}
          className="min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] text-sm bg-[#F8FAFC] dark:bg-[#1F2937] text-[#111827] dark:text-[#F9FAFB]"
        />

        <select
          aria-label="Filter by accommodation type"
          value={genderType}
          onChange={(e) => setGenderType(e.target.value)}
          className="min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] text-sm bg-[#F8FAFC] dark:bg-[#1F2937] text-[#111827] dark:text-[#F9FAFB]"
        >
          <option value="ALL">All PG Types</option>
          <option value={PropertyGenderType.COLIVING}>Co-living</option>
          <option value={PropertyGenderType.BOYS}>Boys PG</option>
          <option value={PropertyGenderType.GIRLS}>Girls PG</option>
        </select>

        <select
          aria-label="Filter by sharing type"
          value={roomType}
          onChange={(e) => setRoomType(e.target.value)}
          className="min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] text-sm bg-[#F8FAFC] dark:bg-[#1F2937] text-[#111827] dark:text-[#F9FAFB]"
        >
          <option value="ALL">All Sharing Types</option>
          <option value="SINGLE">Single Room</option>
          <option value="TWIN">Twin Sharing</option>
          <option value="TRIPLE">Triple Sharing</option>
          <option value="FOUR_SHARING">Four Sharing</option>
        </select>

        <input
          type="number"
          placeholder="Max Rent (₹)"
          value={maxRent}
          onChange={(e) => setMaxRent(e.target.value)}
          className="min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] text-sm bg-[#F8FAFC] dark:bg-[#1F2937] text-[#111827] dark:text-[#F9FAFB] tabular-nums"
        />

        <input
          type="number"
          min={1}
          placeholder="Min Open Beds"
          value={minBeds}
          onChange={(e) => setMinBeds(e.target.value)}
          className="min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] text-sm bg-[#F8FAFC] dark:bg-[#1F2937] text-[#111827] dark:text-[#F9FAFB] tabular-nums"
        />

        <select
          aria-label="Filter by amenity"
          value={amenity}
          onChange={(e) => setAmenity(e.target.value)}
          className="min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] text-sm bg-[#F8FAFC] dark:bg-[#1F2937] text-[#111827] dark:text-[#F9FAFB]"
        >
          <option value="">Any Amenity</option>
          {PG_AMENITIES.map((am) => (
            <option key={am} value={am}>{am}</option>
          ))}
        </select>

        <button
          type="button"
          onClick={fetchProperties}
          className="min-h-[44px] px-4 rounded-xl bg-[#047857] hover:bg-[#065F46] dark:bg-[#10B981] dark:hover:bg-[#059669] text-white dark:text-[#0B1220] text-sm font-semibold inline-flex items-center justify-center gap-2"
        >
          <SlidersHorizontal className="w-4 h-4" />
          Apply Filters
        </button>
      </div>

      {/* Results */}
      <div className="mt-6">
        {loading ? (
          <CardSkeleton rows={3} />
        ) : displayedProperties.length === 0 ? (
          <EmptyState
            icon={Building2}
            title={
              listScope === 'SAVED'
                ? 'No saved PGs yet'
                : listScope === 'RECENT'
                  ? 'No recently viewed PGs yet'
                  : 'No verified PGs match these filters'
            }
            description={
              listScope === 'SAVED'
                ? 'Tap the heart icon on any verified PG listing to save it to your shortlist.'
                : listScope === 'RECENT'
                  ? 'Open any property details page to track it here for quick comparison.'
                  : 'Try widening your budget or clearing the locality filter to see all verified properties.'
            }
            actionLabel={listScope === 'ALL' ? 'Reset Filters' : 'Browse All PGs'}
            onAction={() => {
              setListScope('ALL');
              setCity('ALL');
              setLocality('');
              setGenderType('ALL');
              setRoomType('ALL');
              setMaxRent('');
              setMinBeds('');
              setAmenity('');
            }}
          />
        ) : viewMode === 'list' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedProperties.map((pg) => {
              const isSaved = savedIds.includes(pg.id);
              const detailPath = user?.role === 'TENANT' ? `/tenant/pg/${pg.id}` : `/pg/${pg.id}`;
              return (
                <div
                  key={pg.id}
                  className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] overflow-hidden flex flex-col"
                >
                  <div className="relative aspect-[4/3] bg-[#ECFDF5] dark:bg-[#1F2937]">
                    <SafeImage
                      src={pg.images[0]}
                      alt={pg.name}
                      fallbackTitle={pg.name}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => toggleSave(pg.id)}
                      aria-label={isSaved ? 'Remove from saved' : 'Save PG'}
                      className="absolute top-3 right-3 min-h-[40px] min-w-[40px] rounded-full bg-white/95 dark:bg-[#111827]/95 border border-[#E5E7EB] dark:border-[#374151] flex items-center justify-center text-[#111827] dark:text-[#F9FAFB] hover:text-[#DC2626]"
                    >
                      <Heart className={`w-4 h-4 ${isSaved ? 'fill-[#DC2626] text-[#DC2626]' : ''}`} />
                    </button>
                  </div>

                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex items-center justify-between gap-2 text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                      <span>
                        {pg.locality}, {pg.city} · {pg.genderType}
                      </span>
                      {pg.isPromoted && <span className="font-semibold text-[#047857] dark:text-[#34D399]">Sponsored</span>}
                    </div>
                    <h2 className="mt-1.5 text-lg font-bold text-[#111827] dark:text-[#F9FAFB]">{pg.name}</h2>
                    <div className="mt-1 flex items-center gap-2 text-xs text-[#047857] dark:text-[#34D399] font-medium">
                      <span className="inline-flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Verified Pin
                      </span>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1 text-[#B45309] dark:text-[#FBBF24] tabular-nums">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        {pg.rating > 0 ? `${pg.rating.toFixed(1)} (${pg.reviewCount})` : 'New'}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs text-[#6B7280] dark:text-[#9CA3AF] line-clamp-2">{pg.description}</p>

                    <div className="mt-3 text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                      {pg.amenities.slice(0, 4).join(' · ')}
                    </div>

                    <div className="mt-auto pt-4 border-t border-[#E5E7EB] dark:border-[#374151] flex items-center justify-between gap-3">
                      <div>
                        <span className="font-mono text-lg font-bold text-[#111827] dark:text-[#F9FAFB] tabular-nums">
                          {formatInr(pg.startingRentInr)}
                        </span>
                        <span className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">/mo</span>
                        <p className="text-xs text-[#047857] dark:text-[#34D399] font-medium tabular-nums">
                          {pg.availableBeds} beds available
                        </p>
                      </div>
                      <Link
                        to={detailPath}
                        className="min-h-[44px] px-4 py-2 rounded-xl bg-[#047857] hover:bg-[#065F46] dark:bg-[#10B981] dark:hover:bg-[#059669] text-white dark:text-[#0B1220] text-xs font-semibold inline-flex items-center whitespace-nowrap"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Dark-Mode Aware Interactive Verified Coordinate Pin Map View */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5">
              <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB] dark:border-[#374151]">
                <div>
                  <h2 className="text-sm font-bold text-[#111827] dark:text-[#F9FAFB]">Verified Hyderabad &amp; Metro Locality Map</h2>
                  <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                    Only Super Admin verified coordinates are plotted. Unverified properties are excluded.
                  </p>
                </div>
                <StatusIndicator status="success" label="Verified Pins Only" />
              </div>

              <div className="mt-4 relative min-h-80 rounded-xl bg-[#ECFDF5] dark:bg-[#0B1220] border border-[#E5E7EB] dark:border-[#374151] overflow-hidden p-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                  {displayedProperties.map((pg) => {
                    const active = selectedMapPg?.id === pg.id;
                    return (
                      <button
                        key={pg.id}
                        type="button"
                        onClick={() => setSelectedMapPg(pg)}
                        className={`p-4 rounded-xl border text-left transition-all ${
                          active
                            ? 'bg-[#047857] dark:bg-[#10B981] text-white dark:text-[#0B1220] border-[#065F46] dark:border-[#34D399] shadow-md'
                            : 'bg-white dark:bg-[#1F2937] text-[#111827] dark:text-[#F9FAFB] border-[#E5E7EB] dark:border-[#374151] hover:border-[#047857] dark:hover:border-[#34D399]'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 shrink-0" />
                          <span className="text-sm font-bold truncate">{pg.name}</span>
                        </div>
                        <p className={`mt-1 text-xs ${active ? 'text-emerald-100 dark:text-[#064E3B]' : 'text-[#6B7280] dark:text-[#9CA3AF]'}`}>
                          {pg.locality} · {pg.availableBeds} beds open
                        </p>
                        <p className={`mt-2 font-mono text-xs tabular-nums ${active ? 'text-white dark:text-[#0B1220]' : 'text-[#047857] dark:text-[#34D399]'}`}>
                          {pg.verifiedLat?.toFixed(4)}, {pg.verifiedLng?.toFixed(4)}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="lg:col-span-4">
              {selectedMapPg && (
                <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] overflow-hidden">
                  <div className="aspect-[4/3]">
                    <SafeImage
                      src={selectedMapPg.images[0]}
                      alt={selectedMapPg.name}
                      fallbackTitle={selectedMapPg.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-5">
                    <StatusIndicator status="success" label="Admin-Verified Location" />
                    <h3 className="mt-2 text-lg font-bold text-[#111827] dark:text-[#F9FAFB]">{selectedMapPg.name}</h3>
                    <p className="mt-1 text-xs text-[#6B7280] dark:text-[#9CA3AF]">{selectedMapPg.address}</p>
                    <p className="mt-3 font-mono text-lg font-bold text-[#111827] dark:text-[#F9FAFB] tabular-nums">
                      {formatInr(selectedMapPg.startingRentInr)}/mo
                    </p>
                    <Link
                      to={user?.role === 'TENANT' ? `/tenant/pg/${selectedMapPg.id}` : `/pg/${selectedMapPg.id}`}
                      className="mt-4 w-full min-h-[44px] rounded-xl bg-[#047857] dark:bg-[#10B981] text-white dark:text-[#0B1220] text-sm font-semibold flex items-center justify-center"
                    >
                      Open Property Details
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <AdSlot variant="banner" slotId="explore_pgs_bottom" className="mt-8" />
    </div>
  );

  if (embedded) return content;

  return (
    <div className="h-[100dvh] overflow-y-auto overflow-x-hidden bg-[#F8FAFC] dark:bg-[#0B1220] flex flex-col transition-colors">
      <PublicHeader />
      <main className="flex-1">{content}</main>
      <PublicFooter />
    </div>
  );
}
