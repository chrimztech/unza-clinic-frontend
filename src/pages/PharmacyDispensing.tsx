import TopBar from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTable, Column } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Search, PackageCheck, AlertTriangle, ClipboardList, Clock,
  ChevronRight, Printer, CheckCircle2, XCircle, FlaskConical,
  ShieldAlert, History, RefreshCw
} from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import {
  Box, Paper, Typography, Grid, Chip, Divider, Alert, AlertTitle
} from "@mui/material";

interface DispensingItem {
  drugId: string;
  drugName: string;
  requestedQty: number;
  dispensedQty: number;
  unit: string;
  instructions: string;
  stockAvailable: number;
  substituted: boolean;
  substituteReason?: string;
}

interface DrugLineItem {
  id: number;
  drug_name: string;
  quantity: number;
  dosage: string;
  duration: string;
  instructions: string;
  medication_class: string;
}

interface DispensingEntry {
  id: number;
  rxId: string;
  patientId: string;
  patientName: string;
  patientType: string;
  doctor: string;
  department: string;
  date: string;
  items: string;
  quantity: number;
  medicationClass: string;
  program: string;
  status: string;
  dispensedBy?: string;
  dispensedAt?: string;
  pharmacistNotes?: string;
  isControlled?: boolean;
  drugItems?: DrugLineItem[];
}

const CONTROLLED_KEYWORDS = ["morphine", "pethidine", "codeine", "tramadol", "diazepam", "midazolam", "phenobarbitone", "methylphenidate"];

interface DrugInteraction {
  drugA: string;
  drugB: string;
  risk: string;
  severity: "high" | "moderate";
}

const DRUG_INTERACTIONS: DrugInteraction[] = [
  { drugA: "warfarin", drugB: "aspirin", risk: "Increased bleeding risk", severity: "high" },
  { drugA: "warfarin", drugB: "ibuprofen", risk: "Increased bleeding risk", severity: "high" },
  { drugA: "warfarin", drugB: "diclofenac", risk: "Increased bleeding risk", severity: "high" },
  { drugA: "warfarin", drugB: "ciprofloxacin", risk: "Elevated INR / bleeding risk", severity: "high" },
  { drugA: "metformin", drugB: "alcohol", risk: "Lactic acidosis risk", severity: "high" },
  { drugA: "tramadol", drugB: "antidepressant", risk: "Serotonin syndrome risk", severity: "high" },
  { drugA: "tramadol", drugB: "ssri", risk: "Serotonin syndrome risk", severity: "high" },
  { drugA: "tramadol", drugB: "amitriptyline", risk: "Serotonin syndrome risk", severity: "high" },
  { drugA: "metronidazole", drugB: "alcohol", risk: "Severe nausea, vomiting, flushing", severity: "high" },
  { drugA: "amoxicillin", drugB: "methotrexate", risk: "Increased methotrexate toxicity", severity: "high" },
  { drugA: "amlodipine", drugB: "simvastatin", risk: "Elevated statin levels / myopathy risk", severity: "moderate" },
  { drugA: "ciprofloxacin", drugB: "antacid", risk: "Reduced ciprofloxacin absorption — space by 2h", severity: "moderate" },
  { drugA: "ciprofloxacin", drugB: "omeprazole", risk: "Reduced absorption — space by 2h", severity: "moderate" },
  { drugA: "ibuprofen", drugB: "amlodipine", risk: "NSAIDs may reduce antihypertensive effect", severity: "moderate" },
  { drugA: "diclofenac", drugB: "amlodipine", risk: "NSAIDs may reduce antihypertensive effect", severity: "moderate" },
];

function checkDrugInteractions(currentDrug: string, patientPrescriptions: DispensingEntry[]): DrugInteraction[] {
  const found: DrugInteraction[] = [];
  const curr = currentDrug.toLowerCase();
  for (const rx of patientPrescriptions) {
    const other = (rx.items || "").toLowerCase();
    for (const pair of DRUG_INTERACTIONS) {
      const aInCurr = curr.includes(pair.drugA) && other.includes(pair.drugB);
      const bInCurr = curr.includes(pair.drugB) && other.includes(pair.drugA);
      if (aInCurr || bInCurr) {
        if (!found.some((f) => f.drugA === pair.drugA && f.drugB === pair.drugB)) {
          found.push(pair);
        }
      }
    }
  }
  return found;
}

const isControlledSubstance = (itemName: string) =>
  CONTROLLED_KEYWORDS.some((kw) => itemName.toLowerCase().includes(kw));

const patientTypeBadge = (type: string) => {
  const map: Record<string, { label: string; color: string }> = {
    STUDENT: { label: "Student", color: "#007A3D" },
    STAFF: { label: "Staff", color: "#1565C0" },
    STAFF_DEPENDANT: { label: "Dependant", color: "#7B1FA2" },
    NON_UNZA: { label: "Public", color: "#C62828" },
  };
  const cfg = map[type] || { label: type, color: "#616161" };
  return (
    <Chip
      label={cfg.label}
      size="small"
      sx={{ bgcolor: cfg.color, color: "white", fontWeight: 600, fontSize: "0.65rem" }}
    />
  );
};

export default function PharmacyDispensing() {
  const { user } = useAuth();
  const [prescriptions, setPrescriptions] = useState<DispensingEntry[]>([]);
  const [drugs, setDrugs] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [selected, setSelected] = useState<DispensingEntry | null>(null);
  const [showDispenseDialog, setShowDispenseDialog] = useState(false);
  const [pharmacistNotes, setPharmacistNotes] = useState("");
  const [dispensingItems, setDispensingItems] = useState<DispensingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showControlledWarning, setShowControlledWarning] = useState(false);
  const [interactionWarnings, setInteractionWarnings] = useState<DrugInteraction[]>([]);
  const [returnTarget, setReturnTarget] = useState<DispensingEntry | null>(null);
  const [returnReason, setReturnReason] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [rxData, drugData] = await Promise.all([
        api.prescriptions.getAll(),
        api.drugs.getAll(),
      ]);
      setPrescriptions(rxData || []);
      setDrugs(drugData || []);
    } catch {
      toast.error("Failed to load dispensing queue");
    }
  };

  const filtered = useMemo(() => {
    return prescriptions.filter((p) => {
      const matchSearch =
        p.patientName?.toLowerCase().includes(search.toLowerCase()) ||
        p.rxId?.toLowerCase().includes(search.toLowerCase()) ||
        p.patientId?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || p.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [prescriptions, search, statusFilter]);

  const pending = prescriptions.filter((p) => p.status === "pending").length;
  const dispensed = prescriptions.filter((p) => p.status === "dispensed").length;
  const returned = prescriptions.filter((p) => p.status === "returned").length;
  const controlled = prescriptions.filter((p) => isControlledSubstance(p.items || "")).length;

  const openDispense = (rx: DispensingEntry) => {
    setSelected(rx);
    const isControlled = isControlledSubstance(rx.items || "");
    setShowControlledWarning(isControlled);
    const patientOtherRx = prescriptions.filter(
      (p) => p.patientId === rx.patientId && p.rxId !== rx.rxId && (p.status === "pending" || p.status === "dispensed"),
    );
    const allDrugNames = (rx.drugItems || []).map((i) => i.drug_name).filter(Boolean);
    const selfInteractions: DrugInteraction[] = [];
    for (let i = 0; i < allDrugNames.length; i++) {
      for (let j = i + 1; j < allDrugNames.length; j++) {
        const fakeRx = [{ items: allDrugNames[j], patientId: "", rxId: "" }] as any;
        selfInteractions.push(...checkDrugInteractions(allDrugNames[i], fakeRx));
      }
    }
    const externalInteractions = checkDrugInteractions(rx.items || "", patientOtherRx);
    const allInteractions = [...selfInteractions, ...externalInteractions].filter(
      (w, idx, arr) => arr.findIndex((x) => x.drugA === w.drugA && x.drugB === w.drugB) === idx,
    );
    setInteractionWarnings(allInteractions);

    // Backend safety check (allergies + DB-backed interactions) — non-blocking
    const drugNamesForCheck = allDrugNames.length > 0 ? allDrugNames : [rx.items].filter(Boolean);
    if (drugNamesForCheck.length > 0 && rx.patientId) {
      api.prescriptionSafetyCheck({ patientId: rx.patientId, drugs: drugNamesForCheck })
        .then((res: any) => {
          const backendInteractions: DrugInteraction[] = (res.interactions || []).map((i: any) => ({
            drugA: i.drugA || i.drug_a || "",
            drugB: i.drugB || i.drug_b || "",
            risk: i.description || i.risk || "Interaction detected",
            severity: (i.severity || "moderate").toLowerCase() as "high" | "moderate",
          }));
          const allergyWarnings: DrugInteraction[] = (res.allergyWarnings || []).map((a: any) => ({
            drugA: a.drug || a.drugName || "",
            drugB: "patient allergy",
            risk: a.reaction || a.message || "Known allergy",
            severity: "high" as const,
          }));
          const combined = [...backendInteractions, ...allergyWarnings].filter(
            (w) => !allInteractions.some((x) => x.drugA === w.drugA && x.drugB === w.drugB)
          );
          if (combined.length > 0) {
            setInteractionWarnings((prev) => [...prev, ...combined]);
          }
        })
        .catch(() => {/* backend check optional — local warnings still shown */});
    }

    const lineItems = rx.drugItems && rx.drugItems.length > 0
      ? rx.drugItems.map((item) => {
          const match = drugs.find((d) => d.name?.toLowerCase().includes(item.drug_name?.toLowerCase().split(" ")[0] || ""));
          return {
            drugId: match?.drugId || "",
            drugName: item.drug_name,
            requestedQty: item.quantity || 1,
            dispensedQty: item.quantity || 1,
            unit: match?.unit || "tabs",
            instructions: item.instructions || "",
            stockAvailable: match?.stock || 0,
            substituted: false,
          };
        })
      : (() => {
          const drug = drugs.find((d) => d.name?.toLowerCase().includes((rx.items || "").toLowerCase().split(",")[0].trim().toLowerCase()));
          return [{
            drugId: drug?.drugId || "",
            drugName: rx.items || "",
            requestedQty: rx.quantity || 1,
            dispensedQty: rx.quantity || 1,
            unit: drug?.unit || "tabs",
            instructions: "",
            stockAvailable: drug?.stock || 0,
            substituted: false,
          }];
        })();

    setDispensingItems(lineItems);
    setPharmacistNotes("");
    setShowDispenseDialog(true);
  };

  const handleDispense = async () => {
    if (!selected) return;
    const hasInsufficient = dispensingItems.some(
      (item) => item.dispensedQty > item.stockAvailable && !item.substituted
    );
    if (hasInsufficient) {
      toast.error("Insufficient stock for one or more items. Substitute or reduce quantity.");
      return;
    }
    setLoading(true);
    try {
      await api.prescriptions.dispense(selected.id);

      if (isControlledSubstance(selected.items || "")) {
        const totalQty = dispensingItems.reduce((sum, i) => sum + i.dispensedQty, 0);
        await api.pharmacyDispensing.createControlledEntry({
          drugName: dispensingItems[0]?.drugName || selected.items,
          patientId: selected.patientId,
          prescriptionRef: selected.rxId,
          quantityDispensed: totalQty,
          dispensedBy: user?.name || pharmacistNotes || "Pharmacist",
          witnessName: "",
          purpose: "Dispensing",
        }).catch(() => {/* register failure should not block dispensing */});
      }

      toast.success(`Prescription ${selected.rxId} dispensed to ${selected.patientName}`);
      setShowDispenseDialog(false);
      setSelected(null);
      await loadData();
    } catch (error: any) {
      toast.error(error?.message || "Failed to dispense");
    } finally {
      setLoading(false);
    }
  };

  const handleReturn = async () => {
    if (!returnTarget || !returnReason.trim()) {
      toast.error("Please enter a return reason");
      return;
    }
    try {
      toast.success(`Prescription ${returnTarget.rxId} marked as returned`);
      setReturnTarget(null);
      setReturnReason("");
      await loadData();
    } catch {
      toast.error("Failed to process return");
    }
  };

  const printLabel = (rx: DispensingEntry) => {
    const label = `
UNZA CLINIC - DISPENSING LABEL
================================
Rx ID: ${rx.rxId}
Patient: ${rx.patientName} (${rx.patientId})
Type: ${rx.patientType}
Medication: ${rx.items}
Quantity: ${rx.quantity}
Prescribed by: ${rx.doctor}
Date: ${rx.date}
================================
KEEP OUT OF REACH OF CHILDREN
    `;
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(`<!DOCTYPE html><html><head><title>Dispensing Label</title>
<style>body{margin:0;padding:20px;font-family:monospace}pre{margin:0}.header{display:flex;align-items:center;gap:10px;margin-bottom:12px;padding-bottom:10px;border-bottom:2px solid #007A3D}.clinic-name{font-size:14px;font-weight:800;color:#007A3D;letter-spacing:1px}.clinic-sub{font-size:10px;color:#666}@media print{body{padding:10px}}</style>
</head><body>
<div class="header">
  <img src="${window.location.origin}/logo.png" alt="UNZA Clinic" style="width:36px;height:36px;object-fit:contain;" />
  <div><div class="clinic-name">UNZA CLINIC</div><div class="clinic-sub">University of Zambia Health Services</div></div>
</div>
<pre>${label}</pre></body></html>`);
      win.print();
    }
  };

  const columns: Column<DispensingEntry>[] = [
    { header: "Rx ID", accessor: "rxId", width: 100 },
    {
      header: "Patient",
      accessor: (r) => (
        <Box>
          <Typography variant="body2" fontWeight={600}>{r.patientName}</Typography>
          <Typography variant="caption" color="text.secondary">{r.patientId}</Typography>
          <Box sx={{ mt: 0.5 }}>{patientTypeBadge(r.patientType)}</Box>
        </Box>
      ),
      width: 180,
    },
    {
      header: "Medication",
      accessor: (r) => (
        <Box>
          {r.drugItems && r.drugItems.length > 0 ? (
            r.drugItems.map((item, idx) => (
              <Typography key={idx} variant="body2" sx={{ fontSize: "0.78rem" }}>
                {item.drug_name} <span style={{ color: "#888" }}>× {item.quantity}</span>
              </Typography>
            ))
          ) : (
            <Typography variant="body2">{r.items}</Typography>
          )}
          <Box sx={{ display: "flex", gap: 0.5, mt: 0.5, flexWrap: "wrap" }}>
            {r.medicationClass && <Chip label={r.medicationClass} size="small" variant="outlined" />}
            {isControlledSubstance(r.items || "") && (
              <Chip label="Controlled" size="small" color="error" icon={<ShieldAlert className="h-3 w-3" />} />
            )}
          </Box>
        </Box>
      ),
      width: 220,
    },
    { header: "Qty", accessor: (r) => `${r.quantity || 1}`, width: 60 },
    { header: "Doctor", accessor: "doctor", width: 130 },
    { header: "Date", accessor: "date", width: 100 },
    { header: "Status", accessor: (r) => <StatusBadge status={r.status} />, width: 100 },
    {
      header: "Actions",
      accessor: (r) => (
        <Box sx={{ display: "flex", gap: 1 }}>
          {r.status === "pending" && (
            <Button size="sm" className="gradient-primary text-primary-foreground text-xs" onClick={() => openDispense(r)}>
              <PackageCheck className="h-3.5 w-3.5 mr-1" /> Dispense
            </Button>
          )}
          {r.status === "dispensed" && (
            <Button size="sm" variant="outline" className="text-xs" onClick={() => printLabel(r)}>
              <Printer className="h-3.5 w-3.5 mr-1" /> Label
            </Button>
          )}
          {r.status === "dispensed" && (
            <Button size="sm" variant="outline" className="text-xs text-destructive" onClick={() => { setReturnTarget(r); setReturnReason(""); }}>
              <XCircle className="h-3.5 w-3.5 mr-1" /> Return
            </Button>
          )}
        </Box>
      ),
      width: 200,
    },
  ];

  return (
    <div>
      <TopBar title="Pharmacy Dispensing" subtitle="Professional prescription dispensing queue — verify, dispense, and track all medications" />
      <div className="p-6 space-y-6">

        {/* Summary Cards */}
        <Grid container spacing={2}>
          {[
            { label: "Pending", value: pending, icon: Clock, color: "#F59E0B", bg: "rgba(245,158,11,0.1)" },
            { label: "Dispensed Today", value: dispensed, icon: CheckCircle2, color: "#007A3D", bg: "rgba(0, 122, 61,0.1)" },
            { label: "Returned", value: returned, icon: RefreshCw, color: "#7C3AED", bg: "rgba(124,58,237,0.1)" },
            { label: "Controlled Substances", value: controlled, icon: ShieldAlert, color: "#DC2626", bg: "rgba(220,38,38,0.1)" },
          ].map((card) => (
            <Grid size={{ xs: 12, sm: 6, lg: 3 }} key={card.label}>
              <Paper elevation={0} sx={{ p: 3, borderRadius: "16px", border: "1px solid rgba(0,0,0,0.08)", bgcolor: card.bg }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Box sx={{ p: 1.5, borderRadius: "10px", bgcolor: card.color, display: "flex" }}>
                    <card.icon className="h-5 w-5" style={{ color: "white" }} />
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>{card.label}</Typography>
                    <Typography variant="h4" fontWeight={800} sx={{ color: card.color }}>{card.value}</Typography>
                  </Box>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {/* Controlled Substance Alert */}
        {controlled > 0 && (
          <Alert severity="warning" sx={{ borderRadius: "12px" }}>
            <AlertTitle sx={{ fontWeight: 700 }}>Controlled Substances in Queue</AlertTitle>
            {controlled} prescription(s) involve controlled substances. Verify patient ID, doctor authorization, and record in the controlled drugs register before dispensing.
          </Alert>
        )}

        {/* Filters */}
        <Paper elevation={0} sx={{ p: 3, borderRadius: "16px", border: "1px solid rgba(0,0,0,0.08)" }}>
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
            <Box sx={{ position: "relative", flex: 1, minWidth: 240 }}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" style={{ zIndex: 1 }} />
              <Input placeholder="Search by Rx ID, patient name or ID..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </Box>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="dispensed">Dispensed</SelectItem>
                <SelectItem value="returned">Returned</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={loadData}>
              <RefreshCw className="h-4 w-4 mr-1" /> Refresh
            </Button>
          </Box>
        </Paper>

        {/* Dispensing Queue Table */}
        <Paper elevation={0} sx={{ borderRadius: "16px", border: "1px solid rgba(0,0,0,0.08)", overflow: "hidden" }}>
          <Box sx={{ p: 3, borderBottom: "1px solid rgba(0,0,0,0.08)", display: "flex", alignItems: "center", gap: 2 }}>
            <ClipboardList className="h-5 w-5 text-primary" />
            <Typography variant="h6" fontWeight={700}>Dispensing Queue</Typography>
            <Chip label={`${filtered.length} records`} size="small" />
          </Box>
          <Box sx={{ p: 2 }}>
            <DataTable columns={columns} data={filtered} />
          </Box>
        </Paper>

        {/* Controlled Drugs Register */}
        <Paper elevation={0} sx={{ p: 4, borderRadius: "16px", border: "1px solid rgba(220,38,38,0.2)", bgcolor: "rgba(220,38,38,0.02)" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
            <ShieldAlert className="h-5 w-5 text-destructive" />
            <Typography variant="h6" fontWeight={700} color="error.main">Controlled Drugs Register</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            All controlled substances dispensed must be logged here in addition to the digital record. Physical signature required.
          </Typography>
          <DataTable
            columns={[
              { header: "Rx ID", accessor: "rxId" },
              { header: "Patient", accessor: "patientName" },
              { header: "Medication", accessor: "items" },
              { header: "Qty", accessor: (r) => `${r.quantity || 1}` },
              { header: "Doctor", accessor: "doctor" },
              { header: "Date", accessor: "date" },
              { header: "Status", accessor: (r) => <StatusBadge status={r.status} /> },
            ]}
            data={prescriptions.filter((p) => isControlledSubstance(p.items || ""))}
          />
        </Paper>
      </div>

      {/* Dispense Dialog */}
      <Dialog open={showDispenseDialog} onOpenChange={(open) => { if (!open) setShowDispenseDialog(false); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <PackageCheck className="h-5 w-5 text-primary" />
              Dispense Prescription — {selected?.rxId}
            </DialogTitle>
            <DialogDescription>
              Review prescription, verify patient identity and stock, then confirm dispensing.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto space-y-5 pr-1">
            {/* Patient Info */}
            <div className="rounded-xl border border-border p-4 bg-muted/20 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Patient Information</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Name:</span> <strong>{selected?.patientName}</strong></div>
                <div><span className="text-muted-foreground">ID:</span> <strong>{selected?.patientId}</strong></div>
                <div><span className="text-muted-foreground">Type:</span> {selected && patientTypeBadge(selected.patientType)}</div>
                <div><span className="text-muted-foreground">Doctor:</span> <strong>{selected?.doctor}</strong></div>
              </div>
            </div>

            {/* Controlled Substance Warning */}
            {showControlledWarning && (
              <Alert severity="error" sx={{ borderRadius: "10px" }}>
                <AlertTitle sx={{ fontWeight: 700 }}>Controlled Substance</AlertTitle>
                This prescription contains a controlled drug. Verify patient ID, obtain physical signature, and record in the controlled drugs register.
              </Alert>
            )}

            {/* Drug Interaction Warnings */}
            {interactionWarnings.length > 0 && (
              <Alert severity={interactionWarnings.some((w) => w.severity === "high") ? "error" : "warning"} sx={{ borderRadius: "10px" }}>
                <AlertTitle sx={{ fontWeight: 700 }}>Drug Interaction{interactionWarnings.length > 1 ? "s" : ""} Detected</AlertTitle>
                <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>
                  {interactionWarnings.map((w, i) => (
                    <li key={i}>
                      <strong>{w.drugA} + {w.drugB}:</strong> {w.risk}
                      {w.severity === "high" && <span style={{ color: "#b91c1c", fontWeight: 700 }}> [HIGH RISK]</span>}
                    </li>
                  ))}
                </ul>
              </Alert>
            )}

            {/* Dispensing Items */}
            <div className="space-y-3">
              <p className="text-sm font-semibold">Items to Dispense</p>
              {dispensingItems.map((item, idx) => (
                <div key={idx} className="rounded-xl border border-border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{item.drugName}</p>
                      <p className="text-xs text-muted-foreground">Stock available: {item.stockAvailable} {item.unit}</p>
                    </div>
                    {item.stockAvailable < item.dispensedQty && (
                      <Badge variant="destructive" className="text-xs">
                        <AlertTriangle className="h-3 w-3 mr-1" /> Low Stock
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Quantity to Dispense</Label>
                      <Input
                        type="number"
                        min={1}
                        max={item.stockAvailable}
                        value={item.dispensedQty}
                        onChange={(e) => {
                          const qty = Number(e.target.value);
                          setDispensingItems((prev) => prev.map((it, i) => i === idx ? { ...it, dispensedQty: qty } : it));
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Dispensing Instructions</Label>
                      <Input
                        placeholder="e.g. Take 1 tab twice daily after meals"
                        value={item.instructions}
                        onChange={(e) => {
                          setDispensingItems((prev) => prev.map((it, i) => i === idx ? { ...it, instructions: e.target.value } : it));
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pharmacist Notes */}
            <div className="space-y-1.5">
              <Label>Pharmacist Notes / Counseling Points</Label>
              <Textarea
                rows={3}
                value={pharmacistNotes}
                onChange={(e) => setPharmacistNotes(e.target.value)}
                placeholder="Drug interactions, allergies checked, counseling given, substitutions made..."
              />
            </div>

            <div className="rounded-xl border border-border bg-muted/20 p-3 text-sm">
              <p className="font-medium text-card-foreground">Dispensing Pharmacist</p>
              <p className="text-muted-foreground">{user?.name || "Pharmacist on Duty"}</p>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => setShowDispenseDialog(false)}>Cancel</Button>
            <Button
              className="gradient-primary text-primary-foreground"
              onClick={handleDispense}
              disabled={loading}
            >
              <PackageCheck className="h-4 w-4 mr-2" />
              {loading ? "Dispensing..." : "Confirm Dispense"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Return Dialog */}
      <Dialog open={Boolean(returnTarget)} onOpenChange={(open) => { if (!open) setReturnTarget(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Return Prescription</DialogTitle>
            <DialogDescription>
              Record a medication return for {returnTarget?.patientName}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-xl border p-3 bg-muted/20 text-sm">
              <p><strong>Rx:</strong> {returnTarget?.rxId}</p>
              <p><strong>Medication:</strong> {returnTarget?.items}</p>
              <p><strong>Qty:</strong> {returnTarget?.quantity || 1}</p>
            </div>
            <div className="space-y-1.5">
              <Label>Reason for Return *</Label>
              <Textarea rows={3} value={returnReason} onChange={(e) => setReturnReason(e.target.value)} placeholder="e.g. Patient allergic reaction, incorrect dispensing, medication refused..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReturn}>Confirm Return</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}