import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, UserPlus, Hash, Search, CheckCircle2, AlertCircle, GraduationCap, Briefcase, Users, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import api from "@/lib/api";
import { getEncounterStartingActions, getEncounterStartingStage } from "@/lib/patient-flow";
import { useAuth } from "@/context/AuthContext";
import { getUserDisplayName } from "@/lib/session-user";

interface FormState {
  clinicNumber: string;
  patientType: "GENERAL" | "STUDENT" | "FIRST_TIME_STUDENT" | "STAFF" | "STAFF_DEPENDANT" | "NON_UNZA";
  firstName: string;
  middleName: string;
  lastName: string;
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
  department: string;
  role: string;
  emergencyContact: string;
  emergencyRelation: string;
  emergencyPhone: string;
  bloodGroup: string;
  insurance: string;
  allergies: string;
  conditions: string;
}

const initialState: FormState = {
  clinicNumber: "",
  patientType: "GENERAL",
  firstName: "",
  middleName: "",
  lastName: "",
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
  department: "",
  role: "",
  emergencyContact: "",
  emergencyRelation: "",
  emergencyPhone: "",
  bloodGroup: "",
  insurance: "",
  allergies: "",
  conditions: "",
};

export default function PatientRegistration() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const registeredByName = getUserDisplayName(user, "Reception");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(initialState);
  const [assignedClinicNumber, setAssignedClinicNumber] = useState<string>("");
  const [lookupStatus, setLookupStatus] = useState<"idle" | "loading" | "found" | "not_found" | "already_registered">("idle");
  const [category, setCategory] = useState<"STUDENT" | "STAFF" | "STAFF_DEPENDANT" | "PUBLIC" | null>(null);
  const [isFirstTimeStudent, setIsFirstTimeStudent] = useState(false);
  const [isExternalVisitor, setIsExternalVisitor] = useState(false);
  const [linkedStaffName, setLinkedStaffName] = useState("");
  const [staffDependents, setStaffDependents] = useState<{ full_name: string; relationship: string; date_of_birth: string }[]>([]);
  const [selectedDependentIndex, setSelectedDependentIndex] = useState("");

  const setField = (key: keyof FormState, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const categoryOptions: { key: NonNullable<typeof category>; label: string; description: string; icon: typeof GraduationCap }[] = [
    { key: "STUDENT", label: "Student", description: "Look up by SIS computer number", icon: GraduationCap },
    { key: "STAFF", label: "Staff", description: "Look up by HR man number", icon: Briefcase },
    { key: "STAFF_DEPENDANT", label: "Staff Dependant/Spouse", description: "Link to a staff member's record", icon: Users },
    { key: "PUBLIC", label: "Public", description: "Enter details manually", icon: User },
  ];

  const selectCategory = (next: NonNullable<typeof category>) => {
    setCategory(next);
    setLookupStatus("idle");
    setLinkedStaffName("");
    setStaffDependents([]);
    setSelectedDependentIndex("");
    setForm((prev) => ({ ...prev, department: "", role: "" }));
    if (next === "STUDENT") setField("patientType", isFirstTimeStudent ? "FIRST_TIME_STUDENT" : "STUDENT");
    else if (next === "STAFF") setField("patientType", "STAFF");
    else if (next === "STAFF_DEPENDANT") setField("patientType", "STAFF_DEPENDANT");
    else setField("patientType", isExternalVisitor ? "NON_UNZA" : "GENERAL");
  };

  useEffect(() => {
    if (category === "STUDENT") setField("patientType", isFirstTimeStudent ? "FIRST_TIME_STUDENT" : "STUDENT");
  }, [isFirstTimeStudent]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (category === "PUBLIC") setField("patientType", isExternalVisitor ? "NON_UNZA" : "GENERAL");
  }, [isExternalVisitor]); // eslint-disable-line react-hooks/exhaustive-deps

  const lookupStaff = async () => {
    if (!form.manNumber.trim()) { toast.error("Enter a man number first"); return; }
    setLookupStatus("loading");
    setLinkedStaffName("");
    setStaffDependents([]);
    setSelectedDependentIndex("");
    try {
      const result = await api.staff.lookupByManNumber(form.manNumber.trim());
      if (!result.found) {
        setLookupStatus("not_found");
        toast.info("Man number not found in HR system — enter details manually");
        return;
      }

      if (result.employment_status && result.employment_status !== "ACTIVE") {
        toast.warning(`Note: HR lists this staff member's employment status as ${result.employment_status}`);
      }

      if (form.patientType === "STAFF_DEPENDANT") {
        setLinkedStaffName(result.name || "");
        const dependents = (result.dependents || []) as { full_name: string; relationship: string; date_of_birth: string }[];
        setStaffDependents(dependents);
        setLookupStatus("found");
        setForm((prev) => ({ ...prev, department: result.department || prev.department }));
        if (dependents.length > 0) {
          toast.success(`Found ${result.name} — select a dependant/spouse below`);
        } else {
          toast.info(`${result.name} has no dependants on file in the HR system`);
        }
        return;
      }

      if (result.already_registered) {
        setLookupStatus("already_registered");
        toast.warning(`${result.name} is already registered — Clinic No: ${result.clinic_number}`);
      } else {
        setLookupStatus("found");
        setForm((prev) => ({
          ...prev,
          firstName: (result.name as string).split(" ")[0] || prev.firstName,
          lastName: (result.name as string).split(" ").slice(1).join(" ") || prev.lastName,
          phone: result.phone || prev.phone,
          email: result.email || prev.email,
          gender: result.gender || prev.gender,
          dob: result.date_of_birth || prev.dob,
          department: result.department || prev.department,
          role: result.role || prev.role,
        }));
        toast.success(`Found in HR system: ${result.name} — ${result.department}`);
      }
    } catch {
      setLookupStatus("not_found");
    }
  };

  const relationshipToEmergencyRelation = (hrRelationship: string) => {
    const normalized = hrRelationship.trim().toLowerCase();
    if (normalized === "spouse") return "Spouse";
    if (normalized === "child") return "Parent";
    return "Other";
  };

  const selectDependent = (indexStr: string) => {
    setSelectedDependentIndex(indexStr);
    const dependent = staffDependents[Number(indexStr)];
    if (!dependent) return;
    const nameParts = dependent.full_name.trim().split(/\s+/);
    setForm((prev) => ({
      ...prev,
      firstName: nameParts[0] || prev.firstName,
      lastName: nameParts.slice(1).join(" ") || prev.lastName,
      dob: dependent.date_of_birth || prev.dob,
      emergencyContact: linkedStaffName || prev.emergencyContact,
      emergencyRelation: relationshipToEmergencyRelation(dependent.relationship),
    }));
  };

  const lookupStudent = async () => {
    if (!form.studentId.trim()) { toast.error("Enter a student computer number first"); return; }
    setLookupStatus("loading");
    try {
      const result = await api.sis.lookupStudent(form.studentId.trim());
      if (result.already_registered) {
        setLookupStatus("already_registered");
        toast.warning(`Student already registered — Clinic No: ${result.clinic_number}`);
      } else if (result.found) {
        setLookupStatus("found");
        setForm((prev) => ({
          ...prev,
          firstName: (result.name as string).split(" ")[0] || prev.firstName,
          lastName: (result.name as string).split(" ").slice(1).join(" ") || prev.lastName,
          program: result.program || prev.program,
          school: result.school || prev.school,
          phone: result.phone || prev.phone,
          email: result.email || prev.email,
        }));
        toast.success("Found in SIS — details pre-filled");
      } else {
        setLookupStatus("not_found");
        toast.info("Student number not found in SIS — enter details manually");
      }
    } catch {
      setLookupStatus("not_found");
    }
  };

  // Derive the clinic number preview from institutional ID as the user types
  useEffect(() => {
    if (form.clinicNumber.trim()) {
      setAssignedClinicNumber(form.clinicNumber.toUpperCase());
      return;
    }
    const sanitize = (id: string) =>
      id.trim().toUpperCase().replace(/[^A-Z0-9]/g, "-").replace(/-{2,}/g, "-").replace(/^-|-$/g, "");

    if (["STUDENT", "FIRST_TIME_STUDENT"].includes(form.patientType)) {
      setAssignedClinicNumber(form.studentId.trim() ? `STU-${sanitize(form.studentId)}` : "STU-XXXXX");
    } else if (form.patientType === "STAFF") {
      setAssignedClinicNumber(form.manNumber.trim() ? `STA-${sanitize(form.manNumber)}` : "STA-XXXXX");
    } else if (form.patientType === "STAFF_DEPENDANT") {
      setAssignedClinicNumber(form.manNumber.trim() ? `DEP-${sanitize(form.manNumber)}` : "DEP-XXXXX");
    } else if (form.patientType === "NON_UNZA") {
      setAssignedClinicNumber("EXT-XXXXX");
    } else {
      setAssignedClinicNumber("CLN-XXXXX");
    }
  }, [form.patientType, form.clinicNumber, form.studentId, form.manNumber]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const fullName = [form.firstName, form.middleName, form.lastName].filter(Boolean).join(" ");
    const age = form.dob ? new Date().getFullYear() - new Date(form.dob).getFullYear() : undefined;

    try {
      const response = await api.patients.create({
        clinicNumber: form.clinicNumber,
        patientType: form.patientType,
        name: fullName,
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
        department: ["STAFF", "STAFF_DEPENDANT"].includes(form.patientType) ? form.department : "",
        role: ["STAFF", "STAFF_DEPENDANT"].includes(form.patientType) ? form.role : "",
        emergencyContact: form.emergencyContact,
        emergencyPhone: form.emergencyPhone,
        emergencyRelation: form.emergencyRelation,
        allergies: form.allergies,
        conditions: form.conditions,
        insurance: form.insurance,
      });

      const createdPatient = await api.patients.getById(response.patient_id);
      await api.encounters.create({
        patientId: createdPatient.patient_id,
        patientName: createdPatient.name,
        patientType: createdPatient.patient_type,
        createdBy: registeredByName,
        currentStage: getEncounterStartingStage(false),
        pendingActions: getEncounterStartingActions(false).join(", "),
        notes: "Encounter automatically opened during patient registration.",
      });
      window.dispatchEvent(new CustomEvent("unza:patients:changed"));

      const finalClinicNumber = response.clinic_number || response.patient_id;
      toast.success("Patient registered successfully!", {
        description: `Clinic Number assigned: ${finalClinicNumber}`,
        duration: 6000,
      });
      navigate("/patient-flow");
    } catch {
      toast.error("Failed to register patient");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <TopBar title="Register New Patient" subtitle="Add a new patient to the clinic system" />
      <div className="p-6 max-w-4xl mx-auto">
        <Button variant="ghost" size="sm" onClick={() => navigate("/patients")} className="mb-4 text-muted-foreground">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Patients
        </Button>

        <section className="rounded-xl bg-card p-6 shadow-card border border-border mb-6">
          <h3 className="font-semibold font-display text-card-foreground mb-1 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">1</span>
            Select Patient Type
          </h3>
          <p className="text-xs text-muted-foreground mb-4 ml-8">Choose who you're registering — this determines whether we look the record up for you or you enter it manually.</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {categoryOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = category === option.key;
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => selectCategory(option.key)}
                  className={`flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all ${
                    isSelected ? "border-primary bg-primary/5 shadow-md" : "border-border hover:border-primary/40 hover:bg-muted/40"
                  }`}
                >
                  <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${isSelected ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                    <Icon className="h-4.5 w-4.5" />
                  </span>
                  <span className="font-medium text-card-foreground">{option.label}</span>
                  <span className="text-xs text-muted-foreground">{option.description}</span>
                </button>
              );
            })}
          </div>
        </section>

        {category && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="rounded-xl bg-card p-6 shadow-card border border-border">
            <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
              <h3 className="font-semibold font-display text-card-foreground flex items-center gap-2">
                <Search className="h-5 w-5 text-primary" />
                {category === "STUDENT" ? "UNZA Student Details" : category === "STAFF" ? "UNZA Staff Details" : category === "STAFF_DEPENDANT" ? "Staff Dependant/Spouse Details" : "External Identity"}
              </h3>
              <div className="flex items-center gap-3">
                {category === "STUDENT" && (
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <input type="checkbox" className="h-3.5 w-3.5" checked={isFirstTimeStudent} onChange={(e) => setIsFirstTimeStudent(e.target.checked)} />
                    First-time student (initial medical exam)
                  </label>
                )}
                {category === "PUBLIC" && (
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <input type="checkbox" className="h-3.5 w-3.5" checked={isExternalVisitor} onChange={(e) => setIsExternalVisitor(e.target.checked)} />
                    External visitor (not affiliated with UNZA)
                  </label>
                )}
                <Button type="button" variant="ghost" size="sm" onClick={() => setCategory(null)} className="text-xs text-muted-foreground">
                  Change patient type
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              {["STUDENT", "FIRST_TIME_STUDENT"].includes(form.patientType)
                ? "Search first — this pre-fills the personal details below from the university's student records."
                : ["STAFF", "STAFF_DEPENDANT"].includes(form.patientType)
                ? "Search first — this pre-fills the personal details below from the HR system."
                : "No lookup needed for this patient type — enter details manually below."}
            </p>
            {["STUDENT", "FIRST_TIME_STUDENT"].includes(form.patientType) ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="studentId">Student Computer Number *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="studentId"
                      required
                      placeholder="e.g. 20201234567"
                      value={form.studentId}
                      onChange={(e) => { setField("studentId", e.target.value); setLookupStatus("idle"); }}
                    />
                    <Button type="button" variant="outline" size="sm" onClick={lookupStudent} disabled={lookupStatus === "loading"} title="Lookup in SIS">
                      {lookupStatus === "found" ? <CheckCircle2 className="h-4 w-4 text-green-600" /> :
                       lookupStatus === "already_registered" ? <AlertCircle className="h-4 w-4 text-amber-500" /> :
                       <Search className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Enter the student's SIS computer number then click search to auto-fill details.</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="program">Program</Label>
                  <Input id="program" value={form.program} onChange={(e) => setField("program", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="school">School/Faculty</Label>
                  <Input id="school" value={form.school} onChange={(e) => setField("school", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="yearOfStudy">Year of Study</Label>
                  <Select value={form.year} onValueChange={(value) => setField("year", value)}>
                    <SelectTrigger><SelectValue placeholder="Select year" /></SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7].map((y) => (
                        <SelectItem key={y} value={String(y)}>Year {y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="hostel">Hostel/Residence</Label>
                  <Input id="hostel" value={form.hostel} onChange={(e) => setField("hostel", e.target.value)} />
                </div>
              </div>
            ) : ["STAFF", "STAFF_DEPENDANT"].includes(form.patientType) ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="manNumber">
                    {form.patientType === "STAFF_DEPENDANT" ? "Staff Member's Man Number *" : "Man Number *"}
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="manNumber"
                      required
                      placeholder="e.g. MN001234"
                      value={form.manNumber}
                      onChange={(e) => {
                        setField("manNumber", e.target.value);
                        setLookupStatus("idle");
                        setLinkedStaffName("");
                        setStaffDependents([]);
                        setSelectedDependentIndex("");
                        setForm((prev) => ({ ...prev, department: "", role: "" }));
                      }}
                    />
                    <Button type="button" variant="outline" size="sm" onClick={lookupStaff} disabled={lookupStatus === "loading"} title="Lookup in HR system">
                      {lookupStatus === "found" ? <CheckCircle2 className="h-4 w-4 text-green-600" /> :
                       lookupStatus === "already_registered" ? <AlertCircle className="h-4 w-4 text-amber-500" /> :
                       <Search className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {form.patientType === "STAFF_DEPENDANT"
                      ? "Enter the staff member's man number to link this dependant to their record."
                      : "Enter the UNZA HR man number then click search to auto-fill details from the HR system."}
                  </p>
                </div>
                {form.patientType === "STAFF_DEPENDANT" && linkedStaffName && (
                  <div className="space-y-1.5">
                    <Label htmlFor="dependentSelect">Select Dependant/Spouse *</Label>
                    {staffDependents.length > 0 ? (
                      <Select value={selectedDependentIndex} onValueChange={selectDependent}>
                        <SelectTrigger id="dependentSelect"><SelectValue placeholder="Select from HR record" /></SelectTrigger>
                        <SelectContent>
                          {staffDependents.map((dep, index) => (
                            <SelectItem key={`${dep.full_name}-${index}`} value={String(index)}>
                              {dep.full_name} — {dep.relationship}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-xs text-amber-600">No dependants/spouse on file for {linkedStaffName} in the HR system — enter their details manually below.</p>
                    )}
                    <p className="text-xs text-muted-foreground">Linked to staff member: {linkedStaffName}</p>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="department">Department</Label>
                  <Input id="department" value={form.department} onChange={(e) => setField("department", e.target.value)} />
                </div>
                {form.patientType === "STAFF" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="role">Job Title</Label>
                    <Input id="role" value={form.role} onChange={(e) => setField("role", e.target.value)} />
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Use this patient type for visitors and non-UNZA patients. No student ID or man number is required, and the system will generate an external clinic number automatically when you leave the field blank.</p>
            )}
          </section>

          <section className="rounded-xl bg-card p-6 shadow-card border border-border">
            <h3 className="font-semibold font-display text-card-foreground mb-4 flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" /> Personal Information
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="clinicNumber">Clinic Number</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="clinicNumber"
                    placeholder={getClinicNumberPlaceholder(form.patientType)}
                    value={form.clinicNumber}
                    onChange={(e) => setField("clinicNumber", e.target.value.toUpperCase())}
                    className="font-mono"
                  />
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <Hash className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Will be assigned: </span>
                  <Badge variant="secondary" className="font-mono text-xs px-1.5 py-0">
                    {assignedClinicNumber}
                  </Badge>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input id="phone" required value={form.phone} onChange={(e) => setField("phone", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="firstName">First Name *</Label>
                <Input id="firstName" required value={form.firstName} onChange={(e) => setField("firstName", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="middleName">Middle Name</Label>
                <Input id="middleName" value={form.middleName} onChange={(e) => setField("middleName", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input id="lastName" required value={form.lastName} onChange={(e) => setField("lastName", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dob">Date of Birth *</Label>
                <Input id="dob" type="date" required value={form.dob} onChange={(e) => setField("dob", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gender">Gender *</Label>
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
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} />
              </div>
              <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                <Label htmlFor="address">Residential Address *</Label>
                <Input id="address" required value={form.address} onChange={(e) => setField("address", e.target.value)} />
              </div>
            </div>
          </section>

          <section className="rounded-xl bg-card p-6 shadow-card border border-border">
            <h3 className="font-semibold font-display text-card-foreground mb-4">Emergency Contact</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="ecName">Contact Name *</Label>
                <Input id="ecName" required value={form.emergencyContact} onChange={(e) => setField("emergencyContact", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ecRelation">Relationship *</Label>
                <Select value={form.emergencyRelation} onValueChange={(value) => setField("emergencyRelation", value)}>
                  <SelectTrigger><SelectValue placeholder="Select relationship" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Parent">Parent</SelectItem>
                    <SelectItem value="Spouse">Spouse</SelectItem>
                    <SelectItem value="Sibling">Sibling</SelectItem>
                    <SelectItem value="Guardian">Guardian</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ecPhone">Phone Number *</Label>
                <Input id="ecPhone" required value={form.emergencyPhone} onChange={(e) => setField("emergencyPhone", e.target.value)} />
              </div>
            </div>
          </section>

          <section className="rounded-xl bg-card p-6 shadow-card border border-border">
            <h3 className="font-semibold font-display text-card-foreground mb-4">Medical History</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="bloodGroup">Blood Group</Label>
                <Select value={form.bloodGroup} onValueChange={(value) => setField("bloodGroup", value)}>
                  <SelectTrigger><SelectValue placeholder="Select blood group" /></SelectTrigger>
                  <SelectContent>
                    {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                      <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="insurance">Insurance Provider</Label>
                <Select value={form.insurance} onValueChange={(value) => setField("insurance", value)}>
                  <SelectTrigger><SelectValue placeholder="Select scheme" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NHIMA">NHIMA</SelectItem>
                    <SelectItem value="UNZALARU">UNZALARU</SelectItem>
                    <SelectItem value="UNZA Medical">UNZA Medical</SelectItem>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="allergies">Known Allergies</Label>
                <Textarea id="allergies" rows={2} value={form.allergies} onChange={(e) => setField("allergies", e.target.value)} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="conditions">Chronic Conditions</Label>
                <Textarea id="conditions" rows={2} value={form.conditions} onChange={(e) => setField("conditions", e.target.value)} />
              </div>
            </div>
          </section>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => navigate("/patients")}>Cancel</Button>
            <Button type="submit" className="gradient-primary text-primary-foreground" disabled={saving}>
              <Save className="h-4 w-4 mr-1" /> {saving ? "Saving..." : "Register Patient"}
            </Button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
}

function getClinicNumberPrefix(patientType: FormState["patientType"]) {
  if (["STUDENT", "FIRST_TIME_STUDENT"].includes(patientType)) return "STU";
  if (["STAFF", "STAFF_DEPENDANT"].includes(patientType)) return "STA";
  if (patientType === "NON_UNZA") return "EXT";
  return "CLN";
}

function getClinicNumberPlaceholder(patientType: FormState["patientType"]) {
  if (["STUDENT", "FIRST_TIME_STUDENT"].includes(patientType)) return "Auto-derived from student computer number";
  if (patientType === "STAFF") return "Auto-derived from man number";
  if (patientType === "STAFF_DEPENDANT") return "Auto-derived from staff man number";
  const prefix = getClinicNumberPrefix(patientType);
  return `Leave blank — system assigns ${prefix}-XXXXX`;
}

function getClinicNumberHelpText(_patientType: FormState["patientType"]) {
  return "Auto-assigned by the system. You may override only if transferring from another facility.";
}
