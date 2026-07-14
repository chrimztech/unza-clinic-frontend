import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export interface DischargeDetails {
  dischargeType: string;
  dischargeSummary: string;
  dischargedOn: string;
  dischargedBy: string;
}

interface DischargePatientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm?: (details: DischargeDetails) => void;
}

export default function DischargePatientDialog({ open, onOpenChange, onConfirm }: DischargePatientDialogProps) {
  const { user } = useAuth();
  const [dischargeType, setDischargeType] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [summary, setSummary] = useState("");
  const [physician, setPhysician] = useState("");
  const [doctors, setDoctors] = useState<{ staffId: string; name: string }[]>([]);

  useEffect(() => {
    if (!open) return;
    setDischargeType("");
    setDate(new Date().toISOString().slice(0, 10));
    setSummary("");
    setPhysician("");
    api.staff.getAll()
      .then((staffData: any[]) => {
        const doctorList = (staffData || [])
          .filter((entry) => entry.role === "Doctor")
          .map((entry) => ({ staffId: entry.staffId || entry.staff_id, name: entry.name }));
        setDoctors(doctorList);
        if (user?.role === "Doctor" && user.staffId) {
          setPhysician(user.staffId);
        }
      })
      .catch(() => setDoctors([]));
  }, [open, user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm?.({
      dischargeType,
      dischargeSummary: summary,
      dischargedOn: date,
      dischargedBy: doctors.find((entry) => entry.staffId === physician)?.name || physician,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Discharge Patient</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Discharge Type *</Label>
              <Select required value={dischargeType} onValueChange={setDischargeType}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal Discharge</SelectItem>
                  <SelectItem value="against-advice">Against Medical Advice</SelectItem>
                  <SelectItem value="transfer">Transfer to Another Facility</SelectItem>
                  <SelectItem value="deceased">Deceased</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Discharge Date *</Label>
              <Input type="date" required value={date} onChange={e => setDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Discharge Summary *</Label>
            <Textarea placeholder="Summary of treatment..." rows={3} required value={summary} onChange={e => setSummary(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Attending Physician *</Label>
            <Select required value={physician} onValueChange={setPhysician}>
              <SelectTrigger><SelectValue placeholder="Select physician" /></SelectTrigger>
              <SelectContent>
                {doctors.map((entry) => (
                  <SelectItem key={entry.staffId} value={entry.staffId}>{entry.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="gradient-primary text-primary-foreground">Confirm Discharge</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
