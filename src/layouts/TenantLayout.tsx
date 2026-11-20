import React from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { House, Search, CalendarDays, Building2, UserRound, LogOut } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { ThemeToggleButton } from '../hooks/useTheme';
import { BottomNavigation, BottomNavItem } from '../components/navigation/BottomNavigation';

export function TenantLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const navItems: BottomNavItem[] = [
    {
      label: 'Home',
      to: '/tenant/home',
      icon: House,
      isActive: (p) => p === '/tenant/home' || p.startsWith('/tenant/home/'),
    },
    {
      label: 'Explore',
      to: '/tenant/explore',
      icon: Search,
      isActive: (p) => p.startsWith('/tenant/explore') || p.startsWith('/tenant/pg/'),
    },
    {
      label: 'Connect',
      to: '/tenant/events',
      icon: CalendarDays,
      isActive: (p) => p.startsWith('/tenant/events') || p.startsWith('/tenant/connect'),
    },
    {
      label: 'My PG',
      to: '/tenant/my-pg',
      icon: Building2,
      isActive: (p) => p.startsWith('/tenant/my-pg'),
    },
    {
      label: 'Profile',
      to: '/tenant/profile',
      icon: UserRound,
      isActive: (p) => p.startsWith('/tenant/profile'),
    },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="h-full min-h-0 w-full bg-[#F8FAFC] dark:bg-[#0B1220] flex flex-col overflow-hidden transition-colors">
      <header className="shrink-0 z-30 bg-white/95 dark:bg-[#111827]/95 backdrop-blur-md border-b border-[#E5E7EB] dark:border-[#374151] h-14 px-4 sm:px-6 flex items-center justify-between gap-4 pt-safe">
        <div className="flex items-center gap-6">
          <Link to="/tenant/home" className="font-display text-lg font-extrabold text-[#047857] dark:text-[#34D399] whitespace-nowrap shrink-0">
            PG Finder
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const active = item.isActive ? item.isActive(location.pathname) : location.pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-[#ECFDF5] dark:bg-[#10B981]/15 text-[#047857] dark:text-[#34D399] font-semibold'
                      : 'text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#111827] dark:hover:text-[#F9FAFB] hover:bg-[#F8FAFC] dark:hover:bg-[#1F2937]'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="hidden sm:inline text-xs font-medium text-[#6B7280] dark:text-[#9CA3AF] truncate max-w-[160px]">
            {user?.fullName}
          </span>
          <ThemeToggleButton compact />
          <button
            type="button"
            onClick={handleLogout}
            aria-label="Log out"
            className="min-h-[40px] px-3 py-1.5 rounded-xl border border-[#E5E7EB] dark:border-[#374151] text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] hover:bg-[#F8FAFC] dark:hover:bg-[#1F2937] inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain">
        <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-5 pb-6 md:pb-10">
          <Outlet />
        </div>
      </main>

      <BottomNavigation
        items={navItems}
        ariaLabel="Tenant primary navigation"
        visibilityClass="md:hidden"
      />
    </div>
  );
}
