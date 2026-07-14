import TopBar from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DataTable, Column } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import StatCard from "@/components/dashboard/StatCard";
import { Droplets, Heart, AlertTriangle, Plus, Search, CheckCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { hasPermission } from "@/lib/navigation";
import api from "@/lib/api";

const bloodTypes = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function BloodBank() {
  const { user } = useAuth();
  const canManageBloodBank = hasPermission(user, ["bloodbank.view"]);
  const [stock, setStock] = useState<any[]>([]);
  const [donations, setDonations] = useState<any[]>([]);
  const [showDonation, setShowDonation] = useState(false);
  const [showIssue, setShowIssue] = useState(false);
  const [issueTarget, setIssueTarget] = useState<any | null>(null);
  const [search, setSearch] = useState("");
  const [donorName, setDonorName] = useState("");
  const [donorType, setDonorType] = useState("");
  const [donationUnits, setDonationUnits] = useState("1");
  const [issuePatientName, setIssuePatientName] = useState("");
  const [issuePatientId, setIssuePatientId] = useState("");
  const [issueUnits, setIssueUnits] = useState("1");

  useEffect(() => {
    async function loadBloodBank() {
      try {
        const [stockData, donationData] = await Promise.all([
          api.bloodBank.getStock(),
          api.bloodBank.getDonations(),
        ]);
        setStock(stockData);
        setDonations(donationData);
      } catch (error) {
        toast.error("Failed to load blood bank data");
      }
    }
    loadBloodBank();
  }, []);

  const totalUnits = stock.reduce((sum, unit) => sum + unit.quantity, 0);
  const criticalTypes = stock.filter((unit) => unit.quantity <= 3).length;

  const stockCols: Column<any>[] = [
    { header: "Unit ID", accessor: "unitId" },
    { header: "Blood Type", accessor: (row) => <span className="font-bold text-destructive">{row.bloodType}</span> },
    { header: "Units Available", accessor: (row) => <span className={row.quantity <= 3 ? "text-destructive font-bold" : "text-card-foreground font-medium"}>{row.quantity}</span> },
    { header: "Expiry Date", accessor: "expiryDate" },
    { header: "Donor", accessor: "donorName" },
    { header: "Status", accessor: (row) => <StatusBadge status={row.status} /> },
  ];

  const donationCols: Column<any>[] = [
    { header: "Donor", accessor: "donorName" },
    { header: "Blood Type", accessor: "bloodType" },
    { header: "Units", accessor: (row) => String(row.units) },
    { header: "Date", accessor: "date" },
    { header: "Status", accessor: (row) => <StatusBadge status={row.status} /> },
  ];

  const handleDonation = async (e: React.FormEvent) => {
    e.preventDefault();
    const created = await api.bloodBank.createDonation({ donorName, bloodType: donorType, units: Number(donationUnits) || 1 });
    setDonations((prev) => [created, ...prev]);
    setStock(await api.bloodBank.getStock());
    toast.success("Blood donation recorded");
    setDonorName("");
    setDonorType("");
    setDonationUnits("1");
    setShowDonation(false);
  };

  const handleIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueTarget) return;
    try {
      const updated = await api.bloodBank.issueUnits(issueTarget.id, {
        patientName: issuePatientName,
        patientId: issuePatientId,
        units: Number(issueUnits) || 0,
      });
      setStock((current) => current.map((entry) => entry.id === updated.id ? updated : entry));
      toast.success(`${issueUnits} unit(s) of ${issueTarget.bloodType} issued`);
      setShowIssue(false);
      setIssueTarget(null);
      setIssuePatientName("");
      setIssuePatientId("");
      setIssueUnits("1");
    } catch (error: any) {
      toast.error(error?.message || "Failed to issue blood units");
    }
  };

  return (
    <div>
      <TopBar title="Blood Bank" subtitle="Blood inventory, donations, and transfusion management" />
      <div className="p-6 space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Droplets} title="Total Units" value={String(totalUnits)} />
          <StatCard icon={Heart} title="Donations" value={String(donations.length)} changeType="positive" />
          <StatCard icon={AlertTriangle} title="Critical Stock" value={String(criticalTypes)} changeType="negative" />
          <StatCard icon={CheckCircle} title="Blood Types" value={String(bloodTypes.length)} />
        </div>

        <div className="grid gap-3 grid-cols-4 lg:grid-cols-8">
          {bloodTypes.map((bloodType) => {
            const unit = stock.find((item) => item.bloodType === bloodType);
            const qty = unit?.quantity || 0;
            return (
              <div key={bloodType} className={`rounded-xl p-4 text-center border ${qty <= 3 ? "border-destructive/30 bg-destructive/5" : "border-border bg-card"} shadow-card`}>
                <p className="text-xl font-bold font-display text-card-foreground">{bloodType}</p>
                <p className={`text-2xl font-bold ${qty <= 3 ? "text-destructive" : "text-primary"}`}>{qty}</p>
                <p className="text-[10px] text-muted-foreground uppercase">units</p>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {canManageBloodBank && (
            <Button size="sm" className="gradient-primary text-primary-foreground" onClick={() => setShowDonation(true)}>
              <Plus className="h-4 w-4 mr-1" /> Record Donation
            </Button>
          )}
        </div>

        <div>
          <h3 className="text-sm font-semibold font-display text-foreground mb-3">Blood Inventory</h3>
          <DataTable
            columns={stockCols}
            data={stock.filter((item) => item.bloodType.toLowerCase().includes(search.toLowerCase()))}
            actions={canManageBloodBank ? (row) => (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setIssueTarget(row);
                  setIssueUnits("1");
                  setIssuePatientName("");
                  setIssuePatientId("");
                  setShowIssue(true);
                }}
                disabled={row.quantity <= 0}
              >
                Issue Units
              </Button>
            ) : undefined}
          />
        </div>

        <div>
          <h3 className="text-sm font-semibold font-display text-foreground mb-3">Recent Donations</h3>
          <DataTable columns={donationCols} data={donations} />
        </div>
      </div>

      <Dialog open={showDonation} onOpenChange={setShowDonation}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="font-display">Record Blood Donation</DialogTitle></DialogHeader>
          <form onSubmit={handleDonation} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Donor Name *</Label>
              <Input placeholder="Full name" value={donorName} onChange={(e) => setDonorName(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Blood Type *</Label>
              <Select value={donorType} onValueChange={setDonorType} required>
                <SelectTrigger><SelectValue placeholder="Select blood type" /></SelectTrigger>
                <SelectContent>{bloodTypes.map((bloodType) => <SelectItem key={bloodType} value={bloodType}>{bloodType}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Units Received *</Label>
              <Input type="number" min="1" value={donationUnits} onChange={(e) => setDonationUnits(e.target.value)} required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDonation(false)}>Cancel</Button>
              <Button type="submit" className="gradient-primary text-primary-foreground">Save Donation</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showIssue} onOpenChange={setShowIssue}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="font-display">Issue Blood Units</DialogTitle></DialogHeader>
          <form onSubmit={handleIssue} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Blood Type</Label>
              <Input value={issueTarget?.bloodType || ""} readOnly disabled />
            </div>
            <div className="space-y-1.5">
              <Label>Patient Name *</Label>
              <Input value={issuePatientName} onChange={(e) => setIssuePatientName(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Patient ID</Label>
              <Input value={issuePatientId} onChange={(e) => setIssuePatientId(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Units to Issue *</Label>
              <Input type="number" min="1" value={issueUnits} onChange={(e) => setIssueUnits(e.target.value)} required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowIssue(false)}>Cancel</Button>
              <Button type="submit" className="gradient-primary text-primary-foreground">Issue Blood</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
