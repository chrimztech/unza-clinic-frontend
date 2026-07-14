export type JourneyEvent = {
  id: string;
  patientId: string;
  timestamp: string;
  type: "registration" | "triage" | "vitals" | "consultation" | "medical-exam" | "certificate" | "lab-request" | "lab-result" | "prescription" | "dispensed" | "billing" | "admission" | "discharge" | "encounter";
  title: string;
  description: string;
  performedBy: string;
  department: string;
  data?: Record<string, string>;
};

export type PatientJourneyRecord = {
  patientId: string;
  name: string;
  journey: JourneyEvent[];
};

export function buildPatientJourneys(data: {
  patients: any[];
  triage: any[];
  labTests: any[];
  prescriptions: any[];
  admissions: any[];
  billing: any[];
  encounters: any[];
  clinicalForms: any[];
}) {
  return (data.patients || []).map((patient: any) => ({
    patientId: patient.patient_id,
    name: patient.name,
    journey: buildJourneyForPatient(patient, data).sort(
      (left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime(),
    ),
  }));
}

export function buildJourneyForPatient(patient: any, data: {
  triage: any[];
  labTests: any[];
  prescriptions: any[];
  admissions: any[];
  billing: any[];
  encounters: any[];
  clinicalForms: any[];
}) {
  const patientId = patient.patient_id;
  const patientName = patient.name;
  const journey: JourneyEvent[] = [];

  journey.push({
    id: `registration-${patientId}`,
    patientId,
    timestamp: coerceTimestamp(patient.created_at),
    type: "registration",
    title: "Patient Registered",
    description: `${patientName} was registered in the clinic system.`,
    performedBy: "Reception",
    department: "Reception",
  });

  (data.encounters || [])
    .filter((entry: any) => entry.patientId === patientId)
    .forEach((entry: any) => {
      journey.push({
        id: `encounter-${entry.id}`,
        patientId,
        timestamp: coerceTimestamp(entry.createdAt),
        type: "encounter",
        title: "Encounter Opened",
        description: `${entry.encounterId} opened at ${entry.currentStage}.`,
        performedBy: entry.createdBy || "Reception",
        department: entry.currentStage || "Reception",
        data: {
          encounterId: entry.encounterId || "",
          paymentStatus: entry.paymentStatus || "",
          checkedOut: String(Boolean(entry.checkedOut)),
        },
      });
    });

  (data.triage || [])
    .filter((entry: any) => entry.patientId === patientId)
    .forEach((entry: any) => {
      journey.push({
        id: `triage-${entry.id}`,
        patientId,
        timestamp: coerceTimestamp(entry.created_at || entry.arrivalTime),
        type: "triage",
        title: `Triage: ${String(entry.level || "").toUpperCase() || "Assessment"}`,
        description: entry.chiefComplaint || "Triage assessment recorded.",
        performedBy: entry.nurseName || "Triage Nurse",
        department: "Triage",
        data: {
          vitals: entry.vitalSigns || "",
          bloodPressure: entry.bloodPressure || "",
          notes: entry.notes || "",
        },
      });
    });

  (data.clinicalForms || [])
    .filter((entry: any) => entry.patientId === patientId)
    .forEach((entry: any) => {
      const payload = parseClinicalPayload(entry.payloadJson);
      const normalizedFormType = String(entry.formType || "").toLowerCase();
      const type = normalizedFormType.includes("consult")
        || normalizedFormType.includes("outpatient")
        ? "consultation"
        : normalizedFormType === "student_medical_exam"
          ? "medical-exam"
          : normalizedFormType === "medical_fitness_certificate"
            ? "certificate"
            : "vitals";
      journey.push({
        id: `form-${entry.id}`,
        patientId,
        timestamp: coerceTimestamp(entry.createdAt),
        type,
        title: entry.title || "Clinical Form",
        description: buildClinicalFormDescription(entry, payload, patientName),
        performedBy: entry.createdBy || "Clinic User",
        department: entry.department || "Clinical",
        data: {
          formType: entry.formType || "",
          status: entry.status || "",
          fitnessStatus: payload.fitness_status || payload.fitness_recommendation || "",
          diagnosis: payload.diagnosis || payload.comments || payload.general_comments || "",
        },
      });
    });

  (data.labTests || [])
    .filter((entry: any) => entry.patientId === patientId)
    .forEach((entry: any) => {
      journey.push({
        id: `lab-${entry.id}`,
        patientId,
        timestamp: coerceTimestamp(entry.created_at || entry.date),
        type: entry.results ? "lab-result" : "lab-request",
        title: entry.test || "Laboratory Test",
        description: entry.results || `${entry.test} requested for ${patientName}.`,
        performedBy: entry.requestedBy || "Laboratory",
        department: "Laboratory",
        data: {
          status: entry.status || "",
          results: entry.results || "",
        },
      });
    });

  (data.prescriptions || [])
    .filter((entry: any) => entry.patientId === patientId)
    .forEach((entry: any) => {
      journey.push({
        id: `prescription-${entry.id}`,
        patientId,
        timestamp: coerceTimestamp(entry.created_at || entry.date),
        type: entry.status === "dispensed" ? "dispensed" : "prescription",
        title: entry.status === "dispensed" ? "Medication Dispensed" : "Prescription Issued",
        description: entry.items || "Prescription recorded.",
        performedBy: entry.doctor || "Doctor",
        department: "Pharmacy",
      });
    });

  (data.billing || [])
    .filter((entry: any) => entry.patientId === patientId)
    .forEach((entry: any) => {
      journey.push({
        id: `billing-${entry.id}`,
        patientId,
        timestamp: coerceTimestamp(entry.created_at || entry.date),
        type: "billing",
        title: "Invoice Recorded",
        description: `${entry.service || entry.amount || "Billing activity"} for ${patientName}.`,
        performedBy: "Billing Office",
        department: "Billing",
        data: {
          invoiceId: entry.invoiceId || "",
          status: entry.status || "",
          amount: String(entry.amount || ""),
        },
      });
    });

  (data.admissions || [])
    .filter((entry: any) => entry.patientId === patientId)
    .forEach((entry: any) => {
      journey.push({
        id: `admission-${entry.id}`,
        patientId,
        timestamp: coerceTimestamp(entry.created_at || entry.admittedOn),
        type: entry.status === "discharged" ? "discharge" : "admission",
        title: entry.status === "discharged" ? "Patient Discharged" : "Patient Admitted",
        description: `${patientName} ${entry.status === "discharged" ? "was discharged from" : "was admitted to"} ${entry.ward || "ward"}${entry.bed ? ` (${entry.bed})` : ""}.`,
        performedBy: entry.doctor || "Ward Team",
        department: "Wards",
        data: {
          diagnosis: entry.diagnosis || "",
          status: entry.status || "",
        },
      });
    });

  return journey;
}

function coerceTimestamp(input?: string) {
  if (!input) return new Date().toISOString();
  const value = new Date(input);
  return Number.isNaN(value.getTime()) ? new Date().toISOString() : value.toISOString();
}

function parseClinicalPayload(payloadJson?: string) {
  if (!payloadJson) {
    return {} as Record<string, string>;
  }

  try {
    const parsed = JSON.parse(payloadJson) as Record<string, unknown>;
    return Object.fromEntries(Object.entries(parsed).map(([key, value]) => [key, value == null ? "" : String(value)]));
  } catch {
    return {} as Record<string, string>;
  }
}

function buildClinicalFormDescription(entry: any, payload: Record<string, string>, patientName: string) {
  const formType = String(entry.formType || "").toLowerCase();
  if (formType === "student_medical_exam") {
    const recommendation = payload.fitness_recommendation || payload.bmi_category || "Assessment recorded";
    return `Student medical examination completed for ${patientName}. ${recommendation}`.trim();
  }
  if (formType === "medical_fitness_certificate") {
    const fitnessStatus = payload.fitness_status || "Certificate issued";
    return `Medical fitness certificate issued for ${patientName}. Status: ${fitnessStatus}.`;
  }
  return `${entry.formType || "Clinical form"} saved for ${patientName}.`;
}
