import TopBar from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { hasPermission } from "@/lib/navigation";
import { toast } from "sonner";
import { CalendarClock, ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import api from "@/lib/api";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const departments = ["Reception", "Accounts", "Clinical", "Nursing", "Pharmacy", "Laboratory", "Eye Clinic", "Mother and Child Health", "Radiology", "Inpatient"];

// Returns the ISO date string of the Monday of the week containing `date`
function getWeekMonday(date: Date): string {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun … 6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

// Advance or retreat by N weeks from an ISO date string
function shiftWeek(weekOf: string, n: number): string {
  const d = new Date(weekOf + "T00:00:00");
  d.setDate(d.getDate() + n * 7);
  return d.toISOString().slice(0, 10);
}

// "Mon 11", "Tue 12", …  for each day in the week starting at weekOf
function weekDayHeaders(weekOf: string): { day: string; label: string; date: string }[] {
  return DAYS.map((day, i) => {
    const d = new Date(weekOf + "T00:00:00");
    d.setDate(d.getDate() + i);
    const dd = d.getDate();
    const mon = d.toLocaleString("default", { month: "short" });
    return { day, label: `${day.slice(0, 3)} ${dd} ${mon}`, date: d.toISOString().slice(0, 10) };
  });
}

// "11 May – 17 May 2026"
function weekRangeLabel(weekOf: string): string {
  const start = new Date(weekOf + "T00:00:00");
  const end = new Date(weekOf + "T00:00:00");
  end.setDate(end.getDate() + 6);
  const fmt = (d: Date) => `${d.getDate()} ${d.toLocaleString("default", { month: "long" })}`;
  return `${fmt(start)} – ${fmt(end)} ${end.getFullYear()}`;
}

export default function DoctorSchedule() {
  const { user } = useAuth();
  const canManageSchedules = hasPermission(user, ["schedules.view"]);
  const [weekOf, setWeekOf] = useState(() => getWeekMonday(new Date()));
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [form, setForm] = useState({ staffId: "", shiftName: "", startTime: "08:00", endTime: "17:00", location: "" });
  const [selectedDays, setSelectedDays] = useState<string[]>(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [staffData, scheduleData] = await Promise.all([
          api.staff.getAll(),
          api.staffSchedules.getAll(weekOf),
        ]);
        setStaff(staffData || []);
        setSchedules(scheduleData || []);
      } catch {
        toast.error("Failed to load staff timetable");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [weekOf]);

  const headers = useMemo(() => weekDayHeaders(weekOf), [weekOf]);

  const grouped = useMemo(() => {
    const filtered = selectedDepartment
      ? schedules.filter((e) => e.department === selectedDepartment)
      : schedules;
    return DAYS.reduce((acc: Record<string, any[]>, day) => {
      acc[day] = filtered
        .filter((e) => e.dayOfWeek === day)
        .sort((a, b) => a.startTime.localeCompare(b.startTime));
      return acc;
    }, {});
  }, [schedules, selectedDepartment]);

  const toggleDay = (day: string) =>
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );

  const applyPreset = (preset: "weekdays" | "weekends" | "all") => {
    if (preset === "weekdays") setSelectedDays(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]);
    else if (preset === "weekends") setSelectedDays(["Saturday", "Sunday"]);
    else setSelectedDays([...DAYS]);
  };

  const resetForm = () => {
    setForm({ staffId: "", shiftName: "", startTime: "08:00", endTime: "17:00", location: "" });
    setSelectedDays(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]);
  };

  const handleDeleteEntry = async (id: number) => {
    setDeletingId(id);
    try {
      await api.staffSchedules.delete(id);
      setSchedules((prev) => prev.filter((s) => s.id !== id));
      toast.success("Entry removed");
    } catch {
      toast.error("Failed to remove entry");
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    const member = staff.find((m) => m.staff_id === form.staffId);
    if (!member) { toast.error("Select a staff member"); return; }
    if (selectedDays.length === 0) { toast.error("Select at least one day"); return; }
    setSaving(true);
    try {
      const created = await api.staffSchedules.bulkCreate({
        staffId: member.staff_id,
        name: member.name,
        role: member.role,
        department: member.department,
        days: DAYS.filter((d) => selectedDays.includes(d)),
        weekOf,
        shiftName: form.shiftName,
        startTime: form.startTime,
        endTime: form.endTime,
        location: form.location,
      });
      setSchedules((prev) => [...prev, ...created]);
      setShowAdd(false);
      resetForm();
      const n = created.length;
      const label =
        n === 7 ? "all week" :
        n === 5 && !selectedDays.includes("Saturday") ? "Mon–Fri" :
        n === 2 && selectedDays.includes("Saturday") ? "weekends" :
        `${n} day${n > 1 ? "s" : ""}`;
      toast.success(`${n} entr${n === 1 ? "y" : "ies"} added (${label})`);
    } catch {
      toast.error("Failed to save timetable entries");
    } finally {
      setSaving(false);
    }
  };

  const isCurrentWeek = weekOf === getWeekMonday(new Date());

  return (
    <div>
      <TopBar title="Staff Timetable" subtitle="Department rota for doctors, nurses, reception, pharmacy, laboratory and other units" />
      <div className="pl-0 pr-6 pt-6 space-y-4">

        {/* Week navigator */}
        <div className="flex items-center justify-between bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
          <button
            onClick={() => setWeekOf((w) => shiftWeek(w, -1))}
            className="p-1.5 rounded-md hover:bg-gray-100 transition-colors text-gray-600"
            title="Previous week"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="text-center">
            <p className="text-sm font-semibold text-gray-800">{weekRangeLabel(weekOf)}</p>
            {isCurrentWeek && (
              <span className="text-[11px] text-[#16641D] font-medium">Current Week</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!isCurrentWeek && (
              <button
                onClick={() => setWeekOf(getWeekMonday(new Date()))}
                className="text-[11px] px-2.5 py-1 rounded border border-[#16641D]/40 text-[#16641D] hover:bg-[#16641D]/10 transition-colors font-medium"
              >
                Today
              </button>
            )}
            <button
              onClick={() => setWeekOf((w) => shiftWeek(w, 1))}
              className="p-1.5 rounded-md hover:bg-gray-100 transition-colors text-gray-600"
              title="Next week"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Department filter + Add button */}
        <div className="flex flex-col sm:flex-row gap-3 justify-between">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedDepartment === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedDepartment(null)}
              className={selectedDepartment === null ? "bg-gradient-to-r from-[#16641D] to-[#1e7a29] text-white" : ""}
            >
              All
            </Button>
            {departments.map((dept) => (
              <Button
                key={dept}
                variant={selectedDepartment === dept ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedDepartment(dept)}
                className={selectedDepartment === dept ? "bg-gradient-to-r from-[#16641D] to-[#1e7a29] text-white" : ""}
              >
                {dept}
              </Button>
            ))}
          </div>
          {canManageSchedules && (
            <Button
              size="sm"
              className="bg-gradient-to-r from-[#16641D] to-[#1e7a29] text-white shrink-0"
              onClick={() => setShowAdd(true)}
            >
              <Plus className="h-4 w-4 mr-1" /> Add Entry
            </Button>
          )}
        </div>

        {/* Day columns */}
        {loading ? (
          <div className="text-center py-16 text-sm text-gray-400">Loading timetable…</div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {headers.map(({ day, label }) => (
              <div key={day} className="rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-3 border-b border-gray-100 bg-gray-50/50">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <CalendarClock className="h-4 w-4 text-[#16641D]" />
                    <span>{label}</span>
                    {grouped[day]?.length > 0 && (
                      <span className="ml-auto text-[11px] bg-[#16641D]/10 text-[#16641D] rounded-full px-2 py-0.5 font-medium">
                        {grouped[day].length}
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-3 space-y-2 min-h-[180px]">
                  {(grouped[day] || []).length === 0 ? (
                    <p className="text-xs text-gray-400 pt-1">No staff assigned</p>
                  ) : (
                    grouped[day].map((entry) => (
                      <div
                        key={entry.id}
                        className="group rounded-md px-3 py-2 text-sm border bg-[#16641D]/5 text-[#16641D] border-[#16641D]/20 relative"
                      >
                        {canManageSchedules && (<button
                          onClick={() => handleDeleteEntry(entry.id)}
                          disabled={deletingId === entry.id}
                          className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-red-100 text-red-400 hover:text-red-600"
                          title="Remove"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>)}
                        <p className="font-semibold pr-5 text-[13px]">{entry.startTime} – {entry.endTime}</p>
                        <p className="text-xs font-medium opacity-90">{entry.name}</p>
                        <p className="text-xs opacity-75">{entry.role}</p>
                        {entry.shiftName && (
                          <p className="text-[11px] opacity-60 mt-0.5">{entry.shiftName}{entry.location ? ` · ${entry.location}` : ""}</p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add entry dialog */}
      <Dialog open={showAdd} onOpenChange={(open) => { setShowAdd(open); if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Add Timetable Entry</DialogTitle>
            <p className="text-xs text-gray-500 mt-0.5">Week of {weekRangeLabel(weekOf)}</p>
          </DialogHeader>
          <form onSubmit={handleCreateSchedule} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Staff Member</Label>
              <Select
                value={form.staffId}
                onValueChange={(v) => setForm((p) => ({ ...p, staffId: v }))}
              >
                <SelectTrigger><SelectValue placeholder="Select staff member" /></SelectTrigger>
                <SelectContent>
                  {staff.map((m) => (
                    <SelectItem key={m.staff_id} value={m.staff_id}>{m.name} · {m.department}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Multi-day picker */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>
                  Days <span className="text-xs text-gray-400 font-normal">(select one or more)</span>
                </Label>
                <div className="flex gap-1.5">
                  {(["weekdays", "weekends", "all"] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => applyPreset(p)}
                      className="text-[11px] px-2 py-0.5 rounded border border-[#16641D]/40 text-[#16641D] hover:bg-[#16641D]/10 transition-colors"
                    >
                      {p === "weekdays" ? "Mon–Fri" : p === "weekends" ? "Weekends" : "All Week"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {headers.map(({ day, label }) => (
                  <label
                    key={day}
                    className={`flex items-center gap-1.5 cursor-pointer rounded-md border px-2 py-1.5 text-xs transition-colors ${
                      selectedDays.includes(day)
                        ? "border-[#16641D] bg-[#16641D]/8 text-[#16641D] font-medium"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    <Checkbox
                      checked={selectedDays.includes(day)}
                      onCheckedChange={() => toggleDay(day)}
                      className="h-3.5 w-3.5 shrink-0"
                    />
                    <span className="leading-tight">{label}</span>
                  </label>
                ))}
              </div>
              {selectedDays.length === 0 && (
                <p className="text-xs text-red-500">Select at least one day</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label>Shift Name</Label>
                <Input
                  value={form.shiftName}
                  onChange={(e) => setForm((p) => ({ ...p, shiftName: e.target.value }))}
                  placeholder="Morning OPD, Triage, On-call…"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={form.startTime}
                  onChange={(e) => setForm((p) => ({ ...p, startTime: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={form.endTime}
                  onChange={(e) => setForm((p) => ({ ...p, endTime: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Location</Label>
              <Input
                value={form.location}
                onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                placeholder="Consulting room, triage desk…"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setShowAdd(false); resetForm(); }}>Cancel</Button>
              <Button
                type="submit"
                disabled={saving || selectedDays.length === 0}
                className="gradient-primary text-primary-foreground"
              >
                {saving ? "Saving…" : selectedDays.length > 1 ? `Add ${selectedDays.length} Entries` : "Save Entry"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
