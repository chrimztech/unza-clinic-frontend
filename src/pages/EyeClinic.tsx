import TopBar from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DataTable, Column } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Plus, Search, Eye, Glasses, CheckCircle2, AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Box, Paper, Typography, Grid, Chip } from "@mui/material";

interface EyeRecord {
  id: number;
  visitId: string;
  patientId: string;
  patientName: string;
  visitDate: string;
  optometristName: string;
  chiefComplaint: string;
  // Visual Acuity (unaided)
  vaRightUnaided: string;
  vaLeftUnaided: string;
  // Visual Acuity (corrected)
  vaRightCorrected: string;
  vaLeftCorrected: string;
  // Refraction
  refractionRightSph: string;
  refractionRightCyl: string;
  refractionRightAxis: string;
  refractionLeftSph: string;
  refractionLeftCyl: string;
  refractionLeftAxis: string;
  // IOP
  iopRight: string;
  iopLeft: string;
  // Colour vision
  colourVision: string;
  // Slit lamp
  slitLampFindings: string;
  fundoscopy: string;
  diagnosis: string;
  spectaclesPrescribed: boolean;
  spectaclesType?: string;
  treatment: string;
  referralNeeded: boolean;
  referralReason?: string;
  nextReview: string;
  notes: string;
  status: string;
}

const VA_OPTIONS = ["6/6", "6/9", "6/12", "6/18", "6/24", "6/36", "6/60", "CF", "HM", "PL", "NPL"];
const EYE_DIAGNOSES = [
  "Refractive Error - Myopia",
  "Refractive Error - Hyperopia",
  "Refractive Error - Astigmatism",
  "Presbyopia",
  "Conjunctivitis (Bacterial)",
  "Conjunctivitis (Viral)",
  "Allergic Conjunctivitis",
  "Cataracts",
  "Glaucoma",
  "Diabetic Retinopathy",
  "Hypertensive Retinopathy",
  "Uveitis",
  "Corneal Ulcer",
  "Pterygium",
  "Trachoma",
  "Foreign Body",
  "Dry Eye Syndrome",
  "Stye (Hordeolum)",
  "Chalazion",
];

export default function EyeClinic() {
  const { user } = useAuth();
  const [records, setRecords] = useState<EyeRecord[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    patientId: "", chiefComplaint: "", vaRightUnaided: "", vaLeftUnaided: "", vaRightCorrected: "", vaLeftCorrected: "",
    refractionRightSph: "", refractionRightCyl: "", refractionRightAxis: "", refractionLeftSph: "", refractionLeftCyl: "", refractionLeftAxis: "",
    iopRight: "", iopLeft: "", colourVision: "Normal", slitLampFindings: "", fundoscopy: "",
    diagnosis: "", spectaclesPrescribed: false, spectaclesType: "", treatment: "",
    referralNeeded: false, referralReason: "", nextReview: "", notes: "",
  });

  const mapEye = (r: any): EyeRecord => ({
    id: r.id, visitId: r.visit_id || r.visitId || "",
    patientId: r.patient_id || r.patientId || "", patientName: r.patient_name || r.patientName || "",
    visitDate: r.visit_date || r.visitDate || "", optometristName: r.optometrist_name || r.optometristName || "",
    chiefComplaint: r.chief_complaint || r.chiefComplaint || "",
    vaRightUnaided: r.va_right_unaided || r.vaRightUnaided || "",
    vaLeftUnaided: r.va_left_unaided || r.vaLeftUnaided || "",
    vaRightCorrected: r.va_right_corrected || r.vaRightCorrected || "",
    vaLeftCorrected: r.va_left_corrected || r.vaLeftCorrected || "",
    refractionRightSph: r.refraction_right_sph || r.refractionRightSph || "",
    refractionRightCyl: r.refraction_right_cyl || r.refractionRightCyl || "",
    refractionRightAxis: r.refraction_right_axis || r.refractionRightAxis || "",
    refractionLeftSph: r.refraction_left_sph || r.refractionLeftSph || "",
    refractionLeftCyl: r.refraction_left_cyl || r.refractionLeftCyl || "",
    refractionLeftAxis: r.refraction_left_axis || r.refractionLeftAxis || "",
    iopRight: r.iop_right || r.iopRight || "", iopLeft: r.iop_left || r.iopLeft || "",
    colourVision: r.colour_vision || r.colourVision || "",
    slitLampFindings: r.slit_lamp_findings || r.slitLampFindings || "",
    fundoscopy: r.fundoscopy || "", diagnosis: r.diagnosis || "",
    spectaclesPrescribed: Boolean(r.spectacles_prescribed ?? r.spectaclesPrescribed),
    spectaclesType: r.spectacles_type || r.spectaclesType || "",
    treatment: r.treatment || "", referralNeeded: Boolean(r.referral_needed ?? r.referralNeeded),
    referralReason: r.referral_reason || r.referralReason || "",
    nextReview: r.next_review || r.nextReview || "", notes: r.notes || "", status: r.status || "completed",
  });

  useEffect(() => {
    api.patients.getAll().then((d: any[]) => setPatients(d)).catch(() => {});
    api.eyeClinic.getAll().then((d: any[]) => setRecords((d || []).map(mapEye))).catch(() => {});
  }, []);

  const patientName = (id: string) => patients.find((p) => p.patient_id === id)?.name || id;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.patientId) { toast.error("Select a patient"); return; }
    const pName = patientName(form.patientId);
    const payload = {
      patient_id: form.patientId, patient_name: pName,
      visit_date: new Date().toISOString().slice(0, 10), optometrist_name: user?.name || "Optometrist",
      chief_complaint: form.chiefComplaint,
      va_right_unaided: form.vaRightUnaided, va_left_unaided: form.vaLeftUnaided,
      va_right_corrected: form.vaRightCorrected, va_left_corrected: form.vaLeftCorrected,
      refraction_right_sph: form.refractionRightSph, refraction_right_cyl: form.refractionRightCyl,
      refraction_right_axis: form.refractionRightAxis, refraction_left_sph: form.refractionLeftSph,
      refraction_left_cyl: form.refractionLeftCyl, refraction_left_axis: form.refractionLeftAxis,
      iop_right: form.iopRight, iop_left: form.iopLeft, colour_vision: form.colourVision,
      slit_lamp_findings: form.slitLampFindings, fundoscopy: form.fundoscopy, diagnosis: form.diagnosis,
      spectacles_prescribed: form.spectaclesPrescribed, spectacles_type: form.spectaclesType,
      treatment: form.treatment, referral_needed: form.referralNeeded, referral_reason: form.referralReason,
      next_review: form.nextReview, notes: form.notes,
    };
    const local: EyeRecord = { id: Date.now(), visitId: `EYE-${Date.now()}`, patientId: form.patientId,
      patientName: pName, visitDate: payload.visit_date, optometristName: payload.optometrist_name, ...form, status: "completed" };
    try {
      const saved = await api.eyeClinic.create(payload);
      setRecords((prev) => [mapEye(saved), ...prev]);
    } catch {
      setRecords((prev) => [local, ...prev]);
    }
    toast.success("Eye clinic visit recorded");
    setShowAdd(false);
  };

  const filtered = records.filter((r) => r.patientName.toLowerCase().includes(search.toLowerCase()) || r.visitId.toLowerCase().includes(search.toLowerCase()));

  const columns: Column<EyeRecord>[] = [
    { header: "Visit ID", accessor: "visitId" },
    { header: "Patient", accessor: (r) => <div><p className="font-medium">{r.patientName}</p><p className="text-xs text-muted-foreground">{r.patientId}</p></div> },
    { header: "Date", accessor: "visitDate" },
    { header: "VA Right (aided)", accessor: (r) => `${r.vaRightUnaided || "—"} / ${r.vaRightCorrected || "—"}` },
    { header: "VA Left (aided)", accessor: (r) => `${r.vaLeftUnaided || "—"} / ${r.vaLeftCorrected || "—"}` },
    { header: "Diagnosis", accessor: "diagnosis" },
    { header: "Spectacles", accessor: (r) => r.spectaclesPrescribed ? <Chip label={r.spectaclesType || "Prescribed"} size="small" color="primary" /> : "—" },
    { header: "Referral", accessor: (r) => r.referralNeeded ? <Chip label="Yes" size="small" color="warning" /> : "—" },
    { header: "Next Review", accessor: (r) => r.nextReview || "—" },
    { header: "Status", accessor: (r) => <StatusBadge status={r.status} /> },
  ];

  const stats = [
    { label: "Total Visits", value: records.length, icon: Eye, color: "#1565C0" },
    { label: "Spectacles Rx", value: records.filter((r) => r.spectaclesPrescribed).length, icon: Glasses, color: "#007A3D" },
    { label: "Referrals Made", value: records.filter((r) => r.referralNeeded).length, icon: AlertTriangle, color: "#DC2626" },
    { label: "Resolved", value: records.filter((r) => r.status === "completed").length, icon: CheckCircle2, color: "#7C3AED" },
  ];

  return (
    <div>
      <TopBar title="Eye Clinic" subtitle="Ophthalmic services — visual acuity, refraction, and eye disease management" />
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

        <Paper elevation={0} sx={{ borderRadius: "16px", border: "1px solid rgba(0,0,0,0.08)", overflow: "hidden" }}>
          <Box sx={{ p: 3, borderBottom: "1px solid rgba(0,0,0,0.08)", display: "flex", gap: 2, flexWrap: "wrap" }}>
            <Box sx={{ position: "relative", flex: 1, minWidth: 240 }}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" style={{ zIndex: 1 }} />
              <Input placeholder="Search patients..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </Box>
            <Button size="sm" className="gradient-primary text-primary-foreground" onClick={() => setShowAdd(true)}>
              <Plus className="h-4 w-4 mr-1" /> New Eye Visit
            </Button>
          </Box>
          <Box sx={{ p: 2 }}><DataTable columns={columns} data={filtered} /></Box>
        </Paper>
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-display">New Eye Clinic Visit</DialogTitle>
            <DialogDescription>Record visual acuity, refraction, diagnosis, and treatment.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-2">
            <div className="space-y-1.5">
              <Label>Patient *</Label>
              <Select value={form.patientId} onValueChange={(v) => setForm((f) => ({ ...f, patientId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select patient..." /></SelectTrigger>
                <SelectContent>{patients.map((p) => <SelectItem key={p.patient_id} value={p.patient_id}>{p.name} ({p.patient_id})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Chief Complaint</Label>
              <Input value={form.chiefComplaint} onChange={(e) => setForm((f) => ({ ...f, chiefComplaint: e.target.value }))} placeholder="e.g. Blurred vision, red eye, foreign body, headaches..." />
            </div>

            {/* Visual Acuity */}
            <div className="rounded-xl border p-4 space-y-3">
              <p className="text-sm font-semibold">Visual Acuity</p>
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
                {[
                  { key: "vaRightUnaided", label: "RE Unaided" },
                  { key: "vaLeftUnaided", label: "LE Unaided" },
                  { key: "vaRightCorrected", label: "RE Corrected" },
                  { key: "vaLeftCorrected", label: "LE Corrected" },
                ].map((field) => (
                  <div key={field.key} className="space-y-1">
                    <Label className="text-xs">{field.label}</Label>
                    <Select value={(form as any)[field.key]} onValueChange={(v) => setForm((f) => ({ ...f, [field.key]: v }))}>
                      <SelectTrigger className="text-xs"><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>{VA_OPTIONS.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>

            {/* Refraction */}
            <div className="rounded-xl border p-4 space-y-3">
              <p className="text-sm font-semibold">Refraction</p>
              <div className="grid gap-3 grid-cols-3">
                <Label className="text-xs col-span-3 grid grid-cols-3 text-center gap-3 text-muted-foreground">
                  <span>Sphere (DS)</span><span>Cylinder (DC)</span><span>Axis (°)</span>
                </Label>
                <div className="col-span-3">
                  <p className="text-xs text-muted-foreground mb-1">Right Eye (OD)</p>
                  <div className="grid grid-cols-3 gap-2">
                    <Input placeholder="+/- 0.00" value={form.refractionRightSph} onChange={(e) => setForm((f) => ({ ...f, refractionRightSph: e.target.value }))} />
                    <Input placeholder="+/- 0.00" value={form.refractionRightCyl} onChange={(e) => setForm((f) => ({ ...f, refractionRightCyl: e.target.value }))} />
                    <Input placeholder="0–180" value={form.refractionRightAxis} onChange={(e) => setForm((f) => ({ ...f, refractionRightAxis: e.target.value }))} />
                  </div>
                </div>
                <div className="col-span-3">
                  <p className="text-xs text-muted-foreground mb-1">Left Eye (OS)</p>
                  <div className="grid grid-cols-3 gap-2">
                    <Input placeholder="+/- 0.00" value={form.refractionLeftSph} onChange={(e) => setForm((f) => ({ ...f, refractionLeftSph: e.target.value }))} />
                    <Input placeholder="+/- 0.00" value={form.refractionLeftCyl} onChange={(e) => setForm((f) => ({ ...f, refractionLeftCyl: e.target.value }))} />
                    <Input placeholder="0–180" value={form.refractionLeftAxis} onChange={(e) => setForm((f) => ({ ...f, refractionLeftAxis: e.target.value }))} />
                  </div>
                </div>
              </div>
            </div>

            {/* IOP & Colour Vision */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>IOP Right (mmHg)</Label>
                <Input value={form.iopRight} onChange={(e) => setForm((f) => ({ ...f, iopRight: e.target.value }))} placeholder="e.g. 16" />
              </div>
              <div className="space-y-1.5">
                <Label>IOP Left (mmHg)</Label>
                <Input value={form.iopLeft} onChange={(e) => setForm((f) => ({ ...f, iopLeft: e.target.value }))} placeholder="e.g. 16" />
              </div>
              <div className="space-y-1.5">
                <Label>Colour Vision</Label>
                <Select value={form.colourVision} onValueChange={(v) => setForm((f) => ({ ...f, colourVision: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Normal">Normal</SelectItem>
                    <SelectItem value="Red-Green Deficiency">Red-Green Deficiency</SelectItem>
                    <SelectItem value="Blue-Yellow Deficiency">Blue-Yellow Deficiency</SelectItem>
                    <SelectItem value="Total Colour Blindness">Total Colour Blindness</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Slit Lamp Findings</Label>
              <Input value={form.slitLampFindings} onChange={(e) => setForm((f) => ({ ...f, slitLampFindings: e.target.value }))} placeholder="Cornea, AC, iris, lens findings..." />
            </div>
            <div className="space-y-1.5">
              <Label>Fundoscopy Findings</Label>
              <Input value={form.fundoscopy} onChange={(e) => setForm((f) => ({ ...f, fundoscopy: e.target.value }))} placeholder="Disc, macula, vessels, periphery..." />
            </div>
            <div className="space-y-1.5">
              <Label>Diagnosis</Label>
              <Select value={form.diagnosis} onValueChange={(v) => setForm((f) => ({ ...f, diagnosis: v }))}>
                <SelectTrigger><SelectValue placeholder="Select diagnosis..." /></SelectTrigger>
                <SelectContent>{EYE_DIAGNOSES.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.spectaclesPrescribed} onChange={(e) => setForm((f) => ({ ...f, spectaclesPrescribed: e.target.checked }))} />
                Spectacles Prescribed
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.referralNeeded} onChange={(e) => setForm((f) => ({ ...f, referralNeeded: e.target.checked }))} />
                Referral Needed
              </label>
            </div>
            {form.spectaclesPrescribed && (
              <div className="space-y-1.5">
                <Label>Spectacles Type</Label>
                <Select value={form.spectaclesType} onValueChange={(v) => setForm((f) => ({ ...f, spectaclesType: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Single Vision Distance">Single Vision — Distance</SelectItem>
                    <SelectItem value="Single Vision Near">Single Vision — Near</SelectItem>
                    <SelectItem value="Bifocal">Bifocal</SelectItem>
                    <SelectItem value="Progressive">Progressive (Varifocal)</SelectItem>
                    <SelectItem value="Sunglasses">Sunglasses (Tinted)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {form.referralNeeded && (
              <div className="space-y-1.5">
                <Label>Referral Reason</Label>
                <Input value={form.referralReason} onChange={(e) => setForm((f) => ({ ...f, referralReason: e.target.value }))} placeholder="e.g. Cataract surgery, glaucoma specialist" />
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Treatment Prescribed</Label>
                <Input value={form.treatment} onChange={(e) => setForm((f) => ({ ...f, treatment: e.target.value }))} placeholder="e.g. Chloramphenicol eye drops, artificial tears" />
              </div>
              <div className="space-y-1.5">
                <Label>Next Review Date</Label>
                <Input type="date" value={form.nextReview} onChange={(e) => setForm((f) => ({ ...f, nextReview: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Optometrist Notes</Label>
              <Textarea rows={3} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Additional findings, patient education given, referral details..." />
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
