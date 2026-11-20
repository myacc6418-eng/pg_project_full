import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  AlertTriangle,
  Check,
  Copy,
  Archive,
  Trash2,
  Plus,
  FileText,
  Save,
} from 'lucide-react';
import { apiFetch } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { CardSkeleton, formatInr, StatusIndicator } from '../../components/ui/CommonUI';
import { SafeImage } from '../../components/ui/SafeImage';
import {
  LocationVerificationStatus,
  Property,
  PropertyApprovalStatus,
  PropertyDocument,
  PropertyExtraCharge,
  PropertyGenderType,
} from '../../../packages/shared/types';
import { PG_AMENITIES } from '../../../packages/shared/constants';

export function OwnerPropertyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast, confirmAction } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<'basic' | 'location' | 'amenities' | 'pricing' | 'media' | 'documents'>('basic');

  const [property, setProperty] = useState<Property | null>(null);
  const [documents, setDocuments] = useState<PropertyDocument[]>([]);
  const [activeStayCount, setActiveStayCount] = useState(0);

  // Editable states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [genderType, setGenderType] = useState<PropertyGenderType>(PropertyGenderType.COLIVING);
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  const [address, setAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [locality, setLocality] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [googleMapsUrl, setGoogleMapsUrl] = useState('');
  const [ownerLat, setOwnerLat] = useState('');
  const [ownerLng, setOwnerLng] = useState('');

  const [amenities, setAmenities] = useState<string[]>([]);
  const [rulesText, setRulesText] = useState('');

  const [startingRentInr, setStartingRentInr] = useState(0);
  const [securityDepositInr, setSecurityDepositInr] = useState(0);
  const [extraCharges, setExtraCharges] = useState<PropertyExtraCharge[]>([]);
  const [newChargeTitle, setNewChargeTitle] = useState('');
  const [newChargeAmount, setNewChargeAmount] = useState('');
  const [newChargeFreq, setNewChargeFreq] = useState<'MONTHLY' | 'ONE_TIME'>('MONTHLY');

  const [images, setImages] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState('');

  const [docType, setDocType] = useState<'FIRE_SAFETY' | 'OWNERSHIP_DEED' | 'TRADE_LICENSE' | 'HOUSE_RULES_PDF' | 'OTHER'>('FIRE_SAFETY');
  const [docTitle, setDocTitle] = useState('');
  const [docUrl, setDocUrl] = useState('');

  const loadDetail = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{
        property: Property;
        documents: PropertyDocument[];
        activeStayCount: number;
      }>(`/api/v1/properties/owner/${id}`);
      const p = res.property;
      setProperty(p);
      setDocuments(res.documents);
      setActiveStayCount(res.activeStayCount);

      setName(p.name);
      setDescription(p.description);
      setGenderType(p.genderType);
      setContactPhone(p.contactPhone || '');
      setContactEmail(p.contactEmail || '');
      setAddress(p.address);
      setLandmark(p.landmark);
      setLocality(p.locality);
      setCity(p.city);
      setStateName(p.state);
      setPostalCode(p.postalCode);
      setGoogleMapsUrl(p.googleMapsUrl || '');
      setOwnerLat(String(p.ownerLat));
      setOwnerLng(String(p.ownerLng));
      setAmenities(p.amenities || []);
      setRulesText((p.rules || []).join('\n'));
      setStartingRentInr(p.startingRentInr);
      setSecurityDepositInr(p.securityDepositInr);
      setExtraCharges(p.extraCharges || []);
      setImages(p.images || []);
    } catch (err: any) {
      showToast('Failed to load property', err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
  }, [id]);

  const handleSave = async (payload: Record<string, any>) => {
    setSaving(true);
    try {
      const res = await apiFetch<{ property: Property; reverificationTriggered: boolean }>(
        `/api/v1/properties/owner/${id}`,
        {
          method: 'PATCH',
          body: JSON.stringify(payload),
        }
      );
      setProperty(res.property);
      if (res.reverificationTriggered) {
        showToast(
          'Location Re-verification Required',
          'Address/coordinates changed. Public listing paused until Super Admin re-verifies.',
          'info'
        );
      } else {
        showToast('Property Updated', 'All connected property metrics and screens synchronized.');
      }
      await loadDetail();
    } catch (err: any) {
      showToast('Update failed', err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch(`/api/v1/properties/owner/${id}/documents`, {
        method: 'POST',
        body: JSON.stringify({ docType, title: docTitle, fileUrl: docUrl || undefined }),
      });
      setDocTitle('');
      setDocUrl('');
      showToast('Property document uploaded');
      await loadDetail();
    } catch (err: any) {
      showToast('Upload failed', err.message, 'error');
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    await apiFetch(`/api/v1/properties/owner/${id}/documents/${docId}`, { method: 'DELETE' });
    showToast('Document removed');
    await loadDetail();
  };

  if (loading || !property) return <CardSkeleton rows={4} />;

  const inputClass =
    'w-full min-h-[44px] px-3.5 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#1F2937] text-sm text-[#111827] dark:text-[#F9FAFB]';

  const isPendingApproval = property.approvalStatus !== PropertyApprovalStatus.APPROVED;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            to="/owner/properties"
            className="min-h-[40px] min-w-[40px] rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] flex items-center justify-center text-[#111827] dark:text-[#F9FAFB]"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
              {property.locality}, {property.city} · {activeStayCount} active tenant stays
            </p>
            <h1 className="font-display text-2xl font-bold text-[#111827] dark:text-[#F9FAFB]">{property.name}</h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <StatusIndicator
            status={property.approvalStatus === PropertyApprovalStatus.APPROVED ? 'success' : 'warning'}
            label={`Approval: ${property.approvalStatus.replace(/_/g, ' ')}`}
          />
          <StatusIndicator
            status={property.locationStatus === LocationVerificationStatus.VERIFIED ? 'success' : 'warning'}
            label={`Location: ${property.locationStatus.replace(/_/g, ' ')}`}
          />
        </div>
      </div>

      {isPendingApproval && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 dark:text-amber-200 space-y-1">
            <p className="font-bold">Property Approval &amp; Operational Guard Active</p>
            <p>
              You can configure rooms, beds, pricing, and documents now, but marketplace discovery and public QR tenant joining remain locked until Super Admin approves the property and verifies its location.
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: 'basic', label: 'Basic Details' },
          { id: 'location', label: 'Location & Re-verification' },
          { id: 'amenities', label: 'Amenities & Rules' },
          { id: 'pricing', label: 'Pricing & Extra Charges' },
          { id: 'media', label: 'Media Gallery' },
          { id: 'documents', label: 'Property Documents' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id as any)}
            className={`min-h-[40px] px-3.5 rounded-xl text-xs font-semibold whitespace-nowrap border ${
              tab === t.id
                ? 'bg-[#047857] text-white border-[#047857]'
                : 'bg-white dark:bg-[#111827] text-[#4B5563] dark:text-[#D1D5DB] border-[#E5E7EB] dark:border-[#374151]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'basic' && (
        <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-6 space-y-4">
          <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">Edit Basic Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] mb-1">PG Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] mb-1">
                Accommodation Type
              </label>
              <select
                value={genderType}
                onChange={(e) => setGenderType(e.target.value as PropertyGenderType)}
                className={inputClass}
              >
                <option value={PropertyGenderType.COLIVING}>Co-living</option>
                <option value={PropertyGenderType.BOYS}>Boys PG</option>
                <option value={PropertyGenderType.GIRLS}>Girls PG</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] mb-1">Contact Phone</label>
              <input type="text" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] mb-1">Contact Email</label>
              <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] mb-1">Description</label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3.5 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#1F2937] text-sm text-[#111827] dark:text-[#F9FAFB]"
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={async () => {
                  const res = await apiFetch<{ property: Property }>(`/api/v1/properties/owner/${id}/duplicate`, {
                    method: 'POST',
                  });
                  showToast('Duplicated as Draft');
                  navigate(`/owner/properties/${res.property.id}`);
                }}
                className="min-h-[42px] px-3.5 rounded-xl border border-[#E5E7EB] dark:border-[#374151] text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] inline-flex items-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" /> Duplicate as Draft
              </button>
              <button
                type="button"
                onClick={async () => {
                  const ok = await confirmAction({
                    title: property.isArchived ? 'Unarchive Property?' : 'Archive Property?',
                    description: 'Archiving removes this property from active listings. Blocked if active stays exist.',
                    confirmLabel: property.isArchived ? 'Unarchive' : 'Archive',
                  });
                  if (!ok) return;
                  try {
                    await apiFetch(`/api/v1/properties/owner/${id}/archive`, { method: 'POST' });
                    showToast('Archive status updated');
                    await loadDetail();
                  } catch (err: any) {
                    showToast('Action blocked', err.message, 'error');
                  }
                }}
                className="min-h-[42px] px-3.5 rounded-xl border border-[#E5E7EB] dark:border-[#374151] text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] inline-flex items-center gap-1.5"
              >
                <Archive className="w-3.5 h-3.5" /> {property.isArchived ? 'Unarchive' : 'Archive'}
              </button>
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave({ name, description, genderType, contactPhone, contactEmail })}
              className="min-h-[44px] px-5 rounded-xl bg-[#047857] hover:bg-[#065F46] text-white text-sm font-semibold inline-flex items-center gap-2"
            >
              <Save className="w-4 h-4" /> Save Basic Details
            </button>
          </div>
        </div>
      )}

      {tab === 'location' && (
        <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-6 space-y-4">
          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-xs text-amber-900 dark:text-amber-200">
            <strong>Re-verification Rule:</strong> Modifying address, locality, PIN code, or coordinates on a verified property automatically sets Location Status to <strong>REVERIFICATION REQUIRED</strong> until Super Admin verifies the new location.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] mb-1">Street Address</label>
              <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] mb-1">Landmark</label>
              <input type="text" value={landmark} onChange={(e) => setLandmark(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] mb-1">Locality</label>
              <input type="text" value={locality} onChange={(e) => setLocality(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] mb-1">City</label>
              <input type="text" value={city} onChange={(e) => setCity(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] mb-1">State</label>
              <input type="text" value={stateName} onChange={(e) => setStateName(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] mb-1">PIN Code</label>
              <input type="text" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] mb-1">Google Maps URL</label>
              <input type="text" value={googleMapsUrl} onChange={(e) => setGoogleMapsUrl(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] mb-1">Owner Latitude</label>
              <input type="text" value={ownerLat} onChange={(e) => setOwnerLat(e.target.value)} className={`${inputClass} font-mono`} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] mb-1">Owner Longitude</label>
              <input type="text" value={ownerLng} onChange={(e) => setOwnerLng(e.target.value)} className={`${inputClass} font-mono`} />
            </div>
          </div>

          <button
            type="button"
            disabled={saving}
            onClick={() =>
              handleSave({
                address,
                landmark,
                locality,
                city,
                state: stateName,
                postalCode,
                googleMapsUrl,
                ownerLat: Number(ownerLat),
                ownerLng: Number(ownerLng),
              })
            }
            className="min-h-[44px] px-5 rounded-xl bg-[#047857] hover:bg-[#065F46] text-white text-sm font-semibold inline-flex items-center gap-2"
          >
            <Save className="w-4 h-4" /> Save Location Details
          </button>
        </div>
      )}

      {tab === 'amenities' && (
        <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-6 space-y-5">
          <div>
            <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB] mb-3">Amenities</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {PG_AMENITIES.map((am) => {
                const selected = amenities.includes(am);
                return (
                  <button
                    key={am}
                    type="button"
                    onClick={() =>
                      setAmenities((prev) => (prev.includes(am) ? prev.filter((x) => x !== am) : [...prev, am]))
                    }
                    className={`min-h-[42px] px-3 rounded-xl border text-xs font-semibold flex items-center gap-2 text-left ${
                      selected
                        ? 'border-[#047857] dark:border-[#34D399] bg-[#ECFDF5] dark:bg-[#10B981]/15 text-[#047857] dark:text-[#34D399]'
                        : 'border-[#E5E7EB] dark:border-[#374151] text-[#4B5563] dark:text-[#D1D5DB]'
                    }`}
                  >
                    <Check className={`w-3.5 h-3.5 shrink-0 ${selected ? 'opacity-100' : 'opacity-20'}`} />
                    <span className="truncate">{am}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB] mb-2">House Rules (one per line)</h2>
            <textarea
              rows={5}
              value={rulesText}
              onChange={(e) => setRulesText(e.target.value)}
              className="w-full p-3.5 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#1F2937] text-sm text-[#111827] dark:text-[#F9FAFB]"
            />
          </div>

          <button
            type="button"
            disabled={saving}
            onClick={() =>
              handleSave({
                amenities,
                rules: rulesText
                  .split('\n')
                  .map((r) => r.trim())
                  .filter(Boolean),
              })
            }
            className="min-h-[44px] px-5 rounded-xl bg-[#047857] hover:bg-[#065F46] text-white text-sm font-semibold inline-flex items-center gap-2"
          >
            <Save className="w-4 h-4" /> Save Amenities &amp; Rules
          </button>
        </div>
      )}

      {tab === 'pricing' && (
        <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-6 space-y-5">
          <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">Base Pricing &amp; Extra Charges</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] mb-1">
                Starting Monthly Rent (₹)
              </label>
              <input
                type="number"
                value={startingRentInr}
                onChange={(e) => setStartingRentInr(Number(e.target.value))}
                className={`${inputClass} tabular-nums`}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] mb-1">
                Default Security Deposit (₹)
              </label>
              <input
                type="number"
                value={securityDepositInr}
                onChange={(e) => setSecurityDepositInr(Number(e.target.value))}
                className={`${inputClass} tabular-nums`}
              />
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-[#E5E7EB] dark:border-[#374151]">
            <h3 className="text-sm font-bold text-[#111827] dark:text-[#F9FAFB]">Optional Extra Charges</h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
              <input
                type="text"
                placeholder="Charge title (e.g. AC Meter)"
                value={newChargeTitle}
                onChange={(e) => setNewChargeTitle(e.target.value)}
                className={`${inputClass} sm:col-span-2`}
              />
              <input
                type="number"
                placeholder="Amount (₹)"
                value={newChargeAmount}
                onChange={(e) => setNewChargeAmount(e.target.value)}
                className={`${inputClass} tabular-nums`}
              />
              <div className="flex gap-2">
                <select
                  value={newChargeFreq}
                  onChange={(e) => setNewChargeFreq(e.target.value as any)}
                  className={inputClass}
                >
                  <option value="MONTHLY">Monthly</option>
                  <option value="ONE_TIME">One-Time</option>
                </select>
                <button
                  type="button"
                  onClick={() => {
                    if (!newChargeTitle.trim() || !Number(newChargeAmount)) return;
                    setExtraCharges((prev) => [
                      ...prev,
                      {
                        id: `chg_${Date.now()}`,
                        title: newChargeTitle.trim(),
                        amountInr: Number(newChargeAmount),
                        frequency: newChargeFreq,
                      },
                    ]);
                    setNewChargeTitle('');
                    setNewChargeAmount('');
                  }}
                  className="min-h-[44px] px-3 rounded-xl bg-[#047857] text-white text-xs font-semibold shrink-0"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {extraCharges.map((c) => (
                <div
                  key={c.id}
                  className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151] flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-[#111827] dark:text-[#F9FAFB]">{c.title}</span> ·{' '}
                    <span className="text-[#6B7280] dark:text-[#9CA3AF]">{c.frequency}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-[#047857] dark:text-[#34D399] tabular-nums">
                      {formatInr(c.amountInr)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setExtraCharges((prev) => prev.filter((x) => x.id !== c.id))}
                      className="text-red-500 hover:underline"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            disabled={saving}
            onClick={() => handleSave({ startingRentInr, securityDepositInr, extraCharges })}
            className="min-h-[44px] px-5 rounded-xl bg-[#047857] hover:bg-[#065F46] text-white text-sm font-semibold inline-flex items-center gap-2"
          >
            <Save className="w-4 h-4" /> Save Pricing &amp; Charges
          </button>
        </div>
      )}

      {tab === 'media' && (
        <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-6 space-y-4">
          <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">Property Media Gallery</h2>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Paste image path or URL..."
              value={newImageUrl}
              onChange={(e) => setNewImageUrl(e.target.value)}
              className={inputClass}
            />
            <button
              type="button"
              onClick={() => {
                if (!newImageUrl.trim()) return;
                const next = [...images, newImageUrl.trim()];
                setImages(next);
                setNewImageUrl('');
                handleSave({ images: next });
              }}
              className="min-h-[44px] px-4 rounded-xl bg-[#047857] text-white text-xs font-semibold shrink-0"
            >
              Add Photo
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {images.map((img, idx) => (
              <div
                key={`${img}-${idx}`}
                className="rounded-xl overflow-hidden border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937]"
              >
                <SafeImage src={img} alt={`Property media ${idx + 1}`} className="w-full h-40 object-cover" />
                <div className="p-2.5 flex items-center justify-between text-xs">
                  <span className="text-[#6B7280] dark:text-[#9CA3AF]">Photo #{idx + 1}</span>
                  {images.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const next = images.filter((_, i) => i !== idx);
                        setImages(next);
                        handleSave({ images: next });
                      }}
                      className="text-red-500 font-semibold"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'documents' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleAddDocument}
            className="lg:col-span-5 rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-3"
          >
            <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">Upload Compliance Document</h2>
            <select value={docType} onChange={(e) => setDocType(e.target.value as any)} className={inputClass}>
              <option value="FIRE_SAFETY">Fire &amp; Safety Certificate</option>
              <option value="OWNERSHIP_DEED">Ownership / Lease Deed</option>
              <option value="TRADE_LICENSE">Municipal Trade License</option>
              <option value="HOUSE_RULES_PDF">Signed House Rules Copy</option>
              <option value="OTHER">Other Property Document</option>
            </select>
            <input
              type="text"
              placeholder="Document Title"
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              required
              className={inputClass}
            />
            <input
              type="text"
              placeholder="Document File URL (optional)"
              value={docUrl}
              onChange={(e) => setDocUrl(e.target.value)}
              className={inputClass}
            />
            <button type="submit" className="w-full min-h-[44px] rounded-xl bg-[#047857] text-white text-sm font-semibold">
              Add Property Document
            </button>
          </form>

          <div className="lg:col-span-7 rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-3">
            <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">Attached Property Documents</h2>
            {documents.length === 0 ? (
              <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF]">No property documents attached yet.</p>
            ) : (
              documents.map((d) => (
                <div
                  key={d.id}
                  className="p-4 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151] flex items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-2.5">
                    <FileText className="w-4 h-4 text-[#047857] dark:text-[#34D399] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-[#111827] dark:text-[#F9FAFB]">{d.title}</p>
                      <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                        {d.docType.replace(/_/g, ' ')} · {new Date(d.uploadedAt).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusIndicator status={d.status === 'VERIFIED' ? 'success' : 'warning'} label={d.status} />
                    <button
                      type="button"
                      onClick={() => handleDeleteDocument(d.id)}
                      className="text-red-500 hover:text-red-600"
                      aria-label="Remove document"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
