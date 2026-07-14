import TopBar from "@/components/layout/TopBar";
import StatCard from "@/components/dashboard/StatCard";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/ui/status-badge";
import { useAuth } from "@/context/AuthContext";
import { hasPermission } from "@/lib/navigation";
import DepartmentFormsPanel from "@/components/clinical/DepartmentFormsPanel";
import api from "@/lib/api";
import { AlertCircle, BedDouble, CheckCircle, Minus, Pencil, Plus, Save, Shuffle, Users, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type WardEntry = {
  id: number;
  name: string;
  totalBeds: number;
  occupied: number;
  available: number;
  bedBoard: Array<{
    bed_number: number;
    bed_label: string;
    status: string;
    patient_name?: string;
    patient_id?: string;
    admission_id?: string;
    doctor?: string;
    diagnosis?: string;
  }>;
};

export default function Wards() {
  const { user } = useAuth();
  const canManageBeds = hasPermission(user, ["departments.manage"]);
  const [wards, setWards] = useState<WardEntry[]>([]);
  const [editingWardId, setEditingWardId] = useState<number | null>(null);
  const [bedInput, setBedInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingWardId, setSavingWardId] = useState<number | null>(null);
  const [showCreateWard, setShowCreateWard] = useState(false);
  const [newWardName, setNewWardName] = useState("");
  const [newWardBeds, setNewWardBeds] = useState("");
  const [transferTarget, setTransferTarget] = useState<{ admissionId: string; ward: string; bed: string } | null>(null);
  const [transferWard, setTransferWard] = useState("");
  const [transferBed, setTransferBed] = useState("");

  const loadWards = async () => {
    try {
      setWards(await api.wards.getAll());
    } catch {
      toast.error("Failed to load wards");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWards();
  }, []);

  const totalBeds = useMemo(() => wards.reduce((sum, ward) => sum + ward.totalBeds, 0), [wards]);
  const totalOccupied = useMemo(() => wards.reduce((sum, ward) => sum + ward.occupied, 0), [wards]);
  const totalAvailable = Math.max(totalBeds - totalOccupied, 0);
  const highOccupancyWards = useMemo(() => wards.filter((ward) => getOccupancyRate(ward) >= 90).length, [wards]);

  const startEditing = (ward: WardEntry) => {
    setEditingWardId(ward.id);
    setBedInput(String(ward.totalBeds));
  };

  const cancelEditing = () => {
    setEditingWardId(null);
    setBedInput("");
  };

  const saveBeds = async (ward: WardEntry) => {
    const totalBedsValue = Number(bedInput);
    if (!Number.isInteger(totalBedsValue) || totalBedsValue < 0) {
      toast.error("Enter a valid whole number of beds");
      return;
    }
    if (totalBedsValue < ward.occupied) {
      toast.error(`Total beds cannot be less than ${ward.occupied} occupied beds`);
      return;
    }

    setSavingWardId(ward.id);
    try {
      const updated = await api.wards.updateBeds(ward.id, totalBedsValue);
      setWards((current) => current.map((entry) => (entry.id === ward.id ? updated : entry)));
      toast.success(`${ward.name} updated`, {
        description: `Bed capacity is now ${totalBedsValue}. Occupied beds continue to reflect active admissions.`,
      });
      cancelEditing();
    } catch (error: any) {
      toast.error(error?.message || "Failed to update ward beds");
    } finally {
      setSavingWardId(null);
    }
  };

  const adjustBedsByOne = async (ward: WardEntry, delta: 1 | -1) => {
    if (delta < 0 && ward.totalBeds - 1 < ward.occupied) {
      toast.error(`Cannot reduce ${ward.name} below ${ward.occupied} occupied beds`);
      return;
    }

    setSavingWardId(ward.id);
    try {
      const updated = delta > 0 ? await api.wards.addBed(ward.id) : await api.wards.removeBed(ward.id);
      setWards((current) => current.map((entry) => (entry.id === ward.id ? updated : entry)));
      toast.success(`${delta > 0 ? "Added" : "Removed"} one bed in ${ward.name}`, {
        description: `Ward capacity is now ${updated.totalBeds} beds.`,
      });
    } catch (error: any) {
      toast.error(error?.message || "Failed to update ward beds");
    } finally {
      setSavingWardId(null);
    }
  };

  const createWard = async (event: React.FormEvent) => {
    event.preventDefault();
    const totalBedsValue = Number(newWardBeds);
    if (!newWardName.trim()) {
      toast.error("Ward name is required");
      return;
    }
    if (!Number.isInteger(totalBedsValue) || totalBedsValue < 0) {
      toast.error("Enter a valid whole number of beds");
      return;
    }
    try {
      const created = await api.wards.create({ name: newWardName.trim(), totalBeds: totalBedsValue });
      setWards((current) => [...current, created]);
      toast.success(`${created.name} ward created`);
      setShowCreateWard(false);
      setNewWardName("");
      setNewWardBeds("");
    } catch (error: any) {
      toast.error(error?.message || "Failed to create ward");
    }
  };

  const transferOptions = useMemo(() => {
    if (!transferTarget) return [];
    return wards.map((ward) => ({
      ...ward,
      freeBeds: ward.bedBoard
        .filter((bed) => bed.status === "available" || (ward.name === transferTarget.ward && bed.bed_label === transferTarget.bed))
        .map((bed) => bed.bed_label),
    }));
  }, [transferTarget, wards]);

  const submitTransfer = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!transferTarget || !transferWard || !transferBed) {
      toast.error("Choose a target ward and bed");
      return;
    }
    try {
      await api.admissions.transfer(Number(transferTarget.admissionId), { ward: transferWard, bed: transferBed });
      toast.success("Patient transferred successfully");
      setTransferTarget(null);
      setTransferWard("");
      setTransferBed("");
      await loadWards();
    } catch (error: any) {
      toast.error(error?.message || "Failed to transfer patient");
    }
  };

  return (
    <div>
      <TopBar
        title="Wards & Beds"
        subtitle="Track live ward occupancy from admissions and let admins adjust actual bed capacity safely"
      />
      <div className="p-6 space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={BedDouble} title="Total Beds" value={String(totalBeds)} />
          <StatCard
            icon={Users}
            title="Occupied Beds"
            value={String(totalOccupied)}
            change={`${totalBeds ? ((totalOccupied / totalBeds) * 100).toFixed(1) : 0}% occupancy`}
            changeType="neutral"
          />
          <StatCard icon={CheckCircle} title="Available Beds" value={String(totalAvailable)} changeType="positive" />
          <StatCard icon={AlertCircle} title="High Occupancy Wards" value={String(highOccupancyWards)} changeType="negative" />
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold text-card-foreground">Ward Capacity Overview</h2>
              <p className="text-sm text-muted-foreground">
                Occupied beds come from active admissions in the system. Admins can increase or reduce ward capacity as long as it does not go below current occupancy.
              </p>
            </div>
            {canManageBeds ? (
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">Admin control enabled through department management access.</p>
                <Button size="sm" className="gradient-primary text-primary-foreground" onClick={() => setShowCreateWard(true)}>
                  <Plus className="mr-1 h-4 w-4" /> Create Ward
                </Button>
              </div>
            ) : null}
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {wards.map((ward) => {
              const isEditing = editingWardId === ward.id;
              const isSaving = savingWardId === ward.id;
              const occupancyRate = getOccupancyRate(ward);
              const utilizationTone = occupancyRate >= 90 ? "critical" : occupancyRate >= 70 ? "occupied" : "available";

              return (
                <div key={ward.id} className="rounded-xl border border-border bg-background p-5">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-display text-lg font-semibold text-card-foreground">{ward.name}</h3>
                      <p className="text-sm text-muted-foreground">Live occupied beds are calculated from active admissions.</p>
                    </div>
                    <StatusBadge status={utilizationTone} />
                  </div>

                  <div className="mb-3 flex items-end justify-between">
                    <div>
                      <p className="text-2xl font-bold font-display text-card-foreground">
                        {ward.occupied}/{ward.totalBeds}
                      </p>
                      <p className="text-sm text-muted-foreground">{ward.available} beds currently available</p>
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">{occupancyRate.toFixed(1)}% full</p>
                  </div>

                  <div className="mb-4 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(occupancyRate, 100)}%`,
                        background:
                          occupancyRate >= 90
                            ? "hsl(0 72% 51%)"
                            : occupancyRate >= 70
                              ? "hsl(38 92% 50%)"
                              : "hsl(152 60% 40%)",
                      }}
                    />
                  </div>

                  <div className="space-y-3 rounded-lg bg-muted/40 p-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Operational capacity</span>
                      {isEditing ? (
                        <Input
                          type="number"
                          min={ward.occupied}
                          value={bedInput}
                          onChange={(event) => setBedInput(event.target.value)}
                          className="h-8 w-24"
                        />
                      ) : (
                        <span className="font-medium text-card-foreground">{ward.totalBeds} beds</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Beds in use</span>
                      <span className="font-medium text-card-foreground">{ward.occupied}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Beds free</span>
                      <span className="font-medium text-card-foreground">{ward.available}</span>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-card-foreground">Bed Board</p>
                      <p className="text-xs text-muted-foreground">Live from current admissions</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {ward.bedBoard.map((bed) => (
                        <div
                          key={bed.bed_number}
                          className={`rounded-lg border p-2 text-xs ${
                            bed.status === "occupied"
                              ? "border-amber-300 bg-amber-50"
                              : "border-emerald-200 bg-emerald-50"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-card-foreground">{bed.bed_label}</span>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                              bed.status === "occupied"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-emerald-100 text-emerald-800"
                            }`}>
                              {bed.status === "occupied" ? "Occupied" : "Free"}
                            </span>
                          </div>
                          {bed.status === "occupied" ? (
                            <div className="mt-2 space-y-1 text-muted-foreground">
                              <p className="font-medium text-card-foreground">{bed.patient_name || "Assigned patient"}</p>
                              <p>{bed.patient_id || "No patient ID"}</p>
                              <p>{bed.doctor || "No doctor assigned"}</p>
                              {canManageBeds && bed.admission_id ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="mt-2 h-7 px-2 text-[11px]"
                                  onClick={() => {
                                    setTransferTarget({ admissionId: bed.admission_id!, ward: ward.name, bed: bed.bed_label });
                                    setTransferWard(ward.name);
                                    setTransferBed(bed.bed_label);
                                  }}
                                >
                                  <Shuffle className="mr-1 h-3 w-3" /> Transfer
                                </Button>
                              ) : null}
                            </div>
                          ) : (
                            <p className="mt-2 text-muted-foreground">Available for admission</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {canManageBeds ? (
                    <div className="mt-4 space-y-3">
                      {!isEditing ? (
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => adjustBedsByOne(ward, 1)}
                            disabled={isSaving}
                          >
                            <Plus className="mr-1 h-4 w-4" /> Add Bed
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => adjustBedsByOne(ward, -1)}
                            disabled={isSaving || ward.totalBeds <= ward.occupied}
                          >
                            <Minus className="mr-1 h-4 w-4" /> Remove Bed
                          </Button>
                        </div>
                      ) : null}
                      <div className="flex justify-end gap-2">
                      {isEditing ? (
                        <>
                          <Button variant="outline" size="sm" onClick={cancelEditing} disabled={isSaving}>
                            <X className="mr-1 h-4 w-4" /> Cancel
                          </Button>
                          <Button size="sm" className="gradient-primary text-primary-foreground" onClick={() => saveBeds(ward)} disabled={isSaving}>
                            <Save className="mr-1 h-4 w-4" /> {isSaving ? "Saving..." : "Save Beds"}
                          </Button>
                        </>
                      ) : (
                        <Button variant="outline" size="sm" onClick={() => startEditing(ward)}>
                          <Pencil className="mr-1 h-4 w-4" /> Adjust Beds
                        </Button>
                      )}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          {!loading && wards.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">No ward records found.</div>
          ) : null}
        </div>

        <DepartmentFormsPanel
          title="Ward Forms"
          description="Keep the sick-list admission and inpatient drug sheet available from the ward occupancy view."
          templateKeys={["sick_list_admission", "inpatient_drug_sheet"]}
          triggerLabel="Open Ward Forms"
        />
      </div>

      <Dialog open={showCreateWard} onOpenChange={setShowCreateWard}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="font-display">Create Ward</DialogTitle></DialogHeader>
          <form onSubmit={createWard} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Ward Name *</Label>
              <Input value={newWardName} onChange={(event) => setNewWardName(event.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Initial Bed Capacity *</Label>
              <Input type="number" min="0" value={newWardBeds} onChange={(event) => setNewWardBeds(event.target.value)} required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreateWard(false)}>Cancel</Button>
              <Button type="submit" className="gradient-primary text-primary-foreground">Create Ward</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(transferTarget)} onOpenChange={(open) => !open && setTransferTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="font-display">Transfer Bed Assignment</DialogTitle></DialogHeader>
          <form onSubmit={submitTransfer} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Target Ward *</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={transferWard}
                onChange={(event) => {
                  setTransferWard(event.target.value);
                  setTransferBed("");
                }}
                required
              >
                <option value="">Select ward</option>
                {transferOptions.map((ward) => (
                  <option key={ward.id} value={ward.name}>{ward.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Target Bed *</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={transferBed}
                onChange={(event) => setTransferBed(event.target.value)}
                required
              >
                <option value="">Select bed</option>
                {(transferOptions.find((ward) => ward.name === transferWard)?.freeBeds || []).map((bedLabel) => (
                  <option key={bedLabel} value={bedLabel}>{bedLabel}</option>
                ))}
              </select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setTransferTarget(null)}>Cancel</Button>
              <Button type="submit" className="gradient-primary text-primary-foreground">Transfer Patient</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function getOccupancyRate(ward: WardEntry) {
  if (!ward.totalBeds) return 0;
  return (ward.occupied / ward.totalBeds) * 100;
}
