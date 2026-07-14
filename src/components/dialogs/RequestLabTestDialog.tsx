import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useEffect, useMemo, useState } from "react";
import { usePatientJourney } from "@/context/PatientJourneyContext";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { getUserDisplayName } from "@/lib/session-user";
import { getLabTestByKey, getLabTestsBySection, labTestSections } from "@/lib/lab-tests";

export interface LabTestEntry {
  id: number;
  testId: string;
  patient: string;
  patientId?: string;
  test: string;
  category?: string;
  section?: string;
  sampleType?: string;
  clinicalNotes?: string;
  requestedBy: string;
  reportedBy?: string;
  date: string;
  completedAt?: string;
  results?: string;
  interpretation?: string;
  referenceRange?: string;
  abnormalFlag?: string;
  specimenCollectedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  status: "pending" | "in-progress" | "completed";
}

interface RequestLabTestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit?: (entry: LabTestEntry) => void;
}

export default function RequestLabTestDialog({ open, onOpenChange, onSubmit }: RequestLabTestDialogProps) {
  const { addEvent } = usePatientJourney();
  const { user } = useAuth();
  const [patientId, setPatientId] = useState("");
  const [testKey, setTestKey] = useState("");
  const [priority, setPriority] = useState("");
  const [section, setSection] = useState("");
  const [sampleType, setSampleType] = useState("");
  const [notes, setNotes] = useState("");
  const [registeredPatients, setRegisteredPatients] = useState<any[]>([]);
  const requestedBy = getUserDisplayName(user, "Current Doctor");
  const availableTests = getLabTestsBySection(section);
  const selectedPatient = useMemo(
    () => registeredPatients.find((entry) => entry.patient_id === patientId) ?? null,
    [patientId, registeredPatients],
  );

  useEffect(() => {
    if (!open) return;
    api.patients.getAll()
      .then(setRegisteredPatients)
      .catch(() => toast.error("Failed to load patients"));
  }, [open]);

  const reset = () => {
    setPatientId("");
    setTestKey("");
    setPriority("");
    setSection("");
    setSampleType("");
    setNotes("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const testOption = getLabTestByKey(testKey);
    const testName = testOption?.name || testKey;
    if (!selectedPatient) {
      toast.error("Select a registered patient");
      return;
    }
    try {
      const entry = await api.labTests.create({
        patientId: selectedPatient.patient_id,
        patientName: selectedPatient.name,
        test: testName,
        category: testOption?.category || "",
        section: testOption?.section || section,
        sampleType: sampleType || testOption?.sampleType || "",
        clinicalNotes: notes,
      });
      onSubmit?.(entry);

      addEvent(selectedPatient.patient_id, selectedPatient.name, {
        type: "lab-request",
        title: `Lab Test Requested: ${testName}`,
        description: `${testName} requested. Priority: ${priority}. ${notes ? `Notes: ${notes}` : ""}`,
        performedBy: requestedBy,
        department: "Laboratory",
        data: { test: testName, priority, category: testOption?.category || "", section: testOption?.section || section, sampleType: sampleType || "N/A" },
      });

      toast.success("Lab test requested successfully!", { description: `${testName} for ${selectedPatient.name}` });
      reset();
      onOpenChange(false);
    } catch {
      toast.error("Failed to request lab test");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Request Lab Test</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Patient *</Label>
              <Select required value={patientId} onValueChange={setPatientId}>
                <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                <SelectContent>
                  {registeredPatients.map((entry) => (
                    <SelectItem key={entry.patient_id} value={entry.patient_id}>
                      {entry.name} ({entry.clinic_number || entry.patient_id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Requesting User</Label>
              <Input value={requestedBy} readOnly disabled />
            </div>
            <div className="space-y-1.5">
              <Label>Form Section *</Label>
              <Select
                required
                value={section}
                onValueChange={(value) => {
                  setSection(value);
                  setTestKey("");
                  setSampleType("");
                }}
              >
                <SelectTrigger><SelectValue placeholder="Select form section" /></SelectTrigger>
                <SelectContent>
                  {labTestSections.map((item) => <SelectItem key={item.key} value={item.key}>{item.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Test Name *</Label>
              <Select
                required
                value={testKey}
                onValueChange={(value) => {
                  setTestKey(value);
                  const selectedTest = getLabTestByKey(value);
                  if (selectedTest) {
                    setSampleType(selectedTest.sampleType);
                  }
                }}
                disabled={!section}
              >
                <SelectTrigger><SelectValue placeholder="Select test" /></SelectTrigger>
                <SelectContent>
                  {availableTests.map((item) => <SelectItem key={item.key} value={item.key}>{item.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {testKey ? (
                <p className="text-xs text-muted-foreground">
                  {getLabTestByKey(testKey)?.section}
                  {getLabTestByKey(testKey)?.category ? ` | ${getLabTestByKey(testKey)?.category}` : ""}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label>Priority *</Label>
              <Select required value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue placeholder="Select priority" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="routine">Routine</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="stat">STAT (Emergency)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Sample Type</Label>
              <Select value={sampleType} onValueChange={setSampleType}>
                <SelectTrigger><SelectValue placeholder="Select sample" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="blood">Blood</SelectItem>
                  <SelectItem value="urine">Urine</SelectItem>
                  <SelectItem value="stool">Stool</SelectItem>
                  <SelectItem value="swab">Swab</SelectItem>
                  <SelectItem value="semen">Semen</SelectItem>
                  <SelectItem value="tissue">Tissue</SelectItem>
                  <SelectItem value="sputum">Sputum</SelectItem>
                  <SelectItem value="na">N/A (Imaging)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Clinical Notes</Label>
              <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="gradient-primary text-primary-foreground">Request Test</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
