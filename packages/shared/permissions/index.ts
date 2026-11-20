import { Property, PropertyApprovalStatus, LocationVerificationStatus, UserRole } from '../types';

export type Permission =
  | 'property:create'
  | 'property:update_own'
  | 'property:approve'
  | 'location:verify'
  | 'tenant:join_request'
  | 'tenant:manage_own'
  | 'finance:manage_own'
  | 'events:manage'
  | 'events:register'
  | 'admin:overview';

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.TENANT]: ['tenant:join_request', 'events:register'],
  [UserRole.PG_OWNER]: [
    'property:create',
    'property:update_own',
    'tenant:manage_own',
    'finance:manage_own',
    'events:register',
  ],
  [UserRole.SUPER_ADMIN]: [
    'property:approve',
    'location:verify',
    'events:manage',
    'events:register',
    'admin:overview',
  ],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function isPropertyPubliclyVisible(property: Property): boolean {
  const approved = property.approvalStatus === PropertyApprovalStatus.APPROVED;
  const locationVerified = property.locationStatus === LocationVerificationStatus.VERIFIED;
  const hasEntitlement = property.hasLifetimeListing || property.coveredBySubscription;
  return approved && locationVerified && hasEntitlement;
}

export function getHomeRouteForRole(role: UserRole): string {
  switch (role) {
    case UserRole.TENANT:
      return '/tenant/home';
    case UserRole.PG_OWNER:
      return '/owner/dashboard';
    case UserRole.SUPER_ADMIN:
      return '/admin/dashboard';
  }
}
