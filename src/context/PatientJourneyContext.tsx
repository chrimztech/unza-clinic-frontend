import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import api from "@/lib/api";
import { buildPatientJourneys, type JourneyEvent } from "@/lib/journey";
import { useAuth } from "@/context/AuthContext";
import { hasPermission } from "@/lib/navigation";

export interface PatientRecord {
  patientId: string;
  name: string;
  journey: JourneyEvent[];
}

interface PatientJourneyContextType {
  patients: PatientRecord[];
  addEvent: (patientId: string, patientName: string, event: Omit<JourneyEvent, "id" | "patientId" | "timestamp">) => void;
  getPatientJourney: (patientId: string) => JourneyEvent[];
  getPatientByName: (name: string) => PatientRecord | undefined;
  loading: boolean;
  refresh: () => Promise<void>;
}

const PatientJourneyContext = createContext<PatientJourneyContextType | null>(null);

export function PatientJourneyProvider({ children }: { children: React.ReactNode }) {
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const loadFromAPI = useCallback(async () => {
    if (!user) {
      setPatients([]);
      setLoading(false);
      return;
    }
    try {
      const [dbPatients, triage, labTests, prescriptions, admissions, billing, encounters, clinicalForms] = await Promise.all([
        hasPermission(user, ["patients.view"]) ? api.patients.getAll() : Promise.resolve([]),
        hasPermission(user, ["triage.view"]) ? api.triage.getAll() : Promise.resolve([]),
        hasPermission(user, ["laboratory.view"]) ? api.labTests.getAll() : Promise.resolve([]),
        hasPermission(user, ["prescriptions.view", "pharmacy.view"]) ? api.prescriptions.getAll() : Promise.resolve([]),
        hasPermission(user, ["admissions.view"]) ? api.admissions.getAll() : Promise.resolve([]),
        hasPermission(user, ["billing.view"]) ? api.billing.getAll() : Promise.resolve([]),
        hasPermission(user, ["walkin.view"]) ? api.encounters.getAll() : Promise.resolve([]),
        hasPermission(user, ["forms.view"]) ? api.clinicalForms.getAll() : Promise.resolve([]),
      ]);

      setPatients(buildPatientJourneys({
        patients: dbPatients || [],
        triage: triage || [],
        labTests: labTests || [],
        prescriptions: prescriptions || [],
        admissions: admissions || [],
        billing: billing || [],
        encounters: encounters || [],
        clinicalForms: clinicalForms || [],
      }));
    } catch (error) {
      console.error("Failed to load patient journey data", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadFromAPI();
  }, [loadFromAPI]);

  useEffect(() => {
    const handleDataChanged = () => {
      loadFromAPI();
    };

    window.addEventListener("unza:patients:changed", handleDataChanged);
    return () => window.removeEventListener("unza:patients:changed", handleDataChanged);
  }, [loadFromAPI]);

  const addEvent = useCallback((patientId: string, patientName: string, event: Omit<JourneyEvent, "id" | "patientId" | "timestamp">) => {
    const newEvent: JourneyEvent = {
      ...event,
      id: `evt-${Date.now()}`,
      patientId,
      timestamp: new Date().toISOString(),
    };
    setPatients((prev) => {
      const existing = prev.find((p) => p.patientId === patientId);
      if (existing) {
        return prev.map((p) => p.patientId === patientId ? { ...p, journey: [...p.journey, newEvent] } : p);
      }
      return [...prev, { patientId, name: patientName, journey: [newEvent] }];
    });
    window.dispatchEvent(new CustomEvent("unza:patients:changed"));
  }, []);

  const getPatientJourney = useCallback((patientId: string) => {
    return patients.find((p) => p.patientId === patientId)?.journey ?? [];
  }, [patients]);

  const getPatientByName = useCallback((name: string) => {
    return patients.find((p) => p.name.toLowerCase() === name.toLowerCase());
  }, [patients]);

  return (
    <PatientJourneyContext.Provider value={{ patients, addEvent, getPatientJourney, getPatientByName, loading, refresh: loadFromAPI }}>
      {children}
    </PatientJourneyContext.Provider>
  );
}

export function usePatientJourney() {
  const ctx = useContext(PatientJourneyContext);
  if (!ctx) throw new Error("usePatientJourney must be used within PatientJourneyProvider");
  return ctx;
}
