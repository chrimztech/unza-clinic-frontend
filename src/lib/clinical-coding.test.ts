import { describe, expect, it } from "vitest";
import { getDiagnosisLabel, getDiagnosisOption, medicationClassOptions, treatmentProgramOptions } from "@/lib/clinical-coding";

describe("clinical coding catalog", () => {
  it("returns the full diagnosis option for a structured code", () => {
    expect(getDiagnosisOption("HIV-001")).toEqual({
      code: "HIV-001",
      label: "HIV Disease / ART Follow-up",
      category: "Infectious Diseases",
      defaultProgram: "ARV / HIV",
    });
  });

  it("falls back safely when the diagnosis code is unknown", () => {
    expect(getDiagnosisOption("UNKNOWN-001")).toBeNull();
    expect(getDiagnosisLabel("UNKNOWN-001", "Fallback diagnosis")).toBe("Fallback diagnosis");
  });

  it("keeps the national program and medication class options available", () => {
    expect(treatmentProgramOptions).toContain("ARV / HIV");
    expect(treatmentProgramOptions).toContain("TB");
    expect(medicationClassOptions).toContain("ARV");
    expect(medicationClassOptions).toContain("Anti-TB");
  });
});
