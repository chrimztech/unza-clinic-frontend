import { useState, useMemo } from "react";
import TopBar from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DataTable, Column } from "@/components/ui/data-table";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { getUserDisplayName } from "@/lib/session-user";
import { buildMedicalFitnessCertificateValues } from "@/lib/medical-exam";
import { Users, Plus, CheckCircle2, AlertTriangle, AlertCircle, Search, Download, ClipboardList } from "lucide-react";
import api from "@/lib/api";
import { sisApi } from "@/lib/externalSystems";
import { generateMedicalFitnessCertificate } from "@/lib/pdf-export";

interface ScreeningRecord {
  id: string;
  studentId: string;
  clinicNumber: string;
  name: string;
  school: string;
  sex: string;
  age: string;
  phone: string;
  email: string;
  address: string;
  emergencyContact: string;
  emergencyPhone: string;
  height: string;
  weight: string;
  bmi: string;
  bp: string;
  temp: string;
  pulse: string;
  vision: string;
  urine: string;
  diagnosis: string;
  fitnessStatus: "Fit" | "Unfit" | "Conditional" | "";
  notes: string;
  screenedBy: string;
  timestamp: string;
}

const SCHOOLS = [
  "School of Medicine", "School of Pharmacy", "School of Nursing Sciences",
  "School of Veterinary Medicine", "School of Natural Sciences", "School of Engineering",
  "School of Education", "School of Law", "School of Humanities & Social Sciences",
  "School of Agricultural Sciences", "School of Business Sciences", "School of Mines",
];

const emptyForm = (): Omit<ScreeningRecord, "id" | "screenedBy" | "timestamp" | "clinicNumber"> => ({
  studentId: "", name: "", school: "", sex: "", age: "",
  phone: "", email: "", address: "", emergencyContact: "", emergencyPhone: "",
  height: "", weight: "",
  bmi: "", bp: "", temp: "", pulse: "", vision: "", urine: "", diagnosis: "",
  fitnessStatus: "", notes: "",
});

function computeAge(dob?: string): string {
  if (!dob) return "";
  const birthDate = new Date(dob);
  if (Number.isNaN(birthDate.getTime())) return "";
  const diff = Date.now() - birthDate.getTime();
  const age = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
  return age > 0 ? String(age) : "";
}

const fitnessBadge: Record<string, string> = {
  Fit: "bg-green-100 text-green-800",
  Unfit: "bg-red-100 text-red-800",
  Conditional: "bg-amber-100 text-amber-800",
};

export default function StudentIntakeScreening() {
  const { user } = useAuth();
  const clinician = getUserDisplayName(user, "Clinician");
  const [records, setRecords] = useState<ScreeningRecord[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [search, setSearch] = useState("");
  const [cohortYear, setCohortYear] = useState(new Date().getFullYear().toString());
  const [saving, setSaving] = useState(false);
  const [lookupStatus, setLookupStatus] = useState<"idle" | "loading" | "found" | "not_found">("idle");
  const [existingClinicNumber, setExistingClinicNumber] = useState("");

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const lookupStudent = async () => {
    if (!form.studentId.trim()) { toast.error("Enter the student computer number first"); return; }
    setLookupStatus("loading");
    setExistingClinicNumber("");
    try {
      // Already registered as a clinic patient? Reuse their existing record/clinic number.
      const existing = await api.sis.lookupStudent(form.studentId.trim());
      if (existing?.already_registered) {
        setExistingClinicNumber(existing.clinic_number || "");
        setForm((f) => ({
          ...f,
          name: existing.name || f.name,
          school: existing.school || f.school,
          phone: existing.phone || f.phone,
          email: existing.email || f.email,
        }));
        setLookupStatus("found");
        toast.info(`Already a registered patient — Clinic No: ${existing.clinic_number}`, {
          description: "Existing details pre-filled. This exam will be added to their record.",
        });
        return;
      }

      // First-time student — pull their record from the university's Student Information System.
      const student = await sisApi.searchByStudentNumber(form.studentId.trim());
      setForm((f) => ({
        ...f,
        name: student.full_name || `${student.first_name || ""} ${student.last_name || ""}`.trim() || f.name,
        sex: student.gender || f.sex,
        age: computeAge(student.date_of_birth) || f.age,
        phone: student.phone || f.phone,
        email: student.email || f.email,
        address: student.address || f.address,
      }));
      setLookupStatus("found");
      toast.success("Found in SIS — details pre-filled", { description: "Add emergency contact details, then continue with vitals." });
    } catch {
      setLookupStatus("not_found");
      toast.info("Student number not found in SIS — enter details manually");
    }
  };

  const calcBmi = () => {
    const h = parseFloat(form.height);
    const w = parseFloat(form.weight);
    if (h > 0 && w > 0) {
      const heightM = h > 10 ? h / 100 : h;
      setForm((f) => ({ ...f, bmi: (w / (heightM * heightM)).toFixed(1) }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.studentId || !form.name || !form.fitnessStatus) {
      toast.error("Student ID, name, and fitness status are required");
      return;
    }
    if (!existingClinicNumber && (!form.phone || !form.address || !form.emergencyContact || !form.emergencyPhone)) {
      toast.error("Phone, address, and emergency contact are required to register a first-time patient");
      return;
    }
    setSaving(true);
    try {
      let patientId = "";
      let clinicNumber = existingClinicNumber;

      if (existingClinicNumber) {
        patientId = existingClinicNumber;
      } else {
        const created = await api.patients.create({
          patientType: "FIRST_TIME_STUDENT",
          name: form.name,
          gender: form.sex,
          age: form.age ? Number(form.age) : undefined,
          phone: form.phone,
          email: form.email,
          address: form.address,
          studentId: form.studentId,
          school: form.school,
          emergencyContact: form.emergencyContact,
          emergencyPhone: form.emergencyPhone,
        });
        patientId = created.patient_id;
        clinicNumber = created.clinic_number || created.patient_id;
      }

      const examPayload = {
        surname: form.name.split(" ").slice(-1)[0] || form.name,
        forenames: form.name.split(" ").slice(0, -1).join(" ") || form.name,
        computer_number: form.studentId,
        school: form.school,
        sex: form.sex,
        age: form.age,
        mobile_number: form.phone,
        height: form.height,
        weight: form.weight,
        bmi: form.bmi,
        bp: form.bp,
        temp: form.temp,
        pulse: form.pulse,
        urine: form.urine,
        vision: form.vision,
        diagnosis: form.diagnosis,
        fitness_recommendation: form.fitnessStatus,
        general_comments: form.notes,
      };

      const savedExam = await api.clinicalForms.create({
        formType: "student_medical_exam",
        title: "Student Medical Examination",
        patientId,
        patientName: form.name,
        department: "Clinical",
        status: "completed",
        createdBy: clinician,
        payloadJson: JSON.stringify(examPayload),
      });

      await api.clinicalForms.generateMedicalFitnessCertificate({
        patientId,
        encounterId: "",
        sourceExamFormId: savedExam.formId || savedExam.id,
        createdBy: clinician,
      });

      const certificateValues = buildMedicalFitnessCertificateValues({
        examValues: examPayload,
        examinerName: clinician,
      });
      await generateMedicalFitnessCertificate({
        name: form.name,
        school: form.school,
        compNo: clinicNumber || form.studentId,
        fitnessStatus: certificateValues.fitness_status,
        comments: certificateValues.comments,
        examinerName: clinician,
        officialDate: certificateValues.official_date,
        filename: `fitness-certificate-${clinicNumber || form.studentId}`,
      });

      const record: ScreeningRecord = {
        ...form,
        id: clinicNumber || savedExam.formId || savedExam.id || form.studentId,
        clinicNumber: clinicNumber || "",
        screenedBy: clinician,
        timestamp: new Date().toISOString(),
      };
      setRecords((prev) => [record, ...prev]);
      setForm(emptyForm());
      setLookupStatus("idle");
      setExistingClinicNumber("");
      setShowDialog(false);
      toast.success(`${form.name} screened — ${form.fitnessStatus}`, {
        description: clinicNumber ? `Clinic Number: ${clinicNumber} — certificate downloaded` : "Certificate downloaded",
        duration: 6000,
      });
    } catch (error: any) {
      toast.error(error?.message || "Failed to save screening. Check required fields and try again.");
    } finally {
      setSaving(false);
    }
  };

  const filtered = useMemo(() =>
    records.filter((r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.studentId.toLowerCase().includes(search.toLowerCase()) ||
      r.school.toLowerCase().includes(search.toLowerCase())
    ), [records, search]);

  const stats = useMemo(() => ({
    total: records.length,
    fit: records.filter((r) => r.fitnessStatus === "Fit").length,
    unfit: records.filter((r) => r.fitnessStatus === "Unfit").length,
    conditional: records.filter((r) => r.fitnessStatus === "Conditional").length,
  }), [records]);

  const exportCsv = () => {
    const headers = ["Student ID", "Clinic Number", "Name", "School", "Sex", "Age", "Height", "Weight", "BMI", "BP", "Temp", "Pulse", "Vision", "Diagnosis", "Fitness", "Notes", "Screened By", "Date"];
    const rows = records.map((r) => [
      r.studentId, r.clinicNumber, r.name, r.school, r.sex, r.age, r.height, r.weight, r.bmi,
      r.bp, r.temp, r.pulse, r.vision, r.diagnosis, r.fitnessStatus, r.notes,
      r.screenedBy, new Date(r.timestamp).toLocaleDateString(),
    ]);
    const csv = [headers, ...rows].map((row) => row.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `screening-${cohortYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const columns: Column<ScreeningRecord>[] = [
    { header: "Student ID", accessor: "studentId", width: 120 },
    { header: "Clinic Number", accessor: (r) => r.clinicNumber || "—", width: 130 },
    { header: "Name", accessor: "name", width: 180 },
    { header: "School", accessor: "school", width: 200 },
    { header: "BMI", accessor: (r) => r.bmi || "—", width: 70 },
    { header: "BP", accessor: (r) => r.bp || "—", width: 90 },
    {
      header: "Fitness", accessor: (r) => (
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${fitnessBadge[r.fitnessStatus] || "bg-gray-100 text-gray-600"}`}>
          {r.fitnessStatus || "—"}
        </span>
      ), width: 110,
    },
    { header: "Screened By", accessor: "screenedBy", width: 140 },
    { header: "Date", accessor: (r) => r.timestamp ? new Date(r.timestamp).toLocaleDateString() : "—", width: 100 },
  ];

  return (
    <div>
      <TopBar title="New Student Intake Screening" subtitle="Batch medical examination workflow for incoming student cohorts" />
      <div className="p-6 space-y-6">

        {/* Cohort + Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Label className="text-sm">Cohort Year:</Label>
            <Input value={cohortYear} onChange={(e) => setCohortYear(e.target.value)} className="w-24" />
          </div>
          <Button className="gradient-primary text-primary-foreground" onClick={() => { setForm(emptyForm()); setLookupStatus("idle"); setExistingClinicNumber(""); setShowDialog(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Screen Student
          </Button>
          {records.length > 0 && (
            <Button variant="outline" onClick={exportCsv}>
              <Download className="h-4 w-4 mr-1" /> Export CSV
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Screened", value: stats.total, icon: ClipboardList, color: "text-blue-600" },
            { label: "Fit", value: stats.fit, icon: CheckCircle2, color: "text-green-600" },
            { label: "Unfit", value: stats.unfit, icon: AlertTriangle, color: "text-red-600" },
            { label: "Conditional", value: stats.conditional, icon: Users, color: "text-amber-600" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-card border border-border p-4 shadow-card">
              <div className="flex items-center gap-2 mb-1">
                <s.icon className={`h-4 w-4 ${s.color}`} />
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{s.label}</span>
              </div>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Records Table */}
        <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" />
              <h3 className="font-semibold">Screening Records — {cohortYear}</h3>
              <Badge variant="secondary">{records.length}</Badge>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search..." className="pl-9 h-8 text-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          {records.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>No students screened yet. Click "Screen Student" to begin.</p>
            </div>
          ) : (
            <DataTable columns={columns} data={filtered} />
          )}
        </div>
      </div>

      {/* Screening Dialog */}
      <Dialog open={showDialog} onOpenChange={(o) => { if (!o) setShowDialog(false); }}>
        <DialogContent className="sm:max-w-2xl max-h-[92vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-display">Student Medical Examination</DialogTitle>
            <DialogDescription>Complete the intake screening form for this student.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Student Computer Number *</Label>
                <div className="flex gap-2">
                  <Input
                    required
                    placeholder="e.g. 23008765"
                    value={form.studentId}
                    onChange={(e) => { set("studentId")(e); setLookupStatus("idle"); setExistingClinicNumber(""); }}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={lookupStudent} disabled={lookupStatus === "loading"} title="Pull details from SIS">
                    {lookupStatus === "found" ? <CheckCircle2 className="h-4 w-4 text-green-600" /> :
                     lookupStatus === "not_found" ? <AlertCircle className="h-4 w-4 text-amber-500" /> :
                     <Search className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {existingClinicNumber
                    ? `Already registered — Clinic No: ${existingClinicNumber}`
                    : "Enter the computer number then click search to auto-fill from SIS."}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>Full Name *</Label>
                <Input required placeholder="Surname Forename(s)" value={form.name} onChange={set("name")} />
              </div>
              <div className="space-y-1.5">
                <Label>School</Label>
                <Select value={form.school} onValueChange={(v) => setForm((f) => ({ ...f, school: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select school" /></SelectTrigger>
                  <SelectContent>
                    {SCHOOLS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Sex</Label>
                <Select value={form.sex} onValueChange={(v) => setForm((f) => ({ ...f, sex: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Age</Label>
                <Input placeholder="e.g. 19" value={form.age} onChange={set("age")} />
              </div>
              {!existingClinicNumber && (
                <>
                  <div className="space-y-1.5">
                    <Label>Phone *</Label>
                    <Input required placeholder="e.g. 0971234567" value={form.phone} onChange={set("phone")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Email</Label>
                    <Input type="email" placeholder="student@unza.ac.zm" value={form.email} onChange={set("email")} />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Residential Address *</Label>
                    <Input required placeholder="e.g. Hostel / Township" value={form.address} onChange={set("address")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Emergency Contact Name *</Label>
                    <Input required placeholder="Next of kin" value={form.emergencyContact} onChange={set("emergencyContact")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Emergency Contact Phone *</Label>
                    <Input required placeholder="e.g. 0971234567" value={form.emergencyPhone} onChange={set("emergencyPhone")} />
                  </div>
                </>
              )}
              <div className="space-y-1.5">
                <Label>Blood Pressure</Label>
                <Input placeholder="e.g. 120/80" value={form.bp} onChange={set("bp")} />
              </div>
              <div className="space-y-1.5">
                <Label>Temperature (°C)</Label>
                <Input placeholder="e.g. 36.5" value={form.temp} onChange={set("temp")} />
              </div>
              <div className="space-y-1.5">
                <Label>Pulse Rate (bpm)</Label>
                <Input placeholder="e.g. 72" value={form.pulse} onChange={set("pulse")} />
              </div>
              <div className="space-y-1.5">
                <Label>Height (cm)</Label>
                <Input placeholder="e.g. 170" value={form.height} onChange={(e) => { set("height")(e); }} onBlur={calcBmi} />
              </div>
              <div className="space-y-1.5">
                <Label>Weight (kg)</Label>
                <Input placeholder="e.g. 65" value={form.weight} onChange={(e) => { set("weight")(e); }} onBlur={calcBmi} />
              </div>
              <div className="space-y-1.5">
                <Label>BMI</Label>
                <Input placeholder="Auto-calculated" value={form.bmi} onChange={set("bmi")} />
              </div>
              <div className="space-y-1.5">
                <Label>Vision</Label>
                <Input placeholder="e.g. 6/6 both eyes" value={form.vision} onChange={set("vision")} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Urine Findings</Label>
                <Input placeholder="e.g. NAD" value={form.urine} onChange={set("urine")} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Diagnosis / Impression</Label>
                <Textarea rows={2} placeholder="Any conditions found, referrals..." value={form.diagnosis} onChange={set("diagnosis")} />
              </div>
              <div className="space-y-1.5">
                <Label>Fitness Status *</Label>
                <Select required value={form.fitnessStatus} onValueChange={(v) => setForm((f) => ({ ...f, fitnessStatus: v as any }))}>
                  <SelectTrigger><SelectValue placeholder="Select fitness status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Fit">Fit for University</SelectItem>
                    <SelectItem value="Unfit">Unfit — Refer / Defer</SelectItem>
                    <SelectItem value="Conditional">Conditional — Requires Follow-up</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Notes / Recommendations</Label>
                <Textarea rows={2} placeholder="Follow-up actions, referrals, special considerations..." value={form.notes} onChange={set("notes")} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button type="submit" className="gradient-primary text-primary-foreground" disabled={saving}>
                <CheckCircle2 className="h-4 w-4 mr-1" />
                {saving ? "Saving..." : "Save Screening"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
