export type LabTestOption = {
  key: string;
  name: string;
  category: string;
  section: string;
  sampleType: string;
};

export type LabSectionOption = {
  key: string;
  label: string;
};

export const labTestSections: LabSectionOption[] = [
  { key: "A1. Parasitology", label: "A1. Parasitology" },
  { key: "A2. Biochemistry", label: "A2. Biochemistry" },
  { key: "A3. Haematology", label: "A3. Haematology" },
  { key: "A4. Immunoserology", label: "A4. Immunoserology" },
  { key: "B1. Urinalysis", label: "B1. Urinalysis" },
  { key: "B2. Culture & Sensitivity", label: "B2. Culture & Sensitivity" },
  { key: "B3. Microscopy", label: "B3. Microscopy" },
  { key: "B4. Gram Stain", label: "B4. Gram Stain" },
  { key: "B5. AAFB", label: "B5. AAFB" },
  { key: "B6. Gravindex", label: "B6. Gravindex" },
  { key: "C1. Macro", label: "C1. Stool Macro" },
  { key: "C2. Micro/Concentration", label: "C2. Stool Micro / Concentration" },
  { key: "C3. Occult Blood Test", label: "C3. Occult Blood Test" },
  { key: "C4. AAFB", label: "C4. Stool AAFB" },
  { key: "C5. Modified ZN Stain", label: "C5. Modified ZN Stain" },
  { key: "D1. For Fungus", label: "D1. For Fungus" },
  { key: "E. Semen Analysis", label: "E. Semen Analysis" },
  { key: "F1. Microscopy", label: "F1. Skin / Other Samples Microscopy" },
  { key: "F2. Gram Stain", label: "F2. Skin / Other Samples Gram Stain" },
  { key: "F3. AAFB", label: "F3. Skin / Other Samples AAFB" },
  { key: "G1. Microscopy", label: "G1. Microbiology Microscopy" },
  { key: "G2. Gram Stain", label: "G2. Microbiology Gram Stain" },
  { key: "G3. Culture", label: "G3. Microbiology Culture" },
  { key: "G4. Sensitivity", label: "G4. Microbiology Sensitivity" },
  { key: "Hormonal Tests", label: "Hormonal Tests" },
];

export const labTestCatalog: LabTestOption[] = [
  { key: "bs-mps-parasites", name: "B/S for MPS + Other Parasites", category: "Parasitology", section: "A1. Parasitology", sampleType: "blood" },

  { key: "urea", name: "Urea", category: "Biochemistry", section: "A2. Biochemistry", sampleType: "blood" },
  { key: "creatinine", name: "Creatinine", category: "Biochemistry", section: "A2. Biochemistry", sampleType: "blood" },
  { key: "sodium", name: "Sodium (Na+)", category: "Biochemistry", section: "A2. Biochemistry", sampleType: "blood" },
  { key: "potassium", name: "Potassium (K+)", category: "Biochemistry", section: "A2. Biochemistry", sampleType: "blood" },
  { key: "lithium", name: "Lithium (LIT)", category: "Biochemistry", section: "A2. Biochemistry", sampleType: "blood" },
  { key: "fbs", name: "Fasting Blood Sugar (FBS)", category: "Biochemistry", section: "A2. Biochemistry", sampleType: "blood" },
  { key: "rbs", name: "Random Blood Sugar (RBS)", category: "Biochemistry", section: "A2. Biochemistry", sampleType: "blood" },
  { key: "uric-acid", name: "Uric Acid", category: "Biochemistry", section: "A2. Biochemistry", sampleType: "blood" },
  { key: "sgot", name: "SGOT", category: "Biochemistry", section: "A2. Biochemistry", sampleType: "blood" },
  { key: "sgpt", name: "SGPT", category: "Biochemistry", section: "A2. Biochemistry", sampleType: "blood" },
  { key: "alp", name: "ALP", category: "Biochemistry", section: "A2. Biochemistry", sampleType: "blood" },
  { key: "t-bilirubin", name: "Total Bilirubin", category: "Biochemistry", section: "A2. Biochemistry", sampleType: "blood" },
  { key: "d-bilirubin", name: "Direct Bilirubin", category: "Biochemistry", section: "A2. Biochemistry", sampleType: "blood" },
  { key: "total-protein", name: "Total Protein", category: "Biochemistry", section: "A2. Biochemistry", sampleType: "blood" },
  { key: "albumin", name: "Albumin", category: "Biochemistry", section: "A2. Biochemistry", sampleType: "blood" },
  { key: "gtt-fasting", name: "Glucose T.T Fasting", category: "Biochemistry", section: "A2. Biochemistry", sampleType: "blood" },
  { key: "gtt-1hr", name: "Glucose T.T 1 Hour", category: "Biochemistry", section: "A2. Biochemistry", sampleType: "blood" },
  { key: "gtt-2hr", name: "Glucose T.T 2 Hours", category: "Biochemistry", section: "A2. Biochemistry", sampleType: "blood" },
  { key: "triglycerides", name: "Triglycerides", category: "Biochemistry", section: "A2. Biochemistry", sampleType: "blood" },
  { key: "cholesterol-total", name: "Cholesterol", category: "Biochemistry", section: "A2. Biochemistry", sampleType: "blood" },
  { key: "ggt", name: "Gamma G.T (GGT)", category: "Biochemistry", section: "A2. Biochemistry", sampleType: "blood" },
  { key: "amylase", name: "Amylase", category: "Biochemistry", section: "A2. Biochemistry", sampleType: "blood" },
  { key: "chloride", name: "Chloride", category: "Biochemistry", section: "A2. Biochemistry", sampleType: "blood" },
  { key: "acid-phosphatase", name: "Acid Phosphatase", category: "Biochemistry", section: "A2. Biochemistry", sampleType: "blood" },
  { key: "calcium-oc", name: "Calcium OC", category: "Biochemistry", section: "A2. Biochemistry", sampleType: "blood" },
  { key: "calcium-ar", name: "Calcium AR", category: "Biochemistry", section: "A2. Biochemistry", sampleType: "blood" },
  { key: "cholesterol-hdl", name: "Cholesterol HDL", category: "Biochemistry", section: "A2. Biochemistry", sampleType: "blood" },
  { key: "cholesterol-ldl", name: "Cholesterol LDL", category: "Biochemistry", section: "A2. Biochemistry", sampleType: "blood" },
  { key: "iron", name: "Iron", category: "Biochemistry", section: "A2. Biochemistry", sampleType: "blood" },
  { key: "ldl", name: "LDL", category: "Biochemistry", section: "A2. Biochemistry", sampleType: "blood" },
  { key: "lipase", name: "Lipase", category: "Biochemistry", section: "A2. Biochemistry", sampleType: "blood" },
  { key: "magnesium", name: "Magnesium", category: "Biochemistry", section: "A2. Biochemistry", sampleType: "blood" },
  { key: "phosphor-lipids", name: "Phosphor Lipids", category: "Biochemistry", section: "A2. Biochemistry", sampleType: "blood" },
  { key: "phosphorous", name: "Phosphorous", category: "Biochemistry", section: "A2. Biochemistry", sampleType: "blood" },
  { key: "total-lipids", name: "Total Lipids", category: "Biochemistry", section: "A2. Biochemistry", sampleType: "blood" },
  { key: "ck-mb", name: "CK-MB", category: "Biochemistry", section: "A2. Biochemistry", sampleType: "blood" },
  { key: "ck-nac", name: "CK-NAC", category: "Biochemistry", section: "A2. Biochemistry", sampleType: "blood" },

  { key: "full-blood-count", name: "Full Blood Count", category: "Haematology", section: "A3. Haematology", sampleType: "blood" },
  { key: "haemoglobin", name: "Haemoglobin", category: "Haematology", section: "A3. Haematology", sampleType: "blood" },
  { key: "haematocrit", name: "Haematocrit", category: "Haematology", section: "A3. Haematology", sampleType: "blood" },
  { key: "red-blood-cells", name: "Red Blood Cells", category: "Haematology", section: "A3. Haematology", sampleType: "blood" },
  { key: "white-blood-cells", name: "White Blood Cells", category: "Haematology", section: "A3. Haematology", sampleType: "blood" },
  { key: "platelets", name: "Platelets", category: "Haematology", section: "A3. Haematology", sampleType: "blood" },
  { key: "mch", name: "MCH", category: "Haematology", section: "A3. Haematology", sampleType: "blood" },
  { key: "mcv", name: "MCV", category: "Haematology", section: "A3. Haematology", sampleType: "blood" },
  { key: "p-neutrophils", name: "P. Neutrophils", category: "Haematology", section: "A3. Haematology", sampleType: "blood" },
  { key: "lymphocytes", name: "Lymphocytes", category: "Haematology", section: "A3. Haematology", sampleType: "blood" },
  { key: "monocytes", name: "Monocytes", category: "Haematology", section: "A3. Haematology", sampleType: "blood" },
  { key: "p-eosinophils", name: "P. Eosinophils", category: "Haematology", section: "A3. Haematology", sampleType: "blood" },
  { key: "p-basophils", name: "P. Basophils", category: "Haematology", section: "A3. Haematology", sampleType: "blood" },
  { key: "esr", name: "ESR", category: "Haematology", section: "A3. Haematology", sampleType: "blood" },
  { key: "blood-grouping", name: "Blood Grouping", category: "Haematology", section: "A3. Haematology", sampleType: "blood" },
  { key: "bleeding-time", name: "Bleeding Time", category: "Haematology", section: "A3. Haematology", sampleType: "blood" },
  { key: "clotting-time", name: "Clotting Time", category: "Haematology", section: "A3. Haematology", sampleType: "blood" },
  { key: "sickling-test", name: "Sickling Test", category: "Haematology", section: "A3. Haematology", sampleType: "blood" },
  { key: "solubility-test", name: "Solubility Test", category: "Haematology", section: "A3. Haematology", sampleType: "blood" },

  { key: "rpr", name: "RPR", category: "Immunoserology", section: "A4. Immunoserology", sampleType: "blood" },
  { key: "hiv-test", name: "HIV Test", category: "Immunoserology", section: "A4. Immunoserology", sampleType: "blood" },
  { key: "asot", name: "ASOT", category: "Immunoserology", section: "A4. Immunoserology", sampleType: "blood" },
  { key: "rheumatoid-factor", name: "Rheumatoid Factor (RF)", category: "Immunoserology", section: "A4. Immunoserology", sampleType: "blood" },
  { key: "hepatitis-b", name: "Hepatitis B", category: "Immunoserology", section: "A4. Immunoserology", sampleType: "blood" },
  { key: "hepatitis-a", name: "Hepatitis A", category: "Immunoserology", section: "A4. Immunoserology", sampleType: "blood" },
  { key: "hepatitis-c", name: "Hepatitis C", category: "Immunoserology", section: "A4. Immunoserology", sampleType: "blood" },
  { key: "cryptococcus-antigen", name: "Cryptococcus Antigen Test", category: "Immunoserology", section: "A4. Immunoserology", sampleType: "blood" },
  { key: "tb-test", name: "T.B Test", category: "Immunoserology", section: "A4. Immunoserology", sampleType: "blood" },
  { key: "psa", name: "P.S.A", category: "Immunoserology", section: "A4. Immunoserology", sampleType: "blood" },
  { key: "troponin-i", name: "Troponin I", category: "Immunoserology", section: "A4. Immunoserology", sampleType: "blood" },
  { key: "cd4-count", name: "CD4 Counts", category: "Immunoserology", section: "A4. Immunoserology", sampleType: "blood" },
  { key: "cd8-count", name: "CD8 Counts", category: "Immunoserology", section: "A4. Immunoserology", sampleType: "blood" },
  { key: "viral-load", name: "V/Load", category: "Immunoserology", section: "A4. Immunoserology", sampleType: "blood" },
  { key: "pas", name: "PAS", category: "Immunoserology", section: "A4. Immunoserology", sampleType: "blood" },
  { key: "myoglobin", name: "Myoglobin", category: "Immunoserology", section: "A4. Immunoserology", sampleType: "blood" },
  { key: "ckmb-serology", name: "CK-MB", category: "Immunoserology", section: "A4. Immunoserology", sampleType: "blood" },
  { key: "widal-test", name: "Widal Test", category: "Immunoserology", section: "A4. Immunoserology", sampleType: "blood" },
  { key: "h-pylori-test", name: "H-Pylori Test", category: "Immunoserology", section: "A4. Immunoserology", sampleType: "blood" },

  { key: "urinalysis", name: "Urinalysis", category: "Urine", section: "B1. Urinalysis", sampleType: "urine" },
  { key: "urine-culture-sensitivity", name: "Urine Culture & Sensitivity", category: "Urine", section: "B2. Culture & Sensitivity", sampleType: "urine" },
  { key: "urine-microscopy", name: "Urine Microscopy", category: "Urine", section: "B3. Microscopy", sampleType: "urine" },
  { key: "urine-gram-stain", name: "Urine Gram Stain", category: "Urine", section: "B4. Gram Stain", sampleType: "urine" },
  { key: "urine-aafb", name: "Urine AAFB", category: "Urine", section: "B5. AAFB", sampleType: "urine" },
  { key: "gravindex", name: "Gravindex", category: "Urine", section: "B6. Gravindex", sampleType: "urine" },
  { key: "fungal-exam", name: "Fungal Examination", category: "Urine", section: "D1. For Fungus", sampleType: "urine" },

  { key: "stool-macro", name: "Stool Macro Examination", category: "Stool", section: "C1. Macro", sampleType: "stool" },
  { key: "stool-micro-concentration", name: "Stool Micro / Concentration", category: "Stool", section: "C2. Micro/Concentration", sampleType: "stool" },
  { key: "occult-blood-test", name: "Occult Blood Test", category: "Stool", section: "C3. Occult Blood Test", sampleType: "stool" },
  { key: "stool-aafb", name: "Stool AAFB", category: "Stool", section: "C4. AAFB", sampleType: "stool" },
  { key: "modified-zn-stain", name: "Modified ZN Stain", category: "Stool", section: "C5. Modified ZN Stain", sampleType: "stool" },

  { key: "skin-fluid-microscopy", name: "Skin / Fluid Microscopy", category: "Skin / Other Samples", section: "F1. Microscopy", sampleType: "swab" },
  { key: "skin-fluid-gram-stain", name: "Skin / Fluid Gram Stain", category: "Skin / Other Samples", section: "F2. Gram Stain", sampleType: "swab" },
  { key: "skin-fluid-aafb", name: "Skin / Fluid AAFB", category: "Skin / Other Samples", section: "F3. AAFB", sampleType: "swab" },

  { key: "semen-analysis", name: "Semen Analysis", category: "Semen", section: "E. Semen Analysis", sampleType: "semen" },

  { key: "microbiology-microscopy", name: "Microbiology Microscopy", category: "Microbiology", section: "G1. Microscopy", sampleType: "swab" },
  { key: "microbiology-gram-stain", name: "Microbiology Gram Stain", category: "Microbiology", section: "G2. Gram Stain", sampleType: "swab" },
  { key: "microbiology-culture", name: "Microbiology Culture", category: "Microbiology", section: "G3. Culture", sampleType: "swab" },
  { key: "microbiology-sensitivity", name: "Microbiology Sensitivity", category: "Microbiology", section: "G4. Sensitivity", sampleType: "swab" },

  { key: "progesterone", name: "Progesterone", category: "Hormonal Tests", section: "Hormonal Tests", sampleType: "blood" },
  { key: "estradiol", name: "Estradiol", category: "Hormonal Tests", section: "Hormonal Tests", sampleType: "blood" },
  { key: "prolactin", name: "Prolactin", category: "Hormonal Tests", section: "Hormonal Tests", sampleType: "blood" },
  { key: "luteinizing-hormone", name: "Luteinizing Hormone", category: "Hormonal Tests", section: "Hormonal Tests", sampleType: "blood" },
  { key: "testosterone", name: "Testosterone", category: "Hormonal Tests", section: "Hormonal Tests", sampleType: "blood" },
  { key: "beta-hcg", name: "B-HCG", category: "Hormonal Tests", section: "Hormonal Tests", sampleType: "blood" },
];

export const labTestCategories = Array.from(new Set(labTestCatalog.map((test) => test.category)));

export function getLabTestsBySection(section?: string) {
  return labTestCatalog.filter((test) => !section || test.section === section);
}

export function getLabTestByKey(key?: string) {
  return labTestCatalog.find((test) => test.key === key) || null;
}

export function getGroupedLabTests() {
  return labTestSections
    .map((section) => ({
      ...section,
      tests: labTestCatalog.filter((test) => test.section === section.key),
    }))
    .filter((section) => section.tests.length > 0);
}
