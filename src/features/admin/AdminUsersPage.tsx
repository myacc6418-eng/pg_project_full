import React, { useEffect, useState } from 'react';
import { Eye, Shield } from 'lucide-react';
import { apiFetch } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { BottomSheet, CardSkeleton, formatInr, StatusIndicator } from '../../components/ui/CommonUI';

export function AdminUsersPage({ section }: { section: 'owners' | 'tenants' | 'roles' | 'all' }) {
  const { showToast } = useToast();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [ownerDetail, setOwnerDetail] = useState<any>(null);
  const [tenantDetail, setTenantDetail] = useState<any>(null);
  const [inspectReason, setInspectReason] = useState('Compliance & KYC support verification');
  const [inspectedDocResult, setInspectedDocResult] = useState<any>(null);

  const loadOverview = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/v1/admin/overview');
      setData(res);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (section !== 'roles') {
      loadOverview();
    } else {
      setLoading(false);
    }
  }, [section]);

  const inspectOwner = async (ownerId: string) => {
    try {
      const res = await apiFetch(`/api/v1/admin/owners/${ownerId}`);
      setOwnerDetail(res);
    } catch (err: any) {
      showToast('Could not load owner', err.message, 'error');
    }
  };

  const inspectTenant = async (tenantId: string) => {
    try {
      setInspectedDocResult(null);
      const res = await apiFetch(`/api/v1/admin/tenants/${tenantId}`);
      setTenantDetail(res);
    } catch (err: any) {
      showToast('Could not load tenant', err.message, 'error');
    }
  };

  const handleInspectDocument = async (docId: string) => {
    try {
      const res = await apiFetch<{ document: any; auditedAt: string }>(
        `/api/v1/admin/documents/${docId}/inspect`,
        {
          method: 'POST',
          body: JSON.stringify({ reason: inspectReason }),
        }
      );
      setInspectedDocResult(res);
      showToast('Sensitive Document Audited', 'SENSITIVE_DOCUMENT_ACCESSED logged in audit trail');
    } catch (err: any) {
      showToast('Inspect failed', err.message, 'error');
    }
  };

  if (section === 'roles') {
    const rolesMatrix = [
      {
        role: 'SUPER_ADMIN',
        scope: 'Platform Governance',
        capabilities: [
          'Approve, reject, or suspend PG properties & verify GPS coordinates',
          'Inspect owner/tenant profiles with audited document access logging',
          'Manage Startup Events, Broadcast Notifications, CMS & Local Business Ads',
          'Configure Capacitor AdMob placement rules (checkout/KYC locked ad-free)',
          'Handle support tickets, refunds, and immutable platform audit logs',
        ],
      },
      {
        role: 'PG_OWNER',
        scope: 'Property Operations',
        capabilities: [
          'Manage own properties, floors, rooms, beds, and QR onboarding',
          'Approve joining requests, log offline/ledger rent payments, and settle deposits',
          'Manage weekly mess menus, complaints, maintenance, and staff payroll',
          'Upgrade subscriptions, ₹199 lifetime listings, and featured promotions',
        ],
      },
      {
        role: 'STAFF (Scoped Caretaker/Cook)',
        scope: 'Assigned Property Tasks',
        capabilities: [
          'Scoped property permissions: VIEW_RESIDENTS, LOG_PARCELS, UPDATE_MAINTENANCE',
          'VIEW_MEAL_COUNT, MANAGE_CLEANING, COLLECT_RENT_RECEIPT',
          'Cannot change owner billing, property approvals, or platform settings',
        ],
      },
      {
        role: 'TENANT',
        scope: 'Discovery & Resident Stay',
        capabilities: [
          'Browse published PGs, save shortlists, submit joining requests & QR joins',
          'View rent receipts, meal opt-ins, upload non-Aadhaar KYC, log complaints/checkout',
          'Browse Startup Events & PG Finder Local deals (never exposes other tenants)',
        ],
      },
    ];

    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#111827] dark:text-[#F9FAFB]">
            Admin Roles &amp; RBAC Boundaries
          </h1>
          <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF]">
            Role-based access control enforced across backend routes and shared permission guards.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rolesMatrix.map((item) => (
            <div
              key={item.role}
              className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB] flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#047857] dark:text-[#34D399]" />
                  {item.role}
                </h2>
                <span className="text-xs font-medium text-[#6B7280] dark:text-[#9CA3AF]">{item.scope}</span>
              </div>
              <ul className="space-y-1.5 text-xs text-[#4B5563] dark:text-[#D1D5DB] list-disc pl-4">
                {item.capabilities.map((cap) => (
                  <li key={cap}>{cap}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (loading || !data) return <CardSkeleton rows={3} />;

  const q = search.trim().toLowerCase();
  const filteredOwners = (data.owners || []).filter(
    (o: any) =>
      !q ||
      o.fullName.toLowerCase().includes(q) ||
      o.email.toLowerCase().includes(q) ||
      (o.businessName || '').toLowerCase().includes(q) ||
      (o.city || '').toLowerCase().includes(q)
  );
  const filteredTenants = (data.tenants || []).filter(
    (t: any) =>
      !q ||
      t.fullName.toLowerCase().includes(q) ||
      t.email.toLowerCase().includes(q) ||
      t.phone.toLowerCase().includes(q) ||
      (t.tenantCode || '').toLowerCase().includes(q) ||
      (t.currentPgName || '').toLowerCase().includes(q)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-[#111827] dark:text-[#F9FAFB]">
          {section === 'owners'
            ? 'PG Owners Directory'
            : section === 'tenants'
              ? 'Platform Tenants Directory'
              : 'Owners & Tenants Directory'}
        </h1>
        <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF]">
          Inspect user profiles, active stays, and audited verification documents. Suspend accounts only when justified.
        </p>
      </div>

      <input
        type="text"
        placeholder="Search by name, email, phone, tenant code, city, or PG name..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full min-h-[44px] px-4 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#1F2937] text-sm text-[#111827] dark:text-[#F9FAFB]"
      />

      {(section === 'owners' || section === 'all') && (
        <section className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-3">
          <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">
            Registered PG Owners ({filteredOwners.length})
          </h2>
          <div className="space-y-2.5">
            {filteredOwners.map((o: any) => (
              <div
                key={o.id}
                className="p-4 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <p className="text-sm font-bold text-[#111827] dark:text-[#F9FAFB]">
                    {o.fullName} {o.businessName ? `· ${o.businessName}` : ''}
                  </p>
                  <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                    {o.email} · {o.phone} · {o.city} · {o.propertyCount} properties ({o.approvedCount} approved) · {o.subscriptionTier} Plan
                  </p>
                  <div className="mt-1">
                    <StatusIndicator status={o.isSuspended ? 'error' : 'success'} label={o.isSuspended ? 'Suspended' : 'Active Owner'} />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => inspectOwner(o.id)}
                    className="min-h-[38px] px-3.5 rounded-xl bg-[#ECFDF5] dark:bg-[#10B981]/15 text-[#047857] dark:text-[#34D399] text-xs font-semibold inline-flex items-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Inspect
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await apiFetch(`/api/v1/admin/owners/${o.id}/toggle-suspend`, { method: 'POST' });
                      showToast(o.isSuspended ? 'Owner Reactivated' : 'Owner Suspended');
                      await loadOverview();
                    }}
                    className="min-h-[38px] px-3.5 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] text-xs font-semibold text-[#111827] dark:text-[#F9FAFB]"
                  >
                    {o.isSuspended ? 'Reactivate' : 'Suspend Account'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {(section === 'tenants' || section === 'all') && (
        <section className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] overflow-hidden">
          <div className="p-5 border-b border-[#E5E7EB] dark:border-[#374151]">
            <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">
              Tenants Registry ({filteredTenants.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[960px]">
              <thead>
                <tr className="border-b border-[#E5E7EB] dark:border-[#374151] text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                  <th className="p-3.5 font-semibold">Tenant Code</th>
                  <th className="p-3.5 font-semibold">Resident</th>
                  <th className="p-3.5 font-semibold">Phone</th>
                  <th className="p-3.5 font-semibold">Current PG</th>
                  <th className="p-3.5 font-semibold">Room / Bed</th>
                  <th className="p-3.5 font-semibold">Joined</th>
                  <th className="p-3.5 font-semibold">Stay Status</th>
                  <th className="p-3.5 font-semibold">Rent Status</th>
                  <th className="p-3.5 font-semibold">KYC Docs</th>
                  <th className="p-3.5 font-semibold">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#374151] text-xs">
                {filteredTenants.map((t: any) => (
                  <tr key={t.id} className="hover:bg-[#F8FAFC] dark:hover:bg-[#1F2937]/60">
                    <td className="p-3.5 font-mono font-semibold text-[#111827] dark:text-[#F9FAFB]">{t.tenantCode}</td>
                    <td className="p-3.5">
                      <p className="font-semibold text-[#111827] dark:text-[#F9FAFB]">{t.fullName}</p>
                      <p className="text-[#6B7280] dark:text-[#9CA3AF]">{t.email}</p>
                    </td>
                    <td className="p-3.5 font-mono tabular-nums text-[#4B5563] dark:text-[#D1D5DB]">{t.phone}</td>
                    <td className="p-3.5 text-[#111827] dark:text-[#F9FAFB]">{t.currentPgName || '—'}</td>
                    <td className="p-3.5 font-mono text-[#111827] dark:text-[#F9FAFB]">
                      {t.roomNumber} / {t.bedCode}
                    </td>
                    <td className="p-3.5 text-[#6B7280] dark:text-[#9CA3AF] tabular-nums">
                      {t.joiningDate ? new Date(t.joiningDate).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td className="p-3.5">
                      <StatusIndicator
                        status={t.stayStatus === 'ACTIVE' ? 'success' : 'neutral'}
                        label={t.stayStatus}
                      />
                    </td>
                    <td className="p-3.5">
                      <StatusIndicator
                        status={t.rentStatus === 'PAID' ? 'success' : t.rentStatus === 'DUE' ? 'warning' : 'neutral'}
                        label={t.rentStatus}
                      />
                    </td>
                    <td className="p-3.5">
                      <StatusIndicator
                        status={t.docStatus === 'VERIFIED' ? 'success' : t.docStatus === 'REJECTED' ? 'error' : 'neutral'}
                        label={t.docStatus}
                      />
                    </td>
                    <td className="p-3.5">
                      <button
                        type="button"
                        onClick={() => inspectTenant(t.id)}
                        className="min-h-[34px] px-3 rounded-lg bg-[#ECFDF5] dark:bg-[#10B981]/15 text-[#047857] dark:text-[#34D399] font-semibold"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Owner Inspect BottomSheet */}
      <BottomSheet
        open={Boolean(ownerDetail)}
        onClose={() => setOwnerDetail(null)}
        title={`Owner Profile — ${ownerDetail?.owner?.fullName || ''}`}
        maxWidthClass="sm:max-w-2xl"
      >
        {ownerDetail && (
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151] space-y-1">
              <p className="font-bold text-sm">{ownerDetail.owner.fullName}</p>
              <p className="text-[#6B7280] dark:text-[#9CA3AF]">
                {ownerDetail.owner.email} · {ownerDetail.owner.phone} · {ownerDetail.owner.city || '-'}
              </p>
              <p className="text-[#047857] dark:text-[#34D399] font-semibold">
                Subscription: {ownerDetail.subscription?.tier || 'BASIC'} ({ownerDetail.subscription?.status || 'ACTIVE'})
              </p>
            </div>

            <div>
              <h3 className="font-bold text-sm mb-2">Properties ({ownerDetail.properties.length})</h3>
              <div className="space-y-2">
                {ownerDetail.properties.map((p: any) => (
                  <div key={p.id} className="p-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151]">
                    <p className="font-semibold">{p.name}</p>
                    <p className="text-[#6B7280] dark:text-[#9CA3AF]">
                      {p.locality}, {p.city} · Approval: {p.approvalStatus} · Location: {p.locationStatus}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-bold text-sm mb-2">Platform Transactions ({ownerDetail.transactions.length})</h3>
              <div className="space-y-2">
                {ownerDetail.transactions.map((txn: any) => (
                  <div key={txn.id} className="p-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] flex justify-between">
                    <span>{txn.description}</span>
                    <span className="font-mono font-bold">{formatInr(txn.amountInr)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </BottomSheet>

      {/* Tenant Inspect + Audited Document BottomSheet */}
      <BottomSheet
        open={Boolean(tenantDetail)}
        onClose={() => setTenantDetail(null)}
        title={`Tenant Details — ${tenantDetail?.tenant?.fullName || ''}`}
        maxWidthClass="sm:max-w-2xl"
      >
        {tenantDetail && (
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151] space-y-1">
              <p className="font-bold text-sm">{tenantDetail.tenant.fullName}</p>
              <p className="text-[#6B7280] dark:text-[#9CA3AF]">
                {tenantDetail.tenant.email} · {tenantDetail.tenant.phone} · Occupation: {tenantDetail.tenant.occupationStatus || 'Not specified'}
              </p>
              {tenantDetail.tenant.emergencyContactName && (
                <p className="text-[#4B5563] dark:text-[#D1D5DB]">
                  Emergency: {tenantDetail.tenant.emergencyContactName} ({tenantDetail.tenant.emergencyContactPhone})
                </p>
              )}
            </div>

            <div>
              <h3 className="font-bold text-sm mb-2">Stays &amp; Rent Records</h3>
              {tenantDetail.stays.length === 0 ? (
                <p className="text-[#6B7280] dark:text-[#9CA3AF]">No stay records yet.</p>
              ) : (
                <div className="space-y-2">
                  {tenantDetail.stays.map((s: any) => (
                    <div key={s.id} className="p-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151]">
                      <p className="font-semibold">
                        Code: {s.tenantCode || s.id} · Status: {s.status}
                      </p>
                      <p className="text-[#6B7280] dark:text-[#9CA3AF]">
                        Rent: {formatInr(s.monthlyRentInr)}/mo · Deposit: {formatInr(s.securityDepositInr)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <h3 className="font-bold text-sm">KYC Documents (Audited Access)</h3>
              <input
                type="text"
                value={inspectReason}
                onChange={(e) => setInspectReason(e.target.value)}
                placeholder="Reason for inspecting sensitive KYC document..."
                className="w-full min-h-[38px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-xs"
              />
              {tenantDetail.documents.length === 0 ? (
                <p className="text-[#6B7280] dark:text-[#9CA3AF]">No documents uploaded.</p>
              ) : (
                tenantDetail.documents.map((doc: any) => (
                  <div
                    key={doc.id}
                    className="p-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] flex items-center justify-between gap-2"
                  >
                    <div>
                      <p className="font-semibold">{doc.title} ({doc.docType})</p>
                      <p className="text-[#6B7280] dark:text-[#9CA3AF]">Status: {doc.status}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleInspectDocument(doc.id)}
                      className="min-h-[36px] px-3 rounded-lg bg-[#047857] text-white font-semibold"
                    >
                      Inspect (Audited)
                    </button>
                  </div>
                ))
              )}

              {inspectedDocResult && (
                <div className="p-3.5 rounded-xl bg-[#ECFDF5] dark:bg-[#10B981]/15 border border-[#047857]/30 space-y-1">
                  <p className="font-bold text-[#047857] dark:text-[#34D399]">
                    Audited Document Access Logged ({new Date(inspectedDocResult.auditedAt).toLocaleString('en-IN')})
                  </p>
                  <p>File URL: <span className="font-mono">{inspectedDocResult.document.fileUrl}</span></p>
                  {inspectedDocResult.document.notes && <p>Notes: {inspectedDocResult.document.notes}</p>}
                </div>
              )}
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
