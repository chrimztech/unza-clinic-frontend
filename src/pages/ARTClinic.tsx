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
import {
  Plus, Search, ShieldCheck, Activity, AlertTriangle,
  Pill, Users, TrendingDown, Heart, RefreshCw
} from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Box, Paper, Typography, Grid, Chip, Tabs, Tab, Alert, AlertTitle } from "@mui/material";

type ARTTab = "patients" | "visits" | "defaulters" | "adherence";

interface ARTPatient {
  id: number;
  artNumber: string;
  patientId: string;
  patientName: string;
  enrollmentDate: string;
  currentRegimen: string;
  regimenLine: string;
  cd4Baseline?: number;
  cd4Latest?: number;
  vlLatest?: number;
  vlDate?: string;
  disclosureStatus: string;
  pregnancyStatus?: string;
  tbStatus: string;
  tbTreatment: boolean;
  adherenceScore: string;
  nextPickup: string;
  nextClinicDate: string;
  status: string;
  transferIn?: boolean;
  transferFrom?: string;
}

interface ARTVisit {
  id: number;
  visitId: string;
  artNumber: string;
  patientId: string;
  patientName: string;
  visitDate: string;
  clinicianName: string;
  weight: string;
  bloodPressure: string;
  cd4Count?: number;
  viralLoad?: number;
  vlDate?: string;
  viralLoadStatus: string;
  regimen: string;
  regimenChanged: boolean;
  changeReason?: string;
  oisPresent: string;
  cotrimoxazole: boolean;
  inh: boolean;
  daysDispensed: number;
  pillsReturned: number;
  adherenceScore: string;
  sideEffects: string;
  counselingGiven: boolean;
  nextVisit: string;
  notes: string;
}

const ART_REGIMENS_FIRST_LINE = [
  "TDF + 3TC + DTG (preferred)",
  "TDF + FTC + DTG",
  "TDF + 3TC + EFV",
  "AZT + 3TC + DTG",
  "ABC + 3TC + DTG",
];

const ART_REGIMENS_SECOND_LINE = [
  "AZT + 3TC + ATVr",
  "AZT + 3TC + LPVr",
  "TDF + 3TC + ATVr",
  "TDF + 3TC + LPVr",
  "ABC + 3TC + LPVr",
];

const ART_REGIMENS_THIRD_LINE = [
  "DRV + RTV + RAL + DTG",
  "DRV + RTV + ETR + TDF + 3TC",
];

const DISCLOSURE_OPTIONS = ["Full Disclosure", "Partial Disclosure", "No Disclosure", "Child not aware"];
const TB_STATUS_OPTIONS = ["No TB", "TB Suspect", "On TB Treatment", "Completed TB Treatment"];

export default function ARTClinic() {
  const { user } = useAuth();
  const [tab, setTab] = useState<ARTTab>("patients");
  const [search, setSearch] = useState("");
  const [patients, setPatients] = useState<any[]>([]);
  const [artPatients, setArtPatients] = useState<ARTPatient[]>([]);
  const [artVisits, setArtVisits] = useState<ARTVisit[]>([]);
  const [showNewPatient, setShowNewPatient] = useState(false);
  const [showNewVisit, setShowNewVisit] = useState(false);

  const [patientForm, setPatientForm] = useState({
    patientId: "", artNumber: "", enrollmentDate: "", currentRegimen: "", regimenLine: "First Line",
    cd4Baseline: "", disclosureStatus: "", tbStatus: "No TB", tbTreatment: false, nextPickup: "", nextClinicDate: "", transferIn: false, transferFrom: "",
  });

  const [visitForm, setVisitForm] = useState({
    artNumber: "", visitDate: "", weight: "", bloodPressure: "", cd4Count: "", viralLoad: "", vlDate: "",
    viralLoadStatus: "Suppressed", regimen: "", regimenChanged: false, changeReason: "", oisPresent: "None",
    cotrimoxazole: false, inh: false, daysDispensed: "30", pillsReturned: "0", adherenceScore: "Good",
    sideEffects: "None", counselingGiven: true, nextVisit: "", notes: "",
  });

  const mapArtPatient = (r: any): ARTPatient => ({
    id: r.id, artNumber: r.art_number || r.artNumber || "",
    patientId: r.patient_id || r.patientId || "", patientName: r.patient_name || r.patientName || "",
    enrollmentDate: r.enrollment_date || r.enrollmentDate || "",
    currentRegimen: r.current_regimen || r.currentRegimen || "",
    regimenLine: r.regimen_line || r.regimenLine || "",
    cd4Baseline: r.cd4_baseline ?? r.cd4Baseline, cd4Latest: r.cd4_latest ?? r.cd4Latest,
    vlLatest: r.vl_latest ?? r.vlLatest, vlDate: r.vl_date || r.vlDate || "",
    disclosureStatus: r.disclosure_status || r.disclosureStatus || "",
    pregnancyStatus: r.pregnancy_status || r.pregnancyStatus || "",
    tbStatus: r.tb_status || r.tbStatus || "", tbTreatment: Boolean(r.tb_treatment ?? r.tbTreatment),
    adherenceScore: r.adherence_score || r.adherenceScore || "Pending",
    nextPickup: r.next_pickup || r.nextPickup || "",
    nextClinicDate: r.next_clinic_date || r.nextClinicDate || "",
    status: r.status || "active", transferIn: Boolean(r.transfer_in ?? r.transferIn),
    transferFrom: r.transfer_from || r.transferFrom || "",
  });

  const mapArtVisit = (r: any): ARTVisit => ({
    id: r.id, visitId: r.visit_id || r.visitId || "", artNumber: r.art_number || r.artNumber || "",
    patientId: r.patient_id || r.patientId || "", patientName: r.patient_name || r.patientName || "",
    visitDate: r.visit_date || r.visitDate || "", clinicianName: r.clinician_name || r.clinicianName || "",
    weight: r.weight || "", bloodPressure: r.blood_pressure || r.bloodPressure || "",
    cd4Count: r.cd4_count ?? r.cd4Count, viralLoad: r.viral_load ?? r.viralLoad,
    vlDate: r.vl_date || r.vlDate || "", viralLoadStatus: r.viral_load_status || r.viralLoadStatus || "",
    regimen: r.regimen || "", regimenChanged: Boolean(r.regimen_changed ?? r.regimenChanged),
    changeReason: r.change_reason || r.changeReason || "", oisPresent: r.ois_present || r.oisPresent || "",
    cotrimoxazole: Boolean(r.cotrimoxazole), inh: Boolean(r.inh),
    daysDispensed: r.days_dispensed ?? r.daysDispensed ?? 0,
    pillsReturned: r.pills_returned ?? r.pillsReturned ?? 0,
    adherenceScore: r.adherence_score || r.adherenceScore || "",
    sideEffects: r.side_effects || r.sideEffects || "",
    counselingGiven: Boolean(r.counseling_given ?? r.counselingGiven ?? true),
    nextVisit: r.next_visit || r.nextVisit || "", notes: r.notes || "",
  });

  useEffect(() => {
    api.patients.getAll().then((d: any[]) => setPatients(d)).catch(() => {});
    api.art.getPatients().then((d: any[]) => setArtPatients((d || []).map(mapArtPatient))).catch(() => {});
    api.art.getVisits().then((d: any[]) => setArtVisits((d || []).map(mapArtVisit))).catch(() => {});
  }, []);

  const defaulters = useMemo(() =>
    artPatients.filter((p) => {
      if (!p.nextPickup) return false;
      return new Date(p.nextPickup) < new Date();
    }),
    [artPatients]
  );

  const patientName = (id: string) => patients.find((p) => p.patient_id === id)?.name || id;

  const handleNewPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientForm.patientId || !patientForm.artNumber) { toast.error("Patient ID and ART number required"); return; }
    const pName = patientName(patientForm.patientId);
    const payload = {
      art_number: patientForm.artNumber, patient_id: patientForm.patientId, patient_name: pName,
      enrollment_date: patientForm.enrollmentDate || new Date().toISOString().slice(0, 10),
      current_regimen: patientForm.currentRegimen, regimen_line: patientForm.regimenLine,
      cd4_baseline: patientForm.cd4Baseline ? Number(patientForm.cd4Baseline) : null,
      disclosure_status: patientForm.disclosureStatus, tb_status: patientForm.tbStatus,
      tb_treatment: patientForm.tbTreatment, adherence_score: "Pending",
      next_pickup: patientForm.nextPickup, next_clinic_date: patientForm.nextClinicDate,
      transfer_in: patientForm.transferIn, transfer_from: patientForm.transferFrom,
    };
    const local: ARTPatient = { id: Date.now(), artNumber: patientForm.artNumber, patientId: patientForm.patientId,
      patientName: pName, enrollmentDate: payload.enrollment_date, currentRegimen: patientForm.currentRegimen,
      regimenLine: patientForm.regimenLine, cd4Baseline: payload.cd4_baseline ?? undefined,
      disclosureStatus: patientForm.disclosureStatus, tbStatus: patientForm.tbStatus,
      tbTreatment: patientForm.tbTreatment, adherenceScore: "Pending", nextPickup: patientForm.nextPickup,
      nextClinicDate: patientForm.nextClinicDate, status: "active", transferIn: patientForm.transferIn,
      transferFrom: patientForm.transferFrom };
    try {
      const saved = await api.art.createPatient(payload);
      setArtPatients((prev) => [mapArtPatient(saved), ...prev]);
    } catch {
      setArtPatients((prev) => [local, ...prev]);
    }
    toast.success("ART patient enrolled: " + patientForm.artNumber);
    setShowNewPatient(false);
  };

  const handleNewVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitForm.artNumber) { toast.error("ART number required"); return; }
    const artPt = artPatients.find((p) => p.artNumber === visitForm.artNumber);
    const vDate = visitForm.visitDate || new Date().toISOString().slice(0, 10);
    const payload = {
      art_number: visitForm.artNumber, patient_id: artPt?.patientId || "",
      patient_name: artPt?.patientName || visitForm.artNumber,
      visit_date: vDate, clinician_name: user?.name || "Clinician",
      weight: visitForm.weight, blood_pressure: visitForm.bloodPressure,
      cd4_count: visitForm.cd4Count ? Number(visitForm.cd4Count) : null,
      viral_load: visitForm.viralLoad ? Number(visitForm.viralLoad) : null,
      vl_date: visitForm.vlDate, viral_load_status: visitForm.viralLoadStatus,
      regimen: visitForm.regimen || artPt?.currentRegimen || "",
      regimen_changed: visitForm.regimenChanged, change_reason: visitForm.changeReason,
      ois_present: visitForm.oisPresent, cotrimoxazole: visitForm.cotrimoxazole, inh: visitForm.inh,
      days_dispensed: Number(visitForm.daysDispensed), pills_returned: Number(visitForm.pillsReturned),
      adherence_score: visitForm.adherenceScore, side_effects: visitForm.sideEffects,
      counseling_given: visitForm.counselingGiven, next_visit: visitForm.nextVisit, notes: visitForm.notes,
    };
    const local: ARTVisit = { id: Date.now(), visitId: `VIS-${Date.now()}`, artNumber: visitForm.artNumber,
      patientId: artPt?.patientId || "", patientName: artPt?.patientName || visitForm.artNumber,
      visitDate: vDate, clinicianName: user?.name || "Clinician", weight: visitForm.weight,
      bloodPressure: visitForm.bloodPressure, cd4Count: payload.cd4_count ?? undefined,
      viralLoad: payload.viral_load ?? undefined, vlDate: visitForm.vlDate,
      viralLoadStatus: visitForm.viralLoadStatus, regimen: payload.regimen,
      regimenChanged: visitForm.regimenChanged, changeReason: visitForm.changeReason,
      oisPresent: visitForm.oisPresent, cotrimoxazole: visitForm.cotrimoxazole, inh: visitForm.inh,
      daysDispensed: Number(visitForm.daysDispensed), pillsReturned: Number(visitForm.pillsReturned),
      adherenceScore: visitForm.adherenceScore, sideEffects: visitForm.sideEffects,
      counselingGiven: visitForm.counselingGiven, nextVisit: visitForm.nextVisit, notes: visitForm.notes };
    try {
      const saved = await api.art.createVisit(payload);
      setArtVisits((prev) => [mapArtVisit(saved), ...prev]);
    } catch {
      setArtVisits((prev) => [local, ...prev]);
    }
    if (visitForm.viralLoad) {
      const vl = Number(visitForm.viralLoad);
      setArtPatients((prev) => prev.map((p) => p.artNumber === visitForm.artNumber ? { ...p, vlLatest: vl, vlDate: visitForm.vlDate, nextPickup: visitForm.nextVisit, adherenceScore: visitForm.adherenceScore } : p));
    }
    toast.success("ART clinic visit recorded");
    setShowNewVisit(false);
  };

  const patientColumns: Column<ARTPatient>[] = [
    { header: "ART No.", accessor: "artNumber", width: 100 },
    { header: "Patient", accessor: (r) => <div><p className="font-medium">{r.patientName}</p><p className="text-xs text-muted-foreground">{r.patientId}</p></div>, width: 160 },
    { header: "Regimen", accessor: (r) => <div><p className="text-sm">{r.currentRegimen}</p><Chip label={r.regimenLine} size="small" color={r.regimenLine === "First Line" ? "success" : r.regimenLine === "Second Line" ? "warning" : "error"} /></div>, width: 200 },
    { header: "CD4 Baseline", accessor: (r) => r.cd4Baseline ? `${r.cd4Baseline} cells/μL` : "—", width: 120 },
    { header: "Latest VL", accessor: (r) => r.vlLatest !== undefined ? (<Chip label={r.vlLatest < 1000 ? `${r.vlLatest} (Suppressed)` : `${r.vlLatest} (Unsuppressed)`} size="small" color={r.vlLatest < 1000 ? "success" : "error"} />) : "—", width: 160 },
    { header: "TB Status", accessor: (r) => <Chip label={r.tbStatus} size="small" color={r.tbStatus === "On TB Treatment" ? "warning" : "default"} />, width: 130 },
    { header: "Adherence", accessor: (r) => <Chip label={r.adherenceScore} size="small" color={r.adherenceScore === "Good" ? "success" : r.adherenceScore === "Fair" ? "warning" : "error"} />, width: 100 },
    { header: "Next Pickup", accessor: (r) => <span className={new Date(r.nextPickup) < new Date() ? "text-destructive font-semibold" : ""}>{r.nextPickup || "—"}</span>, width: 110 },
    { header: "Status", accessor: (r) => <StatusBadge status={r.status} />, width: 90 },
  ];

  const visitColumns: Column<ARTVisit>[] = [
    { header: "Visit ID", accessor: "visitId" },
    { header: "ART No.", accessor: "artNumber" },
    { header: "Patient", accessor: "patientName" },
    { header: "Date", accessor: "visitDate" },
    { header: "VL", accessor: (r) => r.viralLoad !== undefined ? <Chip label={`${r.viralLoad} ${r.viralLoadStatus}`} size="small" color={r.viralLoad < 1000 ? "success" : "error"} /> : "—" },
    { header: "Days Dispensed", accessor: (r) => `${r.daysDispensed} days` },
    { header: "Adherence", accessor: (r) => <Chip label={r.adherenceScore} size="small" color={r.adherenceScore === "Good" ? "success" : r.adherenceScore === "Fair" ? "warning" : "error"} /> },
    { header: "Regimen Changed", accessor: (r) => r.regimenChanged ? <Chip label="Changed" size="small" color="warning" /> : "—" },
    { header: "Next Visit", accessor: "nextVisit" },
  ];

  const stats = [
    { label: "Active Patients", value: artPatients.filter((p) => p.status === "active").length, icon: Users, color: "#007A3D" },
    { label: "Suppressed VL", value: artPatients.filter((p) => (p.vlLatest ?? 999999) < 1000).length, icon: ShieldCheck, color: "#1565C0" },
    { label: "Defaulters", value: defaulters.length, icon: AlertTriangle, color: "#DC2626" },
    { label: "TB Co-infection", value: artPatients.filter((p) => p.tbTreatment).length, icon: Activity, color: "#F59E0B" },
  ];

  return (
    <div>
      <TopBar title="ART / HIV Clinic" subtitle="Antiretroviral Therapy management — patient enrollment, clinical visits, adherence and viral load monitoring" />
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

        {defaulters.length > 0 && (
          <Alert severity="error" sx={{ borderRadius: "12px" }}>
            <AlertTitle sx={{ fontWeight: 700 }}>Defaulters Alert</AlertTitle>
            {defaulters.length} patient(s) have missed their scheduled drug pickup. Initiate tracing immediately.
          </Alert>
        )}

        {/* Tabs */}
        <Paper elevation={0} sx={{ borderRadius: "16px", border: "1px solid rgba(0,0,0,0.08)", overflow: "hidden" }}>
          <Box sx={{ borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2 }}>
              <Tab value="patients" label="Enrolled Patients" />
              <Tab value="visits" label="Clinical Visits" />
              <Tab value="defaulters" label={`Defaulters (${defaulters.length})`} />
            </Tabs>
          </Box>
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
              <Box sx={{ position: "relative", flex: 1, minWidth: 240 }}>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" style={{ zIndex: 1 }} />
                <Input placeholder="Search by ART number or patient name..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
              </Box>
              {tab === "patients" && (
                <Button size="sm" className="gradient-primary text-primary-foreground" onClick={() => setShowNewPatient(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Enroll Patient
                </Button>
              )}
              {tab === "visits" && (
                <Button size="sm" className="gradient-primary text-primary-foreground" onClick={() => setShowNewVisit(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Record Visit
                </Button>
              )}
            </Box>

            {tab === "patients" && (
              <DataTable columns={patientColumns} data={artPatients.filter((p) => p.patientName.toLowerCase().includes(search.toLowerCase()) || p.artNumber.toLowerCase().includes(search.toLowerCase()))} />
            )}
            {tab === "visits" && (
              <DataTable columns={visitColumns} data={artVisits.filter((v) => v.patientName.toLowerCase().includes(search.toLowerCase()) || v.artNumber.toLowerCase().includes(search.toLowerCase()))} />
            )}
            {tab === "defaulters" && (
              <DataTable
                columns={[
                  { header: "ART No.", accessor: "artNumber" },
                  { header: "Patient", accessor: "patientName" },
                  { header: "Regimen", accessor: "currentRegimen" },
                  { header: "Missed Pickup", accessor: (r) => <span className="text-destructive font-semibold">{r.nextPickup}</span> },
                  { header: "Adherence", accessor: (r) => <Chip label={r.adherenceScore} size="small" color="error" /> },
                  { header: "Phone", accessor: (r) => patients.find((p) => p.patient_id === r.patientId)?.phone || "—" },
                ]}
                data={defaulters.filter((p) => p.patientName.toLowerCase().includes(search.toLowerCase()))}
              />
            )}
          </Box>
        </Paper>
      </div>

      {/* New Patient Dialog */}
      <Dialog open={showNewPatient} onOpenChange={setShowNewPatient}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-display">Enroll ART Patient</DialogTitle>
            <DialogDescription>Register a new patient into the ART/HIV clinic program.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleNewPatient} className="flex-1 overflow-y-auto space-y-4 pr-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Patient *</Label>
                <Select value={patientForm.patientId} onValueChange={(v) => setPatientForm((f) => ({ ...f, patientId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select patient..." /></SelectTrigger>
                  <SelectContent>{patients.map((p) => <SelectItem key={p.patient_id} value={p.patient_id}>{p.name} ({p.patient_id})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>ART Number *</Label>
                <Input value={patientForm.artNumber} onChange={(e) => setPatientForm((f) => ({ ...f, artNumber: e.target.value }))} placeholder="e.g. LUSAKA/2024/001234" required />
              </div>
              <div className="space-y-1.5">
                <Label>Enrollment Date</Label>
                <Input type="date" value={patientForm.enrollmentDate} onChange={(e) => setPatientForm((f) => ({ ...f, enrollmentDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>CD4 Baseline (cells/μL)</Label>
                <Input type="number" value={patientForm.cd4Baseline} onChange={(e) => setPatientForm((f) => ({ ...f, cd4Baseline: e.target.value }))} placeholder="e.g. 350" />
              </div>
              <div className="space-y-1.5">
                <Label>Regimen Line</Label>
                <Select value={patientForm.regimenLine} onValueChange={(v) => setPatientForm((f) => ({ ...f, regimenLine: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="First Line">First Line</SelectItem>
                    <SelectItem value="Second Line">Second Line</SelectItem>
                    <SelectItem value="Third Line">Third Line</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Current Regimen</Label>
                <Select value={patientForm.currentRegimen} onValueChange={(v) => setPatientForm((f) => ({ ...f, currentRegimen: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select regimen..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="" disabled>— First Line —</SelectItem>
                    {ART_REGIMENS_FIRST_LINE.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    <SelectItem value="" disabled>— Second Line —</SelectItem>
                    {ART_REGIMENS_SECOND_LINE.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    <SelectItem value="" disabled>— Third Line —</SelectItem>
                    {ART_REGIMENS_THIRD_LINE.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Disclosure Status</Label>
                <Select value={patientForm.disclosureStatus} onValueChange={(v) => setPatientForm((f) => ({ ...f, disclosureStatus: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>{DISCLOSURE_OPTIONS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>TB Status</Label>
                <Select value={patientForm.tbStatus} onValueChange={(v) => setPatientForm((f) => ({ ...f, tbStatus: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TB_STATUS_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Next Pickup Date</Label>
                <Input type="date" value={patientForm.nextPickup} onChange={(e) => setPatientForm((f) => ({ ...f, nextPickup: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Next Clinic Date</Label>
                <Input type="date" value={patientForm.nextClinicDate} onChange={(e) => setPatientForm((f) => ({ ...f, nextClinicDate: e.target.value }))} />
              </div>
            </div>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={patientForm.tbTreatment} onChange={(e) => setPatientForm((f) => ({ ...f, tbTreatment: e.target.checked }))} />
                Currently on TB treatment
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={patientForm.transferIn} onChange={(e) => setPatientForm((f) => ({ ...f, transferIn: e.target.checked }))} />
                Transfer-in patient
              </label>
            </div>
            {patientForm.transferIn && (
              <div className="space-y-1.5">
                <Label>Transferring Facility</Label>
                <Input value={patientForm.transferFrom} onChange={(e) => setPatientForm((f) => ({ ...f, transferFrom: e.target.value }))} placeholder="e.g. UTH, Chilenje Health Centre" />
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowNewPatient(false)}>Cancel</Button>
              <Button type="submit" className="gradient-primary text-primary-foreground">Enroll Patient</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* New Visit Dialog */}
      <Dialog open={showNewVisit} onOpenChange={setShowNewVisit}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-display">Record ART Clinic Visit</DialogTitle>
            <DialogDescription>Document clinical review, viral load, adherence, and drug dispensing.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleNewVisit} className="flex-1 overflow-y-auto space-y-4 pr-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>ART Number *</Label>
                <Select value={visitForm.artNumber} onValueChange={(v) => setVisitForm((f) => ({ ...f, artNumber: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select patient..." /></SelectTrigger>
                  <SelectContent>{artPatients.map((p) => <SelectItem key={p.artNumber} value={p.artNumber}>{p.artNumber} — {p.patientName}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Visit Date</Label>
                <Input type="date" value={visitForm.visitDate} onChange={(e) => setVisitForm((f) => ({ ...f, visitDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Weight (kg)</Label>
                <Input value={visitForm.weight} onChange={(e) => setVisitForm((f) => ({ ...f, weight: e.target.value }))} placeholder="65.0" />
              </div>
              <div className="space-y-1.5">
                <Label>Blood Pressure</Label>
                <Input value={visitForm.bloodPressure} onChange={(e) => setVisitForm((f) => ({ ...f, bloodPressure: e.target.value }))} placeholder="120/80" />
              </div>
              <div className="space-y-1.5">
                <Label>CD4 Count (cells/μL)</Label>
                <Input type="number" value={visitForm.cd4Count} onChange={(e) => setVisitForm((f) => ({ ...f, cd4Count: e.target.value }))} placeholder="Leave blank if not done" />
              </div>
              <div className="space-y-1.5">
                <Label>Viral Load (copies/mL)</Label>
                <Input type="number" value={visitForm.viralLoad} onChange={(e) => setVisitForm((f) => ({ ...f, viralLoad: e.target.value }))} placeholder="Leave blank if not done" />
              </div>
              <div className="space-y-1.5">
                <Label>VL Date</Label>
                <Input type="date" value={visitForm.vlDate} onChange={(e) => setVisitForm((f) => ({ ...f, vlDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Viral Load Status</Label>
                <Select value={visitForm.viralLoadStatus} onValueChange={(v) => setVisitForm((f) => ({ ...f, viralLoadStatus: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Suppressed">Suppressed (&lt;1000)</SelectItem>
                    <SelectItem value="Unsuppressed">Unsuppressed (&ge;1000)</SelectItem>
                    <SelectItem value="Not Done">Not Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Days Dispensed</Label>
                <Select value={visitForm.daysDispensed} onValueChange={(v) => setVisitForm((f) => ({ ...f, daysDispensed: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="60">60 days</SelectItem>
                    <SelectItem value="90">90 days (Stable Patient)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Pills Returned (unused)</Label>
                <Input type="number" min="0" value={visitForm.pillsReturned} onChange={(e) => setVisitForm((f) => ({ ...f, pillsReturned: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Adherence Score</Label>
                <Select value={visitForm.adherenceScore} onValueChange={(v) => setVisitForm((f) => ({ ...f, adherenceScore: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Good">&gt;95% — Good</SelectItem>
                    <SelectItem value="Fair">80–95% — Fair</SelectItem>
                    <SelectItem value="Poor">&lt;80% — Poor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>OIs Present</Label>
                <Input value={visitForm.oisPresent} onChange={(e) => setVisitForm((f) => ({ ...f, oisPresent: e.target.value }))} placeholder="None, or list current OIs" />
              </div>
              <div className="space-y-1.5">
                <Label>Side Effects</Label>
                <Input value={visitForm.sideEffects} onChange={(e) => setVisitForm((f) => ({ ...f, sideEffects: e.target.value }))} placeholder="None, or describe" />
              </div>
              <div className="space-y-1.5">
                <Label>Next Visit Date</Label>
                <Input type="date" value={visitForm.nextVisit} onChange={(e) => setVisitForm((f) => ({ ...f, nextVisit: e.target.value }))} />
              </div>
            </div>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={visitForm.cotrimoxazole} onChange={(e) => setVisitForm((f) => ({ ...f, cotrimoxazole: e.target.checked }))} />
                Cotrimoxazole Prophylaxis given
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={visitForm.inh} onChange={(e) => setVisitForm((f) => ({ ...f, inh: e.target.checked }))} />
                INH Preventive Therapy (IPT) given
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={visitForm.regimenChanged} onChange={(e) => setVisitForm((f) => ({ ...f, regimenChanged: e.target.checked }))} />
                Regimen changed this visit
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={visitForm.counselingGiven} onChange={(e) => setVisitForm((f) => ({ ...f, counselingGiven: e.target.checked }))} />
                Adherence counseling given
              </label>
            </div>
            {visitForm.regimenChanged && (
              <div className="space-y-1.5">
                <Label>Reason for Regimen Change</Label>
                <Input value={visitForm.changeReason} onChange={(e) => setVisitForm((f) => ({ ...f, changeReason: e.target.value }))} placeholder="e.g. Treatment failure, toxicity, pregnancy" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Clinical Notes</Label>
              <Textarea rows={3} value={visitForm.notes} onChange={(e) => setVisitForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Clinical observations, plan, referrals..." />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowNewVisit(false)}>Cancel</Button>
              <Button type="submit" className="gradient-primary text-primary-foreground">Record Visit</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
