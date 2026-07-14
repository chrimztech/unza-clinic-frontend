import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import api from "@/lib/api";

export interface StaffEntry {
  id: number;
  staff_id: string;
  man_number?: string;
  name: string;
  role?: string;
  specialization: string;
  department: string;
  phone: string;
  email?: string;
  status: string;
}

interface AddStaffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit?: (entry: StaffEntry) => void;
}

const specializations = [
  "General Medicine", "Orthopedic Surgery", "Pediatrics", "Cardiology",
  "Dermatology", "Neurology", "Nursing", "Lab Technology", "Pharmacy",
  "Radiology", "Anesthesiology",
];

export default function AddStaffDialog({ open, onOpenChange, onSubmit }: AddStaffDialogProps) {
  const [name, setName] = useState("");
  const [manNumber, setManNumber] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [department, setDepartment] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("doctor");
  const [departments, setDepartments] = useState<string[]>([]);

  useEffect(() => {
    async function loadDepartments() {
      try {
        const entries = await api.departments.getAll();
        setDepartments((entries || []).map((entry: any) => entry.name));
      } catch {
        setDepartments([]);
      }
    }
    if (open) {
      loadDepartments();
    }
  }, [open]);

  const reset = () => {
    setName("");
    setManNumber("");
    setSpecialization("");
    setDepartment("");
    setPhone("");
    setEmail("");
    setRole("doctor");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const entry = await api.staff.create({
        name,
        manNumber,
        role: role.charAt(0).toUpperCase() + role.slice(1),
        specialization,
        department,
        phone,
        email,
      });
      onSubmit?.(entry);
      toast.success("Staff member added!", { description: name });
      reset();
      onOpenChange(false);
    } catch {
      toast.error("Failed to add staff member");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Add New Staff Member</DialogTitle>
          <DialogDescription>
            Create a staff profile and assign the role and section they will work in.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Full Name *</Label>
              <Input placeholder="e.g. Dr. John Smith" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Man Number</Label>
              <Input placeholder="e.g. MAN-001" value={manNumber} onChange={(e) => setManNumber(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Role *</Label>
              <Select required value={role} onValueChange={setRole}>
                <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="doctor">Doctor</SelectItem>
                  <SelectItem value="nurse">Nurse</SelectItem>
                  <SelectItem value="lab">Lab Technician</SelectItem>
                  <SelectItem value="pharmacist">Pharmacist</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Department *</Label>
              <Select required value={department} onValueChange={setDepartment}>
                <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>
                  {departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input placeholder="name@unza.zm" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Specialization *</Label>
              <Select required value={specialization} onValueChange={setSpecialization}>
                <SelectTrigger><SelectValue placeholder="Select specialization" /></SelectTrigger>
                <SelectContent>
                  {specializations.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Phone Number *</Label>
              <Input placeholder="+260 97 XXXXXXX" required value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="gradient-primary text-primary-foreground">Add Staff</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
