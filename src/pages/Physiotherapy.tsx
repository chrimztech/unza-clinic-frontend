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
  Plus, Search, Activity, Calendar, CheckCircle2, Clock, Users, TrendingUp
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Box, Paper, Typography, Grid, Chip, Tabs, Tab } from "@mui/material";

type PTTab = "referrals" | "sessions" | "treatment-plans";

interface PTReferral {
  id: number;
  referralId: string;
  patientId: string;
  patientName: string;
  referredBy: string;
  referralDate: string;
  diagnosis: string;
  referralReason: string;
  urgency: string;
  status: string;
  assignedTherapist: string;
  firstAppointment: string;
}

interface PTSession {
  id: number;
  sessionId: string;
  patientId: string;
  patientName: string;
  sessionDate: string;
  therapistName: string;
  sessionNumber: number;
  diagnosis: string;
  treatmentGiven: string[];
  painScoreBefore: number;
  painScoreAfter: number;
  mobilityBefore: string;
  mobilityAfter: string;
  exercisesDone: string;
  homeProgram: string;
  progressNotes: string;
  nextSession: string;
  status: string;
}

const PT_TREATMENTS = [
  "Manual Therapy / Mobilization",
  "Ultrasound Therapy",
  "TENS (Transcutaneous Electrical Nerve Stimulation)",
  "Interferential Therapy (IFT)",
  "Hot Pack Application",
  "Cold Pack / Cryotherapy",
  "Short Wave Diathermy (SWD)",
  "Traction (Cervical)",
  "Traction (Lumbar)",
  "Exercise Therapy (Active)",
  "Exercise Therapy (Passive)",
  "Gait Training",
  "Balance & Coordination Training",
  "Chest Physiotherapy",
  "Hydrotherapy",
  "Massage Therapy",
  "Postural Correction",
  "Kinesio Taping",
  "Splinting / Orthotic Fitting",
  "Stump Bandaging (Post-amputation)",
];

const MOBILITY_OPTIONS = ["Full ROM", "Reduced ROM", "Partial Weight-bearing", "Non-weight-bearing", "Bedbound", "Ambulatory with aid", "Independent"];

const PT_DIAGNOSES = [
  "Low Back Pain", "Neck Pain / Cervical Spondylosis", "Shoulder Pain / Rotator Cuff", "Knee Osteoarthritis",
  "Post-Fracture Rehabilitation", "Post-Operative Rehabilitation", "Stroke / Hemiplegia", "Peripheral Neuropathy",
  "Spinal Cord Injury", "Sports Injury", "Muscle Strain / Sprain", "Plantar Fasciitis",
  "Respiratory Conditions (COPD, Asthma)", "Post-COVID Rehabilitation", "Cerebral Palsy",
  "Parkinson's Disease", "Hip Replacement Rehabilitation", "Knee Replacement Rehabilitation",
];

export default function Physiotherapy() {
  const { user } = useAuth();
  const [tab, setTab] = useState<PTTab>("referrals");
  const [search, setSearch] = useState("");
  const [patients, setPatients] = useState<any[]>([]);
  const [referrals, setReferrals] = useState<PTReferral[]>([]);
  const [sessions, setSessions] = useState<PTSession[]>([]);
  const [showReferral, setShowReferral] = useState(false);
  const [showSession, setShowSession] = useState(false);
  const [selectedTreatments, setSelectedTreatments] = useState<string[]>([]);

  const [referralForm, setReferralForm] = useState({
    patientId: "", diagnosis: "", referralReason: "", urgency: "Routine", assignedTherapist: "", firstAppointment: "",
  });

  const [sessionForm, setSessionForm] = useState({
    patientId: "", sessionNumber: "", diagnosis: "", painScoreBefore: "", painScoreAfter: "",
    mobilityBefore: "", mobilityAfter: "", exercisesDone: "", homeProgram: "", progressNotes: "", nextSession: "",
  });

  const mapReferral = (r: any): PTReferral => ({
    id: r.id, referralId: r.referral_id || r.referralId || "",
    patientId: r.patient_id || r.patientId || "", patientName: r.patient_name || r.patientName || "",
    referredBy: r.referred_by || r.referredBy || "", referralDate: r.referral_date || r.referralDate || "",
    diagnosis: r.diagnosis || "", referralReason: r.referral_reason || r.referralReason || "",
    urgency: r.urgency || "Routine", status: r.status || "pending",
    assignedTherapist: r.assigned_therapist || r.assignedTherapist || "",
    firstAppointment: r.first_appointment || r.firstAppointment || "",
  });

  const mapSession = (s: any): PTSession => ({
    id: s.id, sessionId: s.session_id || s.sessionId || "",
    patientId: s.patient_id || s.patientId || "", patientName: s.patient_name || s.patientName || "",
    sessionDate: s.session_date || s.sessionDate || "", therapistName: s.therapist_name || s.therapistName || "",
    sessionNumber: s.session_number || s.sessionNumber || 1, diagnosis: s.diagnosis || "",
    treatmentGiven: typeof s.treatment_given === "string" ? s.treatment_given.split(",").filter(Boolean) : (s.treatmentGiven || []),
    painScoreBefore: s.pain_score_before ?? s.painScoreBefore ?? 0,
    painScoreAfter: s.pain_score_after ?? s.painScoreAfter ?? 0,
    mobilityBefore: s.mobility_before || s.mobilityBefore || "",
    mobilityAfter: s.mobility_after || s.mobilityAfter || "",
    exercisesDone: s.exercises_done || s.exercisesDone || "",
    homeProgram: s.home_program || s.homeProgram || "",
    progressNotes: s.progress_notes || s.progressNotes || "",
    nextSession: s.next_session || s.nextSession || "", status: s.status || "completed",
  });

  useEffect(() => {
    api.patients.getAll().then((d: any[]) => setPatients(d)).catch(() => {});
    api.physio.getReferrals().then((d: any[]) => setReferrals((d || []).map(mapReferral))).catch(() => {});
    api.physio.getSessions().then((d: any[]) => setSessions((d || []).map(mapSession))).catch(() => {});
  }, []);

  const patientName = (id: string) => patients.find((p) => p.patient_id === id)?.name || id;
  const toggleTreatment = (t: string) => setSelectedTreatments((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);

  const handleReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!referralForm.patientId) { toast.error("Select a patient"); return; }
    const pName = patientName(referralForm.patientId);
    const payload = {
      patient_id: referralForm.patientId, patient_name: pName,
      referred_by: user?.name || "Clinician", referral_date: new Date().toISOString().slice(0, 10),
      diagnosis: referralForm.diagnosis, referral_reason: referralForm.referralReason,
      urgency: referralForm.urgency, assigned_therapist: referralForm.assignedTherapist,
      first_appointment: referralForm.firstAppointment,
    };
    const local: PTReferral = { id: Date.now(), referralId: `PTR-${Date.now()}`, patientId: referralForm.patientId,
      patientName: pName, referredBy: payload.referred_by, referralDate: payload.referral_date,
      diagnosis: referralForm.diagnosis, referralReason: referralForm.referralReason, urgency: referralForm.urgency,
      status: "pending", assignedTherapist: referralForm.assignedTherapist, firstAppointment: referralForm.firstAppointment };
    try {
      const saved = await api.physio.createReferral(payload);
      setReferrals((prev) => [mapReferral(saved), ...prev]);
    } catch {
      setReferrals((prev) => [local, ...prev]);
    }
    toast.success("Physiotherapy referral created");
    setShowReferral(false);
    setReferralForm({ patientId: "", diagnosis: "", referralReason: "", urgency: "Routine", assignedTherapist: "", firstAppointment: "" });
  };

  const handleSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionForm.patientId) { toast.error("Select a patient"); return; }
    const pName = patientName(sessionForm.patientId);
    const payload = {
      patient_id: sessionForm.patientId, patient_name: pName,
      session_date: new Date().toISOString().slice(0, 10), therapist_name: user?.name || "Physiotherapist",
      session_number: Number(sessionForm.sessionNumber) || 1, diagnosis: sessionForm.diagnosis,
      treatment_given: selectedTreatments.join(", "),
      pain_score_before: Number(sessionForm.painScoreBefore), pain_score_after: Number(sessionForm.painScoreAfter),
      mobility_before: sessionForm.mobilityBefore, mobility_after: sessionForm.mobilityAfter,
      exercises_done: sessionForm.exercisesDone, home_program: sessionForm.homeProgram,
      progress_notes: sessionForm.progressNotes, next_session: sessionForm.nextSession,
    };
    const local: PTSession = { id: Date.now(), sessionId: `PTS-${Date.now()}`, patientId: sessionForm.patientId,
      patientName: pName, sessionDate: payload.session_date, therapistName: payload.therapist_name,
      sessionNumber: payload.session_number, diagnosis: sessionForm.diagnosis, treatmentGiven: selectedTreatments,
      painScoreBefore: payload.pain_score_before, painScoreAfter: payload.pain_score_after,
      mobilityBefore: sessionForm.mobilityBefore, mobilityAfter: sessionForm.mobilityAfter,
      exercisesDone: sessionForm.exercisesDone, homeProgram: sessionForm.homeProgram,
      progressNotes: sessionForm.progressNotes, nextSession: sessionForm.nextSession, status: "completed" };
    try {
      const saved = await api.physio.createSession(payload);
      setSessions((prev) => [mapSession(saved), ...prev]);
    } catch {
      setSessions((prev) => [local, ...prev]);
    }
    toast.success("Physiotherapy session recorded");
    setShowSession(false);
    setSelectedTreatments([]);
    setSessionForm({ patientId: "", sessionNumber: "", diagnosis: "", painScoreBefore: "", painScoreAfter: "", mobilityBefore: "", mobilityAfter: "", exercisesDone: "", homeProgram: "", progressNotes: "", nextSession: "" });
  };

  const referralColumns: Column<PTReferral>[] = [
    { header: "Ref. ID", accessor: "referralId" },
    { header: "Patient", accessor: (r) => <div><p className="font-medium">{r.patientName}</p><p className="text-xs text-muted-foreground">{r.patientId}</p></div> },
    { header: "Diagnosis", accessor: "diagnosis" },
    { header: "Referred By", accessor: "referredBy" },
    { header: "Urgency", accessor: (r) => <Chip label={r.urgency} size="small" color={r.urgency === "Urgent" ? "error" : r.urgency === "Routine" ? "default" : "warning"} /> },
    { header: "Therapist", accessor: (r) => r.assignedTherapist || "—" },
    { header: "First Apt.", accessor: (r) => r.firstAppointment || "—" },
    { header: "Status", accessor: (r) => <StatusBadge status={r.status} /> },
  ];

  const sessionColumns: Column<PTSession>[] = [
    { header: "Session", accessor: (r) => `#${r.sessionNumber}` },
    { header: "Patient", accessor: (r) => <div><p className="font-medium">{r.patientName}</p><p className="text-xs text-muted-foreground">{r.patientId}</p></div> },
    { header: "Date", accessor: "sessionDate" },
    { header: "Diagnosis", accessor: "diagnosis" },
    { header: "Pain Score", accessor: (r) => <div><span className="text-destructive font-semibold">{r.painScoreBefore}</span> → <span className="text-primary font-semibold">{r.painScoreAfter}</span></div> },
    { header: "Treatment", accessor: (r) => <div className="flex flex-wrap gap-1">{r.treatmentGiven.slice(0, 2).map((t, i) => <Chip key={i} label={t} size="small" />)}{r.treatmentGiven.length > 2 && <Chip label={`+${r.treatmentGiven.length - 2}`} size="small" />}</div> },
    { header: "Therapist", accessor: "therapistName" },
    { header: "Next Session", accessor: (r) => r.nextSession || "—" },
    { header: "Status", accessor: (r) => <StatusBadge status={r.status} /> },
  ];

  const stats = [
    { label: "Active Referrals", value: referrals.filter((r) => r.status === "pending").length, icon: Users, color: "#7C3AED" },
    { label: "Sessions Today", value: sessions.filter((s) => s.sessionDate === new Date().toISOString().slice(0, 10)).length, icon: Calendar, color: "#007A3D" },
    { label: "Total Sessions", value: sessions.length, icon: Activity, color: "#1565C0" },
    { label: "Avg Pain Reduction", value: sessions.length > 0 ? `${Math.round(sessions.reduce((sum, s) => sum + (s.painScoreBefore - s.painScoreAfter), 0) / sessions.length)}pts` : "—", icon: TrendingUp, color: "#F59E0B" },
  ];

  return (
    <div>
      <TopBar title="Physiotherapy" subtitle="Rehabilitation services — referrals, treatment sessions, and patient progress tracking" />
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
          <Box sx={{ borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2 }}>
              <Tab value="referrals" label="Referrals" icon={<Users className="h-4 w-4" />} iconPosition="start" />
              <Tab value="sessions" label="Sessions" icon={<Activity className="h-4 w-4" />} iconPosition="start" />
            </Tabs>
          </Box>
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
              <Box sx={{ position: "relative", flex: 1, minWidth: 240 }}>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" style={{ zIndex: 1 }} />
                <Input placeholder="Search patients..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
              </Box>
              {tab === "referrals" && (
                <Button size="sm" className="gradient-primary text-primary-foreground" onClick={() => setShowReferral(true)}>
                  <Plus className="h-4 w-4 mr-1" /> New Referral
                </Button>
              )}
              {tab === "sessions" && (
                <Button size="sm" className="gradient-primary text-primary-foreground" onClick={() => setShowSession(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Record Session
                </Button>
              )}
            </Box>
            {tab === "referrals" && <DataTable columns={referralColumns} data={referrals.filter((r) => r.patientName.toLowerCase().includes(search.toLowerCase()))} />}
            {tab === "sessions" && <DataTable columns={sessionColumns} data={sessions.filter((s) => s.patientName.toLowerCase().includes(search.toLowerCase()))} />}
          </Box>
        </Paper>
      </div>

      {/* Referral Dialog */}
      <Dialog open={showReferral} onOpenChange={setShowReferral}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-display">New Physiotherapy Referral</DialogTitle>
            <DialogDescription>Refer a patient for physiotherapy assessment and treatment.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleReferral} className="flex-1 overflow-y-auto space-y-4 pr-2">
            <div className="space-y-1.5">
              <Label>Patient *</Label>
              <Select value={referralForm.patientId} onValueChange={(v) => setReferralForm((f) => ({ ...f, patientId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select patient..." /></SelectTrigger>
                <SelectContent>{patients.map((p) => <SelectItem key={p.patient_id} value={p.patient_id}>{p.name} ({p.patient_id})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Diagnosis</Label>
              <Select value={referralForm.diagnosis} onValueChange={(v) => setReferralForm((f) => ({ ...f, diagnosis: v }))}>
                <SelectTrigger><SelectValue placeholder="Select diagnosis..." /></SelectTrigger>
                <SelectContent>{PT_DIAGNOSES.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Reason for Referral</Label>
              <Textarea rows={3} value={referralForm.referralReason} onChange={(e) => setReferralForm((f) => ({ ...f, referralReason: e.target.value }))} placeholder="Clinical findings, goals of therapy, specific requests..." />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Urgency</Label>
                <Select value={referralForm.urgency} onValueChange={(v) => setReferralForm((f) => ({ ...f, urgency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Urgent">Urgent (&lt; 48h)</SelectItem>
                    <SelectItem value="Semi-urgent">Semi-urgent (within 1 week)</SelectItem>
                    <SelectItem value="Routine">Routine</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>First Appointment</Label>
                <Input type="date" value={referralForm.firstAppointment} onChange={(e) => setReferralForm((f) => ({ ...f, firstAppointment: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Assigned Therapist</Label>
              <Input value={referralForm.assignedTherapist} onChange={(e) => setReferralForm((f) => ({ ...f, assignedTherapist: e.target.value }))} placeholder="Name of assigned physiotherapist" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowReferral(false)}>Cancel</Button>
              <Button type="submit" className="gradient-primary text-primary-foreground">Create Referral</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Session Dialog */}
      <Dialog open={showSession} onOpenChange={setShowSession}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-display">Record Physiotherapy Session</DialogTitle>
            <DialogDescription>Document treatment given, pain scores, mobility, and progress notes.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSession} className="flex-1 overflow-y-auto space-y-4 pr-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Patient *</Label>
                <Select value={sessionForm.patientId} onValueChange={(v) => setSessionForm((f) => ({ ...f, patientId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select patient..." /></SelectTrigger>
                  <SelectContent>{patients.map((p) => <SelectItem key={p.patient_id} value={p.patient_id}>{p.name} ({p.patient_id})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Session Number</Label>
                <Input type="number" min="1" value={sessionForm.sessionNumber} onChange={(e) => setSessionForm((f) => ({ ...f, sessionNumber: e.target.value }))} placeholder="e.g. 3" />
              </div>
              <div className="space-y-1.5">
                <Label>Diagnosis</Label>
                <Select value={sessionForm.diagnosis} onValueChange={(v) => setSessionForm((f) => ({ ...f, diagnosis: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>{PT_DIAGNOSES.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Next Session Date</Label>
                <Input type="date" value={sessionForm.nextSession} onChange={(e) => setSessionForm((f) => ({ ...f, nextSession: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Pain Score Before (0–10)</Label>
                <Input type="number" min="0" max="10" value={sessionForm.painScoreBefore} onChange={(e) => setSessionForm((f) => ({ ...f, painScoreBefore: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Pain Score After (0–10)</Label>
                <Input type="number" min="0" max="10" value={sessionForm.painScoreAfter} onChange={(e) => setSessionForm((f) => ({ ...f, painScoreAfter: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Mobility Before</Label>
                <Select value={sessionForm.mobilityBefore} onValueChange={(v) => setSessionForm((f) => ({ ...f, mobilityBefore: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>{MOBILITY_OPTIONS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Mobility After</Label>
                <Select value={sessionForm.mobilityAfter} onValueChange={(v) => setSessionForm((f) => ({ ...f, mobilityAfter: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>{MOBILITY_OPTIONS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Treatment Given</Label>
              <div className="rounded-xl border p-3 flex flex-wrap gap-2">
                {PT_TREATMENTS.map((t) => (
                  <label key={t} className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input type="checkbox" checked={selectedTreatments.includes(t)} onChange={() => toggleTreatment(t)} />
                    {t}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Exercises Done</Label>
              <Input value={sessionForm.exercisesDone} onChange={(e) => setSessionForm((f) => ({ ...f, exercisesDone: e.target.value }))} placeholder="e.g. SLR x10, quad sets x15, wall squats x8" />
            </div>
            <div className="space-y-1.5">
              <Label>Home Exercise Program</Label>
              <Textarea rows={2} value={sessionForm.homeProgram} onChange={(e) => setSessionForm((f) => ({ ...f, homeProgram: e.target.value }))} placeholder="Instructions for exercises to do at home between sessions..." />
            </div>
            <div className="space-y-1.5">
              <Label>Progress Notes</Label>
              <Textarea rows={3} value={sessionForm.progressNotes} onChange={(e) => setSessionForm((f) => ({ ...f, progressNotes: e.target.value }))} placeholder="Patient's progress, response to treatment, functional improvements, barriers..." />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowSession(false)}>Cancel</Button>
              <Button type="submit" className="gradient-primary text-primary-foreground">Record Session</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
