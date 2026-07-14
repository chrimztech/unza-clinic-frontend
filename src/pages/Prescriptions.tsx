import TopBar from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable, Column } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Search, Plus, PackageCheck } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { hasPermission } from "@/lib/navigation";
import NewPrescriptionDialog, { PrescriptionEntry } from "@/components/dialogs/NewPrescriptionDialog";
import DepartmentFormsPanel from "@/components/clinical/DepartmentFormsPanel";
import api from "@/lib/api";

export default function Prescriptions() {
  const { user } = useAuth();
  const canPrescribe = hasPermission(user, ["prescriptions.view"]);
  const canDispense = hasPermission(user, ["pharmacy.dispense"]);
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [prescriptions, setPrescriptions] = useState<PrescriptionEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPrescriptions() {
      try {
        const data = await api.prescriptions.getAll();
        setPrescriptions(data || []);
      } catch (e) {
        toast.error("Failed to load prescriptions");
      } finally {
        setLoading(false);
      }
    }
    loadPrescriptions();
  }, []);

  const filtered = prescriptions.filter(p =>
    p.patient?.toLowerCase().includes(search.toLowerCase()) ||
    p.rxId?.toLowerCase().includes(search.toLowerCase())
  );

  const dispense = async (id: number) => {
    try {
      const updated = await api.prescriptions.dispense(id);
      setPrescriptions(prev => prev.map(p => p.id === id ? updated : p));
      toast.success("Prescription dispensed and pharmacy stock updated");
    } catch (error: any) {
      toast.error(error?.message || "Failed to dispense prescription");
    }
  };

  const columns: Column<PrescriptionEntry>[] = [
    { header: "Rx ID", accessor: "rxId" },
    { header: "Patient", accessor: (r) => (
      <div>
        <p className="text-sm font-medium">{r.patient}</p>
        <p className="text-xs text-muted-foreground">{r.patientId}</p>
      </div>
    )},
    { header: "Doctor", accessor: "doctor" },
    { header: "Date", accessor: "date" },
    { header: "Items", accessor: (r) => (
      <div className="space-y-0.5">
        {r.drugItems && r.drugItems.length > 0 ? (
          r.drugItems.map((item, idx) => (
            <div key={idx} className="text-sm">
              <span className="font-medium">{item.drug_name}</span>
              <span className="text-xs text-muted-foreground ml-1">× {item.quantity} | {item.dosage} | {item.duration}</span>
            </div>
          ))
        ) : (
          <div>
            <p className="text-sm font-medium">{r.items}</p>
            <p className="text-xs text-muted-foreground">Qty: {r.quantity || 1}{r.medicationClass ? ` | ${r.medicationClass}` : ""}</p>
          </div>
        )}
        {r.program && <p className="text-xs text-muted-foreground">{r.program}</p>}
      </div>
    ) },
    { header: "Status", accessor: (r) => <StatusBadge status={r.status} /> },
    { header: "Action", accessor: (r) => r.status === "pending" && canDispense ? (
      <Button variant="outline" size="sm" className="text-xs" onClick={() => dispense(r.id)}>
        <PackageCheck className="h-3.5 w-3.5 mr-1" /> Dispense
      </Button>
    ) : null },
  ];

  return (
    <div>
      <TopBar title="Prescriptions" subtitle="Manage and fulfill patient prescriptions" />
      <div className="p-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search prescriptions..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {canPrescribe && (
            <Button size="sm" className="gradient-primary text-primary-foreground" onClick={() => setShowNew(true)}>
              <Plus className="h-4 w-4 mr-1" /> New Prescription
            </Button>
          )}
        </div>
        <DepartmentFormsPanel
          title="Prescription Forms"
          description="Capture the paper-style prescription form in the same place you create and dispense prescriptions."
          templateKeys={["pharmacy_prescription"]}
          triggerLabel="Open Prescription Form"
        />
        <DataTable columns={columns} data={filtered} />
      </div>
      <NewPrescriptionDialog open={showNew} onOpenChange={setShowNew} onSubmit={(entry) => setPrescriptions(prev => [entry, ...prev])} />
    </div>
  );
}
