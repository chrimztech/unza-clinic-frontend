import TopBar from "@/components/layout/TopBar";
import { DataTable, Column } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import StatCard from "@/components/dashboard/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, CheckCircle, Clock, AlertTriangle, Search, Plus, Download, ThumbsUp, ThumbsDown } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { hasPermission } from "@/lib/navigation";
import api from "@/lib/api";

interface ClaimEntry {
  id: number;
  claimId: string;
  patient: string;
  insurer: string;
  service: string;
  amount: string;
  submitted: string;
  status: "pending" | "approved" | "completed" | "cancelled" | "rejected";
}

const insurers = ["NHIMA", "Madison General", "Hollard Zambia", "ZSIC Life", "Professional Insurance", "Sanlam Health"];

export default function Insurance() {
  const { user } = useAuth();
  const canManageClaims = hasPermission(user, ["insurance.view"]);
  const [search, setSearch] = useState("");
  const [claims, setClaims] = useState<ClaimEntry[]>([]);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [form, setForm] = useState({ patient: "", insurer: "", service: "", amount: "" });
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  useEffect(() => {
    api.insuranceClaims.getAll().then(setClaims).catch(() => toast.error("Failed to load claims"));
  }, []);

  const updateClaimStatus = async (claim: ClaimEntry, status: "approved" | "rejected") => {
    setUpdatingId(claim.id);
    try {
      await api.insuranceClaims.updateStatus(claim.id, { status });
      setClaims((prev) => prev.map((c) => c.id === claim.id ? { ...c, status } : c));
      toast.success(`Claim ${claim.claimId} ${status}`);
    } catch {
      toast.error(`Failed to ${status} claim`);
    } finally {
      setUpdatingId(null);
    }
  };

  const columns: Column<ClaimEntry>[] = [
    { header: "Claim ID", accessor: "claimId" },
    { header: "Patient", accessor: "patient" },
    { header: "Insurer", accessor: "insurer" },
    { header: "Service", accessor: "service" },
    { header: "Amount", accessor: "amount" },
    { header: "Submitted", accessor: "submitted" },
    { header: "Status", accessor: (row) => <StatusBadge status={row.status === "approved" ? "active" : row.status} /> },
    {
      header: "Actions",
      accessor: (row) => row.status === "pending" && canManageClaims ? (
        <div className="flex gap-1">
          <Button
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white text-xs h-7 px-2"
            disabled={updatingId === row.id}
            onClick={() => updateClaimStatus(row, "approved")}
          >
            <ThumbsUp className="h-3 w-3 mr-1" /> Approve
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="text-xs h-7 px-2"
            disabled={updatingId === row.id}
            onClick={() => updateClaimStatus(row, "rejected")}
          >
            <ThumbsDown className="h-3 w-3 mr-1" /> Reject
          </Button>
        </div>
      ) : (
        <span className="text-xs text-muted-foreground">—</span>
      ),
    },
  ];

  const filtered = claims.filter((c) =>
    c.patient.toLowerCase().includes(search.toLowerCase()) || c.claimId.toLowerCase().includes(search.toLowerCase()) || c.insurer.toLowerCase().includes(search.toLowerCase())
  );

  const handleNewClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newClaim = await api.insuranceClaims.create({
        patient: form.patient,
        insurer: form.insurer,
        service: form.service,
        amount: parseFloat(form.amount),
      });
      setClaims((prev) => [newClaim, ...prev]);
      toast.success(`Claim "${newClaim.claimId}" submitted successfully!`);
      setForm({ patient: "", insurer: "", service: "", amount: "" });
      setShowNewDialog(false);
    } catch {
      toast.error("Failed to submit claim");
    }
  };

  return (
    <div>
      <TopBar title="Insurance Claims" subtitle="Manage insurance claims and reimbursements" />
      <div className="p-6 space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Shield} title="Total Claims" value={String(claims.length)} />
          <StatCard icon={CheckCircle} title="Approved" value={String(claims.filter((c) => c.status === "approved" || c.status === "completed").length)} changeType="positive" />
          <StatCard icon={Clock} title="Pending" value={String(claims.filter((c) => c.status === "pending").length)} changeType="negative" />
          <StatCard icon={AlertTriangle} title="Rejected" value={String(claims.filter((c) => c.status === "rejected" || c.status === "cancelled").length)} changeType="negative" />
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search claims..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => toast.success("Claims export started")}><Download className="h-4 w-4 mr-1" /> Export</Button>
            {canManageClaims && <Button size="sm" className="gradient-primary text-primary-foreground" onClick={() => setShowNewDialog(true)}><Plus className="h-4 w-4 mr-1" /> New Claim</Button>}
          </div>
        </div>
        <DataTable columns={columns} data={filtered} />
      </div>

      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle className="font-display">Submit New Insurance Claim</DialogTitle></DialogHeader>
          <form onSubmit={handleNewClaim} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Patient Name *</Label>
              <Input value={form.patient} onChange={(e) => setForm((f) => ({ ...f, patient: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label>Insurance Provider *</Label>
              <Select value={form.insurer} onValueChange={(v) => setForm((f) => ({ ...f, insurer: v }))}>
                <SelectTrigger><SelectValue placeholder="Select insurer" /></SelectTrigger>
                <SelectContent>{insurers.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Service Provided *</Label>
              <Input value={form.service} onChange={(e) => setForm((f) => ({ ...f, service: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label>Amount (K) *</Label>
              <Input type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowNewDialog(false)}>Cancel</Button>
              <Button type="submit" className="gradient-primary text-primary-foreground">Submit Claim</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
