import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import api from "@/lib/api";

export interface DepartmentEntry {
  id: number;
  code: string;
  name: string;
  head: string;
  doctors: number;
  nurses: number;
  beds: number;
  location: string;
  phone: string;
  status: string;
}

interface AddDepartmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit?: (entry: DepartmentEntry) => void;
  initialData?: DepartmentEntry | null;
}

export default function AddDepartmentDialog({ open, onOpenChange, onSubmit, initialData }: AddDepartmentDialogProps) {
  const [name, setName] = useState("");
  const [head, setHead] = useState("");
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");
  const [doctors, setDoctors] = useState("");
  const [nurses, setNurses] = useState("");
  const [beds, setBeds] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }
    if (!initialData) {
      reset();
      return;
    }
    setName(initialData.name || "");
    setHead(initialData.head || "");
    setLocation(initialData.location || "");
    setPhone(initialData.phone || "");
    setDoctors(String(initialData.doctors ?? ""));
    setNurses(String(initialData.nurses ?? ""));
    setBeds(String(initialData.beds ?? ""));
  }, [initialData, open]);

  const reset = () => {
    setName("");
    setHead("");
    setLocation("");
    setPhone("");
    setDoctors("");
    setNurses("");
    setBeds("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name,
        head,
        doctors: parseInt(doctors) || 0,
        nurses: parseInt(nurses) || 0,
        beds: parseInt(beds) || 0,
        location,
        phone,
      };
      const entry = initialData?.code
        ? await api.departments.update(initialData.code, payload)
        : await api.departments.create(payload);
      onSubmit?.(entry);
      toast.success(initialData ? "Department updated!" : "Department added!", {
        description: initialData ? `${name} has been updated.` : `${name} has been created.`,
      });
      reset();
      onOpenChange(false);
    } catch {
      toast.error(initialData ? "Failed to update department" : "Failed to create department");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">{initialData ? "Edit Department" : "Add New Department"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Department Name *</Label>
              <Input placeholder="e.g. Cardiology" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Head of Department *</Label>
              <Input placeholder="e.g. Dr. John Smith" required value={head} onChange={(e) => setHead(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Location *</Label>
              <Input placeholder="e.g. Block A, Floor 2" required value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Extension *</Label>
              <Input placeholder="e.g. Ext. 301" required value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Number of Doctors</Label>
              <Input type="number" min="0" placeholder="0" value={doctors} onChange={(e) => setDoctors(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Number of Nurses</Label>
              <Input type="number" min="0" placeholder="0" value={nurses} onChange={(e) => setNurses(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Number of Beds</Label>
              <Input type="number" min="0" placeholder="0" value={beds} onChange={(e) => setBeds(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="gradient-primary text-primary-foreground">
              {initialData ? "Save Changes" : "Add Department"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
