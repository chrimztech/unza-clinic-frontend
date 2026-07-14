import { useEffect, useMemo, useState } from "react";
import TopBar from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import api from "@/lib/api";
import { searchPatient, createGuestPatient, counselingApi, type EnrichedPatient } from "@/lib/externalSystems";
import { useAuth } from "@/context/AuthContext";
import { CheckCircle2, Circle, Download, ShieldCheck, Search, UserPlus, Users, GraduationCap, Briefcase, Heart, ArrowRight } from "lucide-react";
import { facilityStages, getAllowedNextStages, getEncounterStartingActions, getEncounterStartingStage, mergeUniqueActions, normalizeFacilityStage, stageTaskLibrary, type FacilityStage } from "@/lib/patient-flow";

type SearchMode = "student" | "staff" | "name" | "guest";

export default function PatientFlow() {
  const { user } = useAuth();
  const [encounters, setEncounters] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [stage, setStage] = useState<FacilityStage>("CONSULTATION");
  const [paymentStatus, setPaymentStatus] = useState("NOT_REQUIRED");
  const [pendingActions, setPendingActions] = useState<string[]>([]);
  const [completedActions, setCompletedActions] = useState<string[]>([]);
  const [note, setNote] = useState("");

  // Search functionality
  const [searchMode, setSearchMode] = useState<SearchMode>("student");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<EnrichedPatient[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<EnrichedPatient | null>(null);

  // Guest registration
  const [guestName, setGuestName] = useState("");
  const [guestDob, setGuestDob] = useState("");
  const [guestGender, setGuestGender] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestAddress, setGuestAddress] = useState("");

  // Counseling referral
  const [showCounselingReferral, setShowCounselingReferral] = useState(false);
  const [counselingReason, setCounselingReason] = useState("");
  const [counselingUrgency, setCounselingUrgency] = useState<"low" | "medium" | "high">("medium");
  const [counselingNotes, setCounselingNotes] = useState("");
  const [counselingReferrals, setCounselingReferrals] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const encounterData = await api.encounters.getAll();
        setEncounters(encounterData);
        if (encounterData.length > 0) {
          setSelectedId(encounterData[0].id);
        }
      } catch {
        toast.error("Failed to load patient flow data");
      }
    }
    load();
  }, []);

  const selectedEncounter = useMemo(
    () => encounters.find((item) => item.id === selectedId) ?? null,
    [encounters, selectedId],
  );

  useEffect(() => {
    if (!selectedEncounter) return;
    setStage(normalizeFacilityStage(selectedEncounter.currentStage || "CONSULTATION"));
    setPaymentStatus(selectedEncounter.paymentStatus || "NOT_REQUIRED");
    setPendingActions(selectedEncounter.pendingActions || []);
    setCompletedActions(selectedEncounter.completedActions || []);
    setNote("");
  }, [selectedEncounter]);

  const allowedStages = useMemo(
    () => getAllowedNextStages(selectedEncounter?.currentStage),
    [selectedEncounter?.currentStage],
  );

  const recommendedTasks = useMemo(
    () => stageTaskLibrary[stage] || [],
    [stage],
  );

  const queueByStage = useMemo(
    () => facilityStages.map((itemStage) => ({
      stage: itemStage,
      count: encounters.filter((entry) => !entry.checkedOut && entry.currentStage === itemStage).length,
    })),
    [encounters],
  );

  const refreshEncounters = async () => {
    const data = await api.encounters.getAll();
    setEncounters(data);
  };

  const ensurePatientRecord = async (patient: EnrichedPatient) => {
    try {
      return await api.patients.getById(patient.patientId);
    } catch {
      const created = await api.patients.create({
        clinicNumber: "",
        patientType: mapPatientType(patient),
        name: patient.name,
        age: patient.dateOfBirth ? new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear() : null,
        gender: patient.gender || "",
        dob: patient.dateOfBirth || "",
        phone: patient.phone || "",
        email: patient.email || "",
        address: patient.address || "",
        bloodGroup: "",
        studentId: patient.studentNumber || "",
        manNumber: patient.staffNumber || "",
        program: patient.program || "",
        school: patient.program || "",
        year: patient.yearOfStudy || null,
        hostel: "",
        emergencyContact: "",
        emergencyPhone: "",
        emergencyRelation: "",
        allergies: "",
        conditions: "",
        insurance: "",
      });
      window.dispatchEvent(new CustomEvent("unza:patients:changed"));
      return api.patients.getById(created.patient_id);
    }
  };

  // Search for patients in external systems
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error("Please enter a search term");
      return;
    }

    setIsSearching(true);
    setSearchResults([]);
    setSelectedPatient(null);

    try {
      const results: EnrichedPatient[] = [];

      if (searchMode === "student") {
        const student = await searchPatient(searchQuery);
        if (student) results.push(student);
      } else if (searchMode === "staff") {
        const staff = await searchPatient(searchQuery);
        if (staff) results.push(staff);
      } else if (searchMode === "name") {
        const patient = await searchPatient(searchQuery);
        if (patient) results.push(patient);
      }

      setSearchResults(results);

      if (results.length === 0) {
        toast.info("No records found. Register as guest if new patient.");
      } else if (results.length === 1) {
        setSelectedPatient(results[0]);
        toast.success(`Found: ${results[0].name}`);
      }
    } catch (error: any) {
      toast.error(error.message || "Search failed");
    } finally {
      setIsSearching(false);
    }
  };

  // Create encounter for selected patient
  const createEncounterForPatient = async (patient: EnrichedPatient) => {
    try {
      const persistedPatient = await ensurePatientRecord(patient);
      const created = await api.encounters.create({
        patientId: persistedPatient.patient_id,
        patientName: persistedPatient.name,
        patientType: persistedPatient.patient_type,
        createdBy: user?.name || "Reception",
        currentStage: getEncounterStartingStage(patient.requiresMedicalExam),
        pendingActions: getEncounterStartingActions(patient.requiresMedicalExam).join(","),
        notes: `Patient from ${patient.source} system. ${patient.requiresMedicalExam ? "Medical examination required." : ""}`,
        metadata: {
          source: patient.source,
          studentNumber: patient.studentNumber,
          staffNumber: patient.staffNumber,
          program: patient.program,
          department: patient.department,
          position: patient.position,
          dateOfBirth: patient.dateOfBirth,
          gender: patient.gender,
          phone: patient.phone,
          email: patient.email,
          requiresMedicalExam: patient.requiresMedicalExam,
          medicalExamStatus: patient.medicalExamStatus,
        },
      });
      await refreshEncounters();
      setSelectedId(created.id);
      setSelectedPatient(null);
      setSearchResults([]);
      setSearchQuery("");
      toast.success("Encounter opened for " + patient.name);
    } catch (error: any) {
      toast.error(error.message || "Failed to open encounter");
    }
  };

  // Register guest patient
  const registerGuest = async () => {
    if (!guestName.trim()) {
      toast.error("Please enter guest name");
      return;
    }

    const guest = createGuestPatient({
      name: guestName,
      dateOfBirth: guestDob,
      gender: guestGender,
      phone: guestPhone,
      address: guestAddress,
    });

    await createEncounterForPatient(guest);

    // Reset guest form
    setGuestName("");
    setGuestDob("");
    setGuestGender("");
    setGuestPhone("");
    setGuestAddress("");
  };

  // Refer patient to counseling
  const referToCounseling = async () => {
    if (!selectedEncounter) {
      toast.error("No patient selected");
      return;
    }
    if (!counselingReason.trim()) {
      toast.error("Please enter reason for referral");
      return;
    }

    try {
      await counselingApi.referToCounseling({
        patientId: selectedEncounter.patientId,
        patientName: selectedEncounter.patientName,
        patientType: selectedEncounter.patientType,
        reason: counselingReason,
        urgency: counselingUrgency,
        referredBy: user?.name || "Clinic Staff",
        notes: counselingNotes,
      });
      toast.success("Patient referred to counseling system");
      setShowCounselingReferral(false);
      setCounselingReason("");
      setCounselingNotes("");
    } catch (error: any) {
      toast.error(error.message || "Failed to refer to counseling");
    }
  };

  // Load counseling referrals for current patient
  const loadCounselingReferrals = async () => {
    if (!selectedEncounter) return;
    try {
      const referrals = await counselingApi.getReferrals("from");
      setCounselingReferrals(referrals);
    } catch (error: any) {
      console.error("Failed to load counseling referrals", error);
    }
  };

  useEffect(() => {
    if (selectedEncounter) {
      loadCounselingReferrals();
    }
  }, [selectedEncounter]);

  const updateStage = async () => {
    if (!selectedEncounter) return;
    try {
      const nextCompletedActions = mergeUniqueActions(
        completedActions,
        stageTaskLibrary[normalizeFacilityStage(selectedEncounter.currentStage)],
      );
      const nextPendingActions = pendingActions.filter((item) => !nextCompletedActions.includes(item));
      const checkoutEligible = nextPendingActions.length === 0 && paymentStatus !== "PENDING";

      await api.encounters.updateStage(selectedEncounter.id, {
        stage,
        department: stage,
        performedBy: user?.name || "Clinic User",
        note: note || `Moved to ${stage}`,
        pendingActions: nextPendingActions.join(", "),
        completedActions: nextCompletedActions.join(", "),
        paymentStatus,
        checkoutEligible,
      });
      await refreshEncounters();
      toast.success("Encounter updated");
    } catch (error: any) {
      toast.error(error.message || "Failed to update encounter");
    }
  };

  const togglePendingAction = (action: string) => {
    setPendingActions((current) => {
      if (current.includes(action)) {
        setCompletedActions((prev) => mergeUniqueActions(prev, [action]));
        return current.filter((item) => item !== action);
      }
      setCompletedActions((prev) => prev.filter((item) => item !== action));
      return mergeUniqueActions(current, [action]);
    });
  };

  const addRecommendedTasks = () => {
    setPendingActions((current) => mergeUniqueActions(current, recommendedTasks.filter((task) => !completedActions.includes(task))));
  };

  const checkoutEncounter = async () => {
    if (!selectedEncounter) return;
    try {
      await api.encounters.checkout(selectedEncounter.id, {
        performedBy: user?.name || "Checkout Desk",
        note: "Visit completed and patient checked out",
      });
      await refreshEncounters();
      toast.success("Patient checked out");
    } catch (error: any) {
      toast.error(error.message || "Checkout blocked");
    }
  };

  const exportBoard = () => {
    const blob = new Blob([JSON.stringify(encounters, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `patient-flow-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
  };

  return (
    <div>
      <TopBar title="Walk-In Flow" subtitle="Track each walk-in visit from reception to checkout with section-by-section clearance checks" />
      <div className="p-6 space-y-6">

        {/* Search Section */}
        <div className="rounded-xl bg-card p-6 shadow-card border border-border space-y-4">
          <h3 className="font-semibold font-display text-card-foreground">Patient Search & Registration</h3>

          {/* Search Mode Selector */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={searchMode === "student" ? "default" : "outline"}
              size="sm"
              onClick={() => setSearchMode("student")}
            >
              <GraduationCap className="h-4 w-4 mr-2" /> Student
            </Button>
            <Button
              variant={searchMode === "staff" ? "default" : "outline"}
              size="sm"
              onClick={() => setSearchMode("staff")}
            >
              <Briefcase className="h-4 w-4 mr-2" /> Staff
            </Button>
            <Button
              variant={searchMode === "name" ? "default" : "outline"}
              size="sm"
              onClick={() => setSearchMode("name")}
            >
              <Users className="h-4 w-4 mr-2" /> Search by Name
            </Button>
            <Button
              variant={searchMode === "guest" ? "default" : "outline"}
              size="sm"
              onClick={() => setSearchMode("guest")}
            >
              <UserPlus className="h-4 w-4 mr-2" /> Guest Registration
            </Button>
          </div>

          {/* Search Input */}
          {searchMode !== "guest" && (
            <div className="flex gap-3">
              <div className="flex-1">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    searchMode === "student" ? "Enter student number (e.g., 2023123456)" :
                      searchMode === "staff" ? "Enter staff number (e.g., EMP12345)" :
                        "Enter patient name"
                  }
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
              <Button onClick={handleSearch} disabled={isSearching}>
                <Search className="h-4 w-4 mr-2" />
                {isSearching ? "Searching..." : "Search"}
              </Button>
            </div>
          )}

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Search Results</h4>
              {searchResults.map((patient, idx) => (
                <div
                  key={idx}
                  className={`rounded-xl border p-4 cursor-pointer transition ${selectedPatient?.patientId === patient.patientId ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
                  onClick={() => setSelectedPatient(patient)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-card-foreground">{patient.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {patient.source === "student" && `Student: ${patient.studentNumber}`}
                        {patient.source === "staff" && `Staff: ${patient.staffNumber}`}
                        {patient.program && ` · ${patient.program}`}
                        {patient.department && ` · ${patient.department}`}
                      </p>
                      {patient.requiresMedicalExam && (
                        <Badge variant="destructive" className="mt-1">Medical Exam Required</Badge>
                      )}
                    </div>
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        createEncounterForPatient(patient);
                      }}
                    >
                      Open Encounter
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Guest Registration Form */}
          {searchMode === "guest" && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Full Name *</label>
                  <Input value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="Enter guest name" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Date of Birth</label>
                  <Input type="date" value={guestDob} onChange={(e) => setGuestDob(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Gender</label>
                  <Select value={guestGender} onValueChange={setGuestGender}>
                    <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Phone</label>
                  <Input value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} placeholder="Phone number" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Address</label>
                <Textarea value={guestAddress} onChange={(e) => setGuestAddress(e.target.value)} rows={2} placeholder="Physical address" />
              </div>
              <Button onClick={registerGuest} className="gradient-primary text-primary-foreground">
                <UserPlus className="h-4 w-4 mr-2" /> Register Guest & Open Encounter
              </Button>
            </div>
          )}
        </div>

        {/* Active Encounters */}
        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <div className="rounded-xl bg-card p-4 shadow-card border border-border space-y-3">
            <h3 className="font-semibold font-display text-card-foreground">Active Encounters</h3>
            {encounters.map((encounter) => (
              <button
                key={encounter.id}
                onClick={() => setSelectedId(encounter.id)}
                className={`w-full rounded-xl border p-4 text-left transition ${selectedId === encounter.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-card-foreground">{encounter.patientName}</p>
                    <p className="text-xs text-muted-foreground">{encounter.encounterId}</p>
                  </div>
                  <Badge variant={encounter.checkedOut ? "secondary" : "outline"}>{encounter.currentStage}</Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>{encounter.patientType}</span>
                  <span>{encounter.paymentStatus}</span>
                  <span>{encounter.checkedOut ? "Checked out" : "In progress"}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Encounter Details */}
          <div className="rounded-xl bg-card p-5 shadow-card border border-border space-y-6">
            {!selectedEncounter ? (
              <p className="text-sm text-muted-foreground">Select a walk-in encounter to manage the clinic journey.</p>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-semibold font-display text-card-foreground">{selectedEncounter.patientName}</h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedEncounter.encounterId} · {selectedEncounter.patientId} · {selectedEncounter.patientType}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{selectedEncounter.paymentStatus}</Badge>
                    <Badge variant={selectedEncounter.checkoutEligible ? "default" : "secondary"}>
                      {selectedEncounter.checkoutEligible ? "Checkout ready" : "Pending clearance"}
                    </Badge>
                  </div>
                </div>

                {/* Stage Progress */}
                <div className="grid gap-3 md:grid-cols-5">
                  {facilityStages.map((itemStage, index) => {
                    const isDone = facilityStages.indexOf(normalizeFacilityStage(selectedEncounter.currentStage)) > index || selectedEncounter.checkedOut;
                    const isCurrent = selectedEncounter.currentStage === itemStage;
                    return (
                      <div key={itemStage} className={`rounded-xl border p-3 ${isCurrent ? "border-primary bg-primary/5" : "border-border"}`}>
                        <div className="flex items-center gap-2">
                          {isDone ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
                          <span className="text-sm font-medium text-card-foreground">{itemStage}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Update Form */}
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Next Stage</label>
                      <Select value={stage} onValueChange={setStage}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {allowedStages.map((itemStage) => <SelectItem key={itemStage} value={itemStage}>{itemStage}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Flow is limited to the current stage and the next valid departments in the facility path.
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Payment Status</label>
                      <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NOT_REQUIRED">Not Required</SelectItem>
                          <SelectItem value="PENDING">Pending</SelectItem>
                          <SelectItem value="CLEARED">Cleared</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-3">
                        <label className="text-sm font-medium">Stage Checklist</label>
                        <Button type="button" variant="outline" size="sm" onClick={addRecommendedTasks}>
                          Add {stage} Tasks
                        </Button>
                      </div>
                      <div className="rounded-xl border border-border p-3 space-y-3">
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Recommended</p>
                          <div className="flex flex-wrap gap-2">
                            {recommendedTasks.map((item) => (
                              <Badge key={item} variant={pendingActions.includes(item) ? "secondary" : completedActions.includes(item) ? "outline" : "outline"}>
                                {item}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Pending</p>
                          <div className="flex flex-wrap gap-2">
                            {pendingActions.length > 0 ? pendingActions.map((item) => (
                              <button
                                key={item}
                                type="button"
                                onClick={() => togglePendingAction(item)}
                                className="rounded-full border border-border bg-secondary px-3 py-1 text-xs text-secondary-foreground transition hover:border-primary/40"
                              >
                                {item}
                              </button>
                            )) : <p className="text-sm text-muted-foreground">No pending actions.</p>}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Completed</p>
                          <div className="flex flex-wrap gap-2">
                            {completedActions.length > 0 ? completedActions.map((item) => (
                              <button
                                key={item}
                                type="button"
                                onClick={() => togglePendingAction(item)}
                                className="rounded-full border border-border bg-background px-3 py-1 text-xs text-card-foreground transition hover:border-primary/40"
                              >
                                {item}
                              </button>
                            )) : <p className="text-sm text-muted-foreground">Nothing completed yet.</p>}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Note</label>
                      <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4} />
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <Button className="gradient-primary text-primary-foreground" onClick={updateStage}>Save Stage Update</Button>
                      <Button variant="outline" onClick={checkoutEncounter} disabled={!selectedEncounter.checkoutEligible}>
                        <ShieldCheck className="h-4 w-4 mr-2" /> Checkout Patient
                      </Button>
                    </div>
                  </div>

                  {/* Journey Info */}
                  <div className="space-y-4">
                    <div className="rounded-xl border border-border p-4">
                      <h4 className="font-medium text-card-foreground mb-3">Pending Clearance</h4>
                      <div className="flex flex-wrap gap-2">
                        {pendingActions.length > 0 ? (
                          pendingActions.map((item: string) => <Badge key={item} variant="secondary">{item}</Badge>)
                        ) : (
                          <p className="text-sm text-muted-foreground">No pending actions.</p>
                        )}
                      </div>
                    </div>
                    <div className="rounded-xl border border-border p-4">
                      <h4 className="font-medium text-card-foreground mb-3">Completed Steps</h4>
                      <div className="flex flex-wrap gap-2">
                        {completedActions.map((item: string) => <Badge key={item} variant="outline">{item}</Badge>)}
                      </div>
                    </div>
                    <div className="rounded-xl border border-border p-4">
                      <h4 className="font-medium text-card-foreground mb-3">Journey History</h4>
                      <div className="space-y-3">
                        {(selectedEncounter.history || []).map((item: any, index: number) => (
                          <div key={`${item.timestamp}-${index}`} className="border-l-2 border-primary/30 pl-3">
                            <p className="text-sm font-medium text-card-foreground">{item.stage}</p>
                            <p className="text-xs text-muted-foreground">{item.performed_by} · {new Date(item.timestamp).toLocaleString()}</p>
                            <p className="text-sm text-muted-foreground">{item.note}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Counseling Referral Section */}
                    <div className="rounded-xl border border-border p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-card-foreground">Counseling Referrals</h4>
                        <Button size="sm" variant="outline" onClick={() => setShowCounselingReferral(!showCounselingReferral)}>
                          <Heart className="h-4 w-4 mr-2" />
                          {showCounselingReferral ? "Cancel" : "Refer to Counseling"}
                        </Button>
                      </div>

                      {showCounselingReferral && (
                        <div className="space-y-3">
                          <div className="space-y-1.5">
                            <label className="text-sm font-medium">Reason for Referral *</label>
                            <Input value={counselingReason} onChange={(e) => setCounselingReason(e.target.value)} placeholder="e.g., Anxiety, Depression, Trauma" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-sm font-medium">Urgency</label>
                            <Select value={counselingUrgency} onValueChange={(v: any) => setCounselingUrgency(v)}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-sm font-medium">Notes</label>
                            <Textarea value={counselingNotes} onChange={(e) => setCounselingNotes(e.target.value)} rows={3} placeholder="Additional notes for counselor" />
                          </div>
                          <Button onClick={referToCounseling} className="gradient-primary text-primary-foreground">
                            <ArrowRight className="h-4 w-4 mr-2" /> Send to Counseling
                          </Button>
                        </div>
                      )}

                      {/* Show referrals from counseling */}
                      {counselingReferrals.length > 0 && (
                        <div className="mt-4 space-y-2">
                          <h5 className="text-sm font-medium text-muted-foreground">Referred from Counseling</h5>
                          {counselingReferrals.map((ref: any, idx: number) => (
                            <div key={idx} className="rounded-lg border p-3 bg-primary/5">
                              <p className="text-sm font-medium">{ref.reason}</p>
                              <p className="text-xs text-muted-foreground">Status: {ref.status} · Urgency: {ref.urgency}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Export Button */}
        <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
          <div className="rounded-xl bg-card p-4 shadow-card border border-border">
            <h3 className="font-semibold font-display text-card-foreground mb-3">Facility Queue Snapshot</h3>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {queueByStage.map((item) => (
                <div key={item.stage} className="rounded-xl border border-border p-3">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">{item.stage}</p>
                  <p className="text-2xl font-bold font-display text-card-foreground">{item.count}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end items-end">
            <Button variant="outline" onClick={exportBoard}>
              <Download className="h-4 w-4 mr-2" /> Export Flow Board
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function mapPatientType(patient: EnrichedPatient) {
  switch (patient.source) {
    case "student":
      return "STUDENT";
    case "staff":
      return "STAFF";
    case "dependent":
    case "spouse":
      return "STAFF_DEPENDANT";
    default:
      return "NON_UNZA";
  }
}
