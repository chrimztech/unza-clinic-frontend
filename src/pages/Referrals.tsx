import TopBar from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DataTable, Column } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import StatCard from "@/components/dashboard/StatCard";
import { ArrowRightLeft, Search, Plus, Clock, CheckCircle, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { usePatientJourney } from "@/context/PatientJourneyContext";
import DepartmentFormsPanel from "@/components/clinical/DepartmentFormsPanel";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { hasPermission } from "@/lib/navigation";
import { getUserDepartment, getUserDisplayName } from "@/lib/session-user";

interface Referral {
  id: number;
  referralId: string;
  patientId: string;
  patientName: string;
  fromDept: string;
  toDept: string;
  referredBy: string;
  reason: string;
  urgency: "routine" | "urgent" | "emergency";
  date: string;
  status: "pending" | "accepted" | "completed" | "rejected";
  notes: string;
}

const departments = ["General Medicine", "Cardiology", "Orthopedics", "Pediatrics", "Neurology", "Dermatology", "Obstetrics & Gynaecology", "Emergency", "ENT", "Ophthalmology", "UTH Specialist Clinic", "Cancer Diseases Hospital", "Chainama Hills Hospital"];

export default function Referrals() {
  const { user } = useAuth();
  const canRefer = hasPermission(user, ["referrals.view"]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [search, setSearch] = useState("");
  const { addEvent, patients } = usePatientJourney();
  const actorName = getUserDisplayName(user, "Current Clinician");
  const actorDepartment = getUserDepartment(user, "");
  const [form, setForm] = useState({ patientId: "", fromDept: actorDepartment, toDept: "", reason: "", urgency: "routine" as Referral["urgency"] });

  useEffect(() => {
    api.referrals.getAll().then(setReferrals).catch(() => toast.error("Failed to load referrals"));
  }, []);

  const urgencyColors: Record<string, string> = {
    routine: "bg-green-100 text-green-800",
    urgent: "bg-orange-100 text-orange-800",
    emergency: "bg-red-100 text-red-800",
  };

  const columns: Column<Referral>[] = [
    { header: "Ref. ID", accessor: "referralId" },
    { header: "Patient", accessor: (r) => <div><p className="text-sm font-medium">{r.patientName}</p><p className="text-xs text-muted-foreground">{r.patientId}</p></div> },
    { header: "From", accessor: "fromDept" },
    { header: "To", accessor: (r) => <span className="flex items-center gap-1">{r.toDept} {!departments.slice(0, 8).includes(r.toDept) && <ExternalLink className="h-3 w-3 text-muted-foreground" />}</span> },
    { header: "Urgency", accessor: (r) => <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${urgencyColors[r.urgency]}`}>{r.urgency}</span> },
    { header: "Referred By", accessor: "referredBy" },
    { header: "Date", accessor: "date" },
    { header: "Status", accessor: (r) => <StatusBadge status={r.status} /> },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const patient = patients.find((p) => p.patientId === form.patientId);
    if (!patient) { toast.error("Patient not found"); return; }

    try {
      const newRef = await api.referrals.create({
        patientId: form.patientId,
        patientName: patient.name,
        fromDept: form.fromDept,
        toDept: form.toDept,
        reason: form.reason,
        urgency: form.urgency,
      });
      setReferrals((prev) => [newRef, ...prev]);

      addEvent(form.patientId, patient.name, {
        type: "consultation",
        title: `Referral to ${form.toDept}`,
        description: `Referred from ${form.fromDept}: ${form.reason}`,
        performedBy: actorName,
        department: form.fromDept,
        data: { from: form.fromDept, to: form.toDept, urgency: form.urgency },
      });

      toast.success("Referral created!");
      setForm({ patientId: "", fromDept: actorDepartment, toDept: "", reason: "", urgency: "routine" });
      setShowDialog(false);
    } catch {
      toast.error("Failed to create referral");
    }
  };

  return (
    <div>
      <TopBar title="Patient Referrals" subtitle="Internal and external referral management" />
      <div className="p-6 space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={ArrowRightLeft} title="Total Referrals" value={String(referrals.length)} />
          <StatCard icon={Clock} title="Pending" value={String(referrals.filter((r) => r.status === "pending").length)} changeType="negative" />
          <StatCard icon={CheckCircle} title="Completed" value={String(referrals.filter((r) => r.status === "completed").length)} changeType="positive" />
          <StatCard icon={ExternalLink} title="External" value={String(referrals.filter((r) => !departments.slice(0, 8).includes(r.toDept)).length)} />
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search referrals..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {canRefer && (
            <Button size="sm" className="gradient-primary text-primary-foreground" onClick={() => setShowDialog(true)}>
              <Plus className="h-4 w-4 mr-1" /> New Referral
            </Button>
          )}
        </div>
        <DepartmentFormsPanel
          title="Referral Forms"
          description="Write the structured consultation and referral form directly inside the referrals module."
          templateKeys={["consultation_referral"]}
          triggerLabel="Open Referral Form"
        />
        <DataTable columns={columns} data={referrals.filter((r) => r.patientName.toLowerCase().includes(search.toLowerCase()) || r.toDept.toLowerCase().includes(search.toLowerCase()))} />
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle className="font-display">Create Referral</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Patient *</Label>
              <Select value={form.patientId} onValueChange={(v) => setForm((f) => ({ ...f, patientId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select patient..." /></SelectTrigger>
                <SelectContent>{patients.map((p) => <SelectItem key={p.patientId} value={p.patientId}>{p.name} ({p.patientId})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>From Department *</Label>
                <Select value={form.fromDept} onValueChange={(v) => setForm((f) => ({ ...f, fromDept: v }))}>
                  <SelectTrigger><SelectValue placeholder="From..." /></SelectTrigger>
                  <SelectContent>{departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>To Department *</Label>
                <Select value={form.toDept} onValueChange={(v) => setForm((f) => ({ ...f, toDept: v }))}>
                  <SelectTrigger><SelectValue placeholder="To..." /></SelectTrigger>
                  <SelectContent>{departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Referring User</Label>
              <Input value={actorName} readOnly disabled />
            </div>
            <div className="space-y-1.5">
              <Label>Urgency *</Label>
              <Select value={form.urgency} onValueChange={(v) => setForm((f) => ({ ...f, urgency: v as Referral["urgency"] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="routine">Routine</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Reason for Referral *</Label>
              <Textarea value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} required rows={3} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button type="submit" className="gradient-primary text-primary-foreground">Create Referral</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
