import React, { createContext, useContext, useEffect, useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  mode: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  setMode: (mode: ThemeMode) => void;
  cycleMode: () => void;
}

const STORAGE_KEY = 'pgfinder_theme';
const ThemeContext = createContext<ThemeContextValue | null>(null);

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
      if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
    } catch {
      // ignore storage failures
    }
    return 'system';
  });

  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(getSystemTheme);

  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => setSystemTheme(e.matches ? 'dark' : 'light');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const resolvedTheme: 'light' | 'dark' = mode === 'system' ? systemTheme : mode;

  useEffect(() => {
    const root = document.documentElement;
    if (resolvedTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [resolvedTheme]);

  const setMode = (next: ThemeMode) => {
    setModeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
  };

  const cycleMode = () => {
    const order: ThemeMode[] = ['light', 'dark', 'system'];
    const next = order[(order.indexOf(mode) + 1) % order.length];
    setMode(next);
  };

  return (
    <ThemeContext.Provider value={{ mode, resolvedTheme, setMode, cycleMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}

export function ThemeToggleButton({ compact = false }: { compact?: boolean }) {
  const { mode, resolvedTheme, cycleMode } = useTheme();
  const Icon = mode === 'system' ? Monitor : resolvedTheme === 'dark' ? Moon : Sun;
  const label = mode === 'system' ? 'System' : mode === 'dark' ? 'Dark' : 'Light';

  return (
    <button
      type="button"
      onClick={cycleMode}
      title={`Theme: ${label} (click to switch)`}
      aria-label={`Switch theme (current: ${label})`}
      className="min-h-[40px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] hover:bg-[#F8FAFC] dark:hover:bg-[#1F2937] inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
    >
      <Icon className="w-4 h-4 text-[#047857] dark:text-[#34D399]" />
      {!compact && <span>{label}</span>}
    </button>
  );
}

export function ThemePreferenceSelector() {
  const { mode, setMode } = useTheme();
  const options: { id: ThemeMode; label: string; desc: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'light', label: 'Light Mode', desc: 'Crisp high-contrast daylight workspace', icon: Sun },
    { id: 'dark', label: 'Dark Mode', desc: 'Deep slate night workspace with emerald accents', icon: Moon },
    { id: 'system', label: 'System Default', desc: 'Automatically match your device OS theme', icon: Monitor },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {options.map((opt) => {
        const Icon = opt.icon;
        const active = mode === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => setMode(opt.id)}
            className={`p-4 rounded-xl border text-left transition-colors ${
              active
                ? 'border-[#047857] dark:border-[#34D399] bg-[#ECFDF5] dark:bg-[#10B981]/15'
                : 'border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] hover:bg-[#F8FAFC] dark:hover:bg-[#1F2937]'
            }`}
          >
            <Icon className={`w-5 h-5 ${active ? 'text-[#047857] dark:text-[#34D399]' : 'text-[#6B7280] dark:text-[#9CA3AF]'}`} />
            <p className="mt-2 text-sm font-bold text-[#111827] dark:text-[#F9FAFB]">{opt.label}</p>
            <p className="mt-0.5 text-xs text-[#6B7280] dark:text-[#9CA3AF]">{opt.desc}</p>
          </button>
        );
      })}
    </div>
  );
}
