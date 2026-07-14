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
import { Image, Search, Plus, FileText, Clock, CheckCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { usePatientJourney } from "@/context/PatientJourneyContext";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { hasPermission } from "@/lib/navigation";
import { getUserDisplayName } from "@/lib/session-user";

interface ImagingRequest {
  id: number;
  requestId: string;
  patientId: string;
  patientName: string;
  type: string;
  bodyPart: string;
  requestedBy: string;
  radiologist: string;
  requestDate: string;
  findings: string;
  status: "pending" | "in-progress" | "completed";
}

const imagingTypes = ["X-Ray", "Ultrasound", "CT Scan", "MRI", "Mammography", "Fluoroscopy"];

export default function Radiology() {
  const { user } = useAuth();
  const canRequestImaging = hasPermission(user, ["radiology.view"]);
  const canEnterFindings = hasPermission(user, ["radiology.view"]) &&
    (user?.role === "Radiographer" || user?.role === "Admin");
  const [requests, setRequests] = useState<ImagingRequest[]>([]);
  const [showRequest, setShowRequest] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [findings, setFindings] = useState("");
  const { addEvent, patients } = usePatientJourney();
  const [form, setForm] = useState({ patientId: "", type: "", bodyPart: "" });
  const actorName = getUserDisplayName(user, "Radiology User");

  useEffect(() => {
    api.imaging.getAll().then(setRequests).catch(() => toast.error("Failed to load imaging requests"));
  }, []);

  const columns: Column<ImagingRequest>[] = [
    { header: "Request ID", accessor: "requestId" },
    { header: "Patient", accessor: (r) => <div><p className="text-sm font-medium">{r.patientName}</p><p className="text-xs text-muted-foreground">{r.patientId}</p></div> },
    { header: "Type", accessor: "type" },
    { header: "Body Part", accessor: "bodyPart" },
    { header: "Requested By", accessor: "requestedBy" },
    { header: "Date", accessor: "requestDate" },
    { header: "Status", accessor: (r) => <StatusBadge status={r.status === "in-progress" ? "active" : r.status} /> },
    { header: "Actions", accessor: (r) => r.status !== "completed" && canEnterFindings ? <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setSelectedId(r.id); setShowResult(true); }}>Enter Results</Button> : <span className="text-xs text-muted-foreground">{r.status === "completed" ? "Done" : "—"}</span> },
  ];

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const patient = patients.find((p) => p.patientId === form.patientId);
    if (!patient) { toast.error("Patient not found"); return; }

    try {
      const newReq = await api.imaging.create({
        patientId: form.patientId,
        patientName: patient.name,
        type: form.type,
        bodyPart: form.bodyPart,
      });
      setRequests((prev) => [newReq, ...prev]);

      addEvent(form.patientId, patient.name, {
        type: "lab-request",
        title: `Radiology: ${form.type} - ${form.bodyPart}`,
        description: `Imaging requested by ${actorName}`,
        performedBy: actorName,
        department: "Radiology",
        data: { imagingType: form.type, bodyPart: form.bodyPart },
      });

      toast.success("Imaging request submitted!");
      setForm({ patientId: "", type: "", bodyPart: "" });
      setShowRequest(false);
    } catch {
      toast.error("Failed to submit imaging request");
    }
  };

  const handleResult = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;
    const req = requests.find((r) => r.id === selectedId);
    if (!req) return;

    setRequests((prev) => prev.map((r) => r.id === selectedId ? { ...r, findings, radiologist: actorName, status: "completed" as const } : r));
    addEvent(req.patientId, req.patientName, {
      type: "lab-result",
      title: `Radiology Results: ${req.type} - ${req.bodyPart}`,
      description: `Findings: ${findings}`,
      performedBy: actorName,
      department: "Radiology",
      data: { imagingType: req.type, bodyPart: req.bodyPart, findings },
    });
    toast.success("Radiology results recorded!");
    setFindings("");
    setShowResult(false);
  };

  return (
    <div>
      <TopBar title="Radiology & Imaging" subtitle="Manage imaging requests and diagnostic results" />
      <div className="p-6 space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Image} title="Total Requests" value={String(requests.length)} />
          <StatCard icon={Clock} title="Pending" value={String(requests.filter((r) => r.status === "pending").length)} changeType="negative" />
          <StatCard icon={FileText} title="In Progress" value={String(requests.filter((r) => r.status === "in-progress").length)} />
          <StatCard icon={CheckCircle} title="Completed" value={String(requests.filter((r) => r.status === "completed").length)} changeType="positive" />
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search imaging requests..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {canRequestImaging && (
            <Button size="sm" className="gradient-primary text-primary-foreground" onClick={() => setShowRequest(true)}>
              <Plus className="h-4 w-4 mr-1" /> New Imaging Request
            </Button>
          )}
        </div>
        <DataTable columns={columns} data={requests.filter((r) => r.patientName.toLowerCase().includes(search.toLowerCase()) || r.type.toLowerCase().includes(search.toLowerCase()))} />
      </div>

      <Dialog open={showRequest} onOpenChange={setShowRequest}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle className="font-display">New Imaging Request</DialogTitle></DialogHeader>
          <form onSubmit={handleRequest} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Patient *</Label>
              <Select value={form.patientId} onValueChange={(v) => setForm((f) => ({ ...f, patientId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select patient..." /></SelectTrigger>
                <SelectContent>{patients.map((p) => <SelectItem key={p.patientId} value={p.patientId}>{p.name} ({p.patientId})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Imaging Type *</Label>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
                <SelectContent>{imagingTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Body Part / Region *</Label>
              <Input value={form.bodyPart} onChange={(e) => setForm((f) => ({ ...f, bodyPart: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label>Requesting User</Label>
              <Input value={actorName} readOnly disabled />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowRequest(false)}>Cancel</Button>
              <Button type="submit" className="gradient-primary text-primary-foreground">Submit Request</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showResult} onOpenChange={setShowResult}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle className="font-display">Enter Radiology Results</DialogTitle></DialogHeader>
          <form onSubmit={handleResult} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Entered By</Label>
              <Input value={actorName} readOnly disabled />
            </div>
            <div className="space-y-1.5">
              <Label>Findings *</Label>
              <Textarea value={findings} onChange={(e) => setFindings(e.target.value)} required rows={4} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowResult(false)}>Cancel</Button>
              <Button type="submit" className="gradient-primary text-primary-foreground">Save Results</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
