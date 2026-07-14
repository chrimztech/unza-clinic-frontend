import { useEffect, useMemo, useState } from "react";
import TopBar from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Download, FileText, Printer, Save, Search, Sparkles } from "lucide-react";
import { generateMedicalFitnessCertificate } from "@/lib/pdf-export";
import api from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import {
  buildMedicalFitnessCertificateValues,
  buildPatientFormDefaults,
  deriveFitnessStatus,
  parseClinicalPayload,
} from "@/lib/medical-exam";
import { diagnosisCodeCatalog, medicationClassOptions, treatmentProgramOptions } from "@/lib/clinical-coding";

type TemplateField = {
  key: string;
  label: string;
  type?: "text" | "textarea" | "date" | "number" | "select";
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
};
type TemplateDef = { title: string; department: string; fields: TemplateField[] };
type FeeCatalogItem = { description: string; amount: number | string };
type FeeCatalogSection = { title: string; department: string; items: FeeCatalogItem[] };

const templates: Record<string, TemplateDef> = {
  medical_record_cover: {
    title: "Medical Record Book Cover",
    department: "Reception",
    fields: [
      { key: "clinic_number", label: "Clinic Number" },
      { key: "name", label: "Name" },
      { key: "school_or_department", label: "School / Department" },
      { key: "computer_number", label: "Computer Number" },
      { key: "man_number", label: "Man Number" },
      { key: "patient_category", label: "Patient Category", placeholder: "Student, Staff, Staff Child, Spouse, External" },
      { key: "remarks", label: "Registration Notes", type: "textarea" },
    ],
  },
  general_client_information: {
    title: "General Client Information",
    department: "Reception",
    fields: [
      { key: "title", label: "Title" },
      { key: "surname", label: "Surname" },
      { key: "forenames", label: "Forenames" },
      { key: "dob", label: "Date of Birth", type: "date" },
      { key: "age", label: "Age", type: "number" },
      { key: "gender", label: "Gender" },
      { key: "nrc_or_passport", label: "NRC / Passport Number" },
      { key: "mobile_number", label: "Mobile Number" },
      { key: "residential_address", label: "Residential Address / Township", type: "textarea" },
      { key: "previous_illness", label: "Previous Illness or Operation", type: "textarea" },
      { key: "current_illness", label: "Current Illness / Medication", type: "textarea" },
      { key: "allergies", label: "Food or Drug Allergies", type: "textarea" },
      { key: "next_of_kin_name", label: "Next of Kin / Contact Name" },
      { key: "relationship", label: "Relationship" },
      { key: "next_of_kin_phone", label: "Emergency Contact Number" },
      { key: "registration_date", label: "Date of Registration", type: "date" },
      { key: "patient_category", label: "Patient Category" },
    ],
  },
  student_medical_exam: {
    title: "Student Medical Examination",
    department: "Clinical",
    fields: [
      { key: "surname", label: "Surname" },
      { key: "forenames", label: "Forenames" },
      { key: "computer_number", label: "Computer Number" },
      { key: "school", label: "School" },
      { key: "sex", label: "Sex" },
      { key: "age", label: "Age" },
      { key: "mobile_number", label: "Mobile Number" },
      { key: "height", label: "Height" },
      { key: "weight", label: "Weight" },
      { key: "temp", label: "Temperature" },
      { key: "bp", label: "Blood Pressure" },
      { key: "pulse", label: "Pulse Rate" },
      { key: "bmi", label: "BMI" },
      { key: "bmi_category", label: "BMI Category" },
      { key: "fitness_recommendation", label: "Fitness Recommendation" },
      { key: "urine", label: "Urine Findings", type: "textarea" },
      { key: "blood", label: "Blood Findings", type: "textarea" },
      { key: "vision", label: "Vision", type: "textarea" },
      { key: "diagnosis", label: "Diagnosis / Impression", type: "textarea" },
      { key: "diagnosis_code", label: "Diagnosis Code / National Code", type: "select", options: diagnosisCodeCatalog.map((item) => ({ value: item.code, label: `${item.code} - ${item.label}` })) },
      { key: "treatment_program", label: "Treatment Program / Clinic", type: "select", options: treatmentProgramOptions.map((item) => ({ value: item, label: item })) },
      { key: "medication_class", label: "Medication Class", type: "select", options: medicationClassOptions.map((item) => ({ value: item, label: item })) },
      { key: "medications_given", label: "Medications Given", type: "textarea" },
      { key: "general_comments", label: "General Comments", type: "textarea" },
    ],
  },
  medical_fitness_certificate: {
    title: "Certificate of Medical Fitness",
    department: "Clinical",
    fields: [
      { key: "name", label: "Name" },
      { key: "school", label: "School" },
      { key: "comp_no", label: "Computer Number" },
      { key: "fitness_status", label: "Declared Fit/Unfit" },
      { key: "comments", label: "Comments", type: "textarea" },
      { key: "examiner_name", label: "Medical Examiner" },
      { key: "official_date", label: "Official Date", type: "date" },
    ],
  },
  laboratory_request: {
    title: "Laboratory Request Form",
    department: "Laboratory",
    fields: [
      { key: "client_id", label: "Client ID / Scheme Number" },
      { key: "clinical_details", label: "Clinical Details", type: "textarea" },
      { key: "requested_tests", label: "Requested Tests", type: "textarea", placeholder: "Parasitology, biochemistry, haematology, immunoserology, urine, stool, semen, microbiology, hormonal tests..." },
      { key: "haematology", label: "Haematology Requests", type: "textarea" },
      { key: "biochemistry", label: "Biochemistry Requests", type: "textarea" },
      { key: "immunoserology", label: "Immunoserology Requests", type: "textarea" },
      { key: "urine_tests", label: "Urine Tests", type: "textarea" },
      { key: "stool_tests", label: "Stool Tests", type: "textarea" },
      { key: "microbiology_tests", label: "Microbiology / Other Samples", type: "textarea" },
      { key: "semen_analysis", label: "Semen Analysis Requests", type: "textarea" },
      { key: "hormone_tests", label: "Hormone Tests", type: "textarea", placeholder: "Progesterone, Estradiol, Prolactin, LH, Testosterone, B-HCG" },
      { key: "requesting_officer", label: "Requesting Officer" },
    ],
  },
  outpatient_progress_notes: {
    title: "Outpatient Progress Notes",
    department: "Clinical",
    fields: [
      { key: "visit_date", label: "Visit Date", type: "date" },
      { key: "temp", label: "Temperature" },
      { key: "bp", label: "Blood Pressure" },
      { key: "pulse", label: "Pulse Rate" },
      { key: "resp_rate", label: "Respiratory Rate" },
      { key: "weight", label: "Weight" },
      { key: "history", label: "History", type: "textarea" },
      { key: "examination", label: "Examination", type: "textarea" },
      { key: "diagnosis", label: "Diagnosis", type: "textarea" },
      { key: "diagnosis_code", label: "Diagnosis Code / National Code", type: "select", options: diagnosisCodeCatalog.map((item) => ({ value: item.code, label: `${item.code} - ${item.label}` })) },
      { key: "assessment", label: "Assessment / Impression", type: "textarea" },
      { key: "investigations", label: "Investigations", type: "textarea" },
      { key: "treatment_program", label: "Treatment Program / Clinic", type: "select", options: treatmentProgramOptions.map((item) => ({ value: item, label: item })) },
      { key: "medication_class", label: "Medication Class", type: "select", options: medicationClassOptions.map((item) => ({ value: item, label: item })) },
      { key: "medications_given", label: "Medications Given", type: "textarea" },
      { key: "treatment", label: "Treatment / Plan", type: "textarea" },
      { key: "review", label: "Review / Follow-up", type: "textarea" },
    ],
  },
  laboratory_slip: {
    title: "General Laboratory Request Slip",
    department: "Laboratory",
    fields: [
      { key: "lab_serial_no", label: "Lab Serial Number" },
      { key: "receipt_no", label: "Receipt Number" },
      { key: "specimens", label: "Specimens", type: "textarea" },
      { key: "tests_required", label: "Tests Required", type: "textarea" },
      { key: "requesting_officer", label: "Requesting Officer" },
      { key: "scheme_no", label: "Client ID / Scheme Number" },
    ],
  },
  laboratory_register_entry: {
    title: "Laboratory Register Entry",
    department: "Laboratory",
    fields: [
      { key: "date", label: "Date", type: "date" },
      { key: "lab_number", label: "Lab Number" },
      { key: "patient_name", label: "Patient Name" },
      { key: "requested_tests", label: "Tests Required", type: "textarea" },
      { key: "result_summary", label: "Result Summary", type: "textarea" },
      { key: "clinical_details", label: "Clinical Details", type: "textarea" },
      { key: "requested_by", label: "Requested By" },
      { key: "reported_by", label: "Reported By" },
    ],
  },
  consultation_referral: {
    title: "Medical Referral / Request for Consultation",
    department: "Clinical",
    fields: [
      { key: "hospital_or_clinic", label: "Hospital / Clinic" },
      { key: "patient_name", label: "Patient Name" },
      { key: "dob", label: "Date of Birth", type: "date" },
      { key: "admission_date", label: "Date of Visit / Admission", type: "date" },
      { key: "history_presenting_complaint", label: "History of Present Complaint", type: "textarea" },
      { key: "examination", label: "Examination Findings", type: "textarea" },
      { key: "clinic_summary", label: "Clinic Summary", type: "textarea" },
      { key: "investigations_done", label: "Investigations Done", type: "textarea" },
      { key: "diagnosis", label: "Diagnosis / Differential Diagnosis", type: "textarea" },
      { key: "diagnosis_code", label: "Diagnosis Code / National Code", type: "select", options: diagnosisCodeCatalog.map((item) => ({ value: item.code, label: `${item.code} - ${item.label}` })) },
      { key: "treatment_program", label: "Treatment Program / Clinic", type: "select", options: treatmentProgramOptions.map((item) => ({ value: item, label: item })) },
      { key: "medication_class", label: "Medication Class", type: "select", options: medicationClassOptions.map((item) => ({ value: item, label: item })) },
      { key: "medications_given", label: "Medications Given", type: "textarea" },
      { key: "management_plan", label: "Management Plan", type: "textarea" },
      { key: "reasons_for_referral", label: "Reasons for Referral", type: "textarea" },
      { key: "referred_by", label: "Referred By" },
    ],
  },
  eye_clinic_record: {
    title: "Eye Clinic Out-Patient Record",
    department: "Eye Clinic",
    fields: [
      { key: "reference_no", label: "Reference Number" },
      { key: "computer_no", label: "Computer Number" },
      { key: "phone_next_of_kin", label: "Phone / Next of Kin" },
      { key: "dept_school", label: "Department / School" },
      { key: "occupation", label: "Occupation" },
      { key: "class_of_patient", label: "Class of Patient (Paying / Free)" },
      { key: "clinical_eye_history", label: "Clinical Eye History", type: "textarea" },
      { key: "diagnosis", label: "Diagnosis", type: "textarea" },
      { key: "diagnosis_code", label: "Diagnosis Code / National Code", type: "select", options: diagnosisCodeCatalog.map((item) => ({ value: item.code, label: `${item.code} - ${item.label}` })) },
      { key: "treatment_program", label: "Treatment Program / Clinic", type: "select", options: treatmentProgramOptions.map((item) => ({ value: item, label: item })) },
      { key: "medication_class", label: "Medication Class", type: "select", options: medicationClassOptions.map((item) => ({ value: item, label: item })) },
      { key: "medications_given", label: "Medications Given", type: "textarea" },
      { key: "treatment", label: "Treatment", type: "textarea" },
    ],
  },
  spectacles_prescription: {
    title: "Prescription Form for Spectacles",
    department: "Eye Clinic",
    fields: [
      { key: "telephone", label: "Telephone Number" },
      { key: "age", label: "Age", type: "number" },
      { key: "sex", label: "Sex" },
      { key: "right_eye", label: "Right Eye Prescription", type: "textarea", placeholder: "Sphere, Cylinder, Axis, Vision" },
      { key: "left_eye", label: "Left Eye Prescription", type: "textarea", placeholder: "Sphere, Cylinder, Axis, Vision" },
      { key: "pd", label: "PD" },
      { key: "remarks", label: "Remarks", type: "textarea" },
      { key: "prescriber_name", label: "Prescriber's Name" },
    ],
  },
  pharmacy_prescription: {
    title: "Prescription Form",
    department: "Pharmacy",
    fields: [
      { key: "clinic_number", label: "Clinic Number" },
      { key: "days_of_treatment", label: "Number of Days Treatment", type: "number" },
      { key: "items_prescribed", label: "Number of Items Prescribed", type: "number" },
      { key: "patient_age", label: "Patient Age" },
      { key: "treatment_program", label: "Treatment Program / Clinic", type: "select", options: treatmentProgramOptions.map((item) => ({ value: item, label: item })) },
      { key: "medication_class", label: "Medication Class", type: "select", options: medicationClassOptions.map((item) => ({ value: item, label: item })) },
      { key: "generic_names", label: "Generic Name(s) Only", type: "textarea" },
      { key: "prescriber_name", label: "Prescriber Name" },
      { key: "prescriber_number", label: "Prescriber's Number" },
      { key: "department_stamp", label: "Department Stamp / Notes" },
    ],
  },
  soap_note: {
    title: "SOAP Consultation Note",
    department: "Clinical",
    fields: [
      { key: "visit_date", label: "Visit Date", type: "date" },
      { key: "subjective", label: "Subjective — Chief Complaint & History of Presenting Illness", type: "textarea", placeholder: "What the patient reports: symptoms, onset, duration, severity, associated factors, medications tried..." },
      { key: "objective", label: "Objective — Examination Findings & Vital Signs", type: "textarea", placeholder: "Temperature, BP, Pulse, Weight, SpO2. Findings on examination of systems..." },
      { key: "assessment", label: "Assessment — Diagnosis / Differential Diagnosis", type: "textarea", placeholder: "Working diagnosis or differential list with reasoning..." },
      { key: "diagnosis_code", label: "Diagnosis Code / National Code", type: "select", options: diagnosisCodeCatalog.map((item) => ({ value: item.code, label: `${item.code} - ${item.label}` })) },
      { key: "plan", label: "Plan — Investigations, Treatment & Follow-up", type: "textarea", placeholder: "Investigations ordered, medications prescribed, referrals made, patient education, review date..." },
      { key: "treatment_program", label: "Treatment Program / Clinic", type: "select", options: treatmentProgramOptions.map((item) => ({ value: item, label: item })) },
      { key: "medication_class", label: "Medication Class", type: "select", options: medicationClassOptions.map((item) => ({ value: item, label: item })) },
      { key: "medications_given", label: "Medications Given", type: "textarea" },
      { key: "follow_up_date", label: "Follow-up / Review Date", type: "date" },
      { key: "clinician_name", label: "Clinician Name" },
    ],
  },
  sick_list_admission: {
    title: "Certificate of Admission to Sick List",
    department: "Inpatient",
    fields: [
      { key: "file_no", label: "File Number" },
      { key: "date_of_admission", label: "Date of Admission", type: "date" },
      { key: "date_of_discharge", label: "Date of Discharge", type: "date" },
      { key: "remarks", label: "Remarks", type: "textarea" },
      { key: "review_date", label: "Review Date", type: "date" },
      { key: "review_time", label: "Review Time" },
      { key: "signed_by", label: "Signed By" },
    ],
  },
  inpatient_drug_sheet: {
    title: "In Patient Drug Sheet",
    department: "Inpatient",
    fields: [
      { key: "gender", label: "Gender" },
      { key: "age", label: "Age" },
      { key: "weight", label: "Weight" },
      { key: "ward", label: "Ward" },
      { key: "bed_no", label: "Bed Number" },
      { key: "clinic_no", label: "Clinic Number" },
      { key: "treatment_program", label: "Treatment Program / Clinic", type: "select", options: treatmentProgramOptions.map((item) => ({ value: item, label: item })) },
      { key: "medication_class", label: "Medication Class", type: "select", options: medicationClassOptions.map((item) => ({ value: item, label: item })) },
      { key: "drug_orders", label: "Drug Orders", type: "textarea", placeholder: "Date commenced, drug, dosage, route, ordered by, time, supplied by..." },
      { key: "other_prescriptions", label: "Other Prescriptions / Treatment", type: "textarea" },
    ],
  },
};

const feeCatalogs: Record<string, FeeCatalogSection> = {
  mch: {
    title: "Maternal and Child Health Services",
    department: "MCH",
    items: [
      { description: "Antenatal booking", amount: 800 },
      { description: "Antenatal re-attendance", amount: 200 },
      { description: "Family planning post-natal re-attendance", amount: 150 },
      { description: "Jadelle or loop insertion", amount: 300 },
      { description: "Jadelle or loop removal", amount: 300 },
      { description: "Under five clinic attendance", amount: 100 },
    ],
  },
  opd: {
    title: "Outpatient and In-Patient Fees",
    department: "Billing",
    items: [
      { description: "Consultation", amount: 200 },
      { description: "Review", amount: 120 },
      { description: "Special consultation", amount: 250 },
      { description: "Ambulance", amount: 500 },
      { description: "Ambulance hire", amount: 1000 },
      { description: "Observation", amount: 300 },
      { description: "Lodging", amount: 200 },
      { description: "Nursing care OPD", amount: "100/day" },
      { description: "Nursing care IPD", amount: "100/day" },
      { description: "Medical care", amount: "100/day" },
      { description: "Admission deposit", amount: 2000 },
      { description: "Injection", amount: 20 },
      { description: "Suturing small", amount: 100 },
      { description: "Suturing medium", amount: 150 },
      { description: "Suturing large", amount: 200 },
      { description: "Incision and drainage", amount: 200 },
      { description: "Wound dressing up to 7 days", amount: 200 },
      { description: "Wound dressing more than 7 days", amount: 75 },
      { description: "Removal of stitches", amount: 100 },
      { description: "Ear syringing", amount: 200 },
      { description: "COVID-19 test PCR", amount: 800 },
      { description: "COVID-19 test RDT", amount: 500 },
      { description: "COVID-19 test RDT follow-up", amount: 200 },
    ],
  },
  laboratory: {
    title: "Laboratory Test Fees",
    department: "Laboratory",
    items: [
      { description: "Blood slide for malaria parasites and other blood parasites", amount: 50 },
      { description: "Full blood count", amount: 225 },
      { description: "RDT for malaria", amount: 50 },
      { description: "Erythrocyte sedimentation rate", amount: 100 },
      { description: "Haemoglobin", amount: 50 },
      { description: "Bleeding time", amount: 150 },
      { description: "Clotting time", amount: 150 },
      { description: "Blood group", amount: 100 },
      { description: "Sickling test", amount: 250 },
      { description: "Blood sugar fasting / random", amount: 100 },
      { description: "Liver function test", amount: 600 },
      { description: "Kidney function test", amount: 400 },
      { description: "Electrolytes", amount: 300 },
      { description: "Lipid profile", amount: 500 },
      { description: "Rapid plasma reagin", amount: 100 },
      { description: "Hepatitis B or C qualitative", amount: 225 },
      { description: "HIV and associated care", amount: 225 },
      { description: "Rheumatoid factor", amount: 225 },
      { description: "Anti streptolysin O test", amount: 225 },
      { description: "Biochemistry each test", amount: 150 },
      { description: "Cryptococcal antigen test", amount: 300 },
      { description: "Total cholesterol", amount: 150 },
      { description: "HDL cholesterol", amount: 150 },
      { description: "LDL cholesterol", amount: 150 },
      { description: "Amylase", amount: 200 },
      { description: "Uric acid", amount: 180 },
      { description: "Widal test", amount: 250 },
      { description: "Blood culture", amount: 300 },
      { description: "Stool microscopy", amount: 120 },
      { description: "Occult blood test", amount: 225 },
      { description: "Culture sensitivity", amount: 300 },
      { description: "Modified ZN stain", amount: 200 },
      { description: "Urinalysis", amount: 70 },
      { description: "Routine microscopy", amount: 120 },
      { description: "Gram stain", amount: 150 },
      { description: "Ziehl Nelson stain", amount: 150 },
      { description: "Wet preparation", amount: 150 },
      { description: "Semen analysis", amount: 225 },
      { description: "Troponin I", amount: 250 },
      { description: "B-HCG", amount: 250 },
      { description: "HbA1C", amount: 250 },
      { description: "Ferritin", amount: 300 },
      { description: "T4", amount: 250 },
      { description: "H. pylori blood test", amount: 200 },
      { description: "PSA quantitative", amount: 270 },
      { description: "Chlamydia RDT", amount: 200 },
      { description: "Gonorrhoea RDT", amount: 200 },
    ],
  },
  medicines: {
    title: "Medicines Reference",
    department: "Pharmacy",
    items: [
      { description: "Aciclovir cream", amount: "60/tube" },
      { description: "Amlodipine 10mg tablets", amount: "90/10 tabs" },
      { description: "Amoxicillin 250mg capsules", amount: "72/30 caps" },
      { description: "Amoxicillin 125mg / 5ml suspension", amount: "60/100ml" },
      { description: "Atenolol 50mg tablets", amount: "42/10 tabs" },
      { description: "Azithromycin 500mg tablets", amount: "96/3 tabs" },
      { description: "Benzathine 2.4m injection", amount: "60/vial" },
      { description: "Brufen 200mg tablets", amount: "48/15 tabs" },
      { description: "Buscopan injection", amount: "48/amp" },
      { description: "Calamine lotion", amount: "60/100ml" },
      { description: "Ceftriaxone 1g injection", amount: "78/vial" },
      { description: "Cetirizine 10mg tablets", amount: "36/10 tabs" },
      { description: "Chlorpheniramine 4mg tablets", amount: "24/10 tabs" },
      { description: "Ciprofloxacin 500mg tablets", amount: "60/10 tabs" },
      { description: "Clotrimazole cream", amount: "72/tube" },
      { description: "Diclofenac 50mg tablets", amount: "36/10" },
      { description: "Doxycycline 100mg capsules", amount: "36/10 caps" },
      { description: "Enalapril 5mg tablets", amount: "36/10 tabs" },
      { description: "Fluconazole 200mg capsules", amount: "72/10 caps" },
      { description: "Hydrocortisone cream", amount: "60/tube" },
      { description: "Insulin injection", amount: "36/set" },
      { description: "Metformin 500mg tablets", amount: "60/10 tabs" },
      { description: "Metronidazole 200mg tablets", amount: "50/30 tabs" },
      { description: "Nifedipine 20mg tablets", amount: "39/10 tabs" },
      { description: "Omeprazole 20mg capsules", amount: "60/10 caps" },
      { description: "Paracetamol syrup", amount: "24/100ml" },
      { description: "Prednisolone 5mg tablets", amount: "36/vial" },
      { description: "Salbutamol inhaler", amount: "96/each" },
      { description: "Silver sulphadiazine cream", amount: "84/each" },
      { description: "Vitamin C tablets", amount: "72/10 tabs" },
    ],
  },
  exams: {
    title: "Medical Examinations and Eye Care",
    department: "Clinical",
    items: [
      { description: "Student accepted to study in Russia / Algeria / India", amount: 500 },
      { description: "Students accepted to study in Japan", amount: 1000 },
      { description: "Students accepted to study in China", amount: 700 },
      { description: "Foreign student accepted to study at UNZA", amount: 400 },
      { description: "General medical examination to the public", amount: 350 },
      { description: "RTSA medical examination for drivers", amount: 250 },
      { description: "Medical examination for food handlers", amount: 675 },
      { description: "Medical examination for UNZA admitted students", amount: 250 },
      { description: "Medical reports for NAPSA / insurance claims", amount: 300 },
      { description: "Lens", amount: 600 },
      { description: "Trans bifocal", amount: 1300 },
      { description: "Trans progressive", amount: 1500 },
      { description: "Clear ARC", amount: 240 },
      { description: "PGX with ARC", amount: 350 },
      { description: "Fitting fee", amount: 50 },
      { description: "Frame", amount: 250 },
      { description: "Glass", amount: 100 },
      { description: "Reader vision", amount: 150 },
    ],
  },
};

export default function ClinicForms() {
  const { user } = useAuth();
  const [patients, setPatients] = useState<any[]>([]);
  const [encounters, setEncounters] = useState<any[]>([]);
  const [forms, setForms] = useState<any[]>([]);
  const [patientId, setPatientId] = useState("");
  const [templateKey, setTemplateKey] = useState<keyof typeof templates | "">("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [formSearch, setFormSearch] = useState("");
  const [savedTypeFilter, setSavedTypeFilter] = useState<string>("all");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [expandedFeeSections, setExpandedFeeSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function load() {
      try {
        const [patientData, encounterData, formData] = await Promise.all([
          api.patients.getAll(),
          api.encounters.getAll(),
          api.clinicalForms.getAll(),
        ]);
        setPatients(patientData || []);
        setEncounters(encounterData || []);
        setForms(formData || []);
      } catch {
        toast.error("Failed to load clinical forms workspace");
      }
    }
    load();
  }, []);

  const selectablePatients = useMemo(() => {
    const uniquePatients = new Map<string, any>();
    patients.forEach((patient) => {
      const identifier = patient?.patient_id;
      if (!identifier || identifier === "null" || uniquePatients.has(identifier)) {
        return;
      }
      uniquePatients.set(identifier, patient);
    });
    return Array.from(uniquePatients.values());
  }, [patients]);

  const template = templateKey ? templates[templateKey] : null;
  const selectedPatient = selectablePatients.find((entry) => entry.patient_id === patientId);
  const selectedEncounter = encounters.find((entry) => entry.patientId === patientId && !entry.checkedOut) ?? null;
  const latestExamForm = useMemo(
    () => forms
      .filter((entry) => entry.patientId === patientId && entry.formType === "student_medical_exam")
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0] ?? null,
    [forms, patientId],
  );
  const latestCertificateForm = useMemo(
    () => forms
      .filter((entry) => entry.patientId === patientId && entry.formType === "medical_fitness_certificate")
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0] ?? null,
    [forms, patientId],
  );
  const bmiSummary = useMemo(() => {
    if (templateKey !== "student_medical_exam") {
      return null;
    }
    const heightCm = parseMetricNumber(values.height);
    const weightKg = parseMetricNumber(values.weight);
    if (!heightCm || !weightKg) {
      return null;
    }
    const bmi = weightKg / Math.pow(heightCm / 100, 2);
    const category = bmi < 18.5 ? "Underweight" : bmi < 25 ? "Normal" : bmi < 30 ? "Overweight" : "Obese";
    const recommendation = category === "Normal" ? "FIT" : category === "Underweight" ? "FIT WITH NUTRITION REVIEW" : "FIT WITH FOLLOW-UP";
    return { bmi: bmi.toFixed(1), category, recommendation };
  }, [templateKey, values.height, values.weight]);

  useEffect(() => {
    if (patientId && !selectablePatients.some((entry) => entry.patient_id === patientId)) {
      setPatientId("");
    }
  }, [patientId, selectablePatients]);

  useEffect(() => {
    if (!template) {
      setValues({});
      return;
    }
    const nextValues: Record<string, string> = {};
    template.fields.forEach((field) => {
      nextValues[field.key] = "";
    });
    if (selectedPatient) {
      Object.assign(nextValues, buildPatientFormDefaults(selectedPatient));
    }
    if (templateKey === "student_medical_exam" && latestExamForm) {
      Object.assign(nextValues, parseClinicalPayload(latestExamForm.payloadJson));
    }
    if (templateKey === "medical_fitness_certificate") {
      if (latestCertificateForm) {
        Object.assign(nextValues, parseClinicalPayload(latestCertificateForm.payloadJson));
      } else if (selectedPatient) {
        Object.assign(
          nextValues,
          buildMedicalFitnessCertificateValues({
            patient: selectedPatient,
            examValues: latestExamForm ? parseClinicalPayload(latestExamForm.payloadJson) : nextValues,
            examinerName: user?.name || "",
          }),
        );
      }
    }
    setValues(nextValues);
  }, [latestCertificateForm, latestExamForm, selectedPatient, template, templateKey, user?.name]);

  useEffect(() => {
    if (!bmiSummary) {
      return;
    }
    setValues((prev) => ({
      ...prev,
      bmi: bmiSummary.bmi,
      bmi_category: bmiSummary.category,
      fitness_recommendation: bmiSummary.recommendation,
    }));
  }, [bmiSummary]);

  const filteredForms = useMemo(() => {
    return forms.filter((entry) => {
      const matchesPatient = !patientId || entry.patientId === patientId;
      const matchesType = savedTypeFilter === "all" || entry.formType === savedTypeFilter;
      const needle = formSearch.toLowerCase();
      const matchesSearch = !needle ||
        entry.title.toLowerCase().includes(needle) ||
        entry.patientName.toLowerCase().includes(needle) ||
        entry.patientId.toLowerCase().includes(needle);
      return matchesPatient && matchesType && matchesSearch;
    });
  }, [forms, patientId, formSearch, savedTypeFilter]);

  const feeReference = useMemo(() => {
    const needle = catalogSearch.toLowerCase();
    return Object.entries(feeCatalogs)
      .map(([key, section]) => ({
        key,
        ...section,
        items: section.items.filter((item) => !needle || item.description.toLowerCase().includes(needle)),
      }))
      .filter((section) => section.items.length > 0);
  }, [catalogSearch]);

  const saveForm = async (overrides?: {
    formType?: keyof typeof templates;
    title?: string;
    department?: string;
    payloadValues?: Record<string, string>;
  }) => {
    if (!template || !selectedPatient) {
      toast.error("Select a patient and form template");
      return null;
    }
    try {
      const created = await api.clinicalForms.create({
        formType: overrides?.formType || templateKey,
        title: overrides?.title || template.title,
        patientId: selectedPatient.patient_id,
        patientName: selectedPatient.name,
        department: overrides?.department || template.department,
        encounterId: selectedEncounter?.encounterId || "",
        status: "completed",
        createdBy: user?.name || "Clinic User",
        payloadJson: JSON.stringify(overrides?.payloadValues || values, null, 2),
      });
      setForms((prev) => [created, ...prev]);
      window.dispatchEvent(new CustomEvent("unza:patients:changed"));
      return created;
    } catch {
      toast.error("Failed to save form");
      return null;
    }
  };

  const handleSave = async () => {
    const created = await saveForm();
    if (created) {
      toast.success("Clinical form saved");
    }
  };

  const generateCertificateFromExam = async () => {
     if (!selectedPatient || templateKey !== "student_medical_exam") {
       toast.error("Open a student medical exam first");
       return;
     }
     try {
       const savedExam = await saveForm({
         formType: "student_medical_exam",
         title: templates.student_medical_exam.title,
         department: templates.student_medical_exam.department,
         payloadValues: values,
       });
       if (!savedExam) {
         return;
       }

       const created = await api.clinicalForms.generateMedicalFitnessCertificate({
         patientId: selectedPatient.patient_id,
         encounterId: selectedEncounter?.encounterId || "",
         sourceExamFormId: savedExam.formId || savedExam.id,
         createdBy: user?.name || "Clinic User",
       });
       setForms((prev) => [created, savedExam, ...prev.filter((entry) => entry.id !== savedExam.id)]);
       setValues(parseClinicalPayload(created.payloadJson));
       setTemplateKey("medical_fitness_certificate");
       toast.success("Medical fitness certificate generated");
     } catch {
       toast.error("Failed to generate certificate");
     }
   };

    const downloadCertificatePDF = async () => {
      if (!selectedPatient) {
        toast.error("Generate a fitness certificate first");
        return;
      }
      const certificateValues = templateKey === "medical_fitness_certificate"
        ? buildMedicalFitnessCertificateValues({
            patient: selectedPatient,
            examValues: values,
            examinerName: values.examiner_name || user?.name || "Medical Examiner",
            officialDate: values.official_date,
          })
        : buildMedicalFitnessCertificateValues({
            patient: selectedPatient,
            examValues: latestCertificateForm ? parseClinicalPayload(latestCertificateForm.payloadJson) : values,
            examinerName: user?.name || "Medical Examiner",
            officialDate: values.official_date,
          });

      if (certificateValues.fitness_status === "PENDING") {
        toast.error("Save the medical exam and generate the certificate first");
        return;
      }

      try {
        await generateMedicalFitnessCertificate({
          name: certificateValues.name || selectedPatient.name || "",
          school: certificateValues.school || selectedPatient.school || "",
          compNo: certificateValues.comp_no || selectedPatient.student_id || selectedPatient.clinic_number || "",
          fitnessStatus: deriveFitnessStatus(certificateValues),
          comments: certificateValues.comments || "",
          examinerName: certificateValues.examiner_name || user?.name || "Medical Examiner",
          officialDate: certificateValues.official_date || new Date().toISOString().slice(0, 10),
          filename: `fitness-certificate-${selectedPatient.patient_id}`
        });
        toast.success("Certificate PDF downloaded");
      } catch {
        toast.error("Failed to generate certificate");
      }
    };

   const downloadCurrent = () => {
    if (!template || !selectedPatient) {
      toast.error("Select a patient and form template first");
      return;
    }
    const payload = {
      template: template.title,
      patient: selectedPatient,
      encounter: selectedEncounter,
      values,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${templateKey}-${selectedPatient.patient_id}.json`;
    anchor.click();
  };

  return (
    <div>
      <TopBar title="Clinical Forms" subtitle="Digital versions of the UNZA clinic forms you shared" />
      <div className="p-6 space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl bg-card p-4 shadow-card border border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Saved Forms</p>
            <p className="text-2xl font-bold font-display text-card-foreground">{forms.length}</p>
          </div>
          <div className="rounded-xl bg-card p-4 shadow-card border border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Templates</p>
            <p className="text-2xl font-bold font-display text-card-foreground">{Object.keys(templates).length}</p>
          </div>
          <div className="rounded-xl bg-card p-4 shadow-card border border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Linked Encounter</p>
            <p className="text-2xl font-bold font-display text-card-foreground">{selectedEncounter?.encounterId || "None"}</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-xl bg-card p-5 shadow-card border border-border space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Patient</label>
                <Select value={patientId} onValueChange={setPatientId}>
                  <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                  <SelectContent>
                    {selectablePatients.map((patient) => (
                      <SelectItem key={patient.patient_id} value={patient.patient_id}>
                        {patient.name} - {patient.clinic_number || patient.patient_id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Form Template</label>
                <Select value={templateKey} onValueChange={(value) => setTemplateKey(value as keyof typeof templates)}>
                  <SelectTrigger><SelectValue placeholder="Select form template" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(templates).map(([key, item]) => (
                      <SelectItem key={key} value={key}>{item.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {template ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{template.department}</Badge>
                  {selectedEncounter && <Badge variant="secondary">{selectedEncounter.currentStage}</Badge>}
                  <span className="text-sm text-muted-foreground">{template.title}</span>
                </div>
                {bmiSummary && (
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-xl border border-border p-4">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">BMI</p>
                      <p className="text-2xl font-bold font-display text-card-foreground">{bmiSummary.bmi}</p>
                    </div>
                    <div className="rounded-xl border border-border p-4">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Category</p>
                      <p className="text-lg font-semibold text-card-foreground">{bmiSummary.category}</p>
                    </div>
                    <div className="rounded-xl border border-border p-4">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Fitness Recommendation</p>
                      <p className="text-lg font-semibold text-card-foreground">{bmiSummary.recommendation}</p>
                    </div>
                  </div>
                )}
                <div className="grid gap-4 md:grid-cols-2">
                  {template.fields.map((field) => (
                    <div key={field.key} className={field.type === "textarea" ? "space-y-1.5 md:col-span-2" : "space-y-1.5"}>
                      <label className="text-sm font-medium">{field.label}</label>
                      {field.type === "textarea" ? (
                        <Textarea
                          rows={4}
                          value={values[field.key] || ""}
                          placeholder={field.placeholder}
                          onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                        />
                      ) : field.type === "select" ? (
                        <Select
                          value={values[field.key] || ""}
                          onValueChange={(value) => {
                            setValues((prev) => {
                              const next = { ...prev, [field.key]: value };
                              if (field.key === "diagnosis_code") {
                                const selected = diagnosisCodeCatalog.find((item) => item.code === value);
                                if (selected) {
                                  if (!String(prev.diagnosis || "").trim()) {
                                    next.diagnosis = selected.label;
                                  }
                                  if (!String(prev.treatment_program || "").trim() && selected.defaultProgram) {
                                    next.treatment_program = selected.defaultProgram;
                                  }
                                }
                              }
                              return next;
                            });
                          }}
                        >
                          <SelectTrigger><SelectValue placeholder={field.placeholder || `Select ${field.label.toLowerCase()}`} /></SelectTrigger>
                          <SelectContent>
                            {field.options?.map((option) => (
                              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          type={field.type || "text"}
                          value={values[field.key] || ""}
                          placeholder={field.placeholder}
                          onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                        />
                      )}
                    </div>
                  ))}
                </div>
                 <div className="flex flex-wrap gap-3">
                   <Button className="gradient-primary text-primary-foreground" onClick={handleSave}>
                     <Save className="h-4 w-4 mr-2" /> Save Form
                   </Button>
                   {templateKey === "student_medical_exam" && (
                     <>
                       <Button variant="outline" onClick={generateCertificateFromExam}>
                         <Sparkles className="h-4 w-4 mr-2" /> Generate Fitness Certificate
                       </Button>
                       <Button variant="outline" onClick={downloadCertificatePDF}>
                         <Download className="h-4 w-4 mr-2" /> Download Fitness PDF
                       </Button>
                     </>
                   )}
                   {templateKey === "medical_fitness_certificate" && (
                     <Button variant="outline" onClick={downloadCertificatePDF}>
                       <Download className="h-4 w-4 mr-2" /> Download Certificate PDF
                     </Button>
                   )}
                   <Button variant="outline" onClick={() => window.print()}>
                     <Printer className="h-4 w-4 mr-2" /> Print
                   </Button>
                   <Button variant="outline" onClick={downloadCurrent}>
                     <Download className="h-4 w-4 mr-2" /> Export
                   </Button>
                 </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Choose a patient and one of the UNZA clinical form templates to start capture.</p>
            )}
          </div>

          <div className="rounded-xl bg-card p-5 shadow-card border border-border space-y-4">
            <div>
              <h3 className="text-sm font-semibold font-display text-card-foreground">Saved Form Records</h3>
              <p className="text-xs text-muted-foreground">These are the digital records created from your paper forms.</p>
            </div>
            <div className="grid gap-3 md:grid-cols-[1fr_220px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={formSearch} onChange={(e) => setFormSearch(e.target.value)} placeholder="Search saved forms..." className="pl-9" />
              </div>
              <Select value={savedTypeFilter} onValueChange={setSavedTypeFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Form Types</SelectItem>
                  {Object.entries(templates).map(([key, item]) => (
                    <SelectItem key={key} value={key}>{item.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3 max-h-[640px] overflow-y-auto">
              {filteredForms.map((entry) => {
                const entryTemplate = templates[entry.formType as keyof typeof templates];
                const payload = parseClinicalPayload(entry.payloadJson);
                const fieldDefs: Array<{ key: string; label: string; type?: TemplateField["type"] }> =
                  entryTemplate?.fields ?? Object.keys(payload).map((key) => ({ key, label: formatFieldLabel(key) }));
                const filledFields = fieldDefs.filter((field) => String(payload[field.key] || "").trim());
                return (
                  <div key={entry.id} className="rounded-lg border border-border overflow-hidden">
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-card-foreground">{entry.title}</p>
                          <p className="text-xs text-muted-foreground">{entry.patientName} | {entry.patientId}</p>
                        </div>
                        <Badge variant="outline">{entry.department}</Badge>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>{entry.formId}</span>
                        <span>{entry.createdBy}</span>
                        <span>{new Date(entry.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                    {filledFields.length > 0 && (
                      <details className="border-t border-border group">
                        <summary className="flex cursor-pointer select-none list-none items-center justify-between px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-secondary/40">
                          <span>View {filledFields.length} recorded field{filledFields.length === 1 ? "" : "s"}</span>
                          <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
                        </summary>
                        <dl className="grid gap-x-4 gap-y-3 p-4 pt-1 sm:grid-cols-2">
                          {filledFields.map((field) => (
                            <div key={field.key} className={field.type === "textarea" ? "sm:col-span-2" : undefined}>
                              <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{field.label}</dt>
                              <dd className="mt-0.5 text-sm text-card-foreground break-words whitespace-pre-wrap">{payload[field.key]}</dd>
                            </div>
                          ))}
                        </dl>
                      </details>
                    )}
                  </div>
                );
              })}
              {filteredForms.length === 0 && (
                <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  <FileText className="mx-auto mb-2 h-5 w-5" />
                  No saved clinical forms yet.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-card p-5 shadow-card border border-border space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h3 className="text-sm font-semibold font-display text-card-foreground">UNZA Fee and Service Reference</h3>
              <p className="text-xs text-muted-foreground">Digitized fee sheets and service references based on the paper documents you shared.</p>
            </div>
            <div className="w-full lg:w-80">
              <Input value={catalogSearch} onChange={(e) => setCatalogSearch(e.target.value)} placeholder="Search fees, medicines, or tests..." />
            </div>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            {feeReference.map((section) => {
              const isOpen = Boolean(expandedFeeSections[section.key]) || catalogSearch.trim().length > 0;
              return (
                <Collapsible
                  key={section.key}
                  open={isOpen}
                  onOpenChange={(open) => setExpandedFeeSections((prev) => ({ ...prev, [section.key]: open }))}
                  className="rounded-xl border border-border p-4"
                >
                  <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 text-left">
                    <div>
                      <h4 className="font-semibold text-card-foreground">{section.title}</h4>
                      <p className="text-xs text-muted-foreground">{section.department}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{section.items.length} items</Badge>
                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-4 max-h-[360px] overflow-y-auto rounded-lg border border-border">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-secondary/80">
                          <tr className="text-left">
                            <th className="px-3 py-2 font-medium text-muted-foreground">Description</th>
                            <th className="px-3 py-2 font-medium text-muted-foreground">Fee</th>
                          </tr>
                        </thead>
                        <tbody>
                          {section.items.map((item) => (
                            <tr key={`${section.key}-${item.description}`} className="border-t border-border/60">
                              <td className="px-3 py-2 text-card-foreground">{item.description}</td>
                              <td className="px-3 py-2 text-card-foreground">
                                {typeof item.amount === "number" ? `K ${item.amount}` : item.amount}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function parseMetricNumber(value?: string) {
  if (!value) return 0;
  const cleaned = value.replace(/[^\d.]/g, "");
  return cleaned ? Number(cleaned) : 0;
}

function formatFieldLabel(key: string) {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
