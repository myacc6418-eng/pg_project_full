import React, { useEffect, useState } from 'react';
import { Utensils, Save, Star } from 'lucide-react';
import { apiFetch } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { CardSkeleton, EmptyState } from '../../components/ui/CommonUI';
import { FoodMenuDay, MealFeedback, MealPreference, Property } from '../../../packages/shared/types';

const DAYS: FoodMenuDay['day'][] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function OwnerFoodMessPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedPropId, setSelectedPropId] = useState('');
  const [menuRows, setMenuRows] = useState<FoodMenuDay[]>([]);
  const [preferences, setPreferences] = useState<MealPreference[]>([]);
  const [feedbacks, setFeedbacks] = useState<MealFeedback[]>([]);
  const [saving, setSaving] = useState(false);

  const loadFood = async (propId?: string) => {
    setLoading(true);
    try {
      const ov = await apiFetch<any>('/api/v1/operations/owner/overview?propertyId=ALL');
      setProperties(ov.properties || []);
      const activeId = propId || selectedPropId || ov.properties?.[0]?.id || '';
      setSelectedPropId(activeId);

      const allMenus: FoodMenuDay[] = ov.foodMenus || [];
      const rows = DAYS.map((day) => {
        const match = allMenus.find((m) => m.propertyId === activeId && m.day === day);
        return (
          match || {
            propertyId: activeId,
            day,
            breakfast: 'Idli Sambar & Tea',
            lunch: 'Rice, Dal, Sabzi & Curd',
            dinner: 'Phulka, Paneer Curry & Salad',
          }
        );
      });
      setMenuRows(rows);
      setPreferences((ov.mealPreferences || []).filter((p: MealPreference) => p.propertyId === activeId));
      setFeedbacks((ov.mealFeedbacks || []).filter((f: MealFeedback) => f.propertyId === activeId));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFood();
  }, []);

  const handlePropertySwitch = (id: string) => {
    setSelectedPropId(id);
    loadFood(id);
  };

  const handleUpdateCell = (day: FoodMenuDay['day'], field: 'breakfast' | 'lunch' | 'dinner', val: string) => {
    setMenuRows((prev) => prev.map((r) => (r.day === day ? { ...r, [field]: val } : r)));
  };

  const handleSaveMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch('/api/v1/operations/owner/food-menu', {
        method: 'PUT',
        body: JSON.stringify({ propertyId: selectedPropId, days: menuRows }),
      });
      showToast('Weekly Mess Menu Published', 'Updated schedule is immediately visible in the tenant app.');
      await loadFood(selectedPropId);
    } catch (err: any) {
      showToast('Could not save menu', err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <CardSkeleton rows={4} />;
  if (properties.length === 0) {
    return (
      <EmptyState
        icon={Utensils}
        title="No Properties Configured"
        description="Add a PG property first to manage weekly mess menus."
      />
    );
  }

  const vegCount = preferences.filter((p) => p.preference === 'VEG').length;
  const nonVegCount = preferences.filter((p) => p.preference === 'NON_VEG').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#111827] dark:text-[#F9FAFB]">Food &amp; Mess Management</h1>
          <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF]">
            Edit the 7-day meal schedule, monitor Veg / Non-Veg headcount, and review resident dining feedback.
          </p>
        </div>

        <select
          aria-label="Select PG property"
          value={selectedPropId}
          onChange={(e) => handlePropertySwitch(e.target.value)}
          className="min-h-[42px] px-3.5 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] text-sm font-medium text-[#111827] dark:text-[#F9FAFB]"
        >
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Headcount Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-4">
          <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">Vegetarian Residents</p>
          <p className="mt-1 font-mono text-2xl font-bold text-[#047857] dark:text-[#34D399] tabular-nums">{vegCount}</p>
        </div>
        <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-4">
          <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">Non-Vegetarian Residents</p>
          <p className="mt-1 font-mono text-2xl font-bold text-[#B45309] dark:text-amber-400 tabular-nums">{nonVegCount}</p>
        </div>
        <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-4">
          <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">Resident Meal Reviews</p>
          <p className="mt-1 font-mono text-2xl font-bold text-[#111827] dark:text-[#F9FAFB] tabular-nums">{feedbacks.length}</p>
        </div>
      </div>

      {/* Weekly Editable Menu */}
      <form onSubmit={handleSaveMenu} className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">Weekly Meal Schedule (Syncs Live to Tenant App)</h2>
          <button
            type="submit"
            disabled={saving}
            className="min-h-[40px] px-4 rounded-xl bg-[#047857] hover:bg-[#065F46] text-white text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Saving...' : 'Save Weekly Menu'}
          </button>
        </div>

        <div className="space-y-3">
          {menuRows.map((row) => (
            <div
              key={row.day}
              className="grid grid-cols-1 lg:grid-cols-10 gap-3 items-center p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151]"
            >
              <div className="lg:col-span-1 font-mono text-sm font-bold text-[#047857] dark:text-[#34D399]">
                {row.day}
              </div>
              <div className="lg:col-span-3">
                <label className="block text-[10px] uppercase text-[#6B7280] dark:text-[#9CA3AF] mb-0.5">Breakfast</label>
                <input
                  type="text"
                  value={row.breakfast}
                  onChange={(e) => handleUpdateCell(row.day, 'breakfast', e.target.value)}
                  className="w-full min-h-[38px] px-2.5 rounded-lg border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] text-xs"
                />
              </div>
              <div className="lg:col-span-3">
                <label className="block text-[10px] uppercase text-[#6B7280] dark:text-[#9CA3AF] mb-0.5">Lunch</label>
                <input
                  type="text"
                  value={row.lunch}
                  onChange={(e) => handleUpdateCell(row.day, 'lunch', e.target.value)}
                  className="w-full min-h-[38px] px-2.5 rounded-lg border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] text-xs"
                />
              </div>
              <div className="lg:col-span-3">
                <label className="block text-[10px] uppercase text-[#6B7280] dark:text-[#9CA3AF] mb-0.5">Dinner</label>
                <input
                  type="text"
                  value={row.dinner}
                  onChange={(e) => handleUpdateCell(row.day, 'dinner', e.target.value)}
                  className="w-full min-h-[38px] px-2.5 rounded-lg border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] text-xs"
                />
              </div>
            </div>
          ))}
        </div>
      </form>

      {/* Meal Preferences + Resident Feedback */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-3">
          <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">Resident Dietary Roster</h2>
          {preferences.length === 0 ? (
            <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF]">No meal preferences submitted yet.</p>
          ) : (
            preferences.map((p) => (
              <div key={p.id} className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] flex justify-between text-xs">
                <span className="font-semibold text-[#111827] dark:text-[#F9FAFB]">{p.tenantName}</span>
                <span className={p.preference === 'VEG' ? 'font-bold text-[#047857] dark:text-[#34D399]' : 'font-bold text-[#B45309] dark:text-amber-400'}>
                  {p.preference}
                </span>
              </div>
            ))
          )}
        </div>

        <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-3">
          <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">Resident Dining Feedback</h2>
          {feedbacks.length === 0 ? (
            <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF]">No meal ratings received yet.</p>
          ) : (
            feedbacks.map((f) => (
              <div key={f.id} className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="font-bold text-[#111827] dark:text-[#F9FAFB]">{f.tenantName}</span>
                  <span className="inline-flex items-center gap-1 font-mono font-bold text-[#B45309] dark:text-amber-400">
                    <Star className="w-3.5 h-3.5 fill-current" /> {f.rating}/5
                  </span>
                </div>
                <p className="text-[#6B7280] dark:text-[#9CA3AF]">{f.comment}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
