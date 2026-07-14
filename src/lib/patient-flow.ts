export const facilityStages = [
  "RECEPTION",
  "TRIAGE",
  "CONSULTATION",
  "LABORATORY",
  "RADIOLOGY",
  "PHARMACY",
  "ACCOUNTS",
  "MCH",
  "INPATIENT",
  "CHECKOUT",
] as const;

export type FacilityStage = (typeof facilityStages)[number];

export const stageTaskLibrary: Record<FacilityStage, string[]> = {
  RECEPTION: ["Registration", "Identity verification", "Encounter opened"],
  TRIAGE: ["Triage assessment", "Vital signs recorded"],
  CONSULTATION: ["Clinical consultation", "Clinical forms completed"],
  LABORATORY: ["Laboratory request completed", "Laboratory results reviewed"],
  RADIOLOGY: ["Imaging request completed", "Imaging results reviewed"],
  PHARMACY: ["Prescription processed", "Medication dispensed"],
  ACCOUNTS: ["Payment clearance"],
  MCH: ["MCH review", "Maternal or child care documented"],
  INPATIENT: ["Admission documentation", "Ward management"],
  CHECKOUT: ["Records updated", "Visit closed"],
};

const stageTransitions: Record<FacilityStage, FacilityStage[]> = {
  RECEPTION: ["TRIAGE", "CONSULTATION"],
  TRIAGE: ["CONSULTATION", "MCH", "INPATIENT"],
  CONSULTATION: ["LABORATORY", "RADIOLOGY", "PHARMACY", "ACCOUNTS", "MCH", "INPATIENT", "CHECKOUT"],
  LABORATORY: ["CONSULTATION", "PHARMACY", "ACCOUNTS", "CHECKOUT"],
  RADIOLOGY: ["CONSULTATION", "PHARMACY", "ACCOUNTS", "CHECKOUT"],
  PHARMACY: ["ACCOUNTS", "CHECKOUT"],
  ACCOUNTS: ["CHECKOUT"],
  MCH: ["PHARMACY", "ACCOUNTS", "CHECKOUT"],
  INPATIENT: ["PHARMACY", "ACCOUNTS", "CHECKOUT"],
  CHECKOUT: ["CHECKOUT"],
};

export function getAllowedNextStages(currentStage?: string) {
  const stage = normalizeFacilityStage(currentStage);
  return [stage, ...stageTransitions[stage]];
}

export function normalizeFacilityStage(stage?: string): FacilityStage {
  const candidate = String(stage || "").trim().toUpperCase() as FacilityStage;
  return facilityStages.includes(candidate) ? candidate : "RECEPTION";
}

export function getEncounterStartingStage(requiresMedicalExam?: boolean): FacilityStage {
  return requiresMedicalExam ? "TRIAGE" : "RECEPTION";
}

export function getEncounterStartingActions(requiresMedicalExam?: boolean) {
  return requiresMedicalExam
    ? ["Triage assessment", "Vital signs recorded", "Clinical consultation"]
    : ["Registration", "Triage assessment", "Clinical consultation"];
}

export function mergeUniqueActions(...groups: Array<string[] | undefined>) {
  return Array.from(
    new Set(
      groups
        .flatMap((group) => group || [])
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}
