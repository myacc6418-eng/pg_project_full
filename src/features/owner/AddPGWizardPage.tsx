import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { apiFetch } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { PropertyGenderType } from '../../../packages/shared/types';
import { PG_AMENITIES } from '../../../packages/shared/constants';

const STEPS = [
  'Basic Details',
  'Property Type',
  'Address',
  'Location Pin',
  'Amenities',
  'House Rules',
  'Photos',
  'Room Config',
  'Pricing',
  'Review & Submit',
];

export function AddPGWizardPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [genderType, setGenderType] = useState<PropertyGenderType>(PropertyGenderType.COLIVING);
  const [address, setAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [locality, setLocality] = useState('');
  const [city, setCity] = useState('Hyderabad');
  const [state, setState] = useState('Telangana');
  const [postalCode, setPostalCode] = useState('');
  const [googleMapsUrl, setGoogleMapsUrl] = useState('');
  const [ownerLat, setOwnerLat] = useState('17.4485');
  const [ownerLng, setOwnerLng] = useState('78.3816');
  const [amenities, setAmenities] = useState<string[]>(['High-Speed Wi-Fi', 'CCTV Security', 'RO Drinking Water']);
  const [rulesText, setRulesText] = useState(
    '30-day advance checkout notice required\nVisitors allowed in lounge until 9:00 PM\nNo smoking inside rooms'
  );
  const [initialRoomType, setInitialRoomType] = useState<'SINGLE' | 'TWIN' | 'TRIPLE'>('TWIN');
  const [initialBedCount, setInitialBedCount] = useState(2);
  const [startingRentInr, setStartingRentInr] = useState(9500);
  const [securityDepositInr, setSecurityDepositInr] = useState(10000);

  const toggleAmenity = (am: string) => {
    setAmenities((prev) => (prev.includes(am) ? prev.filter((item) => item !== am) : [...prev, am]));
  };

  const submitProperty = async (submitImmediately: boolean) => {
    setSubmitting(true);
    try {
      await apiFetch('/api/v1/properties/owner', {
        method: 'POST',
        body: JSON.stringify({
          name,
          description,
          genderType,
          address,
          landmark,
          locality,
          city,
          state,
          postalCode,
          googleMapsUrl,
          ownerLat: Number(ownerLat),
          ownerLng: Number(ownerLng),
          startingRentInr: Number(startingRentInr),
          securityDepositInr: Number(securityDepositInr),
          amenities,
          rules: rulesText
            .split('\n')
            .map((r) => r.trim())
            .filter(Boolean),
          initialRoomType,
          initialBedCount: Number(initialBedCount),
          submitImmediately,
        }),
      });
      showToast(
        submitImmediately ? 'Property Submitted for Approval' : 'Draft Saved',
        'Admin property approval & location verification run independently before public listing.'
      );
      navigate('/owner/properties');
    } catch (err: any) {
      showToast('Validation error', err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    'w-full min-h-[44px] px-3.5 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#1F2937] text-sm text-[#111827] dark:text-[#F9FAFB]';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <p className="text-xs font-semibold text-[#047857] dark:text-[#34D399]">
          Step {step + 1} of {STEPS.length} · {STEPS[step]}
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold text-[#111827] dark:text-[#F9FAFB]">Add PG Property</h1>
        <div className="mt-3 grid grid-cols-10 gap-1">
          {STEPS.map((s, idx) => (
            <button
              key={s}
              type="button"
              onClick={() => setStep(idx)}
              aria-label={`Step ${idx + 1}: ${s}`}
              className={`h-2 rounded-full transition-colors ${
                idx <= step ? 'bg-[#047857] dark:bg-[#34D399]' : 'bg-[#E5E7EB] dark:bg-[#374151]'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-6 space-y-4">
        {step === 0 && (
          <>
            <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">01. Basic Property Details</h2>
            <div>
              <label className="block text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] mb-1">PG Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Emerald Courtyard PG"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] mb-1">Description</label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe proximity to tech parks/colleges, meal style, and environment..."
                className="w-full p-3.5 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#1F2937] text-sm text-[#111827] dark:text-[#F9FAFB]"
              />
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">02. Accommodation Type</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { val: PropertyGenderType.COLIVING, label: 'Co-living' },
                { val: PropertyGenderType.BOYS, label: 'Boys PG' },
                { val: PropertyGenderType.GIRLS, label: 'Girls PG' },
              ].map((opt) => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => setGenderType(opt.val)}
                  className={`min-h-[56px] p-4 rounded-xl border text-sm font-semibold ${
                    genderType === opt.val
                      ? 'border-[#047857] dark:border-[#34D399] bg-[#ECFDF5] dark:bg-[#10B981]/15 text-[#047857] dark:text-[#34D399]'
                      : 'border-[#E5E7EB] dark:border-[#374151] text-[#111827] dark:text-[#F9FAFB]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">03. Complete Address</h2>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Plot / Street Address"
              className={inputClass}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                placeholder="Nearby Landmark"
                className={inputClass}
              />
              <input
                type="text"
                value={locality}
                onChange={(e) => setLocality(e.target.value)}
                placeholder="Locality (e.g. Madhapur)"
                className={inputClass}
              />
              <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" className={inputClass} />
              <input
                type="text"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder="6-digit PIN Code"
                className={`${inputClass} tabular-nums`}
              />
            </div>
            <input type="text" value={state} onChange={(e) => setState(e.target.value)} placeholder="State" className={inputClass} />
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">
              04. Location Coordinates for Verification
            </h2>
            <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
              Owners cannot self-verify locations. Super Admin independently verifies these coordinates before public listing.
            </p>
            <input
              type="url"
              value={googleMapsUrl}
              onChange={(e) => setGoogleMapsUrl(e.target.value)}
              placeholder="Optional Google Maps URL"
              className={inputClass}
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] mb-1">
                  Approximate Latitude
                </label>
                <input
                  type="text"
                  value={ownerLat}
                  onChange={(e) => setOwnerLat(e.target.value)}
                  className={`${inputClass} font-mono`}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] mb-1">
                  Approximate Longitude
                </label>
                <input
                  type="text"
                  value={ownerLng}
                  onChange={(e) => setOwnerLng(e.target.value)}
                  className={`${inputClass} font-mono`}
                />
              </div>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">05. Amenities</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {PG_AMENITIES.map((am) => {
                const selected = amenities.includes(am);
                return (
                  <button
                    key={am}
                    type="button"
                    onClick={() => toggleAmenity(am)}
                    className={`min-h-[44px] px-3 rounded-xl border text-xs font-semibold flex items-center gap-2 text-left ${
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
          </>
        )}

        {step === 5 && (
          <>
            <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">06. Rules &amp; Policies (one per line)</h2>
            <textarea
              rows={5}
              value={rulesText}
              onChange={(e) => setRulesText(e.target.value)}
              className="w-full p-3.5 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#1F2937] text-sm text-[#111827] dark:text-[#F9FAFB]"
            />
          </>
        )}

        {step === 6 && (
          <>
            <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">07. Property Photos</h2>
            <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF]">
              Default preview photograph is pre-attached for development testing. You can manage and add additional property photos anytime in My Properties.
            </p>
            <div className="rounded-xl overflow-hidden border border-[#E5E7EB] dark:border-[#374151] max-w-sm">
              <img
                src="/src/assets/images/pg_green_nest_1795149981855.jpg"
                alt="Property preview"
                className="w-full h-44 object-cover"
              />
            </div>
          </>
        )}

        {step === 7 && (
          <>
            <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">08. Initial Room 101 Configuration</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] mb-1">Sharing Type</label>
                <select value={initialRoomType} onChange={(e) => setInitialRoomType(e.target.value as any)} className={inputClass}>
                  <option value="SINGLE">Single</option>
                  <option value="TWIN">Twin Sharing</option>
                  <option value="TRIPLE">Triple Sharing</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] mb-1">Number of Beds</label>
                <input
                  type="number"
                  min={1}
                  max={6}
                  value={initialBedCount}
                  onChange={(e) => setInitialBedCount(Number(e.target.value))}
                  className={`${inputClass} tabular-nums`}
                />
              </div>
            </div>
          </>
        )}

        {step === 8 && (
          <>
            <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">09. Monthly Rent &amp; Security Deposit</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                <label className="block text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] mb-1">Security Deposit (₹)</label>
                <input
                  type="number"
                  value={securityDepositInr}
                  onChange={(e) => setSecurityDepositInr(Number(e.target.value))}
                  className={`${inputClass} tabular-nums`}
                />
              </div>
            </div>
          </>
        )}

        {step === 9 && (
          <>
            <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">10. Review &amp; Submit</h2>
            <div className="p-4 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151] space-y-1.5 text-sm text-[#111827] dark:text-[#F9FAFB]">
              <p>
                <strong>Name:</strong> {name || '—'}
              </p>
              <p>
                <strong>Type:</strong> {genderType}
              </p>
              <p>
                <strong>Location:</strong> {address}, {locality}, {city} - {postalCode}
              </p>
              <p>
                <strong>Pricing:</strong> ₹{startingRentInr}/mo · Deposit ₹{securityDepositInr}
              </p>
              <p>
                <strong>Amenities:</strong> {amenities.join(', ')}
              </p>
            </div>
            <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
              New properties are not publicly visible until Super Admin approves the property, verifies its location coordinates, and an active listing entitlement exists.
            </p>
          </>
        )}

        <div className="pt-4 border-t border-[#E5E7EB] dark:border-[#374151] flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            className="min-h-[44px] px-4 rounded-xl border border-[#E5E7EB] dark:border-[#374151] text-sm font-semibold text-[#111827] dark:text-[#F9FAFB] disabled:opacity-40 inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            Previous
          </button>

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
              className="min-h-[44px] px-5 rounded-xl bg-[#047857] hover:bg-[#065F46] text-white text-sm font-semibold inline-flex items-center gap-1.5"
            >
              Next Step
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => submitProperty(false)}
                className="min-h-[44px] px-4 rounded-xl border border-[#E5E7EB] dark:border-[#374151] text-sm font-semibold text-[#111827] dark:text-[#F9FAFB]"
              >
                Save as Draft
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => submitProperty(true)}
                className="min-h-[44px] px-5 rounded-xl bg-[#047857] hover:bg-[#065F46] text-white text-sm font-semibold"
              >
                {submitting ? 'Submitting...' : 'Submit for Approval & Verification'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
