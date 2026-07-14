import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import TopBar from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/ui/status-badge";
import { ArrowLeft, Edit, Printer, User, Phone, Mail, MapPin, Heart, FileText, Pill, FlaskConical, CreditCard, Clock, Stethoscope, Activity, CreditCard as CardIcon, History, Upload, Trash2, Download, FolderOpen } from "lucide-react";
import ConsultationDialog from "@/components/dialogs/ConsultationDialog";
import RecordVitalsDialog from "@/components/dialogs/RecordVitalsDialog";
import EditPatientDialog from "@/components/dialogs/EditPatientDialog";
import DepartmentFormsPanel from "@/components/clinical/DepartmentFormsPanel";
import { toast } from "sonner";
import api from "@/lib/api";
import { buildJourneyForPatient, type JourneyEvent } from "@/lib/journey";
import { useAuth } from "@/context/AuthContext";
import { hasPermission } from "@/lib/navigation";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const typeIcons: Record<string, React.ElementType> = {
  registration: User,
  triage: Activity,
  vitals: Activity,
  consultation: Stethoscope,
  "medical-exam": FileText,
  certificate: FileText,
  "lab-request": FlaskConical,
  "lab-result": FlaskConical,
  prescription: Pill,
  dispensed: Pill,
  billing: CreditCard,
  admission: Heart,
  discharge: ArrowLeft,
};

const typeColors: Record<string, string> = {
  registration: "bg-blue-500",
  triage: "bg-yellow-500",
  vitals: "bg-cyan-500",
  consultation: "bg-emerald-500",
  "medical-exam": "bg-sky-600",
  certificate: "bg-teal-600",
  "lab-request": "bg-orange-500",
  "lab-result": "bg-purple-500",
  prescription: "bg-pink-500",
  dispensed: "bg-green-500",
  billing: "bg-indigo-500",
  admission: "bg-red-500",
  discharge: "bg-gray-500",
};

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-card-foreground">{value || "-"}</p>
      </div>
    </div>
  );
}

function JourneyTimeline({ events }: { events: JourneyEvent[] }) {
  const sorted = [...events].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return (
    <div className="relative space-y-0">
      {sorted.map((evt, i) => {
        const Icon = typeIcons[evt.type] || FileText;
        const color = typeColors[evt.type] || "bg-muted";
        const time = new Date(evt.timestamp);
        return (
          <div key={evt.id} className="relative flex gap-4 pb-6">
            {i < sorted.length - 1 && <div className="absolute left-[15px] top-[32px] bottom-0 w-0.5 bg-border" />}
            <div className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${color}`}>
              <Icon className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 rounded-xl bg-card border border-border p-4 shadow-card">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-1">
                <h4 className="text-sm font-semibold text-card-foreground">{evt.title}</h4>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {time.toLocaleDateString()} {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-2">{evt.description}</p>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="bg-secondary px-2 py-0.5 rounded-full text-secondary-foreground">{evt.performedBy}</span>
                <span className="bg-secondary px-2 py-0.5 rounded-full text-secondary-foreground">{evt.department}</span>
                <span className="bg-secondary px-2 py-0.5 rounded-full text-secondary-foreground capitalize">{evt.type.replace("-", " ")}</span>
              </div>
            </div>
          </div>
        );
      })}
      {sorted.length === 0 && <p className="text-center text-muted-foreground py-8">No journey events recorded yet.</p>}
    </div>
  );
}

function VitalsChart({ triageRecords }: { triageRecords: any[] }) {
  const data = triageRecords
    .filter((r) => r.patientId || r.patient_id)
    .map((r) => {
      const bp = (r.bloodPressure || r.blood_pressure || "").split("/");
      const systolic = bp[0] ? parseInt(bp[0]) : undefined;
      const diastolic = bp[1] ? parseInt(bp[1]) : undefined;
      const date = r.arrivalTime || r.arrival_time || r.createdAt || r.created_at || "";
      return {
        date: date ? new Date(date).toLocaleDateString() : "—",
        Temp: r.temperature ?? r.temp ?? undefined,
        Pulse: r.pulseRate ?? r.pulse_rate ?? undefined,
        Weight: r.weightKg ?? r.weight_kg ?? r.weight ?? undefined,
        Systolic: systolic,
        Diastolic: diastolic,
      };
    })
    .filter((d) => d.date !== "—");

  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Activity className="h-12 w-12 mx-auto mb-3 opacity-20" />
        <p>No vital signs recorded yet.</p>
        <p className="text-xs mt-1">Record vitals via the triage or "Record Vitals" button.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-sm font-semibold text-card-foreground mb-4">Blood Pressure (mmHg)</p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} domain={[50, 200]} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="Systolic" stroke="#dc2626" strokeWidth={2} dot={{ r: 4 }} connectNulls />
            <Line type="monotone" dataKey="Diastolic" stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { key: "Temp", label: "Temperature (°C)", color: "#f59e0b" },
          { key: "Pulse", label: "Pulse Rate (bpm)", color: "#8b5cf6" },
          { key: "Weight", label: "Weight (kg)", color: "#10b981" },
        ].map(({ key, label, color }) => (
          <div key={key} className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm font-semibold text-card-foreground mb-4">{label}</p>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey={key} stroke={color} strokeWidth={2} dot={{ r: 3 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showConsultation, setShowConsultation] = useState(false);
  const [showVitals, setShowVitals] = useState(false);
  const [showEditPatient, setShowEditPatient] = useState(false);
  const [patient, setPatient] = useState<any>(null);
  const [encounter, setEncounter] = useState<any>(null);
  const [journey, setJourney] = useState<JourneyEvent[]>([]);
  const [triageRecords, setTriageRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [medHistory, setMedHistory] = useState<any>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [docsLoaded, setDocsLoaded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadPatient() {
      if (!id || id === "null" || id === "undefined") {
        setLoading(false);
        return;
      }
      try {
        const data = await api.patients.getById(id);
        setPatient(data);
        const [encounters, triage, labTests, prescriptions, admissions, billing, clinicalForms] = await Promise.all([
          hasPermission(user, ["walkin.view"]) ? api.encounters.getAll() : Promise.resolve([]),
          hasPermission(user, ["triage.view"]) ? api.triage.getAll() : Promise.resolve([]),
          hasPermission(user, ["laboratory.view"]) ? api.labTests.getAll() : Promise.resolve([]),
          hasPermission(user, ["prescriptions.view", "pharmacy.view"]) ? api.prescriptions.getAll() : Promise.resolve([]),
          hasPermission(user, ["admissions.view"]) ? api.admissions.getAll() : Promise.resolve([]),
          hasPermission(user, ["billing.view"]) ? api.billing.getAll() : Promise.resolve([]),
          hasPermission(user, ["forms.view"]) ? api.clinicalForms.getAll() : Promise.resolve([]),
        ]);
        setEncounter(encounters.find((item: any) => item.patientId === data.patient_id && !item.checkedOut) ?? null);
        const patientTriage = (triage || []).filter(
          (t: any) => t.patientId === data.patient_id || t.patient_id === data.patient_id,
        );
        setTriageRecords(patientTriage);
        setJourney(buildJourneyForPatient(data, {
          triage: triage || [],
          labTests: labTests || [],
          prescriptions: prescriptions || [],
          admissions: admissions || [],
          billing: billing || [],
          encounters: encounters || [],
          clinicalForms: clinicalForms || [],
        }));
      } catch {
        toast.error("Failed to load patient");
      } finally {
        setLoading(false);
      }
    }
    loadPatient();
  }, [id, user]);
  const consultations = journey.filter((e) => e.type === "consultation");
  const labEvents = journey.filter((e) => e.type === "lab-request" || e.type === "lab-result");
  const rxEvents = journey.filter((e) => e.type === "prescription" || e.type === "dispensed");
  const billingEvents = journey.filter((e) => e.type === "billing");
  const vitalsEvents = journey.filter((e) => e.type === "vitals");
  const examEvents = journey.filter((e) => e.type === "medical-exam" || e.type === "certificate");

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading patient record...</div>;
  }

  if (!patient) {
    return <div className="p-6 text-sm text-muted-foreground">Patient not found.</div>;
  }

  const externalIdentifier = patient.patient_type === "STAFF"
    ? patient.man_number || "Not provided"
    : patient.student_id
      ? `${patient.student_id}${patient.year ? ` • Year ${patient.year}` : ""}`
      : "Not provided";

  return (
    <div className="print-container">
      <TopBar title="Patient Record" subtitle={`${patient.name} - ${patient.clinic_number || patient.patient_id}`} />
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate("/patients")} className="text-muted-foreground">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowVitals(true)}><Activity className="h-4 w-4 mr-1" /> Record Vitals</Button>
            <Button variant="outline" size="sm" onClick={() => setShowConsultation(true)}><Stethoscope className="h-4 w-4 mr-1" /> New Consultation</Button>
            <Button variant="outline" size="sm" onClick={() => {
              const regDate = patient.created_at || patient.registration_date || new Date().toLocaleDateString();
              const cardHtml = `
<!DOCTYPE html><html><head><title>Clinic Card — ${patient.name}</title>
<style>
  body{margin:0;padding:0;font-family:'Segoe UI',sans-serif;background:#f5f5f5;display:flex;justify-content:center;align-items:center;min-height:100vh}
  .card{background:#fff;width:340px;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.15);page-break-inside:avoid}
  .header{background:linear-gradient(135deg,#007A3D,#2d9e39);padding:20px;color:#fff;text-align:center}
  .logo-img{width:36px;height:36px;object-fit:contain;display:block;margin:0 auto 4px}
  .logo{font-size:13px;font-weight:800;letter-spacing:2px;text-transform:uppercase;opacity:0.9}
  .subtitle{font-size:11px;opacity:0.75;margin-top:2px}
  .avatar{width:64px;height:64px;border-radius:50%;background:rgba(255,255,255,0.25);display:flex;align-items:center;justify-content:center;margin:12px auto;font-size:28px;color:#fff;font-weight:700}
  .name{font-size:18px;font-weight:800;margin-top:4px}
  .clinic-number{font-size:22px;font-weight:900;letter-spacing:3px;background:rgba(255,255,255,0.2);border-radius:8px;padding:4px 16px;display:inline-block;margin-top:8px}
  .body{padding:20px}
  .row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f0f0f0;font-size:13px}
  .label{color:#888;font-weight:500}
  .value{font-weight:600;color:#222;text-align:right;max-width:60%}
  .qr-box{margin-top:16px;border:2px dashed #ccc;border-radius:10px;padding:16px;text-align:center}
  .qr-text{font-family:monospace;font-size:11px;color:#555;word-break:break-all}
  .qr-label{font-size:10px;color:#aaa;margin-top:4px}
  .footer{background:#f9f9f9;padding:12px 20px;text-align:center;font-size:10px;color:#aaa;border-top:1px solid #eee}
  @media print{body{background:#fff;align-items:flex-start;padding-top:0}.card{box-shadow:none;border-radius:0;width:100%}}
</style></head><body>
<div class="card">
  <div class="header">
    <img src="${window.location.origin}/logo.png" alt="UNZA Clinic" class="logo-img" />
    <div class="logo">UNZA Clinic</div>
    <div class="subtitle">University of Zambia Health Services</div>
    <div class="avatar">${(patient.name || "P").charAt(0).toUpperCase()}</div>
    <div class="name">${patient.name}</div>
    <div class="clinic-number">${patient.clinic_number || patient.patient_id}</div>
  </div>
  <div class="body">
    <div class="row"><span class="label">Patient Type</span><span class="value">${(patient.patient_type || "General").replace(/_/g, " ")}</span></div>
    <div class="row"><span class="label">Blood Group</span><span class="value">${patient.blood_group || "—"}</span></div>
    <div class="row"><span class="label">Phone</span><span class="value">${patient.phone || "—"}</span></div>
    ${patient.student_id ? `<div class="row"><span class="label">Student ID</span><span class="value">${patient.student_id}</span></div>` : ""}
    ${patient.man_number ? `<div class="row"><span class="label">Man Number</span><span class="value">${patient.man_number}</span></div>` : ""}
    <div class="row"><span class="label">Registered</span><span class="value">${new Date(regDate).toLocaleDateString()}</span></div>
    <div class="qr-box">
      <div class="qr-text">${patient.clinic_number || patient.patient_id}</div>
      <div class="qr-label">Scan at reception — Clinic Number</div>
    </div>
  </div>
  <div class="footer">In case of emergency call: ${patient.emergency_phone || "—"} (${patient.emergency_contact || "Next of Kin"})</div>
</div>
</body></html>`;
              const w = window.open("", "_blank");
              if (w) { w.document.write(cardHtml); w.document.close(); w.print(); }
            }}><CardIcon className="h-4 w-4 mr-1" /> Print Card</Button>
            <Button variant="outline" size="sm" onClick={() => {
              const printContent = document.querySelector('.print-container')?.innerHTML;
              if (!printContent) return;
              const printWindow = window.open("", "_blank");
              if (!printWindow) return;
              printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                  <title>Patient Record - ${patient.name}</title>
                  <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; color: #1a1a1a; }
                    h1 { font-size: 24px; margin-bottom: 5px; }
                    h2 { font-size: 20px; margin: 20px 0 10px; }
                    h3 { font-size: 16px; margin: 15px 0 10px; color: #666; }
                    p { margin: 5px 0; }
                    .meta { color: #666; font-size: 14px; margin-bottom: 20px; }
                    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 20px 0; }
                    .card { border: 1px solid #e5e5e5; border-radius: 8px; padding: 15px; }
                    .label { font-size: 12px; color: #666; text-transform: uppercase; }
                    .value { font-size: 14px; font-weight: 500; }
                    .timeline { position: relative; padding-left: 30px; }
                    .timeline::before { content: ''; position: absolute; left: 8px; top: 0; bottom: 0; width: 2px; background: #e5e5e5; }
                    .event { position: relative; margin-bottom: 15px; }
                    .event::before { content: ''; position: absolute; left: -26px; top: 5px; width: 10px; height: 10px; border-radius: 50%; background: #007A3D; }
                    .event-time { font-size: 12px; color: #666; }
                    .event-title { font-weight: 600; }
                    .event-desc { font-size: 14px; color: #444; }
                    .tags { display: flex; gap: 5px; flex-wrap: wrap; margin-top: 5px; }
                    .tag { font-size: 11px; padding: 2px 8px; background: #f5f5f5; border-radius: 10px; }
                    @media print { body { padding: 0; } }
                  </style>
                </head>
                <body>
                  <div style="display:flex;align-items:center;gap:14px;margin-bottom:6px;">
                    <img src="${window.location.origin}/logo.png" alt="UNZA Clinic" style="width:52px;height:52px;object-fit:contain;" />
                    <div>
                      <div style="font-size:20px;font-weight:800;color:#007A3D;letter-spacing:1px;">UNZA Clinic</div>
                      <div style="font-size:12px;color:#666;">University of Zambia Health Services</div>
                    </div>
                  </div>
                  <hr style="border:none;border-top:2px solid #007A3D;margin:8px 0 16px;" />
                  <h1>Patient Record</h1>
                  <p class="meta">${patient.name} - ${patient.clinic_number || patient.patient_id}</p>
                  <div class="grid">
                    <div class="card"><div class="label">Phone</div><div class="value">${patient.phone || '-'}</div></div>
                    <div class="card"><div class="label">Email</div><div class="value">${patient.email || '-'}</div></div>
                    <div class="card"><div class="label">Address</div><div class="value">${patient.address || '-'}</div></div>
                    <div class="card"><div class="label">Blood Group</div><div class="value">${patient.blood_group || '-'}</div></div>
                    <div class="card"><div class="label">${patient.patient_type === 'STAFF' ? 'Man Number' : 'Student ID'}</div><div class="value">${externalIdentifier}</div></div>
                    <div class="card"><div class="label">Status</div><div class="value">${patient.status || '-'}</div></div>
                  </div>
                  <h2>Emergency Contact</h2>
                  <p>${patient.emergency_contact || '-'}</p>
                  <p style="color:#666;font-size:14px">${patient.emergency_relation || '-'} • ${patient.emergency_phone || '-'}</p>
                  <h2>Medical Info</h2>
                  <p><strong>Allergies:</strong> ${patient.allergies || 'No known allergies'}</p>
                  <p><strong>Conditions:</strong> ${patient.conditions || 'No chronic conditions'}</p>
                  <h2>Journey History (${journey.length} events)</h2>
                  <div class="timeline">
                    ${journey.map(evt => `
                      <div class="event">
                        <div class="event-time">${new Date(evt.timestamp).toLocaleDateString()} ${new Date(evt.timestamp).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</div>
                        <div class="event-title">${evt.title}</div>
                        <div class="event-desc">${evt.description}</div>
                        <div class="tags">
                          <span class="tag">${evt.performedBy}</span>
                          <span class="tag">${evt.department}</span>
                          <span class="tag">${evt.type}</span>
                        </div>
                      </div>
                    `).join('')}
                  </div>
                </body>
                </html>
              `);
              printWindow.document.close();
              printWindow.print();
            }}><Printer className="h-4 w-4 mr-1" /> Print</Button>
            {hasPermission(user, ["walkin.view", "patients.manage"]) ? (
              <Button size="sm" className="gradient-primary text-primary-foreground" onClick={() => setShowEditPatient(true)}>
                <Edit className="h-4 w-4 mr-1" /> Edit
              </Button>
            ) : null}
          </div>
        </div>

        <div className="rounded-xl bg-card p-6 shadow-card border border-border flex flex-col sm:flex-row gap-6">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl gradient-primary">
            <User className="h-10 w-10 text-primary-foreground" />
          </div>
          <div className="flex-1 grid gap-x-8 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <h2 className="text-xl font-bold font-display text-card-foreground">{patient.name}</h2>
              <p className="text-sm text-muted-foreground">{patient.clinic_number || patient.patient_id} • <StatusBadge status={patient.status} /></p>
            </div>
            <InfoRow icon={Phone} label="Phone" value={patient.phone} />
            <InfoRow icon={Mail} label="Email" value={patient.email} />
            <InfoRow icon={MapPin} label="Address" value={patient.address} />
            <InfoRow icon={Heart} label="Blood Group" value={patient.blood_group} />
            <InfoRow icon={FileText} label={patient.patient_type === "STAFF" ? "Man Number" : "Student ID"} value={externalIdentifier} />
          </div>
        </div>

        {/* Patient Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Events", value: journey.length, color: "text-blue-600" },
            { label: "Consultations", value: consultations.length, color: "text-emerald-600" },
            { label: "Prescriptions", value: rxEvents.length, color: "text-pink-600" },
            { label: "Lab Tests", value: labEvents.length, color: "text-purple-600" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-card border border-border p-3 shadow-card text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl bg-card p-5 shadow-card border border-border">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Emergency Contact</h4>
            <p className="text-sm font-medium text-card-foreground">{patient.emergency_contact || "-"}</p>
            <p className="text-xs text-muted-foreground">{patient.emergency_relation || "-"} • {patient.emergency_phone || "-"}</p>
          </div>
          <div className="rounded-xl bg-card p-5 shadow-card border border-border">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Allergies & Conditions</h4>
            <p className="text-sm text-destructive font-medium">{patient.allergies || "No known allergies"}</p>
            <p className="text-sm text-card-foreground mt-1">{patient.conditions || "No chronic conditions recorded"}</p>
          </div>
          <div className="rounded-xl bg-card p-5 shadow-card border border-border">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Journey Summary</h4>
            <p className="text-sm font-medium text-card-foreground">{journey.length} events recorded</p>
            <p className="text-xs text-muted-foreground">{consultations.length} consultations • {labEvents.length} lab • {rxEvents.length} pharmacy</p>
          </div>
        </div>

        <div className="rounded-xl bg-card p-5 shadow-card border border-border">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Active Encounter</h4>
          <p className="text-sm font-medium text-card-foreground">{encounter?.currentStage || "No active visit"}</p>
          <p className="text-xs text-muted-foreground">
            {encounter ? `${encounter.encounterId} • ${encounter.paymentStatus} • ${encounter.checkoutEligible ? "Ready for checkout" : "Pending clearance"}` : "Open a visit from Patient Flow to enforce the process."}
          </p>
          <p className="mt-2 text-xs text-muted-foreground capitalize">
            Medical exam: {patient.medical_exam_status || "not started"} | Certificate: {patient.medical_certificate_status || "pending"} | Fitness: {patient.fitness_status || "pending"} | Records on file: {examEvents.length}
          </p>
        </div>

        <DepartmentFormsPanel
          title="Clinical Forms For This Patient"
          description="Complete consultation, student medical examination, certificate, and referral forms from inside the patient record."
          templateKeys={["outpatient_progress_notes", "student_medical_exam", "medical_fitness_certificate", "consultation_referral"]}
          fixedPatientId={patient.patient_id}
          triggerLabel="Open Patient Forms"
        />

        <Tabs defaultValue="journey" className="space-y-4">
          <TabsList className="bg-secondary flex-wrap">
            <TabsTrigger value="journey" className="gap-1"><Activity className="h-4 w-4" /> Full Journey</TabsTrigger>
            <TabsTrigger value="consultations" className="gap-1"><Stethoscope className="h-4 w-4" /> Consultations</TabsTrigger>
            <TabsTrigger value="vitals" className="gap-1"><Heart className="h-4 w-4" /> Vitals</TabsTrigger>
            <TabsTrigger value="lab" className="gap-1"><FlaskConical className="h-4 w-4" /> Lab</TabsTrigger>
            <TabsTrigger value="prescriptions" className="gap-1"><Pill className="h-4 w-4" /> Prescriptions</TabsTrigger>
            <TabsTrigger value="billing" className="gap-1"><CreditCard className="h-4 w-4" /> Billing</TabsTrigger>
            <TabsTrigger value="documents" className="gap-1" onClick={() => {
              if (!docsLoaded && id) {
                const pid = patient?.patient_id || id;
                api.patients.getDocuments(pid)
                  .then((res: any) => { setDocuments(res || []); setDocsLoaded(true); })
                  .catch(() => toast.error("Failed to load documents"));
              }
            }}><FolderOpen className="h-4 w-4" /> Documents</TabsTrigger>
            <TabsTrigger value="history" className="gap-1" onClick={() => {
              if (!medHistory && !historyLoading && id) {
                setHistoryLoading(true);
                api.patients.getHistory(id)
                  .then(setMedHistory)
                  .catch(() => toast.error("Failed to load medical history"))
                  .finally(() => setHistoryLoading(false));
              }
            }}><History className="h-4 w-4" /> Med History</TabsTrigger>
          </TabsList>
          <TabsContent value="journey"><JourneyTimeline events={journey} /></TabsContent>
          <TabsContent value="consultations"><JourneyTimeline events={consultations} /></TabsContent>
          <TabsContent value="vitals"><VitalsChart triageRecords={triageRecords} /></TabsContent>
          <TabsContent value="lab"><JourneyTimeline events={labEvents} /></TabsContent>
          <TabsContent value="prescriptions"><JourneyTimeline events={rxEvents} /></TabsContent>
          <TabsContent value="billing"><JourneyTimeline events={billingEvents} /></TabsContent>
          <TabsContent value="documents">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{documents.length} document(s) on file</p>
                <div className="flex items-center gap-2">
                  <select id="doc-type-select" className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm">
                    <option value="Lab Report">Lab Report</option>
                    <option value="Referral Letter">Referral Letter</option>
                    <option value="Prescription">Prescription</option>
                    <option value="Consent Form">Consent Form</option>
                    <option value="X-Ray / Imaging">X-Ray / Imaging</option>
                    <option value="Other">Other</option>
                  </select>
                  <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file || !patient) return;
                      const docType = (document.getElementById("doc-type-select") as HTMLSelectElement)?.value || "Other";
                      setUploading(true);
                      try {
                        await api.patients.uploadDocument(patient.patient_id, file, { documentType: docType });
                        const updated = await api.patients.getDocuments(patient.patient_id);
                        setDocuments(updated || []);
                        toast.success(`${file.name} uploaded`);
                      } catch { toast.error("Upload failed"); }
                      finally { setUploading(false); e.target.value = ""; }
                    }} />
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                    <Upload className="h-4 w-4 mr-1" />{uploading ? "Uploading..." : "Upload"}
                  </Button>
                </div>
              </div>
              {documents.length === 0
                ? <p className="py-8 text-center text-sm text-muted-foreground">No documents uploaded yet. Use the Upload button to add files.</p>
                : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {documents.map((doc: any) => (
                      <div key={doc.documentId || doc.id} className="rounded-xl border border-border bg-card p-4 flex flex-col gap-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{doc.originalFilename || doc.fileName || "Document"}</p>
                            <p className="text-xs text-muted-foreground">{doc.documentType} • {doc.fileSize ? `${Math.round(doc.fileSize / 1024)}KB` : ""}</p>
                            <p className="text-xs text-muted-foreground">{doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : ""}</p>
                          </div>
                        </div>
                        {doc.description && <p className="text-xs text-muted-foreground italic">{doc.description}</p>}
                        <div className="flex gap-2 mt-auto pt-1">
                          <a href={`/api/documents/${doc.documentId}/download`} target="_blank" rel="noreferrer"
                            className="flex items-center gap-1 text-xs text-primary hover:underline">
                            <Download className="h-3 w-3" /> Download
                          </a>
                          <button className="flex items-center gap-1 text-xs text-destructive hover:underline ml-auto"
                            onClick={async () => {
                              try {
                                await api.patients.deleteDocument(doc.documentId);
                                setDocuments((d) => d.filter((x) => x.documentId !== doc.documentId));
                                toast.success("Document removed");
                              } catch { toast.error("Failed to delete document"); }
                            }}>
                            <Trash2 className="h-3 w-3" /> Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
              }
            </div>
          </TabsContent>
          <TabsContent value="history">
            {historyLoading && <p className="py-8 text-center text-sm text-muted-foreground">Loading medical history...</p>}
            {!historyLoading && !medHistory && <p className="py-8 text-center text-sm text-muted-foreground">Click the "Med History" tab to load the full backend timeline.</p>}
            {medHistory && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">{medHistory.totalEvents} event(s) across all records</p>
                {(medHistory.timeline as any[]).map((evt: any, i: number) => {
                  const typeColor: Record<string, string> = {
                    triage: "bg-yellow-500", encounter: "bg-blue-500", lab_test: "bg-purple-500",
                    prescription: "bg-pink-500", admission: "bg-red-500", referral: "bg-orange-500", imaging: "bg-sky-500",
                  };
                  const color = typeColor[evt.type] || "bg-muted";
                  return (
                    <div key={i} className="flex gap-3">
                      <div className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${color}`} />
                      <div className="flex-1 rounded-xl border border-border bg-card p-3">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-sm font-medium text-card-foreground">{evt.summary}</span>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">{evt.date ? new Date(evt.date).toLocaleDateString() : "—"}</span>
                        </div>
                        <span className="inline-block rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground capitalize">{evt.type.replace("_", " ")}</span>
                      </div>
                    </div>
                  );
                })}
                {medHistory.timeline.length === 0 && <p className="text-center text-sm text-muted-foreground py-6">No history records found.</p>}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
      <ConsultationDialog open={showConsultation} onOpenChange={setShowConsultation} patientId={patient.patient_id} />
      <RecordVitalsDialog open={showVitals} onOpenChange={setShowVitals} />
      <EditPatientDialog
        open={showEditPatient}
        onOpenChange={setShowEditPatient}
        patient={patient}
        onSaved={(updatedPatient) => setPatient(updatedPatient)}
      />
    </div>
  );
}
