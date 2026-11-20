import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Megaphone } from 'lucide-react';
import { AdMobSettings } from '../../../packages/shared/types';
import { adService } from '../../services/adService';
import { apiFetch } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

const AD_FREE_ROUTES = ['/login', '/register', '/owner/finance', '/tenant/my-pg', '/admin', '/join'];

let cachedConfig: AdMobSettings | null = null;
let inflightRequest: Promise<AdMobSettings | null> | null = null;

export function invalidateAdMobCache() {
  cachedConfig = null;
  inflightRequest = null;
}

async function fetchAdMobConfig(): Promise<AdMobSettings | null> {
  if (cachedConfig) return cachedConfig;
  if (!inflightRequest) {
    inflightRequest = apiFetch<{ settings: AdMobSettings }>('/api/v1/monetization/admob/config', {}, false)
      .then((res) => {
        cachedConfig = res.settings;
        adService.initialize(res.settings);
        return res.settings;
      })
      .catch(() => null)
      .finally(() => {
        inflightRequest = null;
      });
  }
  return inflightRequest;
}

export function AdSlot({
  variant = 'banner',
  slotId = 'discovery_default',
  className = '',
}: {
  variant?: 'banner' | 'native';
  slotId?: string;
  className?: string;
}) {
  const location = useLocation();
  const { user } = useAuth();
  const [settings, setSettings] = useState<AdMobSettings | null>(cachedConfig);

  useEffect(() => {
    let active = true;
    fetchAdMobConfig().then((cfg) => {
      if (active && cfg) setSettings(cfg);
    });
    return () => {
      active = false;
    };
  }, []);

  // Strictly suppress ads on checkout, payments, KYC, auth, and admin routes
  if (AD_FREE_ROUTES.some((prefix) => location.pathname.startsWith(prefix))) {
    return null;
  }

  if (!settings || !settings.enabled) return null;
  if (variant === 'banner' && !settings.bannerEnabled) return null;
  if (variant === 'native' && !settings.nativeEnabled) return null;

  const unitId =
    variant === 'banner'
      ? settings.bannerUnitId || 'ca-app-pub-3940256099942544/6300978111'
      : settings.nativeUnitId || 'ca-app-pub-3940256099942544/2247696110';

  const adLabel = user?.consentPersonalizedAds
    ? 'Sponsored Partner Placement'
    : 'Contextual Sponsored Placement';

  return (
    <aside
      aria-label="Sponsored placement"
      data-slot={slotId}
      className={`rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#ECFDF5] dark:bg-[#10B981]/15 text-[#047857] dark:text-[#34D399] flex items-center justify-center shrink-0">
          <Megaphone className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">
            <span className="font-semibold text-[#047857] dark:text-[#34D399]">Ad</span>
            <span>·</span>
            <span>{adLabel}</span>
            {settings.environment === 'test' && (
              <>
                <span>·</span>
                <span className="font-mono text-[#B45309] dark:text-[#FBBF24]">ADMOB TEST MODE</span>
              </>
            )}
          </div>
          <p className="mt-0.5 text-sm font-bold text-[#111827] dark:text-[#F9FAFB]">
            {variant === 'native'
              ? 'Zero-Deposit Home Essentials & Workstation Rentals'
              : 'PG Resident Fibre Wi-Fi & Commute Pass Deals'}
          </p>
          <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
            {variant === 'native'
              ? 'Furnish your study desk or rent ergonomic chairs around Madhapur & Indiranagar.'
              : `Capacitor AdMob Slot (${unitId.slice(-10)}) · Strictly excluded from rent & KYC flows.`}
          </p>
        </div>
      </div>

      <Link
        to={user?.role === 'TENANT' ? '/tenant/connect' : '/events'}
        className="min-h-[40px] px-4 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] hover:border-[#047857] dark:hover:border-[#34D399] inline-flex items-center justify-center whitespace-nowrap shrink-0"
      >
        Explore Local Offers
      </Link>
    </aside>
  );
}
