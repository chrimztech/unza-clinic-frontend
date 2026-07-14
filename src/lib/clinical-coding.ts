export type DiagnosisCodeOption = {
  code: string;
  label: string;
  category: string;
  defaultProgram?: string;
};

export const diagnosisCodeCatalog: DiagnosisCodeOption[] = [
  { code: "MAL-001", label: "Malaria", category: "Infectious Diseases", defaultProgram: "Malaria" },
  { code: "TB-001", label: "Tuberculosis", category: "Infectious Diseases", defaultProgram: "TB" },
  { code: "HIV-001", label: "HIV Disease / ART Follow-up", category: "Infectious Diseases", defaultProgram: "ARV / HIV" },
  { code: "URTI-001", label: "Upper Respiratory Tract Infection", category: "Respiratory" },
  { code: "LRTI-001", label: "Lower Respiratory Tract Infection", category: "Respiratory" },
  { code: "AST-001", label: "Asthma", category: "Respiratory", defaultProgram: "Asthma / Respiratory" },
  { code: "HTN-001", label: "Hypertension", category: "Cardiovascular", defaultProgram: "Hypertension" },
  { code: "DM-001", label: "Diabetes Mellitus", category: "Endocrine", defaultProgram: "Diabetes" },
  { code: "ANC-001", label: "Antenatal Care Visit", category: "MCH", defaultProgram: "ANC / PMTCT" },
  { code: "PMTCT-001", label: "PMTCT Follow-up", category: "MCH", defaultProgram: "ANC / PMTCT" },
  { code: "STI-001", label: "Sexually Transmitted Infection", category: "Sexual Health" },
  { code: "GI-001", label: "Gastroenteritis", category: "Gastrointestinal" },
  { code: "PUD-001", label: "Peptic Ulcer Disease / Gastritis", category: "Gastrointestinal" },
  { code: "UTI-001", label: "Urinary Tract Infection", category: "Genitourinary" },
  { code: "EYE-001", label: "Conjunctivitis / Eye Infection", category: "Eye Clinic" },
  { code: "ENT-001", label: "ENT Infection", category: "ENT" },
  { code: "MH-001", label: "Depression / Anxiety", category: "Mental Health", defaultProgram: "Mental Health" },
  { code: "NEU-001", label: "Epilepsy / Seizure Disorder", category: "Neurology", defaultProgram: "Epilepsy / Neurology" },
  { code: "ONC-001", label: "Oncology / Suspected Malignancy", category: "Oncology", defaultProgram: "Oncology" },
  { code: "TRA-001", label: "Trauma / Injury", category: "Emergency" },
  { code: "DERM-001", label: "Skin Condition / Dermatitis", category: "Dermatology" },
  { code: "OTH-001", label: "Other Clinical Diagnosis", category: "Other" },
];

export const treatmentProgramOptions = [
  "General OPD",
  "ARV / HIV",
  "TB",
  "Malaria",
  "Hypertension",
  "Diabetes",
  "Asthma / Respiratory",
  "ANC / PMTCT",
  "Mental Health",
  "Epilepsy / Neurology",
  "Oncology",
  "Eye Clinic",
  "Emergency",
  "Inpatient",
];

export const medicationClassOptions = [
  "Antibiotic",
  "Analgesic / Anti-inflammatory",
  "Antimalarial",
  "ARV",
  "Anti-TB",
  "Antihypertensive",
  "Antidiabetic",
  "Bronchodilator / Respiratory",
  "Psychiatric / Mental Health",
  "Antiepileptic",
  "Gastrointestinal",
  "Vitamins / Supplements",
  "Other",
];

export function getDiagnosisOption(code?: string) {
  return diagnosisCodeCatalog.find((item) => item.code === code) || null;
}

export function getDiagnosisLabel(code?: string, fallback = "") {
  return getDiagnosisOption(code)?.label || fallback;
}
