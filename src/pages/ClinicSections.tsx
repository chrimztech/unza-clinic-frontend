import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  BedDouble,
  Building2,
  CreditCard,
  Eye,
  FileText,
  FlaskConical,
  Pill,
  Siren,
  Stethoscope,
  Users,
} from "lucide-react";
import TopBar from "@/components/layout/TopBar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

type SectionSummary = {
  id: string;
  name: string;
  activeCount: number;
  pendingCount: number;
  formCount: number;
  description: string;
};

type SectionBlueprint = {
  id: string;
  title: string;
  icon: React.ElementType;
  color: string;
  responsibilities: string[];
  forms: string[];
  actions: { label: string; to: string }[];
};

const sectionBlueprints: SectionBlueprint[] = [
  {
    id: "reception",
    title: "Reception & Walk-In",
    icon: Users,
    color: "text-[#007A3D]",
    responsibilities: [
      "Register walk-in students, staff, dependants, and external clients",
      "Open a visit encounter and route the client to the next clinical unit",
      "Confirm clinic number, school/department, and emergency contacts",
    ],
    forms: ["Medical record book cover", "General client information", "Walk-in encounter record"],
    actions: [
      { label: "Open Reception Desk", to: "/reception-desk" },
      { label: "Register Patient", to: "/patients/register" },
      { label: "Open Walk-In Flow", to: "/patient-flow" },
    ],
  },
  {
    id: "triage",
    title: "Triage",
    icon: AlertTriangle,
    color: "text-orange-600",
    responsibilities: [
      "Capture structured vital signs and classify urgency",
      "Record pain score, consciousness level, BMI, and nurse notes",
      "Escalate emergency and urgent cases immediately",
    ],
    forms: ["Triage assessment", "Vital signs record", "Outpatient progress notes"],
    actions: [
      { label: "Open Triage", to: "/triage" },
      { label: "Walk-In Flow", to: "/patient-flow" },
      { label: "Clinical Forms", to: "/clinical-forms" },
    ],
  },
  {
    id: "consultation",
    title: "Consultation / OPD",
    icon: Stethoscope,
    color: "text-sky-700",
    responsibilities: [
      "Assess, diagnose, document impressions, and issue treatment plans",
      "Order laboratory tests, imaging, prescriptions, referrals, or admission",
      "Keep the outpatient clinical notes linked to the patient encounter",
    ],
    forms: ["Outpatient progress notes", "Medical referral", "Medical fitness certificate"],
    actions: [
      { label: "Medical Records", to: "/medical-records" },
      { label: "Prescriptions", to: "/prescriptions" },
      { label: "Clinical Forms", to: "/clinical-forms" },
    ],
  },
  {
    id: "laboratory",
    title: "Laboratory",
    icon: FlaskConical,
    color: "text-violet-700",
    responsibilities: [
      "Receive test requests, log specimens, and enter validated results",
      "Maintain the laboratory register and support routine plus special tests",
      "Track pending and completed requests for same-day walk-ins",
    ],
    forms: ["Laboratory request form", "General lab slip", "Laboratory register"],
    actions: [
      { label: "Laboratory", to: "/laboratory" },
      { label: "Lab Billing", to: "/billing?department=Laboratory" },
      { label: "Clinical Forms", to: "/clinical-forms" },
      { label: "Reports", to: "/reports" },
    ],
  },
  {
    id: "pharmacy",
    title: "Pharmacy",
    icon: Pill,
    color: "text-emerald-700",
    responsibilities: [
      "Dispense medicines safely and reconcile available stock",
      "Watch critical stock lines and expiry dates",
      "Issue outpatient and inpatient medicines against the recorded encounter",
    ],
    forms: ["Prescription form", "In-patient drug sheet", "Drug issue references"],
    actions: [
      { label: "Pharmacy", to: "/pharmacy" },
      { label: "Pharmacy Billing", to: "/billing?department=Pharmacy" },
      { label: "Inventory", to: "/inventory" },
      { label: "Suppliers", to: "/suppliers" },
    ],
  },
  {
    id: "billing",
    title: "Billing & Accounts",
    icon: CreditCard,
    color: "text-amber-700",
    responsibilities: [
      "Apply approved UNZA fees and issue invoices for services rendered",
      "Track cumulative patient balances and clear payment requirements",
      "Support cash, scheme, NHIMA, and other clinic billing workflows",
    ],
    forms: ["Invoice records", "Fee reference sheets", "Payment clearance support"],
    actions: [
      { label: "Billing", to: "/billing" },
      { label: "Manage Tariffs", to: "/billing/tariffs" },
      { label: "Clinical Forms", to: "/clinical-forms" },
      { label: "Reports", to: "/reports" },
    ],
  },
  {
    id: "medical-records",
    title: "Medical Records",
    icon: FileText,
    color: "text-slate-700",
    responsibilities: [
      "Keep the digital file aligned to the paper record book",
      "Store forms, consultation notes, lab results, and referrals together",
      "Support continuity of care for returning UNZA clients",
    ],
    forms: ["General client information", "Clinical form archive", "Medical record book pages"],
    actions: [
      { label: "Open Records Desk", to: "/records-desk" },
      { label: "Medical Records", to: "/medical-records" },
      { label: "Clinical Forms", to: "/clinical-forms" },
      { label: "Patients", to: "/patients" },
    ],
  },
  {
    id: "mch",
    title: "Maternal & Child Health",
    icon: Building2,
    color: "text-pink-700",
    responsibilities: [
      "Support antenatal, under-five, and family planning services",
      "Use MCH-specific charges and service references",
      "Maintain records for mother and child follow-up visits",
    ],
    forms: ["MCH fee references", "General client information", "Clinical review forms"],
    actions: [
      { label: "Clinical Forms", to: "/clinical-forms" },
      { label: "MCH Billing", to: "/billing?department=MCH" },
      { label: "Patient Flow", to: "/patient-flow" },
    ],
  },
  {
    id: "eye-clinic",
    title: "Eye Clinic",
    icon: Eye,
    color: "text-cyan-700",
    responsibilities: [
      "Capture eye clinic outpatient details and optical findings",
      "Prepare prescriptions for spectacles and eye-care products",
      "Support eye-service pricing and dispensing references",
    ],
    forms: ["Eye clinic out-patient record", "Spectacles prescription", "Eye care fee references"],
    actions: [
      { label: "Clinical Forms", to: "/clinical-forms" },
      { label: "Eye Billing", to: "/billing?department=Eye Clinic" },
      { label: "Patients", to: "/patients" },
    ],
  },
  {
    id: "inpatient",
    title: "Inpatient / Wards",
    icon: BedDouble,
    color: "text-indigo-700",
    responsibilities: [
      "Admit, monitor, and discharge patients who require ward care",
      "Track bed use and in-patient treatment instructions",
      "Maintain admission records and drug administration sheets",
    ],
    forms: ["Admission to sick list", "In-patient drug sheet", "Ward treatment records"],
    actions: [
      { label: "Admissions", to: "/admissions" },
      { label: "Wards", to: "/wards" },
      { label: "Clinical Forms", to: "/clinical-forms" },
    ],
  },
  {
    id: "emergency",
    title: "Emergency",
    icon: Siren,
    color: "text-red-700",
    responsibilities: [
      "Stabilize critical arrivals and fast-track them to immediate care",
      "Coordinate with triage, consultation, wards, and diagnostics",
      "Document severity, presenting complaints, and active emergency cases",
    ],
    forms: ["Emergency triage", "Urgent clinical notes", "Referral and admission support"],
    actions: [
      { label: "Emergency", to: "/emergency" },
      { label: "Triage", to: "/triage" },
      { label: "Patient Flow", to: "/patient-flow" },
    ],
  },
];

function guessSectionId(department?: string) {
  const value = (department || "").toLowerCase();
  if (value.includes("pharm")) return "pharmacy";
  if (value.includes("lab")) return "laboratory";
  if (value.includes("record")) return "medical-records";
  if (value.includes("eye")) return "eye-clinic";
  if (value.includes("emerg")) return "emergency";
  if (value.includes("triage") || value.includes("nursing")) return "triage";
  if (value.includes("mch") || value.includes("maternal")) return "mch";
  if (value.includes("ward") || value.includes("inpatient")) return "inpatient";
  if (value.includes("bill") || value.includes("account")) return "billing";
  if (value.includes("reception")) return "reception";
  return "consultation";
}

export default function ClinicSections() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState<any>(null);
  const [selectedSection, setSelectedSection] = useState(guessSectionId(user?.department));

  useEffect(() => {
    api.dashboard.get().then(setDashboard).catch(() => toast.error("Failed to load clinic section modules"));
  }, []);

  const summaries = dashboard?.sectionSummaries ?? [];
  const summaryMap = useMemo(() => {
    return new Map<string, SectionSummary>(summaries.map((summary: SectionSummary) => [summary.id, summary]));
  }, [summaries]);

  return (
    <div>
      <TopBar
        title="Clinic Section Modules"
        subtitle="Department-based dashboards for how each UNZA clinic section should work in a walk-in setting."
      />
      <div className="p-6 space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {sectionBlueprints.slice(0, 4).map((section) => {
            const summary = summaryMap.get(section.id);
            return (
              <button
                key={section.id}
                onClick={() => setSelectedSection(section.id)}
                className={`rounded-2xl border p-5 text-left transition ${selectedSection === section.id ? "border-[#007A3D] bg-[#007A3D]/5" : "border-border bg-card hover:border-[#007A3D]/40"}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <section.icon className={`h-5 w-5 ${section.color}`} />
                  <Badge variant="outline">{summary?.activeCount ?? 0} active</Badge>
                </div>
                <h3 className="mt-4 text-base font-semibold font-display text-card-foreground">{section.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{summary?.description || "Module summary loading..."}</p>
              </button>
            );
          })}
        </div>

        <Tabs value={selectedSection} onValueChange={setSelectedSection} className="space-y-6">
          <TabsList className="flex h-auto flex-wrap justify-start gap-2 bg-transparent p-0">
            {sectionBlueprints.map((section) => (
              <TabsTrigger key={section.id} value={section.id} className="border border-border bg-card data-[state=active]:border-[#007A3D] data-[state=active]:bg-[#007A3D] data-[state=active]:text-white">
                {section.title}
              </TabsTrigger>
            ))}
          </TabsList>

          {sectionBlueprints.map((section) => {
            const summary = summaryMap.get(section.id);
            return (
              <TabsContent key={section.id} value={section.id} className="space-y-6">
                <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                  <div className="rounded-2xl border border-border bg-card p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-3">
                          <section.icon className={`h-6 w-6 ${section.color}`} />
                          <h2 className="text-xl font-semibold font-display text-card-foreground">{section.title}</h2>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-muted-foreground">
                          {summary?.description || "This section module combines the right workflows, forms, and operational views for the clinic team."}
                        </p>
                      </div>
                      <Badge variant="secondary">{summary?.formCount ?? 0} linked forms</Badge>
                    </div>

                    <div className="mt-6 grid gap-4 md:grid-cols-3">
                      <div className="rounded-xl border border-border p-4">
                        <p className="text-xs uppercase tracking-wider text-muted-foreground">Active Workload</p>
                        <p className="mt-2 text-2xl font-bold font-display text-card-foreground">{summary?.activeCount ?? 0}</p>
                      </div>
                      <div className="rounded-xl border border-border p-4">
                        <p className="text-xs uppercase tracking-wider text-muted-foreground">Pending / Critical</p>
                        <p className="mt-2 text-2xl font-bold font-display text-card-foreground">{summary?.pendingCount ?? 0}</p>
                      </div>
                      <div className="rounded-xl border border-border p-4">
                        <p className="text-xs uppercase tracking-wider text-muted-foreground">Digital Forms</p>
                        <p className="mt-2 text-2xl font-bold font-display text-card-foreground">{summary?.formCount ?? 0}</p>
                      </div>
                    </div>

                    <div className="mt-6">
                      <h3 className="text-sm font-semibold font-display text-card-foreground">What This Section Should Do</h3>
                      <div className="mt-3 grid gap-3">
                        {section.responsibilities.map((item) => (
                          <div key={item} className="rounded-xl border border-border bg-muted/20 px-4 py-3 text-sm text-card-foreground">
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="rounded-2xl border border-border bg-card p-6">
                      <h3 className="text-sm font-semibold font-display text-card-foreground">Recommended Forms</h3>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {section.forms.map((item) => (
                          <Badge key={item} variant="outline">{item}</Badge>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-border bg-card p-6">
                      <h3 className="text-sm font-semibold font-display text-card-foreground">Primary Actions</h3>
                      <div className="mt-4 grid gap-3">
                        {section.actions.map((action) => (
                          <Button key={action.label} variant="outline" className="justify-start" onClick={() => navigate(action.to)}>
                            {action.label}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-border bg-card p-6">
                      <h3 className="text-sm font-semibold font-display text-card-foreground">UNZA Walk-In Model</h3>
                      <p className="mt-3 text-sm leading-6 text-muted-foreground">
                        This module is designed around walk-in visits, not appointment booking. Patients register, get triaged, move through consultation and service points, and are checked out only after the required clinical, laboratory, pharmacy, and billing steps are complete.
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </div>
  );
}
