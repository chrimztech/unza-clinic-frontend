import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardPlus, FileText, Search, UserPlus, Users } from "lucide-react";
import TopBar from "@/components/layout/TopBar";
import StatCard from "@/components/dashboard/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import DepartmentFormsPanel from "@/components/clinical/DepartmentFormsPanel";
import api from "@/lib/api";
import { toast } from "sonner";

export default function ReceptionDesk() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<any[]>([]);
  const [encounters, setEncounters] = useState<any[]>([]);
  const [forms, setForms] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadDesk() {
      try {
        const [patientData, encounterData, formData] = await Promise.all([
          api.patients.getAll(),
          api.encounters.getAll(),
          api.clinicalForms.getAll(),
        ]);
        setPatients(patientData || []);
        setEncounters(encounterData || []);
        setForms(formData || []);
      } catch {
        toast.error("Failed to load reception desk");
      }
    }
    loadDesk();
  }, []);

  const walkInsToday = encounters.filter((entry) => String(entry.createdAt || "").slice(0, 10) === new Date().toISOString().slice(0, 10)).length;
  const receptionOpen = encounters.filter((entry) => !entry.checkedOut && entry.currentStage === "RECEPTION").length;
  const receptionForms = forms.filter((entry) => ["Reception"].includes(entry.department)).length;

  const filteredPatients = useMemo(() => {
    const needle = search.toLowerCase();
    return patients.filter((patient) =>
      !needle ||
      String(patient.name || "").toLowerCase().includes(needle) ||
      String(patient.patient_id || "").toLowerCase().includes(needle) ||
      String(patient.clinic_number || "").toLowerCase().includes(needle) ||
      String(patient.student_id || "").toLowerCase().includes(needle) ||
      String(patient.man_number || "").toLowerCase().includes(needle),
    ).slice(0, 12);
  }, [patients, search]);

  return (
    <div>
      <TopBar title="Reception Desk" subtitle="Register walk-ins, confirm identity, and open the visit into clinic flow." />
      <div className="p-6 space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Users} title="Registered Patients" value={String(patients.length)} />
          <StatCard icon={ClipboardPlus} title="Walk-Ins Today" value={String(walkInsToday)} />
          <StatCard icon={FileText} title="Reception Forms" value={String(receptionForms)} />
          <StatCard icon={UserPlus} title="Waiting at Reception" value={String(receptionOpen)} />
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-base font-bold font-display text-card-foreground">Reception Actions</h3>
              <p className="text-xs text-muted-foreground">Use reception to create or continue a walk-in visit.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => navigate("/patients/register")} className="gradient-primary text-primary-foreground">
                <UserPlus className="mr-2 h-4 w-4" /> Register New Walk-In
              </Button>
              <Button variant="outline" onClick={() => navigate("/patient-flow")}>
                <ClipboardPlus className="mr-2 h-4 w-4" /> Open Walk-In Flow
              </Button>
              <Button variant="outline" onClick={() => navigate("/clinical-forms")}>
                <FileText className="mr-2 h-4 w-4" /> Reception Forms
              </Button>
            </div>
          </div>
        </div>

        <DepartmentFormsPanel
          title="Reception Forms"
          description="Capture reception-only forms directly where registration and walk-in verification happen."
          templateKeys={["medical_record_cover", "general_client_information"]}
          triggerLabel="Capture Reception Form"
        />

        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-base font-bold font-display text-card-foreground">Patient Search</h3>
              <p className="text-xs text-muted-foreground">Find existing students, staff, dependants, or external clients.</p>
            </div>
            <div className="relative w-full lg:w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, clinic no, student ID..." className="pl-9" />
            </div>
          </div>

          <div className="grid gap-3">
            {filteredPatients.map((patient) => (
              <button
                key={patient.patient_id}
                onClick={() => navigate(`/patients/${patient.patient_id}`)}
                className="rounded-xl border border-border p-4 text-left transition hover:border-[#16641D]/40 hover:bg-[#16641D]/5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-card-foreground">{patient.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {[patient.clinic_number || patient.patient_id, patient.patient_type, patient.school || patient.program || patient.man_number].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <Badge variant="outline">{patient.status || "registered"}</Badge>
                </div>
              </button>
            ))}
            {filteredPatients.length === 0 && (
              <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                No patient records match your search.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
