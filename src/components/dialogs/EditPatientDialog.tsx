import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import api from "@/lib/api";

type EditPatientDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: any;
  onSaved: (patient: any) => void;
};

type FormState = {
  clinicNumber: string;
  patientType: string;
  name: string;
  dob: string;
  gender: string;
  phone: string;
  email: string;
  address: string;
  studentId: string;
  manNumber: string;
  program: string;
  school: string;
  year: string;
  hostel: string;
  emergencyContact: string;
  emergencyRelation: string;
  emergencyPhone: string;
  bloodGroup: string;
  insurance: string;
  allergies: string;
  conditions: string;
};

const emptyState: FormState = {
  clinicNumber: "",
  patientType: "GENERAL",
  name: "",
  dob: "",
  gender: "",
  phone: "",
  email: "",
  address: "",
  studentId: "",
  manNumber: "",
  program: "",
  school: "",
  year: "",
  hostel: "",
  emergencyContact: "",
  emergencyRelation: "",
  emergencyPhone: "",
  bloodGroup: "",
  insurance: "",
  allergies: "",
  conditions: "",
};

export default function EditPatientDialog({ open, onOpenChange, patient, onSaved }: EditPatientDialogProps) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(emptyState);

  useEffect(() => {
    if (!open || !patient) {
      return;
    }
    setForm({
      clinicNumber: patient.clinic_number || "",
      patientType: patient.patient_type || "GENERAL",
      name: patient.name || "",
      dob: patient.dob || "",
      gender: patient.gender || "",
      phone: patient.phone || "",
      email: patient.email || "",
      address: patient.address || "",
      studentId: patient.student_id || "",
      manNumber: patient.man_number || "",
      program: patient.program || "",
      school: patient.school || "",
      year: patient.year ? String(patient.year) : "",
      hostel: patient.hostel || "",
      emergencyContact: patient.emergency_contact || "",
      emergencyRelation: patient.emergency_relation || "",
      emergencyPhone: patient.emergency_phone || "",
      bloodGroup: patient.blood_group || "",
      insurance: patient.insurance || "",
      allergies: patient.allergies || "",
      conditions: patient.conditions || "",
    });
  }, [open, patient]);

  const setField = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!patient?.patient_id) {
      toast.error("Patient record is missing an identifier");
      return;
    }

    const age = form.dob ? new Date().getFullYear() - new Date(form.dob).getFullYear() : undefined;

    try {
      setSaving(true);
      const updated = await api.patients.update(patient.patient_id, {
        clinicNumber: form.clinicNumber,
        patientType: form.patientType,
        name: form.name,
        age,
        gender: form.gender,
        dob: form.dob,
        phone: form.phone,
        email: form.email,
        address: form.address,
        bloodGroup: form.bloodGroup,
        studentId: ["STUDENT", "FIRST_TIME_STUDENT"].includes(form.patientType) ? form.studentId : "",
        manNumber: ["STAFF", "STAFF_DEPENDANT"].includes(form.patientType) ? form.manNumber : "",
        program: ["STUDENT", "FIRST_TIME_STUDENT"].includes(form.patientType) ? form.program : "",
        school: ["STUDENT", "FIRST_TIME_STUDENT"].includes(form.patientType) ? form.school : "",
        year: ["STUDENT", "FIRST_TIME_STUDENT"].includes(form.patientType) && form.year ? Number(form.year) : null,
        hostel: ["STUDENT", "FIRST_TIME_STUDENT"].includes(form.patientType) ? form.hostel : "",
        emergencyContact: form.emergencyContact,
        emergencyPhone: form.emergencyPhone,
        emergencyRelation: form.emergencyRelation,
        allergies: form.allergies,
        conditions: form.conditions,
        insurance: form.insurance,
      });
      window.dispatchEvent(new CustomEvent("unza:patients:changed"));
      onSaved(updated);
      toast.success("Patient record updated");
      onOpenChange(false);
    } catch {
      toast.error("Failed to update patient");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-display">Edit Patient Record</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Clinic Number</Label>
              <Input value={form.clinicNumber} onChange={(event) => setField("clinicNumber", event.target.value.toUpperCase())} />
            </div>
            <div className="space-y-1.5">
              <Label>Patient Type</Label>
              <Select value={form.patientType} onValueChange={(value) => setField("patientType", value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="GENERAL">General</SelectItem>
                  <SelectItem value="STUDENT">Student</SelectItem>
                  <SelectItem value="FIRST_TIME_STUDENT">First Timer Student</SelectItem>
                  <SelectItem value="STAFF">Staff</SelectItem>
                  <SelectItem value="STAFF_DEPENDANT">Staff Dependant/Spouse</SelectItem>
                  <SelectItem value="NON_UNZA">Non UNZA</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Full Name</Label>
              <Input required value={form.name} onChange={(event) => setField("name", event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Date of Birth</Label>
              <Input type="date" required value={form.dob} onChange={(event) => setField("dob", event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Gender</Label>
              <Select value={form.gender} onValueChange={(value) => setField("gender", value)}>
                <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input required value={form.phone} onChange={(event) => setField("phone", event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(event) => setField("email", event.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Address</Label>
              <Input required value={form.address} onChange={(event) => setField("address", event.target.value)} />
            </div>
          </div>

          {["STUDENT", "FIRST_TIME_STUDENT"].includes(form.patientType) ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Student ID</Label>
                <Input required value={form.studentId} onChange={(event) => setField("studentId", event.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Program</Label>
                <Input value={form.program} onChange={(event) => setField("program", event.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>School</Label>
                <Input value={form.school} onChange={(event) => setField("school", event.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Year</Label>
                <Input type="number" min="1" value={form.year} onChange={(event) => setField("year", event.target.value)} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Hostel</Label>
                <Input value={form.hostel} onChange={(event) => setField("hostel", event.target.value)} />
              </div>
            </div>
          ) : null}

          {["STAFF", "STAFF_DEPENDANT"].includes(form.patientType) ? (
            <div className="space-y-1.5">
              <Label>Man Number</Label>
              <Input required value={form.manNumber} onChange={(event) => setField("manNumber", event.target.value)} />
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Emergency Contact</Label>
              <Input value={form.emergencyContact} onChange={(event) => setField("emergencyContact", event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Relationship</Label>
              <Input value={form.emergencyRelation} onChange={(event) => setField("emergencyRelation", event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Emergency Phone</Label>
              <Input value={form.emergencyPhone} onChange={(event) => setField("emergencyPhone", event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Blood Group</Label>
              <Input value={form.bloodGroup} onChange={(event) => setField("bloodGroup", event.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Insurance</Label>
              <Input value={form.insurance} onChange={(event) => setField("insurance", event.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Allergies</Label>
              <Textarea rows={3} value={form.allergies} onChange={(event) => setField("allergies", event.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Chronic Conditions</Label>
              <Textarea rows={3} value={form.conditions} onChange={(event) => setField("conditions", event.target.value)} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="gradient-primary text-primary-foreground" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
