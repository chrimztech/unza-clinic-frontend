import TopBar from "@/components/layout/TopBar";
import { DataTable, Column } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Edit, Building2 } from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";
import { Users, Stethoscope, BedDouble } from "lucide-react";
import { useState, useEffect } from "react";
import AddDepartmentDialog, { DepartmentEntry } from "@/components/dialogs/AddDepartmentDialog";
import { toast } from "sonner";
import api from "@/lib/api";

export default function Departments() {
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<DepartmentEntry | null>(null);
  const [depts, setDepts] = useState<DepartmentEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDepartments() {
      try {
        const data = await api.departments.getAll();
        setDepts(data || []);
      } catch (e) {
        toast.error("Failed to load departments");
      } finally {
        setLoading(false);
      }
    }
    loadDepartments();
  }, []);

  const filtered = depts.filter(d =>
    d.name?.toLowerCase().includes(search.toLowerCase()) ||
    d.head?.toLowerCase().includes(search.toLowerCase())
  );
  const totalDoctors = depts.reduce((s, d) => s + (d.doctors || 0), 0);
  const totalNurses = depts.reduce((s, d) => s + (d.nurses || 0), 0);
  const totalBeds = depts.reduce((s, d) => s + (d.beds || 0), 0);

  const columns: Column<DepartmentEntry>[] = [
    { header: "Code", accessor: "code" },
    { header: "Department", accessor: "name" },
    { header: "Head of Dept.", accessor: "head" },
    { header: "Doctors", accessor: (r) => String(r.doctors) },
    { header: "Nurses", accessor: (r) => String(r.nurses) },
    { header: "Beds", accessor: (r) => String(r.beds) },
    { header: "Location", accessor: "location" },
    { header: "Actions", accessor: (r) => (
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={(e) => {
          e.stopPropagation();
          setEditingDepartment(r);
          setShowAdd(true);
        }}
      >
        <Edit className="h-3.5 w-3.5" />
      </Button>
    )},
  ];

  return (
    <div>
      <TopBar title="Department Management" subtitle="Manage hospital departments and resource allocation" />
      <div className="p-6 space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Building2} title="Departments" value={String(depts.length)} />
          <StatCard icon={Stethoscope} title="Total Doctors" value={String(totalDoctors)} />
          <StatCard icon={Users} title="Total Nurses" value={String(totalNurses)} />
          <StatCard icon={BedDouble} title="Total Beds" value={String(totalBeds)} />
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search departments..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button
            size="sm"
            className="gradient-primary text-primary-foreground"
            onClick={() => {
              setEditingDepartment(null);
              setShowAdd(true);
            }}
          >
            <Plus className="h-4 w-4 mr-1" /> Add Department
          </Button>
        </div>
        {loading ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Loading departments...
          </div>
        ) : (
          <DataTable columns={columns} data={filtered} />
        )}
      </div>
      <AddDepartmentDialog
        open={showAdd}
        onOpenChange={(open) => {
          setShowAdd(open);
          if (!open) {
            setEditingDepartment(null);
          }
        }}
        initialData={editingDepartment}
        onSubmit={(entry) => setDepts((prev) => {
          const exists = prev.some((department) => department.code === entry.code);
          if (exists) {
            return prev.map((department) => department.code === entry.code ? entry : department);
          }
          return [entry, ...prev];
        })}
      />
    </div>
  );
}
