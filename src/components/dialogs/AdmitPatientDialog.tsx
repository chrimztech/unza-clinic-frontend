import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";

export interface AdmissionEntry {
  id: number;
  admissionId: string;
  patient: string;
  patientId: string;
  ward: string;
  bed: string;
  doctor: string;
  admittedOn: string;
  diagnosis: string;
  status: "active" | "critical" | "discharged";
}

type WardEntry = {
  id: number;
  name: string;
  totalBeds: number;
  occupied: number;
  available: number;
};

interface AdmitPatientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit?: (entry: AdmissionEntry) => void;
}

const doctorNames: Record<string, string> = {
  "STF-001": "Dr. Joseph Tembo",
  "STF-002": "Dr. Grace Ng'andu",
  "STF-003": "Dr. Patrick Mwale",
  "STF-004": "Dr. Mary Lungu",
};

export default function AdmitPatientDialog({ open, onOpenChange, onSubmit }: AdmitPatientDialogProps) {
  const [patientId, setPatientId] = useState("");
  const [ward, setWard] = useState("");
  const [bed, setBed] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [date, setDate] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [wards, setWards] = useState<WardEntry[]>([]);
  const [admissions, setAdmissions] = useState<AdmissionEntry[]>([]);
  const [registeredPatients, setRegisteredPatients] = useState<any[]>([]);
  const selectedPatient = useMemo(
    () => registeredPatients.find((entry) => entry.patient_id === patientId) ?? null,
    [patientId, registeredPatients],
  );

  const reset = () => {
    setPatientId("");
    setWard("");
    setBed("");
    setDoctorId("");
    setDate("");
    setDiagnosis("");
  };

  useEffect(() => {
    if (!open) return;
    async function loadWardContext() {
      try {
        const [wardData, admissionData, patientData] = await Promise.all([api.wards.getAll(), api.admissions.getAll(), api.patients.getAll()]);
        setWards(wardData || []);
        setAdmissions(admissionData || []);
        setRegisteredPatients(patientData || []);
      } catch {
        toast.error("Failed to load ward availability");
      }
    }
    loadWardContext();
  }, [open]);

  const selectedWard = useMemo(() => wards.find((entry) => entry.name === ward) ?? null, [ward, wards]);

  const availableBeds = useMemo(() => {
    if (!selectedWard) return [];
    const occupiedNumbers = new Set(
      admissions
        .filter((entry) => entry.status !== "discharged" && entry.ward === selectedWard.name)
        .map((entry) => Number(String(entry.bed).replace(/[^0-9]/g, "")))
        .filter((value) => Number.isFinite(value) && value > 0),
    );

    return Array.from({ length: selectedWard.totalBeds }, (_, index) => index + 1).filter((bedNumber) => !occupiedNumbers.has(bedNumber));
  }, [admissions, selectedWard]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) {
      toast.error("Select a registered patient");
      return;
    }
    try {
      const entry = await api.admissions.create({
        patientId: selectedPatient.patient_id,
        patientName: selectedPatient.name,
        ward,
        bed: `Bed ${bed}`,
        doctor: doctorNames[doctorId] || doctorId,
        admittedOn: date,
        diagnosis,
      });
      onSubmit?.(entry);
      toast.success("Patient admitted!", { description: `${selectedPatient.name} to ${entry.ward}, ${entry.bed}` });
      reset();
      onOpenChange(false);
    } catch {
      toast.error("Failed to admit patient");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Admit Patient</DialogTitle>
          <DialogDescription>Select a live ward and a free bed based on the current system occupancy.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
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
              <Label>Ward *</Label>
              <Select
                required
                value={ward}
                onValueChange={(value) => {
                  setWard(value);
                  setBed("");
                }}
              >
                <SelectTrigger><SelectValue placeholder="Select ward" /></SelectTrigger>
                <SelectContent>
                  {wards.map((entry) => (
                    <SelectItem key={entry.id} value={entry.name}>
                      {entry.name} ({entry.available} free)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Bed Number *</Label>
              <Select required value={bed} onValueChange={setBed} disabled={!selectedWard || availableBeds.length === 0}>
                <SelectTrigger><SelectValue placeholder={selectedWard ? "Select free bed" : "Select ward first"} /></SelectTrigger>
                <SelectContent>
                  {availableBeds.map((bedNumber) => (
                    <SelectItem key={bedNumber} value={String(bedNumber)}>
                      Bed {bedNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedWard && availableBeds.length === 0 ? (
                <p className="text-xs text-destructive">No free beds are currently available in this ward.</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label>Admitting Doctor *</Label>
              <Select required value={doctorId} onValueChange={setDoctorId}>
                <SelectTrigger><SelectValue placeholder="Select doctor" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(doctorNames).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Admission Date *</Label>
              <Input type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Diagnosis / Reason *</Label>
              <Textarea placeholder="Enter diagnosis or reason..." rows={2} required value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="gradient-primary text-primary-foreground" disabled={!bed}>
              Admit Patient
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
