import TopBar from "@/components/layout/TopBar";
import { DataTable, Column } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import StatCard from "@/components/dashboard/StatCard";
import { Search, Plus, UserPlus, UserMinus, BedDouble, Clock } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import AdmitPatientDialog, { AdmissionEntry } from "@/components/dialogs/AdmitPatientDialog";
import DischargePatientDialog from "@/components/dialogs/DischargePatientDialog";
import DepartmentFormsPanel from "@/components/clinical/DepartmentFormsPanel";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { hasPermission } from "@/lib/navigation";
import api from "@/lib/api";

type WardEntry = {
  id: number;
  name: string;
  totalBeds: number;
  occupied: number;
  available: number;
};

export default function Admissions() {
  const { user } = useAuth();
  const canAdmit = hasPermission(user, ["admissions.view"]);
  const [search, setSearch] = useState("");
  const [showAdmit, setShowAdmit] = useState(false);
  const [showDischarge, setShowDischarge] = useState(false);
  const [admissions, setAdmissions] = useState<AdmissionEntry[]>([]);
  const [wards, setWards] = useState<WardEntry[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAdmissions = async () => {
    try {
      const [admissionData, wardData] = await Promise.all([api.admissions.getAll(), api.wards.getAll()]);
      setAdmissions(admissionData || []);
      setWards(wardData || []);
    } catch {
      toast.error("Failed to load admissions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdmissions();
  }, []);

  const filtered = admissions.filter((admission) =>
    admission.patient?.toLowerCase().includes(search.toLowerCase()) ||
    admission.admissionId?.toLowerCase().includes(search.toLowerCase()) ||
    admission.ward?.toLowerCase().includes(search.toLowerCase()),
  );

  const active = useMemo(() => admissions.filter((entry) => entry.status === "active" || entry.status === "critical").length, [admissions]);
  const discharged = useMemo(() => admissions.filter((entry) => entry.status === "discharged").length, [admissions]);
  const totalBeds = useMemo(() => wards.reduce((sum, ward) => sum + ward.totalBeds, 0), [wards]);
  const occupiedBeds = useMemo(() => wards.reduce((sum, ward) => sum + ward.occupied, 0), [wards]);
  const averageStay = admissions.length > 0 ? "Live tracking" : "No admissions";

  const handleDischarge = (id: number) => {
    setSelectedId(id);
    setShowDischarge(true);
  };

  const confirmDischarge = async () => {
    if (!selectedId) return;
    try {
      const updated = await api.admissions.discharge(selectedId);
      setAdmissions((prev) => prev.map((entry) => (entry.id === selectedId ? updated : entry)));
      const latestWards = await api.wards.getAll();
      setWards(latestWards || []);
      toast.success("Patient discharged successfully");
    } catch (error: any) {
      toast.error(error?.message || "Failed to discharge patient");
    } finally {
      setShowDischarge(false);
      setSelectedId(null);
    }
  };

  const columns: Column<AdmissionEntry>[] = [
    { header: "Admission ID", accessor: "admissionId" },
    {
      header: "Patient",
      accessor: (row) => (
        <div>
          <p className="text-sm font-medium">{row.patient}</p>
          <p className="text-xs text-muted-foreground">{row.patientId}</p>
        </div>
      ),
    },
    { header: "Ward / Bed", accessor: (row) => `${row.ward} — ${row.bed}` },
    { header: "Doctor", accessor: "doctor" },
    { header: "Admitted On", accessor: "admittedOn" },
    { header: "Diagnosis", accessor: "diagnosis" },
    { header: "Status", accessor: (row) => <StatusBadge status={row.status} /> },
    {
      header: "Action",
      accessor: (row) =>
        row.status !== "discharged" && canAdmit ? (
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={(event) => {
              event.stopPropagation();
              handleDischarge(row.id);
            }}
          >
            <UserMinus className="mr-1 h-3.5 w-3.5" /> Discharge
          </Button>
        ) : null,
    },
  ];

  return (
    <div>
      <TopBar title="Admissions & Discharges" subtitle="Track admissions against live ward capacity and discharge patients through the system" />
      <div className="p-6 space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={UserPlus} title="Active Admissions" value={String(active)} />
          <StatCard icon={UserMinus} title="Discharged" value={String(discharged)} changeType="positive" />
          <StatCard
            icon={BedDouble}
            title="Beds Occupied"
            value={`${occupiedBeds}/${totalBeds}`}
            change={`${totalBeds ? ((occupiedBeds / totalBeds) * 100).toFixed(1) : 0}% occupancy`}
            changeType="neutral"
          />
          <StatCard icon={Clock} title="Ward Status" value={averageStay} changeType="neutral" />
        </div>
        <div className="flex flex-col justify-between gap-3 sm:flex-row">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search admissions..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {canAdmit && (
            <Button size="sm" className="gradient-primary text-primary-foreground" onClick={() => setShowAdmit(true)}>
              <Plus className="mr-1 h-4 w-4" /> Admit Patient
            </Button>
          )}
        </div>
        <DepartmentFormsPanel
          title="Admission Forms"
          description="Use the inpatient sick-list admission form and drug sheet from the same admissions screen."
          templateKeys={["sick_list_admission", "inpatient_drug_sheet"]}
          triggerLabel="Open Admission Forms"
        />
        <DataTable columns={columns} data={filtered} />
        {!loading && filtered.length === 0 ? <p className="text-sm text-muted-foreground">No admissions match the current search.</p> : null}
      </div>
      <AdmitPatientDialog
        open={showAdmit}
        onOpenChange={setShowAdmit}
        onSubmit={async (entry) => {
          setAdmissions((prev) => [entry, ...prev]);
          const latestWards = await api.wards.getAll();
          setWards(latestWards || []);
        }}
      />
      <DischargePatientDialog
        open={showDischarge}
        onOpenChange={(open) => {
          setShowDischarge(open);
          if (!open) setSelectedId(null);
        }}
        onConfirm={confirmDischarge}
      />
    </div>
  );
}
