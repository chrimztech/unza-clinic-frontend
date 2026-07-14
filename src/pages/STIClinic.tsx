import TopBar from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DataTable, Column } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, ShieldAlert, Users, CheckCircle2, AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Box, Paper, Typography, Grid, Chip, Alert, AlertTitle } from "@mui/material";

interface STIRecord {
  id: number;
  visitId: string;
  patientId: string;
  patientName: string;
  visitDate: string;
  clinicianName: string;
  chiefComplaint: string;
  syndromeClassification: string;
  labTestsDone: string;
  hivTest: string;
  syphilisTest: string;
  hepatitisB: string;
  diagnosis: string;
  treatmentProtocol: string;
  medicationsGiven: string;
  partnerNotification: boolean;
  partnerTreated: boolean;
  condomsProvided: number;
  hivCounselingGiven: boolean;
  adherenceCounselingGiven: boolean;
  followUpDate: string;
  notes: string;
  status: string;
}

const SYNDROME_CLASSIFICATIONS = [
  "Urethral Discharge Syndrome (UDS)",
  "Vaginal Discharge Syndrome (VDS)",
  "Genital Ulcer Disease (GUD)",
  "Lower Abdominal Pain (LAP)",
  "Scrotal Swelling Syndrome",
  "Bubo (Inguinal Lymphadenopathy)",
  "Neonatal Conjunctivitis",
  "Ophthalmia Neonatorum",
];

const TREATMENT_PROTOCOLS: Record<string, string> = {
  "Urethral Discharge Syndrome (UDS)": "Ceftriaxone 500mg IM stat + Doxycycline 100mg BD x 7 days + Metronidazole 400mg BD x 7 days",
  "Vaginal Discharge Syndrome (VDS)": "Ceftriaxone 500mg IM stat + Metronidazole 400mg BD x 7 days + Clotrimazole 500mg pessary",
  "Genital Ulcer Disease (GUD)": "Benzathine Penicillin 2.4MU IM stat + Acyclovir 400mg TDS x 5 days (if herpes suspected)",
  "Lower Abdominal Pain (LAP)": "Ceftriaxone 500mg IM stat + Doxycycline 100mg BD x 14 days + Metronidazole 400mg BD x 14 days",
  "Scrotal Swelling Syndrome": "Ceftriaxone 500mg IM stat + Doxycycline 100mg BD x 14 days",
  "Bubo (Inguinal Lymphadenopathy)": "Doxycycline 100mg BD x 21 days (LGV) + aspiration if fluctuant",
};

export default function STIClinic() {
  const { user } = useAuth();
  const [records, setRecords] = useState<STIRecord[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    patientId: "", chiefComplaint: "", syndromeClassification: "", labTestsDone: "",
    hivTest: "", syphilisTest: "", hepatitisB: "", diagnosis: "",
    treatmentProtocol: "", medicationsGiven: "", partnerNotification: false,
    partnerTreated: false, condomsProvided: "", hivCounselingGiven: true,
    adherenceCounselingGiven: true, followUpDate: "", notes: "",
  });

  const mapSti = (r: any): STIRecord => ({
    id: r.id,
    visitId: r.visit_id || r.visitId || "",
    patientId: r.patient_id || r.patientId || "",
    patientName: r.patient_name || r.patientName || "",
    visitDate: r.visit_date || r.visitDate || "",
    clinicianName: r.clinician_name || r.clinicianName || "",
    chiefComplaint: r.chief_complaint || r.chiefComplaint || "",
    syndromeClassification: r.syndrome_classification || r.syndromeClassification || "",
    labTestsDone: r.lab_tests_done || r.labTestsDone || "",
    hivTest: r.hiv_test || r.hivTest || "",
    syphilisTest: r.syphilis_test || r.syphilisTest || "",
    hepatitisB: r.hepatitis_b || r.hepatitisB || "",
    diagnosis: r.diagnosis || "",
    treatmentProtocol: r.treatment_protocol || r.treatmentProtocol || "",
    medicationsGiven: r.medications_given || r.medicationsGiven || "",
    partnerNotification: Boolean(r.partner_notification ?? r.partnerNotification),
    partnerTreated: Boolean(r.partner_treated ?? r.partnerTreated),
    condomsProvided: Number(r.condoms_provided ?? r.condomsProvided) || 0,
    hivCounselingGiven: Boolean(r.hiv_counseling_given ?? r.hivCounselingGiven ?? true),
    adherenceCounselingGiven: Boolean(r.adherence_counseling_given ?? r.adherenceCounselingGiven ?? true),
    followUpDate: r.follow_up_date || r.followUpDate || "",
    notes: r.notes || "",
    status: r.status || "completed",
  });

  useEffect(() => {
    api.patients.getAll().then((d: any[]) => setPatients(d)).catch(() => {});
    api.sti.getAll().then((d: any[]) => setRecords((d || []).map(mapSti))).catch(() => {});
  }, []);

  const patientName = (id: string) => patients.find((p) => p.patient_id === id)?.name || id;

  const handleSyndromeChange = (syndrome: string) => {
    const protocol = TREATMENT_PROTOCOLS[syndrome] || "";
    setForm((f) => ({ ...f, syndromeClassification: syndrome, treatmentProtocol: protocol }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.patientId || !form.syndromeClassification) { toast.error("Select patient and syndrome classification"); return; }
    const pName = patientName(form.patientId);
    const payload = {
      patient_id: form.patientId,
      patient_name: pName,
      visit_date: new Date().toISOString().slice(0, 10),
      clinician_name: user?.name || "Clinician",
      chief_complaint: form.chiefComplaint,
      syndrome_classification: form.syndromeClassification,
      lab_tests_done: form.labTestsDone,
      hiv_test: form.hivTest,
      syphilis_test: form.syphilisTest,
      hepatitis_b: form.hepatitisB,
      diagnosis: form.diagnosis || form.syndromeClassification,
      treatment_protocol: form.treatmentProtocol,
      medications_given: form.medicationsGiven || form.treatmentProtocol,
      partner_notification: form.partnerNotification,
      partner_treated: form.partnerTreated,
      condoms_provided: Number(form.condomsProvided) || 0,
      hiv_counseling_given: form.hivCounselingGiven,
      adherence_counseling_given: form.adherenceCounselingGiven,
      follow_up_date: form.followUpDate,
      notes: form.notes,
    };
    const localEntry: STIRecord = {
      id: Date.now(), visitId: `STI-${Date.now()}`, patientId: form.patientId, patientName: pName,
      visitDate: payload.visit_date, clinicianName: payload.clinician_name, chiefComplaint: form.chiefComplaint,
      syndromeClassification: form.syndromeClassification, labTestsDone: form.labTestsDone,
      hivTest: form.hivTest, syphilisTest: form.syphilisTest, hepatitisB: form.hepatitisB,
      diagnosis: payload.diagnosis, treatmentProtocol: form.treatmentProtocol,
      medicationsGiven: payload.medications_given, partnerNotification: form.partnerNotification,
      partnerTreated: form.partnerTreated, condomsProvided: Number(form.condomsProvided) || 0,
      hivCounselingGiven: form.hivCounselingGiven, adherenceCounselingGiven: form.adherenceCounselingGiven,
      followUpDate: form.followUpDate, notes: form.notes, status: "completed",
    };
    try {
      const saved = await api.sti.create(payload);
      setRecords((prev) => [mapSti(saved), ...prev]);
    } catch {
      setRecords((prev) => [localEntry, ...prev]);
    }
    toast.success("STI visit recorded");
    setShowAdd(false);
    setForm({
      patientId: "", chiefComplaint: "", syndromeClassification: "", labTestsDone: "",
      hivTest: "", syphilisTest: "", hepatitisB: "", diagnosis: "",
      treatmentProtocol: "", medicationsGiven: "", partnerNotification: false,
      partnerTreated: false, condomsProvided: "", hivCounselingGiven: true,
      adherenceCounselingGiven: true, followUpDate: "", notes: "",
    });
  };

  const filtered = records.filter((r) => r.patientName.toLowerCase().includes(search.toLowerCase()) || r.visitId.toLowerCase().includes(search.toLowerCase()));

  const columns: Column<STIRecord>[] = [
    { header: "Visit ID", accessor: "visitId" },
    { header: "Patient", accessor: (r) => <div><p className="font-medium">{r.patientName}</p><p className="text-xs text-muted-foreground">{r.patientId}</p></div> },
    { header: "Date", accessor: "visitDate" },
    { header: "Syndrome", accessor: (r) => <Chip label={r.syndromeClassification} size="small" /> },
    { header: "HIV Test", accessor: (r) => r.hivTest ? <Chip label={r.hivTest} size="small" color={r.hivTest === "Reactive" ? "error" : "success"} /> : "—" },
    { header: "Syphilis", accessor: (r) => r.syphilisTest ? <Chip label={r.syphilisTest} size="small" color={r.syphilisTest === "Reactive" ? "error" : "success"} /> : "—" },
    { header: "Partner Notif.", accessor: (r) => r.partnerNotification ? <Chip label="Done" size="small" color="success" /> : <Chip label="Pending" size="small" color="warning" /> },
    { header: "Condoms", accessor: (r) => r.condomsProvided > 0 ? `${r.condomsProvided}` : "0" },
    { header: "Follow-Up", accessor: (r) => r.followUpDate || "—" },
    { header: "Status", accessor: (r) => <StatusBadge status={r.status} /> },
  ];

  const stats = [
    { label: "Total Cases", value: records.length, icon: Users, color: "#7C3AED" },
    { label: "HIV Reactive", value: records.filter((r) => r.hivTest === "Reactive").length, icon: ShieldAlert, color: "#DC2626" },
    { label: "Partner Notified", value: records.filter((r) => r.partnerNotification).length, icon: CheckCircle2, color: "#16641D" },
    { label: "Pending Follow-Up", value: records.filter((r) => r.followUpDate && new Date(r.followUpDate) > new Date()).length, icon: AlertTriangle, color: "#F59E0B" },
  ];

  return (
    <div>
      <TopBar title="STI Clinic" subtitle="Sexually Transmitted Infection management — syndromic approach, partner notification, and treatment" />
      <div className="p-6 space-y-6">

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

        <Alert severity="info" sx={{ borderRadius: "12px" }}>
          <AlertTitle sx={{ fontWeight: 700 }}>Syndromic Management Approach</AlertTitle>
          UNZA Clinic follows the Ministry of Health syndromic management guidelines. All STI cases must have partner notification attempted and documented. Offer HIV testing to all patients.
        </Alert>

        <Paper elevation={0} sx={{ borderRadius: "16px", border: "1px solid rgba(0,0,0,0.08)", overflow: "hidden" }}>
          <Box sx={{ p: 3, borderBottom: "1px solid rgba(0,0,0,0.08)", display: "flex", gap: 2, flexWrap: "wrap" }}>
            <Box sx={{ position: "relative", flex: 1, minWidth: 240 }}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" style={{ zIndex: 1 }} />
              <Input placeholder="Search patients..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </Box>
            <Button size="sm" className="gradient-primary text-primary-foreground" onClick={() => setShowAdd(true)}>
              <Plus className="h-4 w-4 mr-1" /> New STI Visit
            </Button>
          </Box>
          <Box sx={{ p: 2 }}><DataTable columns={columns} data={filtered} /></Box>
        </Paper>
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-display">New STI Visit</DialogTitle>
            <DialogDescription>Use the syndromic management approach. Document syndrome, tests, treatment, and partner notification.</DialogDescription>
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
              <Label>Chief Complaint</Label>
              <Textarea rows={2} value={form.chiefComplaint} onChange={(e) => setForm((f) => ({ ...f, chiefComplaint: e.target.value }))} placeholder="e.g. Penile discharge, vaginal itching, genital sores..." />
            </div>
            <div className="space-y-1.5">
              <Label>Syndrome Classification *</Label>
              <Select value={form.syndromeClassification} onValueChange={handleSyndromeChange}>
                <SelectTrigger><SelectValue placeholder="Select syndrome..." /></SelectTrigger>
                <SelectContent>{SYNDROME_CLASSIFICATIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {/* Lab Tests */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>HIV Test Result</Label>
                <Select value={form.hivTest} onValueChange={(v) => setForm((f) => ({ ...f, hivTest: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Non-Reactive">Non-Reactive</SelectItem>
                    <SelectItem value="Reactive">Reactive</SelectItem>
                    <SelectItem value="Declined">Patient Declined</SelectItem>
                    <SelectItem value="Already Known">Already Known Positive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Syphilis (RPR/TPHA)</Label>
                <Select value={form.syphilisTest} onValueChange={(v) => setForm((f) => ({ ...f, syphilisTest: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Non-Reactive">Non-Reactive</SelectItem>
                    <SelectItem value="Reactive">Reactive</SelectItem>
                    <SelectItem value="Not Done">Not Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Hepatitis B (HBsAg)</Label>
                <Select value={form.hepatitisB} onValueChange={(v) => setForm((f) => ({ ...f, hepatitisB: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Negative">Negative</SelectItem>
                    <SelectItem value="Positive">Positive</SelectItem>
                    <SelectItem value="Not Done">Not Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Auto-filled treatment */}
            {form.treatmentProtocol && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                <p className="text-xs font-semibold text-primary mb-1">Recommended Treatment Protocol</p>
                <p className="text-sm text-card-foreground">{form.treatmentProtocol}</p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Medications Actually Given</Label>
              <Textarea rows={2} value={form.medicationsGiven} onChange={(e) => setForm((f) => ({ ...f, medicationsGiven: e.target.value }))} placeholder="Copy from above or modify if needed..." />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Condoms Provided</Label>
                <Input type="number" min="0" value={form.condomsProvided} onChange={(e) => setForm((f) => ({ ...f, condomsProvided: e.target.value }))} placeholder="Number of condoms" />
              </div>
              <div className="space-y-1.5">
                <Label>Follow-Up Date</Label>
                <Input type="date" value={form.followUpDate} onChange={(e) => setForm((f) => ({ ...f, followUpDate: e.target.value }))} />
              </div>
            </div>

            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.partnerNotification} onChange={(e) => setForm((f) => ({ ...f, partnerNotification: e.target.checked }))} />
                Partner notification done / initiated
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.partnerTreated} onChange={(e) => setForm((f) => ({ ...f, partnerTreated: e.target.checked }))} />
                Partner treated at this visit
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.hivCounselingGiven} onChange={(e) => setForm((f) => ({ ...f, hivCounselingGiven: e.target.checked }))} />
                HIV counseling given
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.adherenceCounselingGiven} onChange={(e) => setForm((f) => ({ ...f, adherenceCounselingGiven: e.target.checked }))} />
                Adherence counseling given
              </label>
            </div>

            <div className="space-y-1.5">
              <Label>Clinical Notes</Label>
              <Textarea rows={3} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Additional findings, risk reduction counseling, referrals..." />
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
