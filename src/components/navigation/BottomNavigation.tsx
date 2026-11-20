import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export interface BottomNavItem {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive?: (pathname: string) => boolean;
}

export function BottomNavigation({
  items,
  ariaLabel,
  visibilityClass = 'lg:hidden',
}: {
  items: BottomNavItem[];
  ariaLabel: string;
  visibilityClass?: string;
}) {
  const { pathname } = useLocation();

  return (
    <nav
      aria-label={ariaLabel}
      className={`${visibilityClass} shrink-0 relative z-40 w-full bg-white dark:bg-[#111827] border-t border-[#E5E7EB] dark:border-[#374151] pb-safe transition-colors`}
    >
      <div className="grid grid-cols-5 h-16 w-full max-w-full">
        {items.map((item) => {
          const Icon = item.icon;
          const active = item.isActive
            ? item.isActive(pathname)
            : pathname === item.to || pathname.startsWith(`${item.to}/`);

          return (
            <Link
              key={item.to}
              to={item.to}
              aria-current={active ? 'page' : undefined}
              className={`min-h-[44px] min-w-0 flex flex-col items-center justify-center gap-0.5 px-1 text-[11px] leading-tight transition-colors ${
                active
                  ? 'text-[#047857] dark:text-[#34D399] font-semibold'
                  : 'text-[#6B7280] dark:text-[#9CA3AF] font-medium hover:text-[#111827] dark:hover:text-[#F9FAFB]'
              }`}
            >
              <span
                className={`flex items-center justify-center w-9 h-7 rounded-xl transition-colors ${
                  active ? 'bg-[#ECFDF5] dark:bg-[#10B981]/15' : 'bg-transparent'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
              </span>
              <span className="truncate max-w-full px-0.5">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
