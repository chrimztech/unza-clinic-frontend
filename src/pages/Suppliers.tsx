import TopBar from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable, Column } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import StatCard from "@/components/dashboard/StatCard";
import { Search, Plus, Truck, Package, AlertCircle, CheckCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { hasPermission } from "@/lib/navigation";
import api from "@/lib/api";

interface SupplierEntry {
  id: number;
  supplierId: string;
  name: string;
  contact: string;
  phone: string;
  email: string;
  items: number;
  lastOrder: string;
  status: "active" | "inactive";
}

const supplierCols: Column<SupplierEntry>[] = [
  { header: "ID", accessor: "supplierId" },
  { header: "Supplier", accessor: (r) => <div><p className="text-sm font-medium">{r.name}</p><p className="text-xs text-muted-foreground">{r.contact}</p></div> },
  { header: "Phone", accessor: "phone" },
  { header: "Items Supplied", accessor: (r) => String(r.items) },
  { header: "Last Order", accessor: "lastOrder" },
  { header: "Status", accessor: (r) => <StatusBadge status={r.status} /> },
];

export default function Suppliers() {
  const { user } = useAuth();
  const canManageSuppliers = hasPermission(user, ["suppliers.view"]);
  const [search, setSearch] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [suppliers, setSuppliers] = useState<SupplierEntry[]>([]);
  const [form, setForm] = useState({ name: "", contact: "", phone: "", email: "" });

  useEffect(() => {
    api.suppliers.getAll().then(setSuppliers).catch(() => toast.error("Failed to load suppliers"));
  }, []);

  const filtered = suppliers.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()));

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newSupplier = await api.suppliers.create(form);
      setSuppliers((prev) => [newSupplier, ...prev]);
      toast.success(`Supplier "${form.name}" added successfully!`);
      setForm({ name: "", contact: "", phone: "", email: "" });
      setShowAddDialog(false);
    } catch {
      toast.error("Failed to add supplier");
    }
  };

  return (
    <div>
      <TopBar title="Supplier Management" subtitle="Manage pharmaceutical suppliers and purchase orders" />
      <div className="p-6 space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Truck} title="Active Suppliers" value={String(suppliers.filter((s) => s.status === "active").length)} />
          <StatCard icon={Package} title="Suppliers" value={String(suppliers.length)} />
          <StatCard icon={AlertCircle} title="Inactive" value={String(suppliers.filter((s) => s.status === "inactive").length)} changeType="negative" />
          <StatCard icon={CheckCircle} title="Active" value={String(suppliers.filter((s) => s.status === "active").length)} changeType="positive" />
        </div>

        <div>
          <h3 className="text-sm font-semibold font-display text-foreground mb-3">Suppliers</h3>
          <div className="flex flex-col sm:flex-row gap-3 justify-between mb-3">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search suppliers..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            {canManageSuppliers && <Button size="sm" className="gradient-primary text-primary-foreground" onClick={() => setShowAddDialog(true)}><Plus className="h-4 w-4 mr-1" /> Add Supplier</Button>}
          </div>
          <DataTable columns={supplierCols} data={filtered} />
        </div>
      </div>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle className="font-display">Add New Supplier</DialogTitle></DialogHeader>
          <form onSubmit={handleAddSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Company Name *</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label>Contact Person *</Label>
              <Input value={form.contact} onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Phone *</Label>
                <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label>Email *</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
              <Button type="submit" className="gradient-primary text-primary-foreground">Add Supplier</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
