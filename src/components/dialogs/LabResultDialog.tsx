import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { usePatientJourney } from "@/context/PatientJourneyContext";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getUserDisplayName } from "@/lib/session-user";
import api from "@/lib/api";
import type { LabTestEntry } from "@/components/dialogs/RequestLabTestDialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResultSaved?: () => void;
}

export default function LabResultDialog({ open, onOpenChange, onResultSaved }: Props) {
  const { addEvent, patients } = usePatientJourney();
  const { user } = useAuth();
  const [labTests, setLabTests] = useState<LabTestEntry[]>([]);
  const [selectedTestId, setSelectedTestId] = useState("");
  const [result, setResult] = useState("");
  const [interpretation, setInterpretation] = useState("");
  const [referenceRange, setReferenceRange] = useState("");
  const [abnormalFlag, setAbnormalFlag] = useState("normal");
  const [specimenCollectedAt, setSpecimenCollectedAt] = useState("");
  const [approvedBy, setApprovedBy] = useState("");
  const techName = getUserDisplayName(user, "Laboratory User");
  const pendingTests = useMemo(() => labTests.filter((entry) => entry.status !== "completed"), [labTests]);
  const selectedTest = pendingTests.find((entry) => String(entry.id) === selectedTestId) || null;

  useEffect(() => {
    if (!open) {
      return;
    }
    api.labTests.getAll()
      .then(setLabTests)
      .catch(() => toast.error("Failed to load lab requests"));
  }, [open]);

  const reset = () => {
    setSelectedTestId("");
    setResult("");
    setInterpretation("");
    setReferenceRange("");
    setAbnormalFlag("normal");
    setSpecimenCollectedAt("");
    setApprovedBy("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTest) {
      toast.error("Select a pending lab request");
      return;
    }
    const patientId = selectedTest.patientId || "";
    const patient = patients.find(p => p.patientId === patientId);
    if (!patient) { toast.error("Patient not found"); return; }

    try {
      await api.labTests.saveResults(selectedTest.id, {
        results: result,
        interpretation,
        referenceRange,
        abnormalFlag,
        specimenCollectedAt,
        approvedBy,
      });
    } catch {
      toast.error("Failed to save lab results");
      return;
    }

    addEvent(patientId, patient.name, {
      type: "lab-result",
      title: `Lab Results: ${selectedTest.test}`,
      description: `Results: ${result}. ${interpretation ? `Interpretation: ${interpretation}` : ""}`,
      performedBy: techName,
      department: "Laboratory",
      data: { test: selectedTest.test, result, interpretation, category: selectedTest.category, sampleType: selectedTest.sampleType },
    });
    toast.success("Lab results saved to the lab record");
    reset();
    onResultSaved?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Enter Lab Results</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Pending Lab Request *</Label>
            <Select value={selectedTestId} onValueChange={setSelectedTestId} required>
              <SelectTrigger><SelectValue placeholder="Select pending request..." /></SelectTrigger>
              <SelectContent>
                {pendingTests.map((entry) => (
                  <SelectItem key={entry.id} value={String(entry.id)}>
                    {entry.patient} - {entry.test}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Patient</Label>
            <Input value={selectedTest ? `${selectedTest.patient} (${selectedTest.patientId || "No ID"})` : ""} readOnly disabled />
          </div>
          <div className="space-y-1.5">
            <Label>Test Name</Label>
            <Input value={selectedTest?.test || ""} readOnly disabled />
          </div>
          <div className="space-y-1.5">
            <Label>Sample / Section</Label>
            <Input
              value={selectedTest ? `${selectedTest.sampleType || "N/A"}${selectedTest.section ? ` | ${selectedTest.section}` : ""}` : ""}
              readOnly
              disabled
            />
          </div>
          <div className="space-y-1.5">
            <Label>Entered By</Label>
            <Input value={techName} readOnly disabled />
          </div>
          <div className="space-y-1.5">
            <Label>Clinical Notes</Label>
            <Textarea value={selectedTest?.clinicalNotes || ""} readOnly disabled rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label>Specimen Collected At</Label>
            <Input type="datetime-local" value={specimenCollectedAt} onChange={(e) => setSpecimenCollectedAt(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Results *</Label>
            <Textarea placeholder="WBC: 8.2, RBC: 4.9, Hgb: 14.2..." value={result} onChange={e => setResult(e.target.value)} required rows={3} />
          </div>
          <div className="space-y-1.5">
            <Label>Reference Range</Label>
            <Input placeholder="e.g. WBC 4.0-11.0 x10^9/L" value={referenceRange} onChange={(e) => setReferenceRange(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Normal / Abnormal</Label>
            <Select value={abnormalFlag} onValueChange={setAbnormalFlag}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="abnormal">Abnormal</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Interpretation / Notes</Label>
            <Textarea placeholder="Within normal limits, abnormal findings..." value={interpretation} onChange={e => setInterpretation(e.target.value)} rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label>Approving Supervisor</Label>
            <Input placeholder="Supervisor name" value={approvedBy} onChange={(e) => setApprovedBy(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="gradient-primary text-primary-foreground">Save Results</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
