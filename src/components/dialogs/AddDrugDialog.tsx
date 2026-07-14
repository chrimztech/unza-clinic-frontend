import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useState } from "react";
import api from "@/lib/api";

export interface DrugEntry {
  id: number;
  drugId: string;
  name: string;
  category: string;
  drugType: string;
  batchNumber: string;
  stock: number;
  reorderLevel: number;
  unit: string;
  expiry: string;
  storageLocation: string;
  status: "available" | "critical";
}

interface AddDrugDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit?: (entry: DrugEntry) => void;
}

const categoryNames: Record<string, string> = {
  antibiotic: "Antibiotic",
  analgesic: "Analgesic",
  nsaid: "NSAID",
  antidiabetic: "Antidiabetic",
  antihypertensive: "Antihypertensive",
  ppi: "PPI",
  topical: "Topical",
  vitamin: "Vitamin/Supplement",
  other: "Other",
};

const stockTypes = ["Essential Drugs", "ART", "Laboratory Chemicals", "Eye Clinic", "MCH Supplies", "General Consumables"];

export default function AddDrugDialog({ open, onOpenChange, onSubmit }: AddDrugDialogProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [drugType, setDrugType] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [quantity, setQuantity] = useState("");
  const [reorderLevel, setReorderLevel] = useState("");
  const [unit, setUnit] = useState("");
  const [expiry, setExpiry] = useState("");
  const [storageLocation, setStorageLocation] = useState("");

  const reset = () => { setName(""); setCategory(""); setDrugType(""); setBatchNumber(""); setQuantity(""); setReorderLevel(""); setUnit(""); setExpiry(""); setStorageLocation(""); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const entry = await api.drugs.create({
        name,
        category: categoryNames[category] || category,
        drugType,
        batchNumber,
        stock: parseInt(quantity) || 0,
        reorderLevel: parseInt(reorderLevel) || 0,
        unit: unit.charAt(0).toUpperCase() + unit.slice(1),
        expiry,
        storageLocation,
      });
      onSubmit?.(entry);
      toast.success("Drug added to inventory!", { description: `${name} - ${quantity} ${unit}` });
      reset();
      onOpenChange(false);
    } catch {
      toast.error("Failed to add drug");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Add Drug to Inventory</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Drug Name *</Label>
              <Input required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Category *</Label>
              <Select required value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(categoryNames).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Stock Type *</Label>
              <Select required value={drugType} onValueChange={setDrugType}>
                <SelectTrigger><SelectValue placeholder="Select stock type" /></SelectTrigger>
                <SelectContent>
                  {stockTypes.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Quantity *</Label>
              <Input type="number" min="1" required value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Batch Number</Label>
              <Input value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Reorder Level *</Label>
              <Input type="number" min="1" required value={reorderLevel} onChange={(e) => setReorderLevel(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Unit *</Label>
              <Select required value={unit} onValueChange={setUnit}>
                <SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tablets">Tablets</SelectItem>
                  <SelectItem value="capsules">Capsules</SelectItem>
                  <SelectItem value="bottles">Bottles</SelectItem>
                  <SelectItem value="vials">Vials</SelectItem>
                  <SelectItem value="tubes">Tubes</SelectItem>
                  <SelectItem value="boxes">Boxes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Expiry Date *</Label>
              <Input type="date" required value={expiry} onChange={(e) => setExpiry(e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Storage Location</Label>
              <Input value={storageLocation} onChange={(e) => setStorageLocation(e.target.value)} placeholder="Main store, ART cabinet, lab chemical store..." />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="gradient-primary text-primary-foreground">Add Drug</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
