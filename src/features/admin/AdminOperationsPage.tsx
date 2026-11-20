import React from 'react';
import { AdminUsersPage } from './AdminUsersPage';
import { AdminMonetizationPage } from './AdminMonetizationPage';
import { AdminEngagementSystemPage } from './AdminEngagementSystemPage';

export function AdminOperationsPage({ section }: { section: 'users' | 'monetization' | 'settings' }) {
  if (section === 'users') return <AdminUsersPage section="all" />;
  if (section === 'monetization') return <AdminMonetizationPage section="all" />;
  return <AdminEngagementSystemPage section="settings" />;
}
