import { useEffect, useMemo, useState } from "react";
import TopBar from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Save, Plus } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

type TariffForm = {
  tariffCode: string;
  department: string;
  category: string;
  serviceName: string;
  unitLabel: string;
  price: string;
  status: string;
};

const emptyForm: TariffForm = {
  tariffCode: "",
  department: "",
  category: "",
  serviceName: "",
  unitLabel: "",
  price: "",
  status: "active",
};

export default function TariffManager() {
  const [tariffs, setTariffs] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [form, setForm] = useState<TariffForm>(emptyForm);
  const [editingCode, setEditingCode] = useState<string | null>(null);

  const loadTariffs = () => {
    api.tariffs.getAll().then(setTariffs).catch(() => toast.error("Failed to load tariffs"));
  };

  useEffect(() => {
    loadTariffs();
  }, []);

  const departments = useMemo(
    () => ["all", ...new Set(tariffs.map((tariff) => tariff.department).filter(Boolean))],
    [tariffs]
  );

  const filtered = tariffs.filter((tariff) => {
    const matchesDepartment = departmentFilter === "all" || tariff.department === departmentFilter;
    const matchesSearch = !search
      || tariff.serviceName.toLowerCase().includes(search.toLowerCase())
      || tariff.tariffCode.toLowerCase().includes(search.toLowerCase())
      || tariff.category.toLowerCase().includes(search.toLowerCase());
    return matchesDepartment && matchesSearch;
  });

  const startCreate = () => {
    setEditingCode(null);
    setForm(emptyForm);
  };

  const startEdit = (tariff: any) => {
    setEditingCode(tariff.tariffCode);
    setForm({
      tariffCode: tariff.tariffCode,
      department: tariff.department,
      category: tariff.category,
      serviceName: tariff.serviceName,
      unitLabel: tariff.unitLabel,
      price: String(tariff.price ?? ""),
      status: tariff.status || "active",
    });
  };

  const saveTariff = async (event: React.FormEvent) => {
    event.preventDefault();
    const payload = {
      tariffCode: form.tariffCode.trim(),
      department: form.department.trim(),
      category: form.category.trim(),
      serviceName: form.serviceName.trim(),
      unitLabel: form.unitLabel.trim(),
      price: Number(form.price || 0),
      status: form.status,
    };

    try {
      if (editingCode) {
        await api.tariffs.update(editingCode, payload);
        toast.success("Tariff updated");
      } else {
        await api.tariffs.create(payload);
        toast.success("Tariff added");
      }
      startCreate();
      loadTariffs();
    } catch (error: any) {
      toast.error(error?.message || "Failed to save tariff");
    }
  };

  return (
    <div>
      <TopBar title="Tariff Manager" subtitle="Maintain approved UNZA clinic service fees and section pricing." />
      <div className="p-6 space-y-6">
        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          <form onSubmit={saveTariff} className="rounded-xl bg-card p-5 shadow-card border border-border space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold font-display text-card-foreground">
                  {editingCode ? "Edit Tariff" : "Add Tariff"}
                </h3>
                <p className="text-xs text-muted-foreground">Keep clinic fee changes controlled and section-specific.</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={startCreate}>
                <Plus className="h-4 w-4 mr-1" /> New
              </Button>
            </div>

            <div className="space-y-1.5">
              <Label>Tariff Code</Label>
              <Input value={form.tariffCode} onChange={(e) => setForm((current) => ({ ...current, tariffCode: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label>Department</Label>
              <Input value={form.department} onChange={(e) => setForm((current) => ({ ...current, department: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Input value={form.category} onChange={(e) => setForm((current) => ({ ...current, category: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label>Service Name</Label>
              <Input value={form.serviceName} onChange={(e) => setForm((current) => ({ ...current, serviceName: e.target.value }))} required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Unit Label</Label>
                <Input value={form.unitLabel} onChange={(e) => setForm((current) => ({ ...current, unitLabel: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label>Price (K)</Label>
                <Input type="number" step="0.01" min="0" value={form.price} onChange={(e) => setForm((current) => ({ ...current, price: e.target.value }))} required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(value) => setForm((current) => ({ ...current, status: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" className="w-full gradient-primary text-primary-foreground">
              <Save className="h-4 w-4 mr-1" /> {editingCode ? "Update Tariff" : "Save Tariff"}
            </Button>
          </form>

          <div className="rounded-xl bg-card p-5 shadow-card border border-border space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h3 className="text-sm font-semibold font-display text-card-foreground">Approved Tariffs</h3>
                <p className="text-xs text-muted-foreground">Search and revise the fee catalog by clinic unit.</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-9" placeholder="Search tariff code or service..." value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <div className="w-full sm:w-56">
                  <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((department) => (
                        <SelectItem key={department} value={department}>
                          {department === "all" ? "All Departments" : department}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-2 pr-4">Code</th>
                    <th className="py-2 pr-4">Department</th>
                    <th className="py-2 pr-4">Category</th>
                    <th className="py-2 pr-4">Service</th>
                    <th className="py-2 pr-4">Unit</th>
                    <th className="py-2 pr-4">Fee</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((tariff) => (
                    <tr key={tariff.tariffCode} className="border-b border-border/60">
                      <td className="py-3 pr-4 font-medium text-card-foreground">{tariff.tariffCode}</td>
                      <td className="py-3 pr-4">{tariff.department}</td>
                      <td className="py-3 pr-4">{tariff.category}</td>
                      <td className="py-3 pr-4">{tariff.serviceName}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{tariff.unitLabel}</td>
                      <td className="py-3 pr-4 font-medium text-card-foreground">K {Number(tariff.price || 0).toFixed(2)}</td>
                      <td className="py-3 pr-4 capitalize">{tariff.status}</td>
                      <td className="py-3 pr-4 text-right">
                        <Button size="sm" variant="outline" onClick={() => startEdit(tariff)}>Edit</Button>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-6 text-center text-muted-foreground">No tariffs found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
