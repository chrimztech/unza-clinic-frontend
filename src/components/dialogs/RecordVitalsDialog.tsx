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
import { getUserDisplayName } from "@/lib/session-user";

interface RecordVitalsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function RecordVitalsDialog({ open, onOpenChange }: RecordVitalsDialogProps) {
  const { addEvent, patients } = usePatientJourney();
  const { user } = useAuth();
  const [patientId, setPatientId] = useState("");
  const [temp, setTemp] = useState("");
  const [bp, setBp] = useState("");
  const [hr, setHr] = useState("");
  const [rr, setRr] = useState("");
  const [spo2, setSpo2] = useState("");
  const [weight, setWeight] = useState("");
  const [notes, setNotes] = useState("");
  const nurse = getUserDisplayName(user, "Triage Nurse");

  const reset = () => { setPatientId(""); setTemp(""); setBp(""); setHr(""); setRr(""); setSpo2(""); setWeight(""); setNotes(""); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const patient = patients.find(p => p.patientId === patientId);
    if (!patient) { toast.error("Patient not found"); return; }

    const desc = `Temp: ${temp}°C, BP: ${bp}, HR: ${hr}bpm, RR: ${rr}/min, SpO2: ${spo2}%${weight ? `, Weight: ${weight}kg` : ""}${notes ? `. ${notes}` : ""}`;

    addEvent(patientId, patient.name, {
      type: "vitals",
      title: "Vitals Recorded",
      description: desc,
      performedBy: nurse,
      department: "Triage",
      data: { temperature: `${temp}°C`, bloodPressure: bp, heartRate: `${hr}bpm`, respiratoryRate: `${rr}/min`, spo2: `${spo2}%`, ...(weight ? { weight: `${weight}kg` } : {}) },
    });
    toast.success("Vitals recorded and added to patient journey!");
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Record Patient Vitals</DialogTitle>
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
          <div className="space-y-1.5">
            <Label>Recorded By</Label>
            <Input value={nurse} readOnly disabled />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Temperature (°C) *</Label>
              <Input type="number" step="0.1" placeholder="36.5" value={temp} onChange={e => setTemp(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Blood Pressure (mmHg) *</Label>
              <Input placeholder="120/80" value={bp} onChange={e => setBp(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Heart Rate (bpm) *</Label>
              <Input type="number" placeholder="72" value={hr} onChange={e => setHr(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Respiratory Rate (/min) *</Label>
              <Input type="number" placeholder="16" value={rr} onChange={e => setRr(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Oxygen Saturation (%) *</Label>
              <Input type="number" step="0.1" placeholder="98" value={spo2} onChange={e => setSpo2(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Weight (kg)</Label>
              <Input type="number" step="0.1" placeholder="65.0" value={weight} onChange={e => setWeight(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea placeholder="Additional observations..." rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="gradient-primary text-primary-foreground">Save Vitals</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
