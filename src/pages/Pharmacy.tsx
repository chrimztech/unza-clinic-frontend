import TopBar from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { DataTable, Column } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Plus, Search, AlertTriangle, Pill, Package, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import StatCard from "@/components/dashboard/StatCard";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { hasPermission } from "@/lib/navigation";
import AddDrugDialog, { DrugEntry } from "@/components/dialogs/AddDrugDialog";
import DepartmentFormsPanel from "@/components/clinical/DepartmentFormsPanel";
import api from "@/lib/api";
import { toast } from "sonner";
import { exportToPDF } from "@/lib/pdf-export";
import { Download, X } from "lucide-react";
import { Alert, AlertTitle, Collapse, IconButton, Box, Typography } from "@mui/material";

const columns: Column<DrugEntry>[] = [
  { header: "Drug ID", accessor: "drugId" },
  { header: "Name", accessor: "name" },
  { header: "Stock Type", accessor: "drugType" },
  { header: "Category", accessor: "category" },
  { header: "Stock", accessor: (row) => <span className={row.stock < 50 ? "text-destructive font-semibold" : ""}>{row.stock} {row.unit}</span> },
  { header: "Batch", accessor: (row) => row.batchNumber || "-" },
  { header: "Store", accessor: (row) => row.storageLocation || "-" },
  { header: "Expiry", accessor: "expiry" },
  { header: "Status", accessor: (row) => <StatusBadge status={row.status} /> },
];

export default function Pharmacy() {
  const { user } = useAuth();
  const canManageDrugs = hasPermission(user, ["pharmacy.view"]);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [drugs, setDrugs] = useState<DrugEntry[]>([]);
  const [showAlerts, setShowAlerts] = useState(true);
  const [restockTarget, setRestockTarget] = useState<DrugEntry | null>(null);
  const [restockQty, setRestockQty] = useState("");
  const [expiringDrugs, setExpiringDrugs] = useState<any[]>([]);
  const [expiryDays, setExpiryDays] = useState(30);
  const [showExpiry, setShowExpiry] = useState(false);

  useEffect(() => {
    api.drugs.getAll().then(setDrugs).catch(() => toast.error("Failed to load drugs"));
  }, []);

  const loadExpiringDrugs = (days: number) => {
    api.pharmacy.getExpiringDrugs(days)
      .then((res: any) => setExpiringDrugs(res.drugs || []))
      .catch(() => toast.error("Failed to load expiring drugs"));
  };

  const filtered = drugs.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase()) || d.category.toLowerCase().includes(search.toLowerCase()) || d.drugType?.toLowerCase().includes(search.toLowerCase())
  );

  const handleRestock = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!restockTarget) return;
    const quantity = Number(restockQty);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      toast.error("Enter a valid restock quantity");
      return;
    }
    try {
      const updated = await api.drugs.restock(restockTarget.id, quantity);
      setDrugs((current) => current.map((entry) => entry.id === updated.id ? updated : entry));
      toast.success(`${restockTarget.name} restocked by ${quantity} ${restockTarget.unit}`);
      setRestockTarget(null);
      setRestockQty("");
    } catch (error: any) {
      toast.error(error?.message || "Failed to restock drug");
    }
  };

  const available = drugs.filter((d) => d.status === "available").length;
  const critical = drugs.filter((d) => d.status === "critical").length;
  const essential = drugs.filter((d) => d.drugType === "Essential Drugs").length;
  const art = drugs.filter((d) => d.drugType === "ART").length;
  const labChemicals = drugs.filter((d) => d.drugType === "Laboratory Chemicals").length;
  const soonThreshold = new Date();
  soonThreshold.setDate(soonThreshold.getDate() + 60);
  const expiringSoon = drugs.filter((d) => new Date(d.expiry) <= soonThreshold).length;

  const handleExport = async () => {
    await exportToPDF({
      title: "Pharmacy Drug Inventory Report",
      filename: "pharmacy-report",
      columns: [
        { header: "Drug ID", dataKey: "drugId" },
        { header: "Name", dataKey: "name" },
        { header: "Stock Type", dataKey: "drugType" },
        { header: "Category", dataKey: "category" },
        { header: "Stock", dataKey: "stock" },
        { header: "Unit", dataKey: "unit" },
        { header: "Expiry", dataKey: "expiry" },
        { header: "Status", dataKey: "status" }
      ],
      data: filtered,
      subtitle: `Search: ${search || 'None'}`,
    });
  };

  return (
    <div>
      <TopBar title="Pharmacy" subtitle="Manage drug inventory and prescriptions" />
      <div className="p-6 space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Pill} title="Total Drugs" value={String(drugs.length)} />
          <StatCard icon={Package} title="In Stock" value={String(available)} change={drugs.length ? `${((available / drugs.length) * 100).toFixed(1)}% availability` : undefined} changeType="positive" />
          <StatCard icon={AlertCircle} title="Low Stock / Out" value={String(critical)} change="Needs reorder" changeType="negative" />
          <StatCard icon={AlertTriangle} title="Expiring Soon" value={String(expiringSoon)} change="Within 60 days" changeType="negative" />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-card p-4 shadow-card border border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Essential Drugs</p>
            <p className="text-2xl font-bold font-display text-card-foreground">{essential}</p>
          </div>
          <div className="rounded-xl bg-card p-4 shadow-card border border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">ART Stock Lines</p>
            <p className="text-2xl font-bold font-display text-card-foreground">{art}</p>
          </div>
          <div className="rounded-xl bg-card p-4 shadow-card border border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Lab Chemicals</p>
            <p className="text-2xl font-bold font-display text-card-foreground">{labChemicals}</p>
          </div>
        </div>
        {/* Expiring Drugs Panel */}
        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <span className="font-semibold text-amber-900 dark:text-amber-200">Expiring Drug Alert</span>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={expiryDays}
                onChange={(e) => setExpiryDays(Number(e.target.value))}
                className="rounded-lg border border-amber-300 bg-white px-2 py-1 text-sm dark:bg-amber-950 dark:border-amber-700"
              >
                <option value={7}>Next 7 days</option>
                <option value={30}>Next 30 days</option>
                <option value={60}>Next 60 days</option>
                <option value={90}>Next 90 days</option>
              </select>
              <Button size="sm" variant="outline" className="border-amber-400 text-amber-800 hover:bg-amber-100"
                onClick={() => { setShowExpiry(!showExpiry); if (!showExpiry) loadExpiringDrugs(expiryDays); }}>
                {showExpiry ? "Hide" : "Check Expiry"}
              </Button>
            </div>
          </div>
          {showExpiry && (
            expiringDrugs.length === 0
              ? <p className="text-sm text-amber-700 dark:text-amber-300">No drugs expiring within {expiryDays} days.</p>
              : <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-amber-700 dark:text-amber-400 uppercase border-b border-amber-200">
                        <th className="pb-2 pr-4">Name</th>
                        <th className="pb-2 pr-4">Batch</th>
                        <th className="pb-2 pr-4">Expiry</th>
                        <th className="pb-2 pr-4">Days Left</th>
                        <th className="pb-2 pr-4">Stock</th>
                        <th className="pb-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expiringDrugs.map((d: any, i: number) => (
                        <tr key={i} className="border-b border-amber-100 last:border-0">
                          <td className="py-1.5 pr-4 font-medium text-amber-900 dark:text-amber-100">{d.name}</td>
                          <td className="py-1.5 pr-4 text-amber-700 dark:text-amber-300">{d.batchNumber || "—"}</td>
                          <td className="py-1.5 pr-4">{d.expiry}</td>
                          <td className={`py-1.5 pr-4 font-semibold ${d.daysUntilExpiry < 0 ? "text-red-600" : d.daysUntilExpiry <= 7 ? "text-red-500" : "text-amber-600"}`}>
                            {d.daysUntilExpiry < 0 ? `${Math.abs(d.daysUntilExpiry)}d overdue` : `${d.daysUntilExpiry}d`}
                          </td>
                          <td className="py-1.5 pr-4">{d.stock} {d.unit}</td>
                          <td className="py-1.5">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${d.status === "expired" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                              {d.status === "expired" ? "EXPIRED" : "Expiring Soon"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search drugs..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-1" /> Export PDF
            </Button>
            <Button variant="outline" size="sm" onClick={() => api.exports.inventoryXlsx().catch(() => toast.error("Export failed"))}>
              <Download className="h-4 w-4 mr-1" /> XLSX
            </Button>
            {canManageDrugs && (
              <Button size="sm" className="gradient-primary text-primary-foreground" onClick={() => setShowAdd(true)}>
                <Plus className="h-4 w-4 mr-1" /> Add Drug
              </Button>
            )}
          </div>
        </div>
        <DepartmentFormsPanel
          title="Inpatient Pharmacy Forms"
          description="Keep the inpatient drug sheet available inside the pharmacy and stock workflow."
          templateKeys={["inpatient_drug_sheet"]}
          triggerLabel="Open Drug Sheet"
        />

        <Collapse in={showAlerts && (critical > 0 || expiringSoon > 0)}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mb: 4 }}>
            {critical > 0 && (
              <Alert 
                severity="error" 
                variant="filled"
                action={
                  <IconButton aria-label="close" color="inherit" size="small" onClick={() => setShowAlerts(false)}>
                    <X className="h-4 w-4" />
                  </IconButton>
                }
                sx={{ borderRadius: "12px" }}
              >
                <AlertTitle sx={{ fontWeight: 700 }}>Critical Stock Alert</AlertTitle>
                <Typography variant="body2">
                  There are {critical} drug(s) completely out of stock or critically low.
                </Typography>
              </Alert>
            )}
            {expiringSoon > 0 && (
              <Alert 
                severity="warning" 
                sx={{ borderRadius: "12px", border: "1px solid", borderColor: "warning.main" }}
              >
                <AlertTitle sx={{ fontWeight: 700 }}>Expiring Soon Alert</AlertTitle>
                <Typography variant="body2">
                  There are {expiringSoon} drug(s) expiring within the next 60 days. Prioritize dispensing these batches.
                </Typography>
              </Alert>
            )}
          </Box>
        </Collapse>

        <DataTable
          columns={columns}
          data={filtered}
          actions={canManageDrugs ? (row) => (
            <Button variant="outline" size="sm" onClick={() => { setRestockTarget(row); setRestockQty(""); }}>
              Restock
            </Button>
          ) : undefined}
        />
      </div>
      <AddDrugDialog open={showAdd} onOpenChange={setShowAdd} onSubmit={(entry) => setDrugs((prev) => [entry, ...prev])} />
      <Dialog open={Boolean(restockTarget)} onOpenChange={(open) => { if (!open) { setRestockTarget(null); setRestockQty(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="font-display">Restock Drug</DialogTitle></DialogHeader>
          <form onSubmit={handleRestock} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Drug</Label>
              <Input value={restockTarget?.name || ""} readOnly disabled />
            </div>
            <div className="space-y-1.5">
              <Label>Additional Quantity *</Label>
              <Input type="number" min="1" value={restockQty} onChange={(e) => setRestockQty(e.target.value)} required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setRestockTarget(null); setRestockQty(""); }}>Cancel</Button>
              <Button type="submit" className="gradient-primary text-primary-foreground">Save Restock</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
