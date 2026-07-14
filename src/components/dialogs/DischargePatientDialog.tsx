import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

interface DischargePatientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm?: () => void;
}

export default function DischargePatientDialog({ open, onOpenChange, onConfirm }: DischargePatientDialogProps) {
  const [dischargeType, setDischargeType] = useState("");
  const [date, setDate] = useState("2026-03-31");
  const [summary, setSummary] = useState("");
  const [physician, setPhysician] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm?.();
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
                <SelectItem value="dr-tembo">Dr. Tembo</SelectItem>
                <SelectItem value="dr-lungu">Dr. Lungu</SelectItem>
                <SelectItem value="dr-ngandu">Dr. Ng'andu</SelectItem>
                <SelectItem value="dr-mwale">Dr. Mwale</SelectItem>
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
