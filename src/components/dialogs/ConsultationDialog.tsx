import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { usePatientJourney } from "@/context/PatientJourneyContext";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getUserDepartment, getUserDisplayName } from "@/lib/session-user";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId?: string;
}

export default function ConsultationDialog({ open, onOpenChange, patientId: preselectedPatientId }: Props) {
  const { addEvent, patients } = usePatientJourney();
  const { user } = useAuth();
  const [patientId, setPatientId] = useState(preselectedPatientId || "");
  const [symptoms, setSymptoms] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [plan, setPlan] = useState("");
  const [notes, setNotes] = useState("");
  const doctor = getUserDisplayName(user, "Current Clinician");
  const department = getUserDepartment(user, "Clinical");

  const reset = () => { 
    setPatientId(preselectedPatientId || ""); 
    setSymptoms("");
    setDiagnosis("");
    setPlan("");
    setNotes("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const patient = patients.find(p => p.patientId === patientId);
    if (!patient) { toast.error("Patient not found"); return; }

    addEvent(patientId, patient.name, {
      type: "consultation",
      title: "Doctor Consultation",
      description: `Symptoms: ${symptoms}. Diagnosis: ${diagnosis}. Plan: ${plan}. ${notes ? `Notes: ${notes}` : ""}`,
      performedBy: doctor,
      department,
      data: { diagnosis, symptoms, plan },
    });
    toast.success("Consultation recorded and added to patient journey!");
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Record Consultation</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Patient *</Label>
            <Select value={patientId} onValueChange={setPatientId} required>
              <SelectTrigger><SelectValue placeholder="Select patient..." /></SelectTrigger>
              <SelectContent>
                {patients.map(p => (
                  <SelectItem key={p.patientId} value={p.patientId}>{p.name} ({p.patientId})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Clinician</Label>
              <Input value={doctor} readOnly disabled />
            </div>
            <div className="space-y-1.5">
              <Label>Department</Label>
              <Input value={department} readOnly disabled />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Presenting Symptoms *</Label>
            <Textarea placeholder="Describe patient complaints and symptoms..." value={symptoms} onChange={e => setSymptoms(e.target.value)} required rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label>Diagnosis *</Label>
            <Input placeholder="e.g., Upper respiratory infection" value={diagnosis} onChange={e => setDiagnosis(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Treatment Plan *</Label>
            <Textarea placeholder="Medications, lab requests, referrals, follow-up..." value={plan} onChange={e => setPlan(e.target.value)} required rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label>Additional Notes</Label>
            <Textarea placeholder="Any other observations..." value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="gradient-primary text-primary-foreground">Save Consultation</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
