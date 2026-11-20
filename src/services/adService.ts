import { AdMobSettings } from '../../packages/shared/types';

export interface AdServiceInterface {
  initialize(settings: AdMobSettings): Promise<void>;
  loadAppOpenAd(): Promise<boolean>;
  showAppOpenAd(): Promise<boolean>;
  loadBannerAd(slotId: string): { enabled: boolean; testUnitId: string; environment: 'test' | 'production' };
  loadNativeAd(slotId: string): { enabled: boolean; isSponsored: boolean };
  loadInterstitialAd(): Promise<boolean>;
  showInterstitialAd(currentRoute: string): Promise<boolean>;
  loadRewardedAd(): Promise<boolean>;
  showRewardedAd(onReward: () => void): Promise<boolean>;
}

const AD_FREE_ROUTES = ['/login', '/register', '/owner/finance', '/tenant/my-pg', '/admin'];

class WebAndCapacitorAdService implements AdServiceInterface {
  private settings: AdMobSettings = {
    enabled: true,
    environment: 'test',
    bannerEnabled: true,
    nativeEnabled: true,
    interstitialEnabled: false,
    rewardedEnabled: true,
    dailyInterstitialCap: 2,
    adFreeCheckoutAndPayments: true,
  };
  private interstitialShownCount = 0;

  async initialize(settings: AdMobSettings): Promise<void> {
    this.settings = settings;
  }

  async loadAppOpenAd(): Promise<boolean> {
    return this.settings.enabled;
  }

  async showAppOpenAd(): Promise<boolean> {
    return this.settings.enabled;
  }

  loadBannerAd(_slotId: string) {
    return {
      enabled: this.settings.enabled && this.settings.bannerEnabled,
      testUnitId: import.meta.env.VITE_ADMOB_ANDROID_BANNER_ID || 'ca-app-pub-3940256099942544/6300978111',
      environment: this.settings.environment,
    };
  }

  loadNativeAd(_slotId: string) {
    return {
      enabled: this.settings.enabled && this.settings.nativeEnabled,
      isSponsored: true,
    };
  }

  async loadInterstitialAd(): Promise<boolean> {
    return this.settings.enabled && this.settings.interstitialEnabled;
  }

  async showInterstitialAd(currentRoute: string): Promise<boolean> {
    if (!this.settings.enabled || !this.settings.interstitialEnabled) return false;
    if (AD_FREE_ROUTES.some((r) => currentRoute.startsWith(r))) return false;
    if (this.interstitialShownCount >= this.settings.dailyInterstitialCap) return false;
    this.interstitialShownCount += 1;
    return true;
  }

  async loadRewardedAd(): Promise<boolean> {
    return this.settings.enabled && this.settings.rewardedEnabled;
  }

  async showRewardedAd(onReward: () => void): Promise<boolean> {
    if (!this.settings.enabled || !this.settings.rewardedEnabled) return false;
    onReward();
    return true;
  }
}

export const adService = new WebAndCapacitorAdService();
