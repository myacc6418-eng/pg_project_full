import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BedDouble, Plus, Trash2, ArrowRightLeft, Layers, Wrench, CheckCircle2, Ban } from 'lucide-react';
import { apiFetch } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { BottomSheet, CardSkeleton, EmptyState, formatInr, StatusIndicator } from '../../components/ui/CommonUI';
import { Bed, BedStatus, Floor, Property, Room, StayStatus, TenantStay } from '../../../packages/shared/types';

export function OwnerRoomsBedsPage() {
  const { showToast, confirmAction } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState(searchParams.get('propertyId') || '');
  const [floors, setFloors] = useState<Floor[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [stays, setStays] = useState<TenantStay[]>([]);

  // Modals
  const [showFloorModal, setShowFloorModal] = useState(false);
  const [floorNumber, setFloorNumber] = useState('1');
  const [floorLabel, setFloorLabel] = useState('Floor 1');

  const [showRoomModal, setShowRoomModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [roomNumber, setRoomNumber] = useState('');
  const [roomFloorNumber, setRoomFloorNumber] = useState('1');
  const [roomType, setRoomType] = useState<'SINGLE' | 'TWIN' | 'TRIPLE' | 'FOUR_SHARING'>('TWIN');
  const [roomRent, setRoomRent] = useState('9000');
  const [roomDeposit, setRoomDeposit] = useState('15000');
  const [roomBedCount, setRoomBedCount] = useState('2');
  const [roomNotes, setRoomNotes] = useState('');

  const [addBedRoom, setAddBedRoom] = useState<Room | null>(null);
  const [newBedCode, setNewBedCode] = useState('');
  const [newBedRentOverride, setNewBedRentOverride] = useState('');

  const [editBed, setEditBed] = useState<Bed | null>(null);
  const [editBedRent, setEditBedRent] = useState('');
  const [editBedNotes, setEditBedNotes] = useState('');

  const [transferStay, setTransferStay] = useState<TenantStay | null>(null);
  const [transferTargetBedId, setTransferTargetBedId] = useState('');
  const [transferReason, setTransferReason] = useState('Resident requested room upgrade');
  const [updateRentToNewRoom, setUpdateRentToNewRoom] = useState(true);

  const loadData = async (propId?: string) => {
    setLoading(true);
    try {
      const ov = await apiFetch<any>('/api/v1/operations/owner/overview?propertyId=ALL');
      setProperties(ov.properties || []);
      const targetId = propId || selectedPropertyId || searchParams.get('propertyId') || ov.properties?.[0]?.id || '';
      setSelectedPropertyId(targetId);
      setFloors(ov.floors || []);
      setRooms(ov.rooms || []);
      setBeds(ov.beds || []);
      setStays(ov.stays || []);
    } catch {
      showToast('Could not load rooms & beds', undefined, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePropertyChange = (id: string) => {
    setSelectedPropertyId(id);
    setSearchParams({ propertyId: id });
  };

  const propFloors = floors
    .filter((f) => f.propertyId === selectedPropertyId)
    .sort((a, b) => a.floorNumber - b.floorNumber);
  const propRooms = rooms.filter((r) => r.propertyId === selectedPropertyId);
  const propBeds = beds.filter((b) => b.propertyId === selectedPropertyId);
  const activeStays = stays.filter(
    (s) => s.propertyId === selectedPropertyId && s.status !== StayStatus.CHECKED_OUT
  );

  const handleCreateFloor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/v1/operations/owner/floors', {
        method: 'POST',
        body: JSON.stringify({
          propertyId: selectedPropertyId,
          floorNumber: Number(floorNumber),
          label: floorLabel.trim() || `Floor ${floorNumber}`,
        }),
      });
      setShowFloorModal(false);
      showToast('Floor added');
      await loadData(selectedPropertyId);
    } catch (err: any) {
      showToast('Could not add floor', err.message, 'error');
    }
  };

  const handleDeleteFloor = async (f: Floor) => {
    const ok = await confirmAction({
      title: `Delete ${f.label}?`,
      description: 'Floors can only be deleted when no rooms exist on them.',
      confirmLabel: 'Delete Floor',
    });
    if (!ok) return;
    try {
      await apiFetch(`/api/v1/operations/owner/floors/${f.id}`, { method: 'DELETE' });
      showToast('Floor deleted');
      await loadData(selectedPropertyId);
    } catch (err: any) {
      showToast('Cannot delete floor', err.message, 'error');
    }
  };

  const openCreateRoomModal = () => {
    const prop = properties.find((p) => p.id === selectedPropertyId);
    setEditingRoom(null);
    setRoomNumber('');
    setRoomFloorNumber(String(propFloors[0]?.floorNumber ?? 1));
    setRoomType('TWIN');
    setRoomRent(String(prop?.startingRentInr || 9000));
    setRoomDeposit(String(prop?.securityDepositInr || 15000));
    setRoomBedCount('2');
    setRoomNotes('');
    setShowRoomModal(true);
  };

  const openEditRoomModal = (room: Room) => {
    setEditingRoom(room);
    setRoomNumber(room.roomNumber);
    setRoomFloorNumber(String(room.floorNumber));
    setRoomType(room.roomType);
    setRoomRent(String(room.monthlyRentInr));
    setRoomDeposit(String(room.depositInr));
    setRoomNotes(room.notes || '');
    setShowRoomModal(true);
  };

  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingRoom) {
        await apiFetch(`/api/v1/operations/owner/rooms/${editingRoom.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            roomType,
            monthlyRentInr: Number(roomRent),
            depositInr: Number(roomDeposit),
            notes: roomNotes,
          }),
        });
        showToast(`Room ${editingRoom.roomNumber} updated`);
      } else {
        await apiFetch('/api/v1/operations/owner/rooms', {
          method: 'POST',
          body: JSON.stringify({
            propertyId: selectedPropertyId,
            roomNumber,
            floorNumber: Number(roomFloorNumber),
            roomType,
            monthlyRentInr: Number(roomRent),
            depositInr: Number(roomDeposit),
            bedCount: Number(roomBedCount),
            notes: roomNotes,
          }),
        });
        showToast(`Room ${roomNumber} created with ${roomBedCount} beds`);
      }
      setShowRoomModal(false);
      await loadData(selectedPropertyId);
    } catch (err: any) {
      showToast('Room save failed', err.message, 'error');
    }
  };

  const handleToggleRoomActive = async (room: Room) => {
    const nextActive = room.isActive === false;
    try {
      await apiFetch(`/api/v1/operations/owner/rooms/${room.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: nextActive }),
      });
      showToast(nextActive ? `Room ${room.roomNumber} enabled` : `Room ${room.roomNumber} disabled`);
      await loadData(selectedPropertyId);
    } catch (err: any) {
      showToast('Action blocked', err.message, 'error');
    }
  };

  const handleAddBed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addBedRoom) return;
    try {
      await apiFetch('/api/v1/operations/owner/beds', {
        method: 'POST',
        body: JSON.stringify({
          roomId: addBedRoom.id,
          bedCode: newBedCode.trim() || undefined,
          monthlyRentOverrideInr: newBedRentOverride ? Number(newBedRentOverride) : null,
        }),
      });
      setAddBedRoom(null);
      setNewBedCode('');
      setNewBedRentOverride('');
      showToast('Bed added to room');
      await loadData(selectedPropertyId);
    } catch (err: any) {
      showToast('Could not add bed', err.message, 'error');
    }
  };

  const handleUpdateBedStatus = async (bed: Bed, status: BedStatus) => {
    try {
      await apiFetch(`/api/v1/operations/owner/beds/${bed.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      showToast(`Bed ${bed.bedCode} marked ${status}`);
      await loadData(selectedPropertyId);
    } catch (err: any) {
      showToast('Bed update failed', err.message, 'error');
    }
  };

  const handleSaveBedOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editBed) return;
    try {
      await apiFetch(`/api/v1/operations/owner/beds/${editBed.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          monthlyRentOverrideInr: editBedRent ? Number(editBedRent) : null,
          notes: editBedNotes,
        }),
      });
      setEditBed(null);
      showToast(`Bed ${editBed.bedCode} updated`);
      await loadData(selectedPropertyId);
    } catch (err: any) {
      showToast('Update failed', err.message, 'error');
    }
  };

  const handleDeleteBed = async (bed: Bed) => {
    const ok = await confirmAction({
      title: `Delete Bed ${bed.bedCode}?`,
      description: 'Occupied or reserved beds cannot be deleted. Only unused/maintenance beds can be removed.',
      confirmLabel: 'Delete Bed',
    });
    if (!ok) return;
    try {
      await apiFetch(`/api/v1/operations/owner/beds/${bed.id}`, { method: 'DELETE' });
      showToast(`Bed ${bed.bedCode} removed`);
      await loadData(selectedPropertyId);
    } catch (err: any) {
      showToast('Cannot delete bed', err.message, 'error');
    }
  };

  const handleTransferBed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferStay || !transferTargetBedId) return;
    try {
      await apiFetch(`/api/v1/operations/owner/stays/${transferStay.id}/transfer-bed`, {
        method: 'POST',
        body: JSON.stringify({
          targetBedId: transferTargetBedId,
          reason: transferReason,
          updateRentToNewRoom,
        }),
      });
      setTransferStay(null);
      setTransferTargetBedId('');
      showToast('Resident transferred to new bed', 'Inventory, stay history, and vacancy status updated.');
      await loadData(selectedPropertyId);
    } catch (err: any) {
      showToast('Transfer failed', err.message, 'error');
    }
  };

  if (loading) return <CardSkeleton rows={4} />;

  if (properties.length === 0) {
    return (
      <EmptyState
        icon={BedDouble}
        title="No Properties Found"
        description="Add a PG property first before configuring floors, rooms, and beds."
      />
    );
  }

  const availableBedsForTransfer = propBeds.filter((b) => b.status === BedStatus.AVAILABLE);

  return (
    <div className="space-y-6">
      {/* Header + Property Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#111827] dark:text-[#F9FAFB]">
            Floors, Rooms &amp; Beds
          </h1>
          <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF]">
            Manage floor hierarchy, room sharing configurations, bed statuses, rent overrides, and bed transfers.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Select property"
            value={selectedPropertyId}
            onChange={(e) => handlePropertyChange(e.target.value)}
            className="min-h-[42px] px-3.5 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] text-sm font-medium text-[#111827] dark:text-[#F9FAFB]"
          >
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setShowFloorModal(true)}
            className="min-h-[42px] px-3.5 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] inline-flex items-center gap-1.5"
          >
            <Layers className="w-4 h-4 text-[#047857] dark:text-[#34D399]" />
            Add Floor
          </button>

          <button
            type="button"
            onClick={openCreateRoomModal}
            className="min-h-[42px] px-4 rounded-xl bg-[#047857] hover:bg-[#065F46] text-white text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Add Room
          </button>
        </div>
      </div>

      {/* Inventory Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Floors', val: propFloors.length },
          { label: 'Rooms', val: propRooms.length },
          { label: 'Total Beds', val: propBeds.length },
          { label: 'Occupied', val: propBeds.filter((b) => b.status === BedStatus.OCCUPIED).length },
          { label: 'Available', val: propBeds.filter((b) => b.status === BedStatus.AVAILABLE).length },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-4"
          >
            <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">{item.label}</p>
            <p className="mt-1 font-mono text-xl font-bold text-[#111827] dark:text-[#F9FAFB] tabular-nums">
              {item.val}
            </p>
          </div>
        ))}
      </div>

      {/* Floor Badges */}
      <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-[#111827] dark:text-[#F9FAFB]">Floor Structure</h2>
          <Link to="/owner/vacancies" className="text-xs font-semibold text-[#047857] dark:text-[#34D399] hover:underline">
            View Live Vacancies
          </Link>
        </div>
        {propFloors.length === 0 ? (
          <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">No floors configured yet. Add a floor or room to begin.</p>
        ) : (
          <div className="flex flex-wrap gap-2.5">
            {propFloors.map((f) => {
              const floorRoomCount = propRooms.filter((r) => r.floorNumber === f.floorNumber).length;
              return (
                <div
                  key={f.id}
                  className="px-3.5 py-2 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] flex items-center gap-3"
                >
                  <div>
                    <p className="text-xs font-bold text-[#111827] dark:text-[#F9FAFB]">{f.label}</p>
                    <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">{floorRoomCount} room(s)</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteFloor(f)}
                    aria-label={`Delete ${f.label}`}
                    className="p-1.5 rounded-lg text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#DC2626] dark:hover:text-red-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Rooms & Beds Matrix */}
      <div className="space-y-4">
        {propRooms.length === 0 ? (
          <EmptyState
            icon={BedDouble}
            title="No Rooms Added Yet"
            description="Create your first room with single, twin, triple, or 4-sharing bed layout."
            actionLabel="Create First Room"
            onAction={openCreateRoomModal}
          />
        ) : (
          propRooms.map((room) => {
            const roomBeds = propBeds.filter((b) => b.roomId === room.id);
            return (
              <div
                key={room.id}
                className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">
                        Room {room.roomNumber}
                      </h3>
                      <span className="text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF]">
                        Floor {room.floorNumber} · {room.roomType.replace(/_/g, ' ')}
                      </span>
                      <StatusIndicator
                        status={room.isActive === false ? 'neutral' : 'success'}
                        label={room.isActive === false ? 'Disabled' : 'Active'}
                      />
                    </div>
                    <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] mt-0.5">
                      Rent {formatInr(room.monthlyRentInr)}/mo · Deposit {formatInr(room.depositInr)}
                      {room.notes ? ` · ${room.notes}` : ''}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => openEditRoomModal(room)}
                      className="min-h-[36px] px-3 rounded-lg border border-[#E5E7EB] dark:border-[#374151] text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] hover:bg-[#F8FAFC] dark:hover:bg-[#1F2937]"
                    >
                      Edit Room
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAddBedRoom(room);
                        setNewBedCode(`${room.roomNumber}-${String.fromCharCode(65 + roomBeds.length)}`);
                        setNewBedRentOverride('');
                      }}
                      className="min-h-[36px] px-3 rounded-lg bg-[#ECFDF5] dark:bg-[#10B981]/15 text-[#047857] dark:text-[#34D399] text-xs font-semibold"
                    >
                      + Add Bed
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleRoomActive(room)}
                      className="min-h-[36px] px-3 rounded-lg border border-[#E5E7EB] dark:border-[#374151] text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#111827] dark:hover:text-[#F9FAFB]"
                    >
                      {room.isActive === false ? 'Enable' : 'Disable'}
                    </button>
                  </div>
                </div>

                {/* Bed Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {roomBeds.map((bed) => {
                    const residentStay = activeStays.find((s) => s.bedId === bed.id);
                    const effectiveRent = bed.monthlyRentOverrideInr || room.monthlyRentInr;
                    const tone =
                      bed.status === BedStatus.AVAILABLE
                        ? 'success'
                        : bed.status === BedStatus.OCCUPIED
                          ? 'info'
                          : bed.status === BedStatus.MAINTENANCE
                            ? 'warning'
                            : 'neutral';
                    return (
                      <div
                        key={bed.id}
                        className="p-3.5 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] space-y-2.5 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-sm font-bold text-[#111827] dark:text-[#F9FAFB]">
                              {bed.bedCode}
                            </span>
                            <StatusIndicator status={tone} label={bed.status} />
                          </div>
                          <p className="mt-1 font-mono text-xs text-[#6B7280] dark:text-[#9CA3AF] tabular-nums">
                            {formatInr(effectiveRent)}/mo
                            {bed.monthlyRentOverrideInr ? ' (override)' : ''}
                          </p>
                          {residentStay && (
                            <Link
                              to={`/owner/tenants/${residentStay.id}`}
                              className="mt-1.5 inline-block text-xs font-semibold text-[#047857] dark:text-[#34D399] hover:underline"
                            >
                              {residentStay.tenantName} →
                            </Link>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-[#E5E7EB] dark:border-[#374151]">
                          {bed.status === BedStatus.OCCUPIED && residentStay ? (
                            <button
                              type="button"
                              onClick={() => {
                                setTransferStay(residentStay);
                                setTransferTargetBedId(availableBedsForTransfer[0]?.id || '');
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-[#047857] text-white text-[11px] font-semibold inline-flex items-center gap-1"
                            >
                              <ArrowRightLeft className="w-3 h-3" />
                              Transfer Bed
                            </button>
                          ) : (
                            <>
                              {bed.status !== BedStatus.AVAILABLE && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateBedStatus(bed, BedStatus.AVAILABLE)}
                                  className="px-2 py-1 rounded-lg border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] text-[11px] font-semibold text-[#047857] dark:text-[#34D399] inline-flex items-center gap-1"
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                  Available
                                </button>
                              )}
                              {bed.status !== BedStatus.MAINTENANCE && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateBedStatus(bed, BedStatus.MAINTENANCE)}
                                  className="px-2 py-1 rounded-lg border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] text-[11px] font-semibold text-[#B45309] dark:text-amber-400 inline-flex items-center gap-1"
                                >
                                  <Wrench className="w-3 h-3" />
                                  Maint.
                                </button>
                              )}
                              {bed.status !== BedStatus.INACTIVE && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateBedStatus(bed, BedStatus.INACTIVE)}
                                  className="px-2 py-1 rounded-lg border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] text-[11px] font-semibold text-[#6B7280] dark:text-[#9CA3AF] inline-flex items-center gap-1"
                                >
                                  <Ban className="w-3 h-3" />
                                  Inactive
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setEditBed(bed);
                                  setEditBedRent(bed.monthlyRentOverrideInr ? String(bed.monthlyRentOverrideInr) : '');
                                  setEditBedNotes(bed.notes || '');
                                }}
                                className="px-2 py-1 rounded-lg border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] text-[11px] font-semibold text-[#111827] dark:text-[#F9FAFB]"
                              >
                                Rent
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteBed(bed)}
                                aria-label={`Delete bed ${bed.bedCode}`}
                                className="px-2 py-1 rounded-lg text-[11px] font-semibold text-[#DC2626] dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Floor Modal */}
      <BottomSheet open={showFloorModal} onClose={() => setShowFloorModal(false)} title="Add Floor">
        <form onSubmit={handleCreateFloor} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] mb-1">Floor Number</label>
            <input
              type="number"
              min={0}
              value={floorNumber}
              onChange={(e) => {
                setFloorNumber(e.target.value);
                setFloorLabel(e.target.value === '0' ? 'Ground Floor' : `Floor ${e.target.value}`);
              }}
              required
              className="w-full min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#1F2937] text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] mb-1">Floor Label</label>
            <input
              type="text"
              value={floorLabel}
              onChange={(e) => setFloorLabel(e.target.value)}
              required
              className="w-full min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#1F2937] text-sm"
            />
          </div>
          <button type="submit" className="w-full min-h-[44px] rounded-xl bg-[#047857] text-white text-sm font-semibold">
            Save Floor
          </button>
        </form>
      </BottomSheet>

      {/* Add / Edit Room Modal */}
      <BottomSheet
        open={showRoomModal}
        onClose={() => setShowRoomModal(false)}
        title={editingRoom ? `Edit Room ${editingRoom.roomNumber}` : 'Create New Room & Beds'}
      >
        <form onSubmit={handleSaveRoom} className="space-y-4">
          {!editingRoom && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1">Room Number</label>
                <input
                  type="text"
                  placeholder="e.g. 204"
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                  required
                  className="w-full min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#1F2937] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Floor Number</label>
                <input
                  type="number"
                  min={0}
                  value={roomFloorNumber}
                  onChange={(e) => setRoomFloorNumber(e.target.value)}
                  required
                  className="w-full min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#1F2937] text-sm"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Room Sharing Type</label>
              <select
                value={roomType}
                onChange={(e) => setRoomType(e.target.value as any)}
                className="w-full min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#1F2937] text-sm"
              >
                <option value="SINGLE">Single</option>
                <option value="TWIN">Twin Sharing</option>
                <option value="TRIPLE">Triple Sharing</option>
                <option value="FOUR_SHARING">Four Sharing</option>
              </select>
            </div>
            {!editingRoom && (
              <div>
                <label className="block text-xs font-semibold mb-1">Initial Beds</label>
                <input
                  type="number"
                  min={1}
                  max={6}
                  value={roomBedCount}
                  onChange={(e) => setRoomBedCount(e.target.value)}
                  required
                  className="w-full min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#1F2937] text-sm"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Monthly Rent (₹)</label>
              <input
                type="number"
                min={1500}
                value={roomRent}
                onChange={(e) => setRoomRent(e.target.value)}
                required
                className="w-full min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#1F2937] text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Security Deposit (₹)</label>
              <input
                type="number"
                min={0}
                value={roomDeposit}
                onChange={(e) => setRoomDeposit(e.target.value)}
                required
                className="w-full min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#1F2937] text-sm tabular-nums"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Room Notes</label>
            <input
              type="text"
              placeholder="Balcony, attached washroom, AC..."
              value={roomNotes}
              onChange={(e) => setRoomNotes(e.target.value)}
              className="w-full min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#1F2937] text-sm"
            />
          </div>

          <button type="submit" className="w-full min-h-[44px] rounded-xl bg-[#047857] text-white text-sm font-semibold">
            {editingRoom ? 'Save Room Changes' : 'Create Room & Beds'}
          </button>
        </form>
      </BottomSheet>

      {/* Add Bed Modal */}
      <BottomSheet
        open={Boolean(addBedRoom)}
        onClose={() => setAddBedRoom(null)}
        title={`Add Bed to Room ${addBedRoom?.roomNumber || ''}`}
      >
        <form onSubmit={handleAddBed} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1">Bed Code</label>
            <input
              type="text"
              value={newBedCode}
              onChange={(e) => setNewBedCode(e.target.value)}
              required
              className="w-full min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#1F2937] text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Custom Monthly Rent Override (optional)</label>
            <input
              type="number"
              placeholder="Leave blank to use room default"
              value={newBedRentOverride}
              onChange={(e) => setNewBedRentOverride(e.target.value)}
              className="w-full min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#1F2937] text-sm"
            />
          </div>
          <button type="submit" className="w-full min-h-[44px] rounded-xl bg-[#047857] text-white text-sm font-semibold">
            Add Bed
          </button>
        </form>
      </BottomSheet>

      {/* Edit Bed Rent Modal */}
      <BottomSheet
        open={Boolean(editBed)}
        onClose={() => setEditBed(null)}
        title={`Bed ${editBed?.bedCode || ''} Settings`}
      >
        <form onSubmit={handleSaveBedOverride} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1">Rent Override (₹)</label>
            <input
              type="number"
              placeholder="Clear to revert to room rate"
              value={editBedRent}
              onChange={(e) => setEditBedRent(e.target.value)}
              className="w-full min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#1F2937] text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Bed Notes</label>
            <input
              type="text"
              value={editBedNotes}
              onChange={(e) => setEditBedNotes(e.target.value)}
              className="w-full min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#1F2937] text-sm"
            />
          </div>
          <button type="submit" className="w-full min-h-[44px] rounded-xl bg-[#047857] text-white text-sm font-semibold">
            Update Bed
          </button>
        </form>
      </BottomSheet>

      {/* Transfer Bed Modal */}
      <BottomSheet
        open={Boolean(transferStay)}
        onClose={() => setTransferStay(null)}
        title={`Transfer ${transferStay?.tenantName || ''}`}
      >
        <form onSubmit={handleTransferBed} className="space-y-4">
          {availableBedsForTransfer.length === 0 ? (
            <p className="text-sm text-[#B45309] dark:text-amber-400">
              No available beds in this property to transfer to. Free or add a bed first.
            </p>
          ) : (
            <>
              <div>
                <label className="block text-xs font-semibold mb-1">Target Available Bed</label>
                <select
                  value={transferTargetBedId}
                  onChange={(e) => setTransferTargetBedId(e.target.value)}
                  required
                  className="w-full min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#1F2937] text-sm"
                >
                  {availableBedsForTransfer.map((b) => {
                    const rm = propRooms.find((r) => r.id === b.roomId);
                    return (
                      <option key={b.id} value={b.id}>
                        Bed {b.bedCode} · Room {rm?.roomNumber} ({formatInr(b.monthlyRentOverrideInr || rm?.monthlyRentInr || 0)}/mo)
                      </option>
                    );
                  })}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Transfer Reason</label>
                <input
                  type="text"
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  required
                  className="w-full min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#1F2937] text-sm"
                />
              </div>
              <label className="flex items-center gap-2 text-xs font-medium">
                <input
                  type="checkbox"
                  checked={updateRentToNewRoom}
                  onChange={(e) => setUpdateRentToNewRoom(e.target.checked)}
                />
                Update tenant monthly rent to match target bed/room rate
              </label>
              <button type="submit" className="w-full min-h-[44px] rounded-xl bg-[#047857] text-white text-sm font-semibold">
                Confirm Bed Transfer
              </button>
            </>
          )}
        </form>
      </BottomSheet>
    </div>
  );
}
