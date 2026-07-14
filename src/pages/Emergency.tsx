import TopBar from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import StatCard from "@/components/dashboard/StatCard";
import { Siren, HeartPulse, Users, Plus, Search, AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { hasPermission } from "@/lib/navigation";
import api from "@/lib/api";

const severityConfig: Record<string, { label: string; color: string; dot: string }> = {
  critical: { label: "Critical", color: "bg-red-100 text-red-800", dot: "bg-red-500" },
  severe: { label: "Severe", color: "bg-orange-100 text-orange-800", dot: "bg-orange-500" },
  moderate: { label: "Moderate", color: "bg-yellow-100 text-yellow-800", dot: "bg-yellow-500" },
  minor: { label: "Minor", color: "bg-green-100 text-green-800", dot: "bg-green-500" },
};

export default function Emergency() {
  const { user } = useAuth();
  const canManageEmergency = hasPermission(user, ["emergency.view"]);
  const [cases, setCases] = useState<any[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ name: "", age: "", gender: "", severity: "moderate", complaint: "", mode: "", doctor: "", nurse: "", vitals: "" });

  useEffect(() => {
    async function loadEmergencyCases() {
      try {
        setCases(await api.emergency.getAll());
      } catch (error) {
        toast.error("Failed to load emergency cases");
      }
    }
    loadEmergencyCases();
  }, []);

  const activeCases = cases.filter((entry) => entry.status === "active" || entry.status === "stabilized");
  const filtered = cases.filter((entry) => entry.patientName.toLowerCase().includes(search.toLowerCase()) || entry.chiefComplaint.toLowerCase().includes(search.toLowerCase()));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const created = await api.emergency.create({
      patientName: form.name,
      age: Number(form.age),
      gender: form.gender,
      severity: form.severity,
      chiefComplaint: form.complaint,
      arrivalMode: form.mode,
      attendingDoctor: form.doctor,
      nurseOnDuty: form.nurse,
      vitals: form.vitals,
    });
    setCases((prev) => [created, ...prev]);
    toast.success("Emergency case registered");
    setForm({ name: "", age: "", gender: "", severity: "moderate", complaint: "", mode: "", doctor: "", nurse: "", vitals: "" });
    setShowDialog(false);
  };

  const updateStatus = async (id: number, status: string) => {
    const updated = await api.emergency.updateStatus(id, status);
    setCases((prev) => prev.map((entry) => entry.id === id ? updated : entry));
    toast.success(`Case status updated to ${status}`);
  };

  return (
    <div>
      <TopBar title="Emergency Department" subtitle="Real-time emergency case management and response" />
      <div className="p-6 space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Siren} title="Active Cases" value={String(activeCases.length)} changeType="negative" />
          <StatCard icon={AlertTriangle} title="Critical" value={String(cases.filter((entry) => entry.severity === "critical" && entry.status === "active").length)} changeType="negative" />
          <StatCard icon={HeartPulse} title="Stabilized" value={String(cases.filter((entry) => entry.status === "stabilized").length)} />
          <StatCard icon={Users} title="Total Today" value={String(cases.length)} />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search cases..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {canManageEmergency && (
            <Button size="sm" className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => setShowDialog(true)}>
              <Plus className="h-4 w-4 mr-1" /> New Emergency
            </Button>
          )}
        </div>

        <div className="space-y-4">
          {filtered.map((entry) => {
            const cfg = severityConfig[entry.severity];
            return (
              <div key={entry.id} className={`rounded-xl bg-card p-5 shadow-card border border-border ${entry.status === "active" && entry.severity === "critical" ? "ring-2 ring-red-500/50" : ""}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`h-3 w-3 rounded-full ${cfg.dot} ${entry.status === "active" ? "animate-pulse" : ""}`} />
                    <div>
                      <h4 className="text-sm font-semibold text-card-foreground">{entry.patientName} <span className="text-muted-foreground font-normal">({entry.caseId})</span></h4>
                      <p className="text-xs text-muted-foreground">{entry.age}y • {entry.gender} • Arrived: {entry.arrivalTime} via {entry.arrivalMode}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full capitalize bg-gray-100 text-gray-700">{entry.status}</span>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm mb-3">
                  <div><p className="text-xs text-muted-foreground">Chief Complaint</p><p className="text-card-foreground">{entry.chiefComplaint}</p></div>
                  <div><p className="text-xs text-muted-foreground">Vitals</p><p className="text-card-foreground font-mono text-xs">{entry.vitals}</p></div>
                  <div><p className="text-xs text-muted-foreground">Attending Doctor</p><p className="text-card-foreground">{entry.attendingDoctor}</p></div>
                  <div><p className="text-xs text-muted-foreground">Nurse</p><p className="text-card-foreground">{entry.nurseOnDuty}</p></div>
                </div>
                {(entry.status === "active" || entry.status === "stabilized") && canManageEmergency && (
                  <div className="flex gap-2">
                    {entry.status === "active" && <Button size="sm" variant="outline" onClick={() => updateStatus(entry.id, "stabilized")}>Stabilize</Button>}
                    <Button size="sm" variant="outline" onClick={() => updateStatus(entry.id, "admitted")}>Admit</Button>
                    <Button size="sm" variant="outline" onClick={() => updateStatus(entry.id, "transferred")}>Transfer</Button>
                    <Button size="sm" variant="outline" onClick={() => updateStatus(entry.id, "discharged")}>Discharge</Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle className="font-display">Register Emergency Case</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5 col-span-1">
                <Label>Patient Name *</Label>
                <Input placeholder="Full name" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label>Age *</Label>
                <Input type="number" placeholder="Age" value={form.age} onChange={(e) => setForm((prev) => ({ ...prev, age: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label>Gender *</Label>
                <Select value={form.gender} onValueChange={(value) => setForm((prev) => ({ ...prev, gender: value }))} required>
                  <SelectTrigger><SelectValue placeholder="..." /></SelectTrigger>
                  <SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Severity *</Label>
                <Select value={form.severity} onValueChange={(value) => setForm((prev) => ({ ...prev, severity: value }))} required>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="severe">Severe</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="minor">Minor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Arrival Mode *</Label>
                <Select value={form.mode} onValueChange={(value) => setForm((prev) => ({ ...prev, mode: value }))} required>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ambulance">Ambulance</SelectItem>
                    <SelectItem value="Walk-in">Walk-in</SelectItem>
                    <SelectItem value="Police">Police</SelectItem>
                    <SelectItem value="Parents">Parents/Family</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Chief Complaint *</Label>
              <Textarea placeholder="Describe emergency..." value={form.complaint} onChange={(e) => setForm((prev) => ({ ...prev, complaint: e.target.value }))} required rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label>Vital Signs *</Label>
              <Input placeholder="BP: 120/80, HR: 72, SpO2: 98%" value={form.vitals} onChange={(e) => setForm((prev) => ({ ...prev, vitals: e.target.value }))} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Attending Doctor *</Label>
                <Input placeholder="Dr. Siame" value={form.doctor} onChange={(e) => setForm((prev) => ({ ...prev, doctor: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label>Nurse on Duty *</Label>
                <Input placeholder="Nurse Zulu" value={form.nurse} onChange={(e) => setForm((prev) => ({ ...prev, nurse: e.target.value }))} required />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button type="submit" className="bg-destructive text-destructive-foreground">Register Emergency</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
