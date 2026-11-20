import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { ThemeToggleButton } from '../hooks/useTheme';
import { getHomeRouteForRole } from '../../packages/shared/permissions';

export function PublicHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useAuth();
  const location = useLocation();
  const isLanding = location.pathname === '/';

  const navLinks = [
    { label: 'Explore PGs', to: '/explore' },
    { label: 'How It Works', to: isLanding ? '#how-it-works' : '/#how-it-works', isAnchor: isLanding },
    { label: 'Startup Events', to: '/events' },
    { label: 'For Owners', to: isLanding ? '#for-owners' : '/#for-owners', isAnchor: isLanding },
    { label: 'Pricing', to: isLanding ? '#pricing' : '/#pricing', isAnchor: isLanding },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#111827]/95 backdrop-blur-md border-b border-[#E5E7EB] dark:border-[#374151] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <Link
          to="/"
          className="font-display text-xl font-extrabold tracking-tight text-[#047857] dark:text-[#34D399] whitespace-nowrap shrink-0"
        >
          PG Finder
        </Link>

        <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-[#4B5563] dark:text-[#9CA3AF]">
          {navLinks.map((item) =>
            item.isAnchor ? (
              <a
                key={item.label}
                href={item.to}
                className="hover:text-[#047857] dark:hover:text-[#34D399] transition-colors whitespace-nowrap shrink-0"
              >
                {item.label}
              </a>
            ) : (
              <Link
                key={item.label}
                to={item.to}
                className="hover:text-[#047857] dark:hover:text-[#34D399] transition-colors whitespace-nowrap shrink-0"
              >
                {item.label}
              </Link>
            )
          )}
        </nav>

        <div className="hidden lg:flex items-center gap-3 shrink-0">
          <ThemeToggleButton />
          {user ? (
            <Link
              to={getHomeRouteForRole(user.role)}
              className="min-h-[40px] px-4 py-2 rounded-xl bg-[#047857] hover:bg-[#065F46] dark:bg-[#10B981] dark:hover:bg-[#059669] text-sm font-semibold text-white dark:text-[#0B1220] transition-colors whitespace-nowrap shrink-0 inline-flex items-center"
            >
              Open Dashboard
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="text-sm font-semibold text-[#111827] dark:text-[#F9FAFB] hover:text-[#047857] dark:hover:text-[#34D399] transition-colors whitespace-nowrap shrink-0 px-2"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="min-h-[40px] px-4 py-2 rounded-xl bg-[#047857] hover:bg-[#065F46] dark:bg-[#10B981] dark:hover:bg-[#059669] text-sm font-semibold text-white dark:text-[#0B1220] transition-colors whitespace-nowrap shrink-0 inline-flex items-center"
              >
                Get Started
              </Link>
            </>
          )}
        </div>

        <div className="lg:hidden flex items-center gap-2">
          <ThemeToggleButton compact />
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-[#111827] dark:text-[#F9FAFB] hover:bg-[#F8FAFC] dark:hover:bg-[#1F2937]"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden border-t border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] px-4 py-4 space-y-1">
          {navLinks.map((item) =>
            item.isAnchor ? (
              <a
                key={item.label}
                href={item.to}
                onClick={() => setMobileOpen(false)}
                className="block min-h-[44px] px-3 py-2.5 rounded-xl text-sm font-medium text-[#111827] dark:text-[#F9FAFB] hover:bg-[#ECFDF5] dark:hover:bg-[#1F2937] hover:text-[#047857] dark:hover:text-[#34D399]"
              >
                {item.label}
              </a>
            ) : (
              <Link
                key={item.label}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className="block min-h-[44px] px-3 py-2.5 rounded-xl text-sm font-medium text-[#111827] dark:text-[#F9FAFB] hover:bg-[#ECFDF5] dark:hover:bg-[#1F2937] hover:text-[#047857] dark:hover:text-[#34D399]"
              >
                {item.label}
              </Link>
            )
          )}
          <div className="pt-3 mt-2 border-t border-[#E5E7EB] dark:border-[#374151] flex flex-col gap-2">
            {user ? (
              <Link
                to={getHomeRouteForRole(user.role)}
                onClick={() => setMobileOpen(false)}
                className="min-h-[44px] w-full rounded-xl bg-[#047857] dark:bg-[#10B981] text-white dark:text-[#0B1220] text-sm font-semibold flex items-center justify-center"
              >
                Open Dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="min-h-[44px] w-full rounded-xl border border-[#E5E7EB] dark:border-[#374151] text-[#111827] dark:text-[#F9FAFB] text-sm font-semibold flex items-center justify-center"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileOpen(false)}
                  className="min-h-[44px] w-full rounded-xl bg-[#047857] dark:bg-[#10B981] text-white dark:text-[#0B1220] text-sm font-semibold flex items-center justify-center"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="bg-white dark:bg-[#111827] border-t border-[#E5E7EB] dark:border-[#374151] mt-16 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        <div>
          <span className="font-display text-lg font-extrabold text-[#047857] dark:text-[#34D399]">PG Finder</span>
          <p className="mt-3 text-sm text-[#6B7280] dark:text-[#9CA3AF] leading-relaxed">
            India&apos;s integrated platform for verified Paying Guest stays, transparent monthly operations, local discovery, and startup networking.
          </p>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-[#111827] dark:text-[#F9FAFB]">For Residents</h4>
          <ul className="mt-3 space-y-2.5 text-sm text-[#6B7280] dark:text-[#9CA3AF]">
            <li><Link to="/explore" className="hover:text-[#047857] dark:hover:text-[#34D399]">Explore Verified PGs</Link></li>
            <li><Link to="/events" className="hover:text-[#047857] dark:hover:text-[#34D399]">Startup Events</Link></li>
            <li><Link to="/register" className="hover:text-[#047857] dark:hover:text-[#34D399]">Create Tenant Account</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-[#111827] dark:text-[#F9FAFB]">For PG Owners</h4>
          <ul className="mt-3 space-y-2.5 text-sm text-[#6B7280] dark:text-[#9CA3AF]">
            <li><Link to="/register" className="hover:text-[#047857] dark:hover:text-[#34D399]">List Your PG Property</Link></li>
            <li><a href="/#pricing" className="hover:text-[#047857] dark:hover:text-[#34D399]">Basic, Pro &amp; Business Plans</a></li>
            <li><Link to="/login" className="hover:text-[#047857] dark:hover:text-[#34D399]">Owner Dashboard</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-[#111827] dark:text-[#F9FAFB]">Platform Standards</h4>
          <ul className="mt-3 space-y-2.5 text-sm text-[#6B7280] dark:text-[#9CA3AF]">
            <li>Verified Location Coordinates</li>
            <li>Separate Property &amp; Location Audits</li>
            <li>Fictional demo listings clearly disclosed in preview mode</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-[#E5E7EB] dark:border-[#374151] py-5 px-4 sm:px-6 max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#6B7280] dark:text-[#9CA3AF]">
        <span>© {new Date().getFullYear()} PG Finder India. All rights reserved.</span>
        <span>Modular Monolith Architecture · Mobile-First Web &amp; Capacitor Ready</span>
      </div>
    </footer>
  );
}
