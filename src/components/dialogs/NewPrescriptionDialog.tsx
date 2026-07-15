import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { AlertTriangle, Check, ChevronsUpDown, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useEffect, useMemo, useState } from "react";
import { usePatientJourney } from "@/context/PatientJourneyContext";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { getUserDisplayName } from "@/lib/session-user";

export interface PrescriptionEntry {
  id: number;
  rxId: string;
  patient: string;
  patientId: string;
  doctor: string;
  date: string;
  items: string;
  drugName?: string;
  quantity?: number;
  dosage?: string;
  duration?: string;
  instructions?: string;
  medicationClass?: string;
  program?: string;
  status: "pending" | "dispensed" | "cancelled" | "completed";
  drugItems?: DrugItem[];
}

interface DrugItem {
  drugName: string;
  quantity: string;
  dosage: string;
  duration: string;
  instructions: string;
  medicationClass: string;
}

interface NewPrescriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit?: (entry: PrescriptionEntry) => void;
}

const ALLERGY_MAP: Record<string, string[]> = {
  amoxicillin: ["penicillin", "amoxicillin", "ampicillin", "beta-lactam"],
  paracetamol: ["paracetamol", "acetaminophen"],
  metformin: ["metformin"],
  ibuprofen: ["ibuprofen", "nsaid", "aspirin", "anti-inflammatory"],
  omeprazole: ["omeprazole", "proton pump"],
  ciprofloxacin: ["ciprofloxacin", "fluoroquinolone", "quinolone"],
  amlodipine: ["amlodipine", "calcium channel"],
  diclofenac: ["diclofenac", "nsaid", "aspirin", "anti-inflammatory"],
  metronidazole: ["metronidazole", "nitroimidazole"],
  cotrimoxazole: ["sulfa", "sulfonamide", "cotrimoxazole", "trimethoprim"],
};

function emptyItem(): DrugItem {
  return { drugName: "", quantity: "1", dosage: "", duration: "", instructions: "", medicationClass: "" };
}

function allergyCheck(items: DrugItem[], allergies: string): string[] {
  if (!allergies) return [];
  const allerg = allergies.toLowerCase();
  const warnings: string[] = [];
  for (const item of items) {
    if (!item.drugName) continue;
    const base = item.drugName.split(" ")[0].toLowerCase();
    const keywords = ALLERGY_MAP[base] || [base];
    const hit = keywords.find((kw) => allerg.includes(kw));
    if (hit) {
      warnings.push(`${item.drugName} may conflict with documented allergy "${allergies}"`);
    }
  }
  return warnings;
}

export default function NewPrescriptionDialog({ open, onOpenChange, onSubmit }: NewPrescriptionDialogProps) {
  const { addEvent } = usePatientJourney();
  const { user } = useAuth();
  const doctor = getUserDisplayName(user, "Current Doctor");

  const [patientId, setPatientId] = useState("");
  const [program, setProgram] = useState("");
  const [drugItems, setDrugItems] = useState<DrugItem[]>([emptyItem()]);
  const [registeredPatients, setRegisteredPatients] = useState<any[]>([]);
  const [drugCatalogue, setDrugCatalogue] = useState<any[]>([]);
  const [openDrugPicker, setOpenDrugPicker] = useState<number | null>(null);

  const selectedPatient = useMemo(
    () => registeredPatients.find((p) => p.patient_id === patientId) ?? null,
    [patientId, registeredPatients],
  );

  const allergyWarnings = useMemo(
    () => allergyCheck(drugItems, selectedPatient?.allergies || ""),
    [drugItems, selectedPatient],
  );

  useEffect(() => {
    if (!open) return;
    api.patients.getAll()
      .then(setRegisteredPatients)
      .catch(() => toast.error("Failed to load patients"));
    api.drugs.getAll()
      .then(setDrugCatalogue)
      .catch(() => toast.error("Failed to load drug inventory"));
  }, [open]);

  const reset = () => {
    setPatientId("");
    setProgram("");
    setDrugItems([emptyItem()]);
  };

  const updateItem = (idx: number, field: keyof DrugItem, value: string) => {
    setDrugItems((prev) => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const setDrug = (idx: number, drugName: string) => {
    const option = drugCatalogue.find((drug) => drug.name === drugName);
    setDrugItems((prev) => prev.map((item, i) =>
      i === idx ? { ...item, drugName, medicationClass: option?.category || item.medicationClass } : item,
    ));
  };

  const addItem = () => setDrugItems((prev) => [...prev, emptyItem()]);

  const removeItem = (idx: number) => {
    if (drugItems.length === 1) return;
    setDrugItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) { toast.error("Select a registered patient"); return; }
    const filledItems = drugItems.filter((item) => item.drugName.trim());
    if (filledItems.length === 0) { toast.error("Add at least one drug"); return; }

    try {
      const entry = await api.prescriptions.create({
        patientId: selectedPatient.patient_id,
        patientName: selectedPatient.name,
        patientIdNum: selectedPatient.clinic_number || selectedPatient.patient_id,
        program,
        drugItems: filledItems.map((item) => ({
          drugName: item.drugName,
          quantity: Number(item.quantity) || 1,
          dosage: item.dosage,
          duration: item.duration,
          instructions: item.instructions,
          medicationClass: item.medicationClass,
        })),
      });
      onSubmit?.(entry);

      const summary = filledItems.map((i) => `${i.drugName} × ${i.quantity}`).join(", ");
      addEvent(selectedPatient.patient_id, selectedPatient.name, {
        type: "prescription",
        title: "Prescription Issued",
        description: summary,
        performedBy: doctor,
        department: "General Medicine",
      });

      toast.success(`Prescription created — ${filledItems.length} item(s) for ${selectedPatient.name}`);
      reset();
      onOpenChange(false);
    } catch {
      toast.error("Failed to create prescription");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display">New Prescription</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex-1 min-h-0 overflow-y-auto space-y-5 pr-1">

          {/* Patient + Doctor */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Patient *</Label>
              <Select required value={patientId} onValueChange={setPatientId}>
                <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                <SelectContent>
                  {registeredPatients.map((p) => (
                    <SelectItem key={p.patient_id} value={p.patient_id}>
                      {p.name} ({p.clinic_number || p.patient_id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Prescribing Clinician</Label>
              <Input value={doctor} readOnly disabled />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Treatment Program</Label>
              <Input placeholder="e.g. General OPD, ARV / HIV, TB, Maternal Health..." value={program} onChange={(e) => setProgram(e.target.value)} />
            </div>
          </div>

          {/* Allergy warnings */}
          {allergyWarnings.length > 0 && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 space-y-1">
              <div className="flex items-center gap-2 text-amber-800 font-semibold text-sm">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                Allergy Warning
              </div>
              {allergyWarnings.map((w, i) => (
                <p key={i} className="text-xs text-amber-700 pl-6">{w}</p>
              ))}
            </div>
          )}

          {/* Drug Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Drug Items</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Drug
              </Button>
            </div>

            {drugItems.map((item, idx) => (
              <div key={idx} className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Item {idx + 1}
                  </span>
                  {drugItems.length > 1 && (
                    <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => removeItem(idx)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs">Drug *</Label>
                    <Popover open={openDrugPicker === idx} onOpenChange={(isOpen) => setOpenDrugPicker(isOpen ? idx : null)}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between font-normal"
                        >
                          <span className={cn("truncate", !item.drugName && "text-muted-foreground")}>
                            {item.drugName || "Search drug inventory..."}
                          </span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command>
                          <CommandInput placeholder="Search by drug name..." />
                          <CommandList>
                            <CommandEmpty>No drug found in inventory.</CommandEmpty>
                            <CommandGroup>
                              {drugCatalogue.map((drug) => (
                                <CommandItem
                                  key={drug.drugId || drug.id}
                                  value={drug.name}
                                  onSelect={(value) => {
                                    setDrug(idx, value);
                                    setOpenDrugPicker(null);
                                  }}
                                >
                                  <Check className={cn("mr-2 h-4 w-4", item.drugName === drug.name ? "opacity-100" : "opacity-0")} />
                                  <div className="flex-1 min-w-0">
                                    <p className="truncate">{drug.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {drug.category || "General"} • {drug.stock > 0 ? `${drug.stock} in stock` : "Out of stock"}
                                    </p>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    {/* Free-text override for drugs not yet in the formulary */}
                    <Input
                      placeholder="Or type drug name manually..."
                      value={item.drugName}
                      onChange={(e) => updateItem(idx, "drugName", e.target.value)}
                      className="mt-1 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Quantity *</Label>
                    <Input type="number" min="1" required value={item.quantity} onChange={(e) => updateItem(idx, "quantity", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Dosage *</Label>
                    <Input placeholder="e.g. 1 tab 3× daily" required value={item.dosage} onChange={(e) => updateItem(idx, "dosage", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Duration *</Label>
                    <Input placeholder="e.g. 7 days" required value={item.duration} onChange={(e) => updateItem(idx, "duration", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Medication Class</Label>
                    <Input placeholder="e.g. Antibiotic" value={item.medicationClass} onChange={(e) => updateItem(idx, "medicationClass", e.target.value)} />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs">Instructions</Label>
                    <Textarea placeholder="Take after meals, avoid alcohol..." rows={2} value={item.instructions} onChange={(e) => updateItem(idx, "instructions", e.target.value)} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="gradient-primary text-primary-foreground">
              Create Prescription ({drugItems.filter((i) => i.drugName.trim()).length} item{drugItems.filter((i) => i.drugName.trim()).length !== 1 ? "s" : ""})
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
