import TopBar from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DataTable, Column } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Plus, Search, Smile, AlertTriangle, Clock, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Box, Paper, Typography, Grid, Chip } from "@mui/material";

interface DentalRecord {
  id: number;
  visitId: string;
  patientId: string;
  patientName: string;
  visitDate: string;
  dentistName: string;
  chiefComplaint: string;
  teethAffected: string;
  diagnosis: string;
  treatmentPerformed: string;
  localAnesthetic: boolean;
  anestheticType?: string;
  extractionsDone: string;
  fillingsPlaced: string;
  scalingDone: boolean;
  xrayTaken: boolean;
  xrayFindings?: string;
  medications: string;
  referralNeeded: boolean;
  referralReason?: string;
  nextAppointment: string;
  notes: string;
  status: string;
}

const TREATMENTS = [
  "Scaling & Polishing",
  "Simple Extraction",
  "Surgical Extraction",
  "Composite Filling",
  "Amalgam Filling",
  "Root Canal Treatment",
  "Crown Placement",
  "Denture Fitting",
  "Denture Repair",
  "Oral Prophylaxis",
  "Fluoride Application",
  "Fissure Sealant",
  "Incision & Drainage",
  "Biopsy",
  "Orthodontic Review",
];

const DIAGNOSES = [
  "Dental Caries",
  "Periodontal Disease",
  "Pulpitis",
  "Periapical Abscess",
  "Periodontal Abscess",
  "Impacted Tooth",
  "Fractured Tooth",
  "Gingivitis",
  "Oral Ulcers / Aphthous",
  "Oral Candidiasis",
  "Denture-related Issues",
  "TMJ Disorder",
  "Oral Trauma",
  "Malocclusion",
];

const TEETH_NUMBERS = [
  "11","12","13","14","15","16","17","18",
  "21","22","23","24","25","26","27","28",
  "31","32","33","34","35","36","37","38",
  "41","42","43","44","45","46","47","48",
];

export default function DentalClinic() {
  const { user } = useAuth();
  const [records, setRecords] = useState<DentalRecord[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [selectedTeeth, setSelectedTeeth] = useState<string[]>([]);
  const [selectedTreatments, setSelectedTreatments] = useState<string[]>([]);
  const [form, setForm] = useState({
    patientId: "", chiefComplaint: "", diagnosis: "", localAnesthetic: false, anestheticType: "",
    extractionsDone: "", fillingsPlaced: "", scalingDone: false, xrayTaken: false, xrayFindings: "",
    medications: "", referralNeeded: false, referralReason: "", nextAppointment: "", notes: "",
  });

  const mapDental = (r: any): DentalRecord => ({
    id: r.id, visitId: r.visit_id || r.visitId || "",
    patientId: r.patient_id || r.patientId || "", patientName: r.patient_name || r.patientName || "",
    visitDate: r.visit_date || r.visitDate || "", dentistName: r.dentist_name || r.dentistName || "",
    chiefComplaint: r.chief_complaint || r.chiefComplaint || "",
    teethAffected: r.teeth_affected || r.teethAffected || "", diagnosis: r.diagnosis || "",
    treatmentPerformed: r.treatment_performed || r.treatmentPerformed || "",
    localAnesthetic: Boolean(r.local_anesthetic ?? r.localAnesthetic),
    anestheticType: r.anesthetic_type || r.anestheticType || "",
    extractionsDone: r.extractions_done || r.extractionsDone || "",
    fillingsPlaced: r.fillings_placed || r.fillingsPlaced || "",
    scalingDone: Boolean(r.scaling_done ?? r.scalingDone),
    xrayTaken: Boolean(r.xray_taken ?? r.xrayTaken),
    xrayFindings: r.xray_findings || r.xrayFindings || "", medications: r.medications || "",
    referralNeeded: Boolean(r.referral_needed ?? r.referralNeeded),
    referralReason: r.referral_reason || r.referralReason || "",
    nextAppointment: r.next_appointment || r.nextAppointment || "",
    notes: r.notes || "", status: r.status || "completed",
  });

  useEffect(() => {
    api.patients.getAll().then((d: any[]) => setPatients(d)).catch(() => {});
    api.dental.getAll().then((d: any[]) => setRecords((d || []).map(mapDental))).catch(() => {});
  }, []);

  const patientName = (id: string) => patients.find((p) => p.patient_id === id)?.name || id;

  const toggleTooth = (tooth: string) => {
    setSelectedTeeth((prev) => prev.includes(tooth) ? prev.filter((t) => t !== tooth) : [...prev, tooth]);
  };

  const toggleTreatment = (t: string) => {
    setSelectedTreatments((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.patientId) { toast.error("Select a patient"); return; }
    const pName = patientName(form.patientId);
    const payload = {
      patient_id: form.patientId, patient_name: pName,
      visit_date: new Date().toISOString().slice(0, 10), dentist_name: user?.name || "Dentist",
      chief_complaint: form.chiefComplaint, teeth_affected: selectedTeeth.join(", "),
      diagnosis: form.diagnosis, treatment_performed: selectedTreatments.join(", "),
      local_anesthetic: form.localAnesthetic, anesthetic_type: form.anestheticType,
      extractions_done: form.extractionsDone, fillings_placed: form.fillingsPlaced,
      scaling_done: form.scalingDone, xray_taken: form.xrayTaken, xray_findings: form.xrayFindings,
      medications: form.medications, referral_needed: form.referralNeeded, referral_reason: form.referralReason,
      next_appointment: form.nextAppointment, notes: form.notes,
    };
    const local: DentalRecord = { id: Date.now(), visitId: `DEN-${Date.now()}`, patientId: form.patientId,
      patientName: pName, visitDate: payload.visit_date, dentistName: payload.dentist_name,
      chiefComplaint: form.chiefComplaint, teethAffected: payload.teeth_affected, diagnosis: form.diagnosis,
      treatmentPerformed: payload.treatment_performed, localAnesthetic: form.localAnesthetic,
      anestheticType: form.anestheticType, extractionsDone: form.extractionsDone, fillingsPlaced: form.fillingsPlaced,
      scalingDone: form.scalingDone, xrayTaken: form.xrayTaken, xrayFindings: form.xrayFindings,
      medications: form.medications, referralNeeded: form.referralNeeded, referralReason: form.referralReason,
      nextAppointment: form.nextAppointment, notes: form.notes, status: "completed" };
    try {
      const saved = await api.dental.create(payload);
      setRecords((prev) => [mapDental(saved), ...prev]);
    } catch {
      setRecords((prev) => [local, ...prev]);
    }
    toast.success("Dental visit recorded");
    setShowAdd(false);
    setSelectedTeeth([]);
    setSelectedTreatments([]);
  };

  const filtered = records.filter((r) => r.patientName.toLowerCase().includes(search.toLowerCase()) || r.visitId.toLowerCase().includes(search.toLowerCase()));

  const columns: Column<DentalRecord>[] = [
    { header: "Visit ID", accessor: "visitId" },
    { header: "Patient", accessor: (r) => <div><p className="font-medium">{r.patientName}</p><p className="text-xs text-muted-foreground">{r.patientId}</p></div> },
    { header: "Date", accessor: "visitDate" },
    { header: "Diagnosis", accessor: "diagnosis" },
    { header: "Teeth", accessor: (r) => r.teethAffected || "—" },
    { header: "Treatment", accessor: (r) => <div className="flex flex-wrap gap-1">{(r.treatmentPerformed || "").split(",").filter(Boolean).map((t, i) => <Chip key={i} label={t.trim()} size="small" />)}</div> },
    { header: "X-Ray", accessor: (r) => r.xrayTaken ? <Chip label="Yes" size="small" color="info" /> : "—" },
    { header: "Next Apt", accessor: (r) => r.nextAppointment || "—" },
    { header: "Status", accessor: (r) => <StatusBadge status={r.status} /> },
  ];

  const stats = [
    { label: "Total Visits", value: records.length, icon: Smile, color: "#16641D" },
    { label: "Extractions", value: records.filter((r) => (r.treatmentPerformed || "").toLowerCase().includes("extraction")).length, icon: AlertTriangle, color: "#DC2626" },
    { label: "Fillings", value: records.filter((r) => (r.treatmentPerformed || "").toLowerCase().includes("filling")).length, icon: CheckCircle2, color: "#1565C0" },
    { label: "Scaling Done", value: records.filter((r) => r.scalingDone).length, icon: Clock, color: "#7C3AED" },
  ];

  return (
    <div>
      <TopBar title="Dental Clinic" subtitle="Oral health services — dental examination, treatment, and follow-up records" />
      <div className="p-6 space-y-6">

        {/* Stats */}
        <Grid container spacing={2}>
          {stats.map((s) => (
            <Grid size={{ xs: 12, sm: 6, lg: 3 }} key={s.label}>
              <Paper elevation={0} sx={{ p: 3, borderRadius: "16px", border: "1px solid rgba(0,0,0,0.08)" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Box sx={{ p: 1.5, borderRadius: "10px", bgcolor: s.color, display: "flex" }}>
                    <s.icon className="h-5 w-5" style={{ color: "white" }} />
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>{s.label}</Typography>
                    <Typography variant="h4" fontWeight={800} sx={{ color: s.color }}>{s.value}</Typography>
                  </Box>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {/* Dental Chart Reference */}
        <Paper elevation={0} sx={{ p: 3, borderRadius: "16px", border: "1px solid rgba(0,0,0,0.08)" }}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>Dental Chart (FDI Notation)</Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>Upper Right → Upper Left</Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                {["18","17","16","15","14","13","12","11","21","22","23","24","25","26","27","28"].map((t) => (
                  <Box key={t} sx={{ width: 28, height: 28, border: "1px solid #ddd", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", bgcolor: "#f9f9f9" }}>{t}</Box>
                ))}
              </Box>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>Lower Right → Lower Left</Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                {["48","47","46","45","44","43","42","41","31","32","33","34","35","36","37","38"].map((t) => (
                  <Box key={t} sx={{ width: 28, height: 28, border: "1px solid #ddd", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", bgcolor: "#f9f9f9" }}>{t}</Box>
                ))}
              </Box>
            </Box>
          </Box>
        </Paper>

        {/* Table */}
        <Paper elevation={0} sx={{ borderRadius: "16px", border: "1px solid rgba(0,0,0,0.08)", overflow: "hidden" }}>
          <Box sx={{ p: 3, borderBottom: "1px solid rgba(0,0,0,0.08)", display: "flex", gap: 2, flexWrap: "wrap" }}>
            <Box sx={{ position: "relative", flex: 1, minWidth: 240 }}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" style={{ zIndex: 1 }} />
              <Input placeholder="Search patients..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </Box>
            <Button size="sm" className="gradient-primary text-primary-foreground" onClick={() => setShowAdd(true)}>
              <Plus className="h-4 w-4 mr-1" /> New Visit
            </Button>
          </Box>
          <Box sx={{ p: 2 }}><DataTable columns={columns} data={filtered} /></Box>
        </Paper>
      </div>

      {/* Add Visit Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-display">New Dental Visit</DialogTitle>
            <DialogDescription>Record dental examination, diagnosis, and treatment performed.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 pr-2">
            <div className="space-y-1.5">
              <Label>Patient *</Label>
              <Select value={form.patientId} onValueChange={(v) => setForm((f) => ({ ...f, patientId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select patient..." /></SelectTrigger>
                <SelectContent>{patients.map((p) => <SelectItem key={p.patient_id} value={p.patient_id}>{p.name} ({p.patient_id})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Chief Complaint *</Label>
              <Textarea rows={2} value={form.chiefComplaint} onChange={(e) => setForm((f) => ({ ...f, chiefComplaint: e.target.value }))} placeholder="e.g. Toothache upper right, bleeding gums, loose tooth..." required />
            </div>
            <div className="space-y-1.5">
              <Label>Diagnosis</Label>
              <Select value={form.diagnosis} onValueChange={(v) => setForm((f) => ({ ...f, diagnosis: v }))}>
                <SelectTrigger><SelectValue placeholder="Select diagnosis..." /></SelectTrigger>
                <SelectContent>{DIAGNOSES.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {/* Tooth Selector */}
            <div className="space-y-2">
              <Label>Teeth Affected (FDI)</Label>
              <div className="rounded-xl border p-3 flex flex-wrap gap-1.5">
                {TEETH_NUMBERS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleTooth(t)}
                    className={`w-10 h-10 rounded-lg border text-sm font-mono transition ${selectedTeeth.includes(t) ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/40"}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            {/* Treatment Selector */}
            <div className="space-y-2">
              <Label>Treatment Performed</Label>
              <div className="rounded-xl border p-3 flex flex-wrap gap-2">
                {TREATMENTS.map((t) => (
                  <label key={t} className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input type="checkbox" checked={selectedTreatments.includes(t)} onChange={() => toggleTreatment(t)} />
                    {t}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.localAnesthetic} onChange={(e) => setForm((f) => ({ ...f, localAnesthetic: e.target.checked }))} />
                Local Anesthetic Used
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.scalingDone} onChange={(e) => setForm((f) => ({ ...f, scalingDone: e.target.checked }))} />
                Scaling & Polishing Done
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.xrayTaken} onChange={(e) => setForm((f) => ({ ...f, xrayTaken: e.target.checked }))} />
                X-Ray Taken
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.referralNeeded} onChange={(e) => setForm((f) => ({ ...f, referralNeeded: e.target.checked }))} />
                Referral Needed
              </label>
            </div>
            {form.xrayTaken && (
              <div className="space-y-1.5">
                <Label>X-Ray Findings</Label>
                <Input value={form.xrayFindings} onChange={(e) => setForm((f) => ({ ...f, xrayFindings: e.target.value }))} placeholder="Periapical abscess, bone loss, impaction..." />
              </div>
            )}
            {form.localAnesthetic && (
              <div className="space-y-1.5">
                <Label>Anesthetic Type</Label>
                <Input value={form.anestheticType} onChange={(e) => setForm((f) => ({ ...f, anestheticType: e.target.value }))} placeholder="e.g. Lignocaine 2%, Articaine" />
              </div>
            )}
            {form.referralNeeded && (
              <div className="space-y-1.5">
                <Label>Referral Reason</Label>
                <Input value={form.referralReason} onChange={(e) => setForm((f) => ({ ...f, referralReason: e.target.value }))} placeholder="e.g. Oral surgery needed, maxillofacial referral" />
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Medications Prescribed</Label>
                <Input value={form.medications} onChange={(e) => setForm((f) => ({ ...f, medications: e.target.value }))} placeholder="e.g. Amoxicillin 500mg, Ibuprofen 400mg" />
              </div>
              <div className="space-y-1.5">
                <Label>Next Appointment</Label>
                <Input type="date" value={form.nextAppointment} onChange={(e) => setForm((f) => ({ ...f, nextAppointment: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Dentist Notes</Label>
              <Textarea rows={3} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Clinical observations, treatment plan, follow-up instructions..." />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button type="submit" className="gradient-primary text-primary-foreground">Record Visit</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
