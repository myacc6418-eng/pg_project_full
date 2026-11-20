import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  MapPin,
  BedDouble,
  DoorOpen,
  UserPlus,
  LogOut,
  Receipt,
  Wallet,
  AlertOctagon,
  Utensils,
  MessageSquareWarning,
  Wrench,
  UserCheck,
  Activity,
  BarChart3,
  Star,
  CalendarDays,
  CreditCard,
  Sparkles,
  Bell,
  History,
  Settings,
  QrCode,
  UserCircle,
} from 'lucide-react';
import { ThemeToggleButton } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';

const SECTIONS = [
  {
    title: 'Properties & Inventory',
    items: [
      { label: 'PG Approvals', to: '/owner/approvals', icon: ShieldCheck },
      { label: 'Location Verification', to: '/owner/locations', icon: MapPin },
      { label: 'Floors, Rooms & Beds', to: '/owner/rooms-beds', icon: BedDouble },
      { label: 'Live Vacancies', to: '/owner/vacancies', icon: DoorOpen },
    ],
  },
  {
    title: 'Residents & Finance',
    items: [
      { label: 'Joining Requests', to: '/owner/joining-requests', icon: UserPlus },
      { label: 'QR Onboarding', to: '/owner/qr-onboarding', icon: QrCode },
      { label: 'Checkout Management', to: '/owner/checkouts', icon: LogOut },
      { label: 'Rent & Payments', to: '/owner/rent', icon: Receipt },
      { label: 'Expenses', to: '/owner/expenses', icon: Wallet },
      { label: 'Outstanding Dues', to: '/owner/dues', icon: AlertOctagon },
    ],
  },
  {
    title: 'Daily Operations',
    items: [
      { label: 'Food & Mess', to: '/owner/food', icon: Utensils },
      { label: 'Complaints', to: '/owner/complaints', icon: MessageSquareWarning },
      { label: 'Maintenance', to: '/owner/maintenance', icon: Wrench },
      { label: 'Staff & Payroll', to: '/owner/staff', icon: UserCheck },
    ],
  },
  {
    title: 'Insights, Growth & Account',
    items: [
      { label: 'Tracking Center', to: '/owner/tracking', icon: Activity },
      { label: 'Reports & Analytics', to: '/owner/reports', icon: BarChart3 },
      { label: 'Reviews', to: '/owner/reviews', icon: Star },
      { label: 'Startup Events', to: '/owner/events', icon: CalendarDays },
      { label: 'Subscriptions', to: '/owner/subscriptions', icon: CreditCard },
      { label: 'Promotions', to: '/owner/promotions', icon: Sparkles },
      { label: 'Notifications', to: '/owner/notifications', icon: Bell },
      { label: 'Activity Log', to: '/owner/activity-log', icon: History },
      { label: 'Owner Profile', to: '/owner/profile', icon: UserCircle },
      { label: 'Settings', to: '/owner/settings', icon: Settings },
    ],
  },
];

export function OwnerMorePage() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#111827] dark:text-[#F9FAFB]">
            All Owner Modules
          </h1>
          <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF]">
            Quick launcher for every property, operations, tracking, and account tool.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <ThemeToggleButton />
          <button
            type="button"
            onClick={async () => {
              await logout();
              navigate('/login');
            }}
            className="min-h-[42px] px-4 rounded-xl border border-red-200 dark:border-red-900/50 text-xs font-semibold text-[#DC2626] dark:text-[#F87171] hover:bg-red-50 dark:hover:bg-red-950/30 inline-flex items-center gap-1.5"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>

      {SECTIONS.map((sec) => (
        <section key={sec.title} className="space-y-2.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#6B7280] dark:text-[#9CA3AF]">
            {sec.title}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {sec.items.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className="p-4 rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] hover:border-[#047857] dark:hover:border-[#34D399] flex items-center gap-3 transition-colors"
                >
                  <div className="w-9 h-9 rounded-xl bg-[#ECFDF5] dark:bg-[#10B981]/15 text-[#047857] dark:text-[#34D399] flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-[#111827] dark:text-[#F9FAFB] leading-tight">
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
