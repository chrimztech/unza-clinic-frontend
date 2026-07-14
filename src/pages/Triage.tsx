import TopBar from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import StatCard from "@/components/dashboard/StatCard";
import { AlertTriangle, Clock, HeartPulse, Search, Plus, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { usePatientJourney } from "@/context/PatientJourneyContext";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { hasPermission } from "@/lib/navigation";
import { getUserDisplayName } from "@/lib/session-user";

type TriageLevel = "red" | "orange" | "yellow" | "green";

interface TriageEntry {
  id: number;
  patientId: string;
  patientName: string;
  level: TriageLevel;
  chiefComplaint: string;
  vitalSigns: string;
  bloodPressure: string;
  temperature?: number;
  pulseRate?: number;
  respiratoryRate?: number;
  oxygenSaturation?: number;
  weightKg?: number;
  heightCm?: number;
  bmi?: number;
  randomBloodSugar?: number;
  painScore?: number;
  consciousnessLevel?: string;
  notes?: string;
  nurseName: string;
  arrivalTime: string;
  status: "waiting" | "in-treatment" | "transferred";
}

const levelConfig: Record<TriageLevel, { label: string; description: string; bg: string; text: string; border: string }> = {
  red: { label: "Emergency", description: "Life-threatening, immediate attention", bg: "bg-red-500/10", text: "text-red-600", border: "border-red-500/30" },
  orange: { label: "Urgent", description: "Serious condition, 10 min wait", bg: "bg-orange-500/10", text: "text-orange-600", border: "border-orange-500/30" },
  yellow: { label: "Less Urgent", description: "Moderate condition, 30 min wait", bg: "bg-yellow-500/10", text: "text-yellow-600", border: "border-yellow-500/30" },
  green: { label: "Non-Urgent", description: "Minor condition, 60+ min wait", bg: "bg-green-500/10", text: "text-green-600", border: "border-green-500/30" },
};

export default function Triage() {
  const { user } = useAuth();
  const canTriage = hasPermission(user, ["triage.view"]);
  const [entries, setEntries] = useState<TriageEntry[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [search, setSearch] = useState("");
  const { addEvent, patients } = usePatientJourney();
  const nurseName = getUserDisplayName(user, "Triage Nurse");
  const [form, setForm] = useState({
    patientId: "",
    level: "" as TriageLevel,
    complaint: "",
    bloodPressure: "",
    temperature: "",
    pulseRate: "",
    respiratoryRate: "",
    oxygenSaturation: "",
    weightKg: "",
    heightCm: "",
    randomBloodSugar: "",
    painScore: "",
    consciousnessLevel: "",
    notes: "",
  });

  useEffect(() => {
    api.triage.getAll().then(setEntries).catch(() => toast.error("Failed to load triage assessments"));
  }, []);

  const selectablePatients = useMemo(() => {
    const seen = new Set<string>();
    return patients.filter((patient) => {
      const identifier = patient?.patientId;
      if (!identifier || identifier === "null" || seen.has(identifier)) {
        return false;
      }
      seen.add(identifier);
      return true;
    });
  }, [patients]);

  const filtered = entries.filter((e) =>
    e.patientName.toLowerCase().includes(search.toLowerCase()) || e.chiefComplaint.toLowerCase().includes(search.toLowerCase())
  );

  const computedBmi = useMemo(() => {
    const weight = Number(form.weightKg);
    const heightCm = Number(form.heightCm);
    if (!weight || !heightCm) return "";
    const heightM = heightCm / 100;
    const bmi = weight / (heightM * heightM);
    return bmi.toFixed(1);
  }, [form.heightCm, form.weightKg]);

  const bmiCategory = useMemo(() => {
    const bmi = Number(computedBmi);
    if (!bmi) return "";
    if (bmi < 18.5) return "Underweight";
    if (bmi < 25) return "Normal";
    if (bmi < 30) return "Overweight";
    return "Obese";
  }, [computedBmi]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const patient = patients.find((p) => p.patientId === form.patientId);
    if (!patient) { toast.error("Patient not found"); return; }

    try {
      const vitalsSummary = [
        form.temperature ? `Temp ${form.temperature}C` : null,
        form.bloodPressure ? `BP ${form.bloodPressure}` : null,
        form.pulseRate ? `PR ${form.pulseRate} bpm` : null,
        form.respiratoryRate ? `RR ${form.respiratoryRate}/min` : null,
        form.oxygenSaturation ? `SpO2 ${form.oxygenSaturation}%` : null,
        form.weightKg ? `Wt ${form.weightKg} kg` : null,
        form.heightCm ? `Ht ${form.heightCm} cm` : null,
        computedBmi ? `BMI ${computedBmi}` : null,
        form.randomBloodSugar ? `RBS ${form.randomBloodSugar} mmol/L` : null,
        form.painScore ? `Pain ${form.painScore}/10` : null,
        form.consciousnessLevel ? `AVPU ${form.consciousnessLevel}` : null,
      ].filter(Boolean).join(", ");

      const newEntry = await api.triage.create({
        patientId: form.patientId,
        patientName: patient.name,
        level: form.level,
        chiefComplaint: form.complaint,
        vitalSigns: vitalsSummary,
        bloodPressure: form.bloodPressure,
        temperature: form.temperature ? Number(form.temperature) : null,
        pulseRate: form.pulseRate ? Number(form.pulseRate) : null,
        respiratoryRate: form.respiratoryRate ? Number(form.respiratoryRate) : null,
        oxygenSaturation: form.oxygenSaturation ? Number(form.oxygenSaturation) : null,
        weightKg: form.weightKg ? Number(form.weightKg) : null,
        heightCm: form.heightCm ? Number(form.heightCm) : null,
        bmi: computedBmi ? Number(computedBmi) : null,
        randomBloodSugar: form.randomBloodSugar ? Number(form.randomBloodSugar) : null,
        painScore: form.painScore ? Number(form.painScore) : null,
        consciousnessLevel: form.consciousnessLevel,
        notes: form.notes,
      });
      setEntries((prev) => [newEntry, ...prev]);

      addEvent(form.patientId, patient.name, {
        type: "triage",
        title: `Triage: ${levelConfig[form.level].label}`,
        description: `Chief complaint: ${form.complaint}. Vitals: ${vitalsSummary}`,
        performedBy: nurseName,
        department: "Emergency/Triage",
        data: {
          level: levelConfig[form.level].label,
          complaint: form.complaint,
          vitals: vitalsSummary,
          bloodPressure: form.bloodPressure,
          temperature: form.temperature,
          pulseRate: form.pulseRate,
          respiratoryRate: form.respiratoryRate,
          oxygenSaturation: form.oxygenSaturation,
          weightKg: form.weightKg,
          heightCm: form.heightCm,
          bmi: computedBmi,
          randomBloodSugar: form.randomBloodSugar,
          painScore: form.painScore,
          consciousnessLevel: form.consciousnessLevel,
          notes: form.notes,
        },
      });

      toast.success("Patient triaged and added to the walk-in workflow");
      setForm({
        patientId: "",
        level: "" as TriageLevel,
        complaint: "",
        bloodPressure: "",
        temperature: "",
        pulseRate: "",
        respiratoryRate: "",
        oxygenSaturation: "",
        weightKg: "",
        heightCm: "",
        randomBloodSugar: "",
        painScore: "",
        consciousnessLevel: "",
        notes: "",
      });
      setShowDialog(false);
    } catch {
      toast.error("Failed to add triage entry");
    }
  };

  const sortedByPriority = [...filtered].sort((a, b) => {
    const order: Record<TriageLevel, number> = { red: 0, orange: 1, yellow: 2, green: 3 };
    return order[a.level] - order[b.level];
  });

  return (
    <div>
      <TopBar title="Triage Assessment" subtitle="Patient severity classification for the walk-in clinic workflow" />
      <div className="p-6 space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={AlertTriangle} title="Emergency (Red)" value={String(entries.filter((e) => e.level === "red").length)} changeType="negative" />
          <StatCard icon={HeartPulse} title="Urgent (Orange)" value={String(entries.filter((e) => e.level === "orange").length)} />
          <StatCard icon={Clock} title="Less Urgent (Yellow)" value={String(entries.filter((e) => e.level === "yellow").length)} />
          <StatCard icon={Users} title="Non-Urgent (Green)" value={String(entries.filter((e) => e.level === "green").length)} changeType="positive" />
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search patients..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {canTriage && (
            <Button size="sm" className="gradient-primary text-primary-foreground" onClick={() => setShowDialog(true)}>
              <Plus className="h-4 w-4 mr-1" /> New Triage
            </Button>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          {sortedByPriority.map((entry) => {
            const cfg = levelConfig[entry.level];
            return (
              <div key={entry.id} className={`rounded-xl border ${cfg.border} ${cfg.bg} p-5 space-y-3`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-4 w-4 rounded-full ${entry.level === "red" ? "bg-red-500" : entry.level === "orange" ? "bg-orange-500" : entry.level === "yellow" ? "bg-yellow-500" : "bg-green-500"} animate-pulse`} />
                    <div>
                      <h4 className="text-sm font-semibold text-card-foreground">{entry.patientName}</h4>
                      <p className="text-xs text-muted-foreground">{entry.patientId} · Arrived: {entry.arrivalTime}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold uppercase ${cfg.text}`}>{cfg.label}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800">{entry.status}</span>
                  </div>
                </div>
                <div className="grid sm:grid-cols-4 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Chief Complaint</p>
                    <p className="text-card-foreground">{entry.chiefComplaint}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Core Vitals</p>
                    <p className="text-card-foreground font-mono text-xs">{entry.vitalSigns}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Triage Nurse</p>
                    <p className="text-card-foreground">{entry.nurseName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Clinical Notes</p>
                    <p className="text-card-foreground">{entry.notes || "-"}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-display">New Triage Assessment</DialogTitle>
            <DialogDescription>
              Record the patient triage level, full vitals, pain score, consciousness level, and nurse notes before they proceed through the clinic flow.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto flex-1 min-h-0 pr-2">
            <div className="space-y-1.5">
              <Label>Patient *</Label>
              <Select value={form.patientId} onValueChange={(v) => setForm((f) => ({ ...f, patientId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select patient..." /></SelectTrigger>
                <SelectContent>
                  {selectablePatients.map((patient) => (
                    <SelectItem key={patient.patientId} value={patient.patientId}>
                      {patient.name} ({patient.patientId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Triage Level *</Label>
              <Select value={form.level} onValueChange={(v) => setForm((f) => ({ ...f, level: v as TriageLevel }))}>
                <SelectTrigger><SelectValue placeholder="Select severity..." /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(levelConfig) as [TriageLevel, typeof levelConfig.red][]).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>{cfg.label} - {cfg.description}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Triage User</Label>
              <Input value={nurseName} readOnly disabled />
            </div>
            <div className="space-y-1.5">
              <Label>Chief Complaint *</Label>
              <Textarea value={form.complaint} onChange={(e) => setForm((f) => ({ ...f, complaint: e.target.value }))} required rows={2} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Blood Pressure *</Label>
                <Input placeholder="120/80" value={form.bloodPressure} onChange={(e) => setForm((f) => ({ ...f, bloodPressure: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label>Temperature (C)</Label>
                <Input type="number" step="0.1" placeholder="36.7" value={form.temperature} onChange={(e) => setForm((f) => ({ ...f, temperature: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Pulse Rate (bpm)</Label>
                <Input type="number" placeholder="76" value={form.pulseRate} onChange={(e) => setForm((f) => ({ ...f, pulseRate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Respiratory Rate (/min)</Label>
                <Input type="number" placeholder="18" value={form.respiratoryRate} onChange={(e) => setForm((f) => ({ ...f, respiratoryRate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Oxygen Saturation (%)</Label>
                <Input type="number" placeholder="98" value={form.oxygenSaturation} onChange={(e) => setForm((f) => ({ ...f, oxygenSaturation: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Random Blood Sugar (mmol/L)</Label>
                <Input type="number" step="0.1" placeholder="5.4" value={form.randomBloodSugar} onChange={(e) => setForm((f) => ({ ...f, randomBloodSugar: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Weight (kg)</Label>
                <Input type="number" step="0.1" placeholder="65.0" value={form.weightKg} onChange={(e) => setForm((f) => ({ ...f, weightKg: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Height (cm)</Label>
                <Input type="number" step="0.1" placeholder="170" value={form.heightCm} onChange={(e) => setForm((f) => ({ ...f, heightCm: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Pain Score (0-10)</Label>
                <Input type="number" min="0" max="10" placeholder="4" value={form.painScore} onChange={(e) => setForm((f) => ({ ...f, painScore: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Consciousness Level</Label>
                <Select value={form.consciousnessLevel} onValueChange={(v) => setForm((f) => ({ ...f, consciousnessLevel: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select AVPU..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Alert">Alert</SelectItem>
                    <SelectItem value="Voice">Voice</SelectItem>
                    <SelectItem value="Pain">Pain</SelectItem>
                    <SelectItem value="Unresponsive">Unresponsive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="rounded-lg border border-border bg-muted/20 p-3 text-sm">
              <p className="font-medium text-card-foreground">Calculated BMI</p>
              <p className="text-muted-foreground">{computedBmi ? `${computedBmi} (${bmiCategory})` : "Enter height and weight to calculate BMI."}</p>
            </div>
            <div className="space-y-1.5">
              <Label>Clinical Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={3} placeholder="Observations, bleeding, weakness, distress, dehydration, mobility, or other triage notes..." />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button type="submit" className="gradient-primary text-primary-foreground">Triage Patient</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
