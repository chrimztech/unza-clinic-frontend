import TopBar from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DataTable, Column } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import StatCard from "@/components/dashboard/StatCard";
import { Package, Search, Plus, AlertTriangle, CheckCircle, Boxes } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { hasPermission } from "@/lib/navigation";
import api from "@/lib/api";
import { exportToPDF } from "@/lib/pdf-export";
import { Download, X } from "lucide-react";
import { Alert, AlertTitle, Collapse, IconButton, Box, Typography } from "@mui/material";

interface InventoryItem {
  id: number;
  itemCode: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  minStock: number;
  location: string;
  lastRestocked: string;
  status: "in-stock" | "low-stock" | "out-of-stock";
}

const categories = ["Medical Equipment", "Surgical Supplies", "PPE", "Linens & Bedding", "Office Supplies", "Cleaning Supplies", "Lab Consumables", "IT Equipment"];

export default function Inventory() {
  const { user } = useAuth();
  const canManageInventory = hasPermission(user, ["inventory.view"]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [form, setForm] = useState({ name: "", category: "", quantity: "", unit: "", minStock: "", location: "" });
  const [showAlerts, setShowAlerts] = useState(true);

  useEffect(() => {
    api.inventory.getAll().then(setItems).catch(() => toast.error("Failed to load inventory"));
  }, []);

  const columns: Column<InventoryItem>[] = [
    { header: "Code", accessor: "itemCode" },
    { header: "Item", accessor: (r) => <div><p className="text-sm font-medium">{r.name}</p><p className="text-xs text-muted-foreground">{r.category}</p></div> },
    { header: "Qty", accessor: (r) => <span className={r.quantity <= r.minStock ? "text-destructive font-bold" : "font-medium"}>{r.quantity} {r.unit}</span> },
    { header: "Min Stock", accessor: (r) => `${r.minStock} ${r.unit}` },
    { header: "Location", accessor: "location" },
    { header: "Last Restocked", accessor: "lastRestocked" },
    { header: "Status", accessor: (r) => <StatusBadge status={r.status === "in-stock" ? "active" : r.status === "low-stock" ? "pending" : "critical"} /> },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newItem = await api.inventory.create({
        name: form.name,
        category: form.category,
        quantity: parseInt(form.quantity),
        unit: form.unit,
        minStock: parseInt(form.minStock),
        location: form.location,
      });
      setItems((prev) => [newItem, ...prev]);
      toast.success("Inventory item added!");
      setForm({ name: "", category: "", quantity: "", unit: "", minStock: "", location: "" });
      setShowDialog(false);
    } catch {
      toast.error("Failed to add inventory item");
    }
  };

  const filtered = items.filter((i) => {
    const matchSearch = i.name.toLowerCase().includes(search.toLowerCase()) || i.itemCode.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === "all" || i.category === filterCat;
    return matchSearch && matchCat;
  });

  const lowStock = items.filter((i) => i.status === "low-stock").length;
  const outOfStock = items.filter((i) => i.status === "out-of-stock").length;

  const handleExport = async () => {
    await exportToPDF({
      title: "Hospital Inventory Report",
      filename: "inventory-report",
      columns: [
        { header: "Code", dataKey: "itemCode" },
        { header: "Name", dataKey: "name" },
        { header: "Category", dataKey: "category" },
        { header: "Quantity", dataKey: "quantity" },
        { header: "Unit", dataKey: "unit" },
        { header: "Min Stock", dataKey: "minStock" },
        { header: "Location", dataKey: "location" },
        { header: "Status", dataKey: "status" }
      ],
      data: filtered,
      subtitle: `Filtered: ${filterCat !== 'all' ? filterCat : 'All Categories'} | Search: ${search || 'None'}`,
    });
  };

  return (
    <div>
      <TopBar title="Hospital Inventory" subtitle="Equipment, supplies, and consumables management" />
      <div className="p-6 space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Boxes} title="Total Items" value={String(items.length)} />
          <StatCard icon={CheckCircle} title="In Stock" value={String(items.filter((i) => i.status === "in-stock").length)} changeType="positive" />
          <StatCard icon={AlertTriangle} title="Low Stock" value={String(lowStock)} changeType="negative" />
          <StatCard icon={Package} title="Out of Stock" value={String(outOfStock)} changeType="negative" />
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-between">
          <div className="flex gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search items..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={filterCat} onValueChange={setFilterCat}>
              <SelectTrigger className="w-48"><SelectValue placeholder="All Categories" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-1" /> Export PDF
            </Button>
            {canManageInventory && (
              <Button size="sm" className="gradient-primary text-primary-foreground" onClick={() => setShowDialog(true)}>
                <Plus className="h-4 w-4 mr-1" /> Add Item
              </Button>
            )}
          </div>
        </div>

        <Collapse in={showAlerts && (lowStock > 0 || outOfStock > 0)}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {outOfStock > 0 && (
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
                <AlertTitle sx={{ fontWeight: 700 }}>Critical: Out of Stock</AlertTitle>
                <Typography variant="body2">
                  There are {outOfStock} item(s) completely out of stock. Immediate replenishment is required.
                </Typography>
              </Alert>
            )}
            {lowStock > 0 && (
              <Alert 
                severity="warning" 
                sx={{ borderRadius: "12px", border: "1px solid", borderColor: "warning.main" }}
              >
                <AlertTitle sx={{ fontWeight: 700 }}>Warning: Low Stock</AlertTitle>
                <Typography variant="body2">
                  There are {lowStock} item(s) running low. Please review and generate purchase orders.
                </Typography>
              </Alert>
            )}
          </Box>
        </Collapse>

        <DataTable columns={columns} data={filtered} />
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle className="font-display">Add Inventory Item</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Item Name *</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label>Category *</Label>
              <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>{categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Quantity *</Label>
                <Input type="number" value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label>Unit *</Label>
                <Input value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label>Min Stock *</Label>
                <Input type="number" value={form.minStock} onChange={(e) => setForm((f) => ({ ...f, minStock: e.target.value }))} required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Storage Location *</Label>
              <Input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button type="submit" className="gradient-primary text-primary-foreground">Add Item</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
