import { useEffect, useMemo, useState } from "react";
import { Archive, FileText, FolderOpen, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import TopBar from "@/components/layout/TopBar";
import StatCard from "@/components/dashboard/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/api";
import { toast } from "sonner";

export default function RecordsDesk() {
  const navigate = useNavigate();
  const [forms, setForms] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [encounters, setEncounters] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadRecords() {
      try {
        const [formData, patientData, encounterData] = await Promise.all([
          api.clinicalForms.getAll(),
          api.patients.getAll(),
          api.encounters.getAll(),
        ]);
        setForms(formData || []);
        setPatients(patientData || []);
        setEncounters(encounterData || []);
      } catch {
        toast.error("Failed to load records desk");
      }
    }
    loadRecords();
  }, []);

  const savedToday = forms.filter((entry) => String(entry.createdAt || "").slice(0, 10) === new Date().toISOString().slice(0, 10)).length;
  const checkedOutToday = encounters.filter((entry) => entry.checkedOut && String(entry.checkoutTime || "").slice(0, 10) === new Date().toISOString().slice(0, 10)).length;

  const patientsWithRecords = useMemo(() => {
    const formCounts = new Map<string, number>();
    forms.forEach((entry) => formCounts.set(entry.patientId, (formCounts.get(entry.patientId) || 0) + 1));

    return patients
      .map((patient) => ({
        ...patient,
        recordCount: formCounts.get(patient.patient_id) || 0,
      }))
      .filter((patient) => patient.recordCount > 0)
      .filter((patient) => {
        const needle = search.toLowerCase();
        return !needle ||
          String(patient.name || "").toLowerCase().includes(needle) ||
          String(patient.patient_id || "").toLowerCase().includes(needle) ||
          String(patient.clinic_number || "").toLowerCase().includes(needle);
      })
      .sort((a, b) => b.recordCount - a.recordCount)
      .slice(0, 15);
  }, [forms, patients, search]);

  return (
    <div>
      <TopBar title="Records Desk" subtitle="Keep the digital file complete, searchable, and aligned with the clinic record book." />
      <div className="p-6 space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Archive} title="Saved Forms" value={String(forms.length)} />
          <StatCard icon={FileText} title="Saved Today" value={String(savedToday)} />
          <StatCard icon={FolderOpen} title="Patients With Records" value={String(patientsWithRecords.length)} />
          <StatCard icon={Archive} title="Checked Out Today" value={String(checkedOutToday)} />
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-base font-bold font-display text-card-foreground">Records Actions</h3>
              <p className="text-xs text-muted-foreground">Open the forms archive, patient charts, and the full walk-in medical record trail.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => navigate("/clinical-forms")} className="gradient-primary text-primary-foreground">
                <FileText className="mr-2 h-4 w-4" /> Open Clinical Forms
              </Button>
              <Button variant="outline" onClick={() => navigate("/medical-records")}>
                <Archive className="mr-2 h-4 w-4" /> Open Medical Records
              </Button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-base font-bold font-display text-card-foreground">Patients With Digital Records</h3>
              <p className="text-xs text-muted-foreground">Use this list to find the file, review forms, and continue care.</p>
            </div>
            <div className="relative w-full lg:w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search patient file..." className="pl-9" />
            </div>
          </div>

          <div className="grid gap-3">
            {patientsWithRecords.map((patient) => (
              <button
                key={patient.patient_id}
                onClick={() => navigate(`/patients/${patient.patient_id}`)}
                className="rounded-xl border border-border p-4 text-left transition hover:border-[#007A3D]/40 hover:bg-[#007A3D]/5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-card-foreground">{patient.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {[patient.clinic_number || patient.patient_id, patient.patient_type, patient.school || patient.man_number].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <Badge variant="outline">{patient.recordCount} forms</Badge>
                </div>
              </button>
            ))}
            {patientsWithRecords.length === 0 && (
              <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                No patient record files match your search.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
