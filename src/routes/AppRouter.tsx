import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { UserRole } from '../../packages/shared/types';
import { getHomeRouteForRole } from '../../packages/shared/permissions';
import { useAuth } from '../hooks/useAuth';
import { CardSkeleton } from '../components/ui/CommonUI';

import { LandingPage } from '../features/landing/LandingPage';
import { LoginPage } from '../features/auth/LoginPage';
import { RegisterPage } from '../features/auth/RegisterPage';
import { TenantLayout } from '../layouts/TenantLayout';
import { OwnerLayout } from '../layouts/OwnerLayout';
import { AdminLayout } from '../layouts/AdminLayout';

const ExplorePGsPage = lazy(() =>
  import('../features/landing/ExplorePGsPage').then((m) => ({ default: m.ExplorePGsPage }))
);
const PropertyDetailPage = lazy(() =>
  import('../features/landing/PropertyDetailPage').then((m) => ({ default: m.PropertyDetailPage }))
);
const JoinByQRPage = lazy(() =>
  import('../features/landing/JoinByQRPage').then((m) => ({ default: m.JoinByQRPage }))
);
const ConnectEventsPage = lazy(() =>
  import('../features/events/ConnectEventsPage').then((m) => ({ default: m.ConnectEventsPage }))
);

const TenantHomePage = lazy(() =>
  import('../features/tenant/TenantHomePage').then((m) => ({ default: m.TenantHomePage }))
);
const TenantMyPGPage = lazy(() =>
  import('../features/tenant/TenantMyPGPage').then((m) => ({ default: m.TenantMyPGPage }))
);
const TenantProfilePage = lazy(() =>
  import('../features/tenant/TenantProfilePage').then((m) => ({ default: m.TenantProfilePage }))
);

// Owner PMS Modules
const OwnerDashboardPage = lazy(() =>
  import('../features/owner/OwnerDashboardPage').then((m) => ({ default: m.OwnerDashboardPage }))
);
const AddPGWizardPage = lazy(() =>
  import('../features/owner/AddPGWizardPage').then((m) => ({ default: m.AddPGWizardPage }))
);
const OwnerPropertiesPage = lazy(() =>
  import('../features/owner/OwnerPropertiesPage').then((m) => ({ default: m.OwnerPropertiesPage }))
);
const OwnerPropertyDetailPage = lazy(() =>
  import('../features/owner/OwnerPropertyDetailPage').then((m) => ({ default: m.OwnerPropertyDetailPage }))
);
const OwnerApprovalsLocationsPage = lazy(() =>
  import('../features/owner/OwnerApprovalsLocationsPage').then((m) => ({ default: m.OwnerApprovalsLocationsPage }))
);
const OwnerRoomsBedsPage = lazy(() =>
  import('../features/owner/OwnerRoomsBedsPage').then((m) => ({ default: m.OwnerRoomsBedsPage }))
);
const OwnerVacanciesPage = lazy(() =>
  import('../features/owner/OwnerVacanciesPage').then((m) => ({ default: m.OwnerVacanciesPage }))
);
const OwnerTenantsPage = lazy(() =>
  import('../features/owner/OwnerTenantsPage').then((m) => ({ default: m.OwnerTenantsPage }))
);
const OwnerTenantDetailPage = lazy(() =>
  import('../features/owner/OwnerTenantDetailPage').then((m) => ({ default: m.OwnerTenantDetailPage }))
);
const OwnerCheckoutsPage = lazy(() =>
  import('../features/owner/OwnerCheckoutsPage').then((m) => ({ default: m.OwnerCheckoutsPage }))
);
const OwnerFinancePage = lazy(() =>
  import('../features/owner/OwnerFinancePage').then((m) => ({ default: m.OwnerFinancePage }))
);
const OwnerFoodMessPage = lazy(() =>
  import('../features/owner/OwnerFoodMessPage').then((m) => ({ default: m.OwnerFoodMessPage }))
);
const OwnerComplaintsMaintenancePage = lazy(() =>
  import('../features/owner/OwnerComplaintsMaintenancePage').then((m) => ({
    default: m.OwnerComplaintsMaintenancePage,
  }))
);
const OwnerStaffPage = lazy(() =>
  import('../features/owner/OwnerStaffPage').then((m) => ({ default: m.OwnerStaffPage }))
);
const OwnerTrackingPage = lazy(() =>
  import('../features/owner/OwnerTrackingPage').then((m) => ({ default: m.OwnerTrackingPage }))
);
const OwnerReportsPage = lazy(() =>
  import('../features/owner/OwnerReportsPage').then((m) => ({ default: m.OwnerReportsPage }))
);
const OwnerReviewsPage = lazy(() =>
  import('../features/owner/OwnerReviewsPage').then((m) => ({ default: m.OwnerReviewsPage }))
);
const OwnerGrowthBillingPage = lazy(() =>
  import('../features/owner/OwnerGrowthBillingPage').then((m) => ({ default: m.OwnerGrowthBillingPage }))
);
const OwnerNotificationsPage = lazy(() =>
  import('../features/owner/OwnerSystemPages').then((m) => ({ default: m.OwnerNotificationsPage }))
);
const OwnerActivityLogPage = lazy(() =>
  import('../features/owner/OwnerSystemPages').then((m) => ({ default: m.OwnerActivityLogPage }))
);
const OwnerSettingsPage = lazy(() =>
  import('../features/owner/OwnerSystemPages').then((m) => ({ default: m.OwnerSettingsPage }))
);
const OwnerMorePage = lazy(() =>
  import('../features/owner/OwnerMorePage').then((m) => ({ default: m.OwnerMorePage }))
);
const OwnerProfilePage = lazy(() =>
  import('../features/owner/OwnerProfilePage').then((m) => ({ default: m.OwnerProfilePage }))
);
const OwnerQROnboardingPage = lazy(() =>
  import('../features/owner/OwnerQROnboardingPage').then((m) => ({ default: m.OwnerQROnboardingPage }))
);

// Super Admin Modules
const AdminDashboardPage = lazy(() =>
  import('../features/admin/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage }))
);
const AdminApprovalsPage = lazy(() =>
  import('../features/admin/AdminApprovalsPage').then((m) => ({ default: m.AdminApprovalsPage }))
);
const AdminEventsPage = lazy(() =>
  import('../features/admin/AdminEventsPage').then((m) => ({ default: m.AdminEventsPage }))
);
const AdminUsersPage = lazy(() =>
  import('../features/admin/AdminUsersPage').then((m) => ({ default: m.AdminUsersPage }))
);
const AdminSupportOpsPage = lazy(() =>
  import('../features/admin/AdminSupportOpsPage').then((m) => ({ default: m.AdminSupportOpsPage }))
);
const AdminMonetizationPage = lazy(() =>
  import('../features/admin/AdminMonetizationPage').then((m) => ({ default: m.AdminMonetizationPage }))
);
const AdminEngagementSystemPage = lazy(() =>
  import('../features/admin/AdminEngagementSystemPage').then((m) => ({ default: m.AdminEngagementSystemPage }))
);
const AdminOperationsPage = lazy(() =>
  import('../features/admin/AdminOperationsPage').then((m) => ({ default: m.AdminOperationsPage }))
);
const AdminMorePage = lazy(() =>
  import('../features/admin/AdminMorePage').then((m) => ({ default: m.AdminMorePage }))
);

function RequireRole({ role, children }: { role: UserRole; children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <CardSkeleton rows={3} />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to={getHomeRouteForRole(user.role)} replace />;
  return <>{children}</>;
}

function PageFallback() {
  return (
    <div className="max-w-5xl mx-auto p-6">
      <CardSkeleton rows={3} />
    </div>
  );
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/explore" element={<ExplorePGsPage />} />
          <Route path="/pg/:id" element={<PropertyDetailPage />} />
          <Route path="/join/:pgId" element={<JoinByQRPage />} />
          <Route path="/events" element={<ConnectEventsPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Tenant Routes */}
          <Route
            path="/tenant"
            element={
              <RequireRole role={UserRole.TENANT}>
                <TenantLayout />
              </RequireRole>
            }
          >
            <Route path="home" element={<TenantHomePage />} />
            <Route path="explore" element={<ExplorePGsPage embedded />} />
            <Route path="pg/:id" element={<PropertyDetailPage embedded />} />
            <Route path="connect" element={<ConnectEventsPage embedded />} />
            <Route path="events" element={<ConnectEventsPage embedded />} />
            <Route path="my-pg" element={<TenantMyPGPage />} />
            <Route path="profile" element={<TenantProfilePage />} />
            <Route index element={<Navigate to="home" replace />} />
          </Route>

          {/* PG Owner Routes (All 25 Sidebar Items + Subpages) */}
          <Route
            path="/owner"
            element={
              <RequireRole role={UserRole.PG_OWNER}>
                <OwnerLayout />
              </RequireRole>
            }
          >
            <Route path="dashboard" element={<OwnerDashboardPage />} />
            <Route path="add-pg" element={<AddPGWizardPage />} />
            <Route path="properties" element={<OwnerPropertiesPage />} />
            <Route path="properties/:id" element={<OwnerPropertyDetailPage />} />
            <Route path="approvals" element={<OwnerApprovalsLocationsPage mode="approvals" />} />
            <Route path="locations" element={<OwnerApprovalsLocationsPage mode="locations" />} />
            <Route path="rooms-beds" element={<OwnerRoomsBedsPage />} />
            <Route path="vacancies" element={<OwnerVacanciesPage />} />
            <Route path="tenants" element={<OwnerTenantsPage initialSection="tenants" />} />
            <Route path="tenants/:stayId" element={<OwnerTenantDetailPage />} />
            <Route path="joining-requests" element={<OwnerTenantsPage initialSection="joining" />} />
            <Route path="checkouts" element={<OwnerCheckoutsPage />} />
            <Route path="finance" element={<OwnerFinancePage defaultTab="rent" />} />
            <Route path="rent" element={<OwnerFinancePage defaultTab="rent" />} />
            <Route path="expenses" element={<OwnerFinancePage defaultTab="expenses" />} />
            <Route path="dues" element={<OwnerFinancePage defaultTab="dues" />} />
            <Route path="food" element={<OwnerFoodMessPage />} />
            <Route path="complaints" element={<OwnerComplaintsMaintenancePage mode="complaints" />} />
            <Route path="maintenance" element={<OwnerComplaintsMaintenancePage mode="maintenance" />} />
            <Route path="staff" element={<OwnerStaffPage />} />
            <Route path="tracking" element={<OwnerTrackingPage />} />
            <Route path="reports" element={<OwnerReportsPage />} />
            <Route path="reviews" element={<OwnerReviewsPage />} />
            <Route path="events" element={<ConnectEventsPage embedded />} />
            <Route path="subscriptions" element={<OwnerGrowthBillingPage mode="subscriptions" />} />
            <Route path="promotions" element={<OwnerGrowthBillingPage mode="promotions" />} />
            <Route path="notifications" element={<OwnerNotificationsPage />} />
            <Route path="activity-log" element={<OwnerActivityLogPage />} />
            <Route path="settings" element={<OwnerSettingsPage />} />
            <Route path="profile" element={<OwnerProfilePage />} />
            <Route path="qr-onboarding" element={<OwnerQROnboardingPage />} />
            <Route path="more" element={<OwnerMorePage />} />
            <Route index element={<Navigate to="dashboard" replace />} />
          </Route>

          {/* Super Admin Routes (7 Grouped Modules + Legacy Aliases) */}
          <Route
            path="/admin"
            element={
              <RequireRole role={UserRole.SUPER_ADMIN}>
                <AdminLayout />
              </RequireRole>
            }
          >
            {/* Overview */}
            <Route path="dashboard" element={<AdminDashboardPage mode="dashboard" />} />
            <Route path="analytics" element={<AdminDashboardPage mode="analytics" />} />
            <Route path="activity" element={<AdminEngagementSystemPage section="activity" />} />
            {/* Users */}
            <Route path="owners" element={<AdminUsersPage section="owners" />} />
            <Route path="tenants" element={<AdminUsersPage section="tenants" />} />
            <Route path="roles" element={<AdminUsersPage section="roles" />} />
            <Route path="users" element={<AdminOperationsPage section="users" />} />
            {/* Properties */}
            <Route path="properties" element={<AdminApprovalsPage mode="properties" />} />
            <Route path="properties/:id" element={<AdminApprovalsPage mode="properties" />} />
            <Route path="approvals" element={<AdminApprovalsPage mode="approvals" />} />
            <Route path="locations" element={<AdminApprovalsPage mode="locations" />} />
            <Route path="location-verification" element={<AdminApprovalsPage mode="locations" />} />
            <Route path="vacancies" element={<AdminApprovalsPage mode="vacancies" />} />
            {/* Operations */}
            <Route path="joining" element={<AdminSupportOpsPage section="joining" />} />
            <Route path="stays" element={<AdminSupportOpsPage section="stays" />} />
            <Route path="checkouts" element={<AdminSupportOpsPage section="checkouts" />} />
            <Route path="complaints" element={<AdminSupportOpsPage section="complaints" />} />
            <Route path="support" element={<AdminSupportOpsPage section="support" />} />
            {/* Monetization */}
            <Route path="subscriptions" element={<AdminMonetizationPage section="subscriptions" />} />
            <Route path="lifetime" element={<AdminMonetizationPage section="lifetime" />} />
            <Route path="payments" element={<AdminMonetizationPage section="payments" />} />
            <Route path="promotions" element={<AdminMonetizationPage section="promotions" />} />
            <Route path="ads" element={<AdminMonetizationPage section="ads" />} />
            <Route path="admob" element={<AdminMonetizationPage section="admob" />} />
            <Route path="monetization" element={<AdminOperationsPage section="monetization" />} />
            {/* Engagement */}
            <Route path="events" element={<AdminEventsPage mode="events" />} />
            <Route path="registrations" element={<AdminEventsPage mode="registrations" />} />
            <Route path="notifications" element={<AdminEngagementSystemPage section="notifications" />} />
            <Route path="cms" element={<AdminEngagementSystemPage section="cms" />} />
            {/* System */}
            <Route path="audit-logs" element={<AdminEngagementSystemPage section="audit" />} />
            <Route path="settings" element={<AdminEngagementSystemPage section="settings" />} />
            <Route path="more" element={<AdminMorePage />} />
            <Route index element={<Navigate to="dashboard" replace />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
