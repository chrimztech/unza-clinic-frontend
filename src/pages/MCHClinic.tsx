import TopBar from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/ui/status-badge";
import { DataTable, Column } from "@/components/ui/data-table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Baby, Heart, Plus, Search, Calendar, Syringe, Users, AlertTriangle, Star
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import {
  Box, Paper, Typography, Grid, Chip, Tabs, Tab
} from "@mui/material";

type MCHTab = "antenatal" | "postnatal" | "immunization" | "family-planning";

interface AntenatalEntry {
  id: number;
  visitId: string;
  patientId: string;
  patientName: string;
  gestationalAge: string;
  gravida: number;
  para: number;
  lmp: string;
  edd: string;
  bloodPressure: string;
  weight: string;
  fetalHeartRate: string;
  presentation: string;
  urinalysis: string;
  hivStatus: string;
  syphilisStatus: string;
  ferrous: boolean;
  folicAcid: boolean;
  itn: boolean;
  tetanusVaccine: string;
  nextVisit: string;
  nurseNotes: string;
  riskFactors: string;
  status: string;
  visitDate: string;
}

interface ImmunizationEntry {
  id: number;
  childId: string;
  childName: string;
  motherName: string;
  dob: string;
  vaccines: string;
  visitDate: string;
  nextDue: string;
  weight: string;
  height: string;
  muac: string;
  nutritionStatus: string;
  nurseNotes: string;
}

interface FamilyPlanningEntry {
  id: number;
  visitId: string;
  patientId: string;
  patientName: string;
  method: string;
  startDate: string;
  nextVisit: string;
  sideEffects: string;
  counselingGiven: boolean;
  notes: string;
  status: string;
}

const VACCINES_BY_AGE = [
  { age: "Birth", vaccines: ["BCG", "OPV-0 (Birth Dose)"] },
  { age: "6 weeks", vaccines: ["OPV-1", "Penta-1", "PCV-1", "Rota-1"] },
  { age: "10 weeks", vaccines: ["OPV-2", "Penta-2", "PCV-2", "Rota-2"] },
  { age: "14 weeks", vaccines: ["OPV-3", "Penta-3", "PCV-3", "IPV"] },
  { age: "9 months", vaccines: ["Measles-1", "Yellow Fever", "Vitamin A"] },
  { age: "18 months", vaccines: ["Measles-2 (Booster)"] },
];

const FP_METHODS = [
  "Combined Oral Contraceptive Pill (COCP)",
  "Progestogen-Only Pill (POP/Mini-pill)",
  "Injectable (Depo-Provera)",
  "Implant (Jadelle/Implanon)",
  "Intrauterine Device (IUD/Copper-T)",
  "Intrauterine System (IUS/Mirena)",
  "Male Condom",
  "Female Condom",
  "Emergency Contraception",
  "Natural Family Planning",
  "Bilateral Tubal Ligation",
  "Vasectomy",
];

export default function MCHClinic() {
  const { user } = useAuth();
  const [tab, setTab] = useState<MCHTab>("antenatal");
  const [search, setSearch] = useState("");
  const [patients, setPatients] = useState<any[]>([]);

  // Antenatal
  const [antenatalList, setAntenatalList] = useState<AntenatalEntry[]>([]);
  const [showAntenatal, setShowAntenatal] = useState(false);
  const [antenatalForm, setAntenatalForm] = useState({
    patientId: "", gestationalAge: "", gravida: "", para: "", lmp: "", edd: "", bloodPressure: "", weight: "",
    fetalHeartRate: "", presentation: "Cephalic", urinalysis: "", hivStatus: "", syphilisStatus: "",
    ferrous: false, folicAcid: false, itn: false, tetanusVaccine: "", nextVisit: "", nurseNotes: "", riskFactors: "",
  });

  // Immunization
  const [immunizationList, setImmunizationList] = useState<ImmunizationEntry[]>([]);
  const [showImmunization, setShowImmunization] = useState(false);
  const [immunizationForm, setImmunizationForm] = useState({
    childId: "", childName: "", motherName: "", dob: "", vaccines: [] as string[], weight: "", height: "", muac: "", nutritionStatus: "Normal", nurseNotes: "", nextDue: "",
  });

  // Family Planning
  const [fpList, setFpList] = useState<FamilyPlanningEntry[]>([]);
  const [showFP, setShowFP] = useState(false);
  const [fpForm, setFpForm] = useState({
    patientId: "", method: "", startDate: "", nextVisit: "", sideEffects: "", counselingGiven: true, notes: "",
  });

  const mapAntenatal = (r: any): AntenatalEntry => ({
    id: r.id, visitId: r.visit_id || r.visitId || "", patientId: r.patient_id || r.patientId || "",
    patientName: r.patient_name || r.patientName || "", gestationalAge: r.gestational_age || r.gestationalAge || "",
    gravida: r.gravida || 0, para: r.para || 0, lmp: r.lmp || "", edd: r.edd || "",
    bloodPressure: r.blood_pressure || r.bloodPressure || "", weight: r.weight || "",
    fetalHeartRate: r.fetal_heart_rate || r.fetalHeartRate || "", presentation: r.presentation || "",
    urinalysis: r.urinalysis || "", hivStatus: r.hiv_status || r.hivStatus || "",
    syphilisStatus: r.syphilis_status || r.syphilisStatus || "",
    ferrous: Boolean(r.ferrous), folicAcid: Boolean(r.folic_acid ?? r.folicAcid),
    itn: Boolean(r.itn), tetanusVaccine: r.tetanus_vaccine || r.tetanusVaccine || "",
    nextVisit: r.next_visit || r.nextVisit || "", nurseNotes: r.nurse_notes || r.nurseNotes || "",
    riskFactors: r.risk_factors || r.riskFactors || "", status: r.status || "active",
    visitDate: r.visit_date || r.visitDate || "",
  });

  const mapImmunization = (r: any): ImmunizationEntry => ({
    id: r.id, childId: r.child_id || r.childId || "", childName: r.child_name || r.childName || "",
    motherName: r.mother_name || r.motherName || "", dob: r.dob || "",
    vaccines: r.vaccines_given || r.vaccines || "", visitDate: r.visit_date || r.visitDate || "",
    nextDue: r.next_due || r.nextDue || "", weight: r.weight || "", height: r.height || "",
    muac: r.muac || "", nutritionStatus: r.nutrition_status || r.nutritionStatus || "Normal",
    nurseNotes: r.nurse_notes || r.nurseNotes || "",
  });

  const mapFP = (r: any): FamilyPlanningEntry => ({
    id: r.id, visitId: r.visit_id || r.visitId || "", patientId: r.patient_id || r.patientId || "",
    patientName: r.patient_name || r.patientName || "", method: r.method || "",
    startDate: r.start_date || r.startDate || "", nextVisit: r.next_visit || r.nextVisit || "",
    sideEffects: r.side_effects || r.sideEffects || "",
    counselingGiven: Boolean(r.counseling_given ?? r.counselingGiven ?? true),
    notes: r.notes || "", status: r.status || "active",
  });

  useEffect(() => {
    api.patients.getAll().then((data: any[]) => setPatients(data)).catch(() => {});
    loadMCHData();
  }, []);

  const loadMCHData = async () => {
    try {
      const data = await api.mch.getAll();
      setAntenatalList((data.antenatal || []).map(mapAntenatal));
      setImmunizationList((data.immunizations || []).map(mapImmunization));
      setFpList((data.familyPlanning || []).map(mapFP));
    } catch {
      // Start empty if no backend yet
    }
  };

  const patientName = (id: string) => patients.find((p) => p.patient_id === id)?.name || id;

  const handleAntenatal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!antenatalForm.patientId) { toast.error("Select a patient"); return; }
    const pName = patientName(antenatalForm.patientId);
    const payload = {
      patient_id: antenatalForm.patientId, patient_name: pName,
      visit_date: new Date().toISOString().slice(0, 10),
      gestational_age: antenatalForm.gestationalAge, gravida: Number(antenatalForm.gravida),
      para: Number(antenatalForm.para), lmp: antenatalForm.lmp, edd: antenatalForm.edd,
      blood_pressure: antenatalForm.bloodPressure, weight: antenatalForm.weight,
      fetal_heart_rate: antenatalForm.fetalHeartRate, presentation: antenatalForm.presentation,
      urinalysis: antenatalForm.urinalysis, hiv_status: antenatalForm.hivStatus,
      syphilis_status: antenatalForm.syphilisStatus, ferrous: antenatalForm.ferrous,
      folic_acid: antenatalForm.folicAcid, itn: antenatalForm.itn,
      tetanus_vaccine: antenatalForm.tetanusVaccine, next_visit: antenatalForm.nextVisit,
      nurse_notes: antenatalForm.nurseNotes, risk_factors: antenatalForm.riskFactors, nurse_name: user?.name || "Nurse",
    };
    const local: AntenatalEntry = { id: Date.now(), visitId: `ANC-${Date.now()}`, patientId: antenatalForm.patientId,
      patientName: pName, gestationalAge: antenatalForm.gestationalAge, gravida: Number(antenatalForm.gravida),
      para: Number(antenatalForm.para), lmp: antenatalForm.lmp, edd: antenatalForm.edd,
      bloodPressure: antenatalForm.bloodPressure, weight: antenatalForm.weight, fetalHeartRate: antenatalForm.fetalHeartRate,
      presentation: antenatalForm.presentation, urinalysis: antenatalForm.urinalysis, hivStatus: antenatalForm.hivStatus,
      syphilisStatus: antenatalForm.syphilisStatus, ferrous: antenatalForm.ferrous, folicAcid: antenatalForm.folicAcid,
      itn: antenatalForm.itn, tetanusVaccine: antenatalForm.tetanusVaccine, nextVisit: antenatalForm.nextVisit,
      nurseNotes: antenatalForm.nurseNotes, riskFactors: antenatalForm.riskFactors, status: "active", visitDate: payload.visit_date };
    try {
      const saved = await api.mch.createAntenatal(payload);
      setAntenatalList((prev) => [mapAntenatal(saved), ...prev]);
    } catch {
      setAntenatalList((prev) => [local, ...prev]);
    }
    toast.success("Antenatal visit recorded");
    setShowAntenatal(false);
  };

  const handleImmunization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!immunizationForm.childName.trim()) { toast.error("Enter child name"); return; }
    const vDate = new Date().toISOString().slice(0, 10);
    const payload = {
      child_name: immunizationForm.childName, mother_name: immunizationForm.motherName,
      dob: immunizationForm.dob, vaccines_given: immunizationForm.vaccines.join(", "),
      visit_date: vDate, next_due: immunizationForm.nextDue, weight: immunizationForm.weight,
      height: immunizationForm.height, muac: immunizationForm.muac,
      nutrition_status: immunizationForm.nutritionStatus, nurse_notes: immunizationForm.nurseNotes,
      nurse_name: user?.name || "Nurse",
    };
    const local: ImmunizationEntry = { id: Date.now(), childId: immunizationForm.childId || `CH-${Date.now()}`,
      childName: immunizationForm.childName, motherName: immunizationForm.motherName, dob: immunizationForm.dob,
      vaccines: immunizationForm.vaccines.join(", "), visitDate: vDate, nextDue: immunizationForm.nextDue,
      weight: immunizationForm.weight, height: immunizationForm.height, muac: immunizationForm.muac,
      nutritionStatus: immunizationForm.nutritionStatus, nurseNotes: immunizationForm.nurseNotes };
    try {
      const saved = await api.mch.createImmunization(payload);
      setImmunizationList((prev) => [mapImmunization(saved), ...prev]);
    } catch {
      setImmunizationList((prev) => [local, ...prev]);
    }
    toast.success("Immunization visit recorded");
    setShowImmunization(false);
    setImmunizationForm({ childId: "", childName: "", motherName: "", dob: "", vaccines: [], weight: "", height: "", muac: "", nutritionStatus: "Normal", nurseNotes: "", nextDue: "" });
  };

  const handleFP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fpForm.patientId || !fpForm.method) { toast.error("Select patient and method"); return; }
    const pName = patientName(fpForm.patientId);
    const startDate = fpForm.startDate || new Date().toISOString().slice(0, 10);
    const payload = {
      patient_id: fpForm.patientId, patient_name: pName, method: fpForm.method, start_date: startDate,
      next_visit: fpForm.nextVisit, side_effects: fpForm.sideEffects, counseling_given: fpForm.counselingGiven,
      notes: fpForm.notes, nurse_name: user?.name || "Nurse",
    };
    const local: FamilyPlanningEntry = { id: Date.now(), visitId: `FP-${Date.now()}`, patientId: fpForm.patientId,
      patientName: pName, method: fpForm.method, startDate, nextVisit: fpForm.nextVisit,
      sideEffects: fpForm.sideEffects, counselingGiven: fpForm.counselingGiven, notes: fpForm.notes, status: "active" };
    try {
      const saved = await api.mch.createFamilyPlanning(payload);
      setFpList((prev) => [mapFP(saved), ...prev]);
    } catch {
      setFpList((prev) => [local, ...prev]);
    }
    toast.success("Family planning visit recorded");
    setShowFP(false);
    setFpForm({ patientId: "", method: "", startDate: "", nextVisit: "", sideEffects: "", counselingGiven: true, notes: "" });
  };

  const ancColumns: Column<AntenatalEntry>[] = [
    { header: "Visit ID", accessor: "visitId" },
    { header: "Patient", accessor: (r) => <div><p className="font-medium">{r.patientName}</p><p className="text-xs text-muted-foreground">{r.patientId}</p></div> },
    { header: "GA (weeks)", accessor: "gestationalAge" },
    { header: "G/P", accessor: (r) => `G${r.gravida}P${r.para}` },
    { header: "EDD", accessor: "edd" },
    { header: "BP", accessor: "bloodPressure" },
    { header: "FHR", accessor: (r) => r.fetalHeartRate ? `${r.fetalHeartRate} bpm` : "-" },
    { header: "HIV", accessor: (r) => r.hivStatus ? <Chip label={r.hivStatus} size="small" color={r.hivStatus === "Reactive" ? "error" : "success"} /> : "-" },
    { header: "Next Visit", accessor: "nextVisit" },
    { header: "Status", accessor: (r) => <StatusBadge status={r.status} /> },
  ];

  const immuColumns: Column<ImmunizationEntry>[] = [
    { header: "Child", accessor: (r) => <div><p className="font-medium">{r.childName}</p><p className="text-xs text-muted-foreground">Mother: {r.motherName}</p></div> },
    { header: "DOB", accessor: "dob" },
    { header: "Vaccines Given", accessor: (r) => <div className="flex flex-wrap gap-1">{(r.vaccines || "").split(",").map((v, i) => <Chip key={i} label={v.trim()} size="small" color="primary" />)}</div> },
    { header: "Weight", accessor: (r) => r.weight ? `${r.weight} kg` : "-" },
    { header: "MUAC", accessor: (r) => r.muac ? `${r.muac} cm` : "-" },
    { header: "Nutrition", accessor: (r) => <Chip label={r.nutritionStatus} size="small" color={r.nutritionStatus === "SAM" ? "error" : r.nutritionStatus === "MAM" ? "warning" : "success"} /> },
    { header: "Next Due", accessor: "nextDue" },
    { header: "Visit Date", accessor: "visitDate" },
  ];

  const fpColumns: Column<FamilyPlanningEntry>[] = [
    { header: "Visit ID", accessor: "visitId" },
    { header: "Patient", accessor: (r) => <div><p className="font-medium">{r.patientName}</p><p className="text-xs text-muted-foreground">{r.patientId}</p></div> },
    { header: "Method", accessor: "method" },
    { header: "Start Date", accessor: "startDate" },
    { header: "Next Visit", accessor: "nextVisit" },
    { header: "Counseling", accessor: (r) => r.counselingGiven ? <Chip label="Given" color="success" size="small" /> : <Chip label="Pending" color="warning" size="small" /> },
    { header: "Status", accessor: (r) => <StatusBadge status={r.status} /> },
  ];

  const stats = [
    { label: "Antenatal Visits", value: antenatalList.length, icon: Baby, color: "#E91E63" },
    { label: "Immunizations", value: immunizationList.length, icon: Syringe, color: "#007A3D" },
    { label: "Family Planning", value: fpList.length, icon: Heart, color: "#7C3AED" },
    { label: "High Risk", value: antenatalList.filter((a) => a.riskFactors).length, icon: AlertTriangle, color: "#DC2626" },
  ];

  return (
    <div>
      <TopBar title="MCH Clinic" subtitle="Mother & Child Health — Antenatal Care, Immunization, Postnatal & Family Planning" />
      <div className="p-6 space-y-6">

        {/* Summary */}
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

        {/* EPI Schedule Reference */}
        <Paper elevation={0} sx={{ p: 3, borderRadius: "16px", border: "1px solid rgba(0, 122, 61,0.2)", bgcolor: "rgba(0, 122, 61,0.02)" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
            <Syringe className="h-5 w-5 text-primary" />
            <Typography variant="h6" fontWeight={700}>EPI Schedule (Zambia)</Typography>
          </Box>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
            {VACCINES_BY_AGE.map((schedule) => (
              <Box key={schedule.age} sx={{ flex: "1 1 140px", p: 2, borderRadius: "10px", border: "1px solid rgba(0,0,0,0.08)", bgcolor: "white" }}>
                <Typography variant="caption" fontWeight={700} color="primary.main">{schedule.age}</Typography>
                {schedule.vaccines.map((v) => (
                  <Typography key={v} variant="caption" display="block" color="text.secondary" sx={{ mt: 0.25 }}>• {v}</Typography>
                ))}
              </Box>
            ))}
          </Box>
        </Paper>

        {/* Tabs */}
        <Paper elevation={0} sx={{ borderRadius: "16px", border: "1px solid rgba(0,0,0,0.08)", overflow: "hidden" }}>
          <Box sx={{ borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2 }}>
              <Tab value="antenatal" label="Antenatal Care" icon={<Baby className="h-4 w-4" />} iconPosition="start" />
              <Tab value="immunization" label="Immunization" icon={<Syringe className="h-4 w-4" />} iconPosition="start" />
              <Tab value="family-planning" label="Family Planning" icon={<Heart className="h-4 w-4" />} iconPosition="start" />
            </Tabs>
          </Box>

          <Box sx={{ p: 3 }}>
            {/* Search + Add */}
            <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
              <Box sx={{ position: "relative", flex: 1, minWidth: 240 }}>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" style={{ zIndex: 1 }} />
                <Input placeholder="Search patients..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
              </Box>
              {tab === "antenatal" && (
                <Button size="sm" className="gradient-primary text-primary-foreground" onClick={() => setShowAntenatal(true)}>
                  <Plus className="h-4 w-4 mr-1" /> New ANC Visit
                </Button>
              )}
              {tab === "immunization" && (
                <Button size="sm" className="gradient-primary text-primary-foreground" onClick={() => setShowImmunization(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Record Immunization
                </Button>
              )}
              {tab === "family-planning" && (
                <Button size="sm" className="gradient-primary text-primary-foreground" onClick={() => setShowFP(true)}>
                  <Plus className="h-4 w-4 mr-1" /> New FP Visit
                </Button>
              )}
            </Box>

            {tab === "antenatal" && (
              <DataTable
                columns={ancColumns}
                data={antenatalList.filter((a) => a.patientName.toLowerCase().includes(search.toLowerCase()))}
              />
            )}
            {tab === "immunization" && (
              <DataTable
                columns={immuColumns}
                data={immunizationList.filter((i) => i.childName.toLowerCase().includes(search.toLowerCase()))}
              />
            )}
            {tab === "family-planning" && (
              <DataTable
                columns={fpColumns}
                data={fpList.filter((f) => f.patientName.toLowerCase().includes(search.toLowerCase()))}
              />
            )}
          </Box>
        </Paper>
      </div>

      {/* Antenatal Dialog */}
      <Dialog open={showAntenatal} onOpenChange={setShowAntenatal}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-display">New Antenatal Visit</DialogTitle>
            <DialogDescription>Record antenatal care assessment including vitals, lab results, and supplementation.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAntenatal} className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Patient *</Label>
                <Select value={antenatalForm.patientId} onValueChange={(v) => setAntenatalForm((f) => ({ ...f, patientId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select patient..." /></SelectTrigger>
                  <SelectContent>{patients.map((p) => <SelectItem key={p.patient_id} value={p.patient_id}>{p.name} ({p.patient_id})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Gestational Age (weeks)</Label>
                <Input value={antenatalForm.gestationalAge} onChange={(e) => setAntenatalForm((f) => ({ ...f, gestationalAge: e.target.value }))} placeholder="e.g. 24" />
              </div>
              <div className="space-y-1.5">
                <Label>LMP</Label>
                <Input type="date" value={antenatalForm.lmp} onChange={(e) => setAntenatalForm((f) => ({ ...f, lmp: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>EDD</Label>
                <Input type="date" value={antenatalForm.edd} onChange={(e) => setAntenatalForm((f) => ({ ...f, edd: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Gravida</Label>
                <Input type="number" min="1" value={antenatalForm.gravida} onChange={(e) => setAntenatalForm((f) => ({ ...f, gravida: e.target.value }))} placeholder="1" />
              </div>
              <div className="space-y-1.5">
                <Label>Para</Label>
                <Input type="number" min="0" value={antenatalForm.para} onChange={(e) => setAntenatalForm((f) => ({ ...f, para: e.target.value }))} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label>Blood Pressure</Label>
                <Input value={antenatalForm.bloodPressure} onChange={(e) => setAntenatalForm((f) => ({ ...f, bloodPressure: e.target.value }))} placeholder="120/80" />
              </div>
              <div className="space-y-1.5">
                <Label>Weight (kg)</Label>
                <Input value={antenatalForm.weight} onChange={(e) => setAntenatalForm((f) => ({ ...f, weight: e.target.value }))} placeholder="65.0" />
              </div>
              <div className="space-y-1.5">
                <Label>Fetal Heart Rate (bpm)</Label>
                <Input value={antenatalForm.fetalHeartRate} onChange={(e) => setAntenatalForm((f) => ({ ...f, fetalHeartRate: e.target.value }))} placeholder="140" />
              </div>
              <div className="space-y-1.5">
                <Label>Presentation</Label>
                <Select value={antenatalForm.presentation} onValueChange={(v) => setAntenatalForm((f) => ({ ...f, presentation: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cephalic">Cephalic</SelectItem>
                    <SelectItem value="Breech">Breech</SelectItem>
                    <SelectItem value="Transverse">Transverse</SelectItem>
                    <SelectItem value="Oblique">Oblique</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>HIV Status</Label>
                <Select value={antenatalForm.hivStatus} onValueChange={(v) => setAntenatalForm((f) => ({ ...f, hivStatus: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Non-Reactive">Non-Reactive</SelectItem>
                    <SelectItem value="Reactive">Reactive</SelectItem>
                    <SelectItem value="Not Tested">Not Tested</SelectItem>
                    <SelectItem value="Known Positive">Known Positive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Syphilis Status</Label>
                <Select value={antenatalForm.syphilisStatus} onValueChange={(v) => setAntenatalForm((f) => ({ ...f, syphilisStatus: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Non-Reactive">Non-Reactive</SelectItem>
                    <SelectItem value="Reactive">Reactive</SelectItem>
                    <SelectItem value="Not Tested">Not Tested</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Tetanus Vaccine</Label>
                <Select value={antenatalForm.tetanusVaccine} onValueChange={(v) => setAntenatalForm((f) => ({ ...f, tetanusVaccine: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select dose..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TT1">TT1</SelectItem>
                    <SelectItem value="TT2">TT2</SelectItem>
                    <SelectItem value="TT3">TT3</SelectItem>
                    <SelectItem value="Booster">Booster</SelectItem>
                    <SelectItem value="Not Due">Not Due</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Next Visit Date</Label>
                <Input type="date" value={antenatalForm.nextVisit} onChange={(e) => setAntenatalForm((f) => ({ ...f, nextVisit: e.target.value }))} />
              </div>
            </div>
            {/* Supplementation Checkboxes */}
            <div className="rounded-xl border p-3 space-y-2">
              <p className="text-sm font-semibold">Supplementation Given</p>
              <div className="flex flex-wrap gap-4">
                {[
                  { key: "ferrous", label: "Ferrous Sulphate" },
                  { key: "folicAcid", label: "Folic Acid" },
                  { key: "itn", label: "ITN (Mosquito Net)" },
                ].map((item) => (
                  <label key={item.key} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(antenatalForm as any)[item.key]}
                      onChange={(e) => setAntenatalForm((f) => ({ ...f, [item.key]: e.target.checked }))}
                    />
                    {item.label}
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Risk Factors</Label>
              <Input value={antenatalForm.riskFactors} onChange={(e) => setAntenatalForm((f) => ({ ...f, riskFactors: e.target.value }))} placeholder="e.g. Hypertension, diabetes, multiple gestation, previous CS..." />
            </div>
            <div className="space-y-1.5">
              <Label>Nurse Notes</Label>
              <Textarea rows={3} value={antenatalForm.nurseNotes} onChange={(e) => setAntenatalForm((f) => ({ ...f, nurseNotes: e.target.value }))} placeholder="Clinical observations, referral indications, patient education given..." />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAntenatal(false)}>Cancel</Button>
              <Button type="submit" className="gradient-primary text-primary-foreground">Record ANC Visit</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Immunization Dialog */}
      <Dialog open={showImmunization} onOpenChange={setShowImmunization}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-display">Record Immunization Visit</DialogTitle>
            <DialogDescription>Enter child details, vaccines administered, and growth measurements.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleImmunization} className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Child Name *</Label>
                <Input value={immunizationForm.childName} onChange={(e) => setImmunizationForm((f) => ({ ...f, childName: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label>Mother's Name</Label>
                <Input value={immunizationForm.motherName} onChange={(e) => setImmunizationForm((f) => ({ ...f, motherName: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Date of Birth</Label>
                <Input type="date" value={immunizationForm.dob} onChange={(e) => setImmunizationForm((f) => ({ ...f, dob: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Weight (kg)</Label>
                <Input value={immunizationForm.weight} onChange={(e) => setImmunizationForm((f) => ({ ...f, weight: e.target.value }))} placeholder="5.2" />
              </div>
              <div className="space-y-1.5">
                <Label>Height (cm)</Label>
                <Input value={immunizationForm.height} onChange={(e) => setImmunizationForm((f) => ({ ...f, height: e.target.value }))} placeholder="60" />
              </div>
              <div className="space-y-1.5">
                <Label>MUAC (cm)</Label>
                <Input value={immunizationForm.muac} onChange={(e) => setImmunizationForm((f) => ({ ...f, muac: e.target.value }))} placeholder="12.5" />
              </div>
              <div className="space-y-1.5">
                <Label>Nutrition Status</Label>
                <Select value={immunizationForm.nutritionStatus} onValueChange={(v) => setImmunizationForm((f) => ({ ...f, nutritionStatus: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Normal">Normal</SelectItem>
                    <SelectItem value="MAM">MAM (Moderate Acute Malnutrition)</SelectItem>
                    <SelectItem value="SAM">SAM (Severe Acute Malnutrition)</SelectItem>
                    <SelectItem value="Overweight">Overweight</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Next Due Date</Label>
                <Input type="date" value={immunizationForm.nextDue} onChange={(e) => setImmunizationForm((f) => ({ ...f, nextDue: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Vaccines Administered *</Label>
              <div className="rounded-xl border p-3 space-y-3">
                {VACCINES_BY_AGE.map((schedule) => (
                  <div key={schedule.age}>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">{schedule.age}</p>
                    <div className="flex flex-wrap gap-2">
                      {schedule.vaccines.map((v) => (
                        <label key={v} className="flex items-center gap-1.5 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            checked={immunizationForm.vaccines.includes(v)}
                            onChange={(e) => {
                              setImmunizationForm((f) => ({
                                ...f,
                                vaccines: e.target.checked ? [...f.vaccines, v] : f.vaccines.filter((vac) => vac !== v),
                              }));
                            }}
                          />
                          {v}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Nurse Notes</Label>
              <Textarea rows={2} value={immunizationForm.nurseNotes} onChange={(e) => setImmunizationForm((f) => ({ ...f, nurseNotes: e.target.value }))} placeholder="Adverse reactions, contraindications, referrals..." />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowImmunization(false)}>Cancel</Button>
              <Button type="submit" className="gradient-primary text-primary-foreground">Record Immunization</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Family Planning Dialog */}
      <Dialog open={showFP} onOpenChange={setShowFP}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-display">Family Planning Visit</DialogTitle>
            <DialogDescription>Record contraceptive method counseling and initiation.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleFP} className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-2">
            <div className="space-y-1.5">
              <Label>Patient *</Label>
              <Select value={fpForm.patientId} onValueChange={(v) => setFpForm((f) => ({ ...f, patientId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select patient..." /></SelectTrigger>
                <SelectContent>{patients.map((p) => <SelectItem key={p.patient_id} value={p.patient_id}>{p.name} ({p.patient_id})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Contraceptive Method *</Label>
              <Select value={fpForm.method} onValueChange={(v) => setFpForm((f) => ({ ...f, method: v }))}>
                <SelectTrigger><SelectValue placeholder="Select method..." /></SelectTrigger>
                <SelectContent>{FP_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Start Date</Label>
                <Input type="date" value={fpForm.startDate} onChange={(e) => setFpForm((f) => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Next Visit</Label>
                <Input type="date" value={fpForm.nextVisit} onChange={(e) => setFpForm((f) => ({ ...f, nextVisit: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Side Effects / Concerns</Label>
              <Input value={fpForm.sideEffects} onChange={(e) => setFpForm((f) => ({ ...f, sideEffects: e.target.value }))} placeholder="e.g. Irregular bleeding, headaches, none" />
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={fpForm.counselingGiven} onChange={(e) => setFpForm((f) => ({ ...f, counselingGiven: e.target.checked }))} />
              Counseling given (method use, side effects, when to return)
            </label>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea rows={2} value={fpForm.notes} onChange={(e) => setFpForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Additional clinical notes..." />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowFP(false)}>Cancel</Button>
              <Button type="submit" className="gradient-primary text-primary-foreground">Record FP Visit</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
