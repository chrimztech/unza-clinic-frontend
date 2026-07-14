import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import api from "@/lib/api";

export interface InvoiceEntry {
  id: number;
  invoiceId: string;
  patient: string;
  service: string;
  lineItems?: Array<{
    tariff_code?: string;
    service_name: string;
    department?: string;
    quantity: number;
    unit_price: number;
    line_total: number;
  }>;
  amount: string;
  method: string;
  date: string;
  status: "pending" | "completed" | "cancelled";
}

interface NewInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit?: (entry: InvoiceEntry) => void;
}

interface LineItem {
  department: string;
  tariffCode: string;
  description: string;
  qty: number;
  unitPrice: number;
}

interface TariffOption {
  tariffCode: string;
  department: string;
  category: string;
  serviceName: string;
  unitLabel: string;
  price: number;
}

const methodNames: Record<string, string> = {
  cash: "Cash",
  mobile: "Mobile Money",
  card: "Card",
  insurance: "Insurance",
  student: "Student Account",
};

export default function NewInvoiceDialog({ open, onOpenChange, onSubmit }: NewInvoiceDialogProps) {
  const [patientId, setPatientId] = useState("");
  const [method, setMethod] = useState("");
  const [items, setItems] = useState<LineItem[]>([{ department: "", tariffCode: "", description: "", qty: 1, unitPrice: 0 }]);
  const [notes, setNotes] = useState("");
  const [tariffs, setTariffs] = useState<TariffOption[]>([]);
  const [registeredPatients, setRegisteredPatients] = useState<any[]>([]);
  const selectedPatient = useMemo(
    () => registeredPatients.find((entry) => entry.patient_id === patientId) ?? null,
    [patientId, registeredPatients],
  );

  useEffect(() => {
    if (!open) return;
    Promise.all([api.tariffs.getAll(), api.patients.getAll()])
      .then(([tariffData, patientData]) => {
        setTariffs(tariffData || []);
        setRegisteredPatients(patientData || []);
      })
      .catch(() => toast.error("Failed to load approved service tariffs"));
  }, [open]);

  const departments = useMemo(
    () => [...new Set(tariffs.map((tariff) => tariff.department).filter(Boolean))].sort(),
    [tariffs]
  );

  const addItem = () => setItems([...items, { department: "", tariffCode: "", description: "", qty: 1, unitPrice: 0 }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: keyof LineItem, value: string | number) => {
    const updated = [...items];
    if (field === "department") {
      updated[i] = { department: String(value), tariffCode: "", description: "", qty: updated[i].qty, unitPrice: 0 };
      setItems(updated);
      return;
    }
    if (field === "tariffCode") {
      const selected = tariffs.find((tariff) => tariff.tariffCode === value);
      updated[i] = {
        ...updated[i],
        tariffCode: String(value),
        department: selected?.department || updated[i].department,
        description: selected?.serviceName || "",
        unitPrice: selected?.price || 0,
      };
      setItems(updated);
      return;
    }
    (updated[i] as LineItem)[field] = value as never;
    setItems(updated);
  };
  const total = items.reduce((s, item) => s + item.qty * item.unitPrice, 0);

  const reset = () => {
    setPatientId("");
    setMethod("");
    setItems([{ department: "", tariffCode: "", description: "", qty: 1, unitPrice: 0 }]);
    setNotes("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) {
      toast.error("Select a registered patient");
      return;
    }
    try {
      const entry = await api.billing.create({
        patientId: selectedPatient.patient_id,
        patientName: selectedPatient.name,
        items: items.map((i) => i.description).join(", "),
        lineItems: items
          .filter((item) => item.tariffCode && item.description)
          .map((item) => ({
            tariffCode: item.tariffCode,
            serviceName: item.description,
            department: item.department,
            quantity: item.qty,
            unitPrice: item.unitPrice,
            lineTotal: item.qty * item.unitPrice,
          })),
        subtotal: total,
        tax: 0,
        total,
        dueDate: new Date().toISOString().split("T")[0],
        paymentMethod: methodNames[method] || method,
        notes,
      });
      onSubmit?.(entry);
      toast.success("Invoice created!", { description: `Total: K ${total.toFixed(2)}` });
      reset();
      onOpenChange(false);
    } catch {
      toast.error("Failed to create invoice");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display">Create New Invoice</DialogTitle>
          <DialogDescription>Select approved UNZA clinic services and the official fees will be applied automatically.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Patient *</Label>
              <Select required value={patientId} onValueChange={setPatientId}>
                <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                <SelectContent>
                  {registeredPatients.map((entry) => (
                    <SelectItem key={entry.patient_id} value={entry.patient_id}>
                      {entry.name} ({entry.clinic_number || entry.patient_id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Payment Method *</Label>
              <Select required value={method} onValueChange={setMethod}>
                <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(methodNames).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Line Items</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}><Plus className="h-3.5 w-3.5 mr-1" /> Add Item</Button>
            </div>
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="grid grid-cols-[160px_1fr_80px_110px_40px] gap-2 bg-secondary/50 px-3 py-2 text-xs font-semibold text-muted-foreground">
                <span>Department</span><span>Approved Service</span><span>Qty</span><span>Fee (K)</span><span></span>
              </div>
              {items.map((item, i) => (
                <div key={`${item.tariffCode || "new"}-${i}`} className="grid grid-cols-[160px_1fr_80px_110px_40px] gap-2 px-3 py-2 border-t border-border items-center">
                  <Select value={item.department} onValueChange={(value) => updateItem(i, "department", value)}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((department) => (
                        <SelectItem key={department} value={department}>{department}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={item.tariffCode} onValueChange={(value) => updateItem(i, "tariffCode", value)} disabled={!item.department}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder={item.department ? "Select approved service" : "Choose department first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {tariffs
                        .filter((tariff) => tariff.department === item.department)
                        .map((tariff) => (
                          <SelectItem key={tariff.tariffCode} value={tariff.tariffCode}>
                            {tariff.serviceName} - K {Number(tariff.price || 0).toFixed(2)}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Input type="number" min="1" value={item.qty} onChange={(e) => updateItem(i, "qty", parseInt(e.target.value) || 1)} className="h-8 text-sm" />
                  <Input type="number" step="0.01" min="0" value={item.unitPrice || ""} className="h-8 text-sm" readOnly required />
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeItem(i)} disabled={items.length === 1}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Only approved UNZA service tariffs are used here. Quantity changes are allowed, but the fee comes from the tariff catalog.</p>
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="gradient-primary text-primary-foreground">Create Invoice</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
