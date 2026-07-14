import { useEffect, useMemo, useState } from "react";
import TopBar from "@/components/layout/TopBar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { Search, Stethoscope, Clock, Users, RefreshCw, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

interface QueueEntry {
  encounterId: string;
  patientId: string;
  patientName: string;
  clinicNumber: string;
  currentStage: string;
  assignedDoctor?: string;
  checkInTime: string;
  paymentStatus: string;
  chiefComplaint?: string;
  triageLevel?: string;
}

const stageColor: Record<string, string> = {
  Triage: "bg-yellow-100 text-yellow-800",
  Consultation: "bg-blue-100 text-blue-800",
  "Lab / Investigation": "bg-purple-100 text-purple-800",
  Pharmacy: "bg-green-100 text-green-800",
  Billing: "bg-indigo-100 text-indigo-800",
};

const triageBg: Record<string, string> = {
  red: "border-l-4 border-red-500",
  orange: "border-l-4 border-orange-400",
  yellow: "border-l-4 border-yellow-400",
  green: "border-l-4 border-green-400",
};

export default function DoctorQueue() {
  const navigate = useNavigate();
  const [encounters, setEncounters] = useState<QueueEntry[]>([]);
  const [triage, setTriage] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [doctorFilter, setDoctorFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [enc, tri] = await Promise.all([api.encounters.getAll(), api.triage.getAll()]);
      const active = (enc || []).filter((e: any) => !e.checkedOut && e.currentStage === "Consultation");
      setEncounters(active.map((e: any) => ({
        encounterId: e.encounterId,
        patientId: e.patientId,
        patientName: e.patientName || e.patient_name || e.patientId,
        clinicNumber: e.clinicNumber || e.clinic_number || e.patientId,
        currentStage: e.currentStage || "Consultation",
        assignedDoctor: e.assignedDoctor || e.assigned_doctor,
        checkInTime: e.checkInTime || e.check_in_time || e.createdAt || "",
        paymentStatus: e.paymentStatus || e.payment_status || "unknown",
        chiefComplaint: e.chiefComplaint || e.chief_complaint,
      })));
      setTriage(tri || []);
    } catch {
      toast.error("Failed to load queue");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const enriched = useMemo(() => {
    return encounters.map((e) => {
      const triageEntry = triage.find((t) => t.patientId === e.patientId || t.patient_id === e.patientId);
      return {
        ...e,
        triageLevel: triageEntry?.level,
        chiefComplaint: e.chiefComplaint || triageEntry?.chiefComplaint || triageEntry?.chief_complaint,
      };
    });
  }, [encounters, triage]);

  const doctors = useMemo(() => {
    const names = enriched.map((e) => e.assignedDoctor).filter(Boolean) as string[];
    return [...new Set(names)];
  }, [enriched]);

  const filtered = useMemo(() => {
    return enriched.filter((e) => {
      const matchSearch =
        (e.patientName || "").toLowerCase().includes(search.toLowerCase()) ||
        (e.clinicNumber || "").toLowerCase().includes(search.toLowerCase()) ||
        (e.assignedDoctor || "").toLowerCase().includes(search.toLowerCase());
      const matchDoctor = doctorFilter === "all" || e.assignedDoctor === doctorFilter;
      return matchSearch && matchDoctor;
    });
  }, [enriched, search, doctorFilter]);

  const grouped = useMemo(() => {
    const map: Record<string, QueueEntry[]> = {};
    for (const entry of filtered) {
      const key = entry.assignedDoctor || "Unassigned";
      if (!map[key]) map[key] = [];
      map[key].push(entry);
    }
    return map;
  }, [filtered]);

  const waitTime = (checkIn: string) => {
    if (!checkIn) return "—";
    const mins = Math.floor((Date.now() - new Date(checkIn).getTime()) / 60000);
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  return (
    <div>
      <TopBar title="Doctor's Queue" subtitle="Patients currently in Consultation stage, grouped by doctor" />
      <div className="p-6 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Awaiting Consultation", value: enriched.length, icon: Stethoscope, color: "text-blue-600" },
            { label: "Doctors on Queue", value: doctors.length, icon: Users, color: "text-emerald-600" },
            { label: "Unassigned", value: enriched.filter((e) => !e.assignedDoctor).length, icon: AlertCircle, color: "text-amber-600" },
            { label: "Longest Wait", value: enriched.length > 0 ? waitTime(enriched.reduce((a, b) => new Date(a.checkInTime) < new Date(b.checkInTime) ? a : b).checkInTime) : "—", icon: Clock, color: "text-purple-600" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-card border border-border p-4 shadow-card">
              <div className="flex items-center gap-2 mb-1">
                <s.icon className={`h-4 w-4 ${s.color}`} />
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{s.label}</span>
              </div>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search patient or doctor..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={doctorFilter} onValueChange={setDoctorFilter}>
            <SelectTrigger className="w-48"><SelectValue placeholder="All Doctors" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Doctors</SelectItem>
              {doctors.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
        </div>

        {/* Grouped Queue */}
        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-12">Loading queue...</p>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <Stethoscope className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-30" />
            <p className="text-muted-foreground">No patients currently in Consultation stage.</p>
          </div>
        ) : (
          Object.entries(grouped).map(([doctor, patients]) => (
            <div key={doctor} className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-3 bg-muted/40 border-b border-border">
                <Stethoscope className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-card-foreground">{doctor}</h3>
                <Badge variant="secondary">{patients.length} patient{patients.length > 1 ? "s" : ""}</Badge>
              </div>
              <div className="divide-y divide-border">
                {patients.map((p, i) => (
                  <div
                    key={p.encounterId}
                    className={`flex items-center gap-4 px-5 py-4 hover:bg-muted/20 cursor-pointer transition-colors ${p.triageLevel ? triageBg[p.triageLevel] || "" : ""}`}
                    onClick={() => navigate(`/patients/${p.patientId}`)}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-card-foreground truncate">{p.patientName}</p>
                      <p className="text-xs text-muted-foreground">{p.clinicNumber}</p>
                      {p.chiefComplaint && <p className="text-xs text-muted-foreground italic truncate">{p.chiefComplaint}</p>}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Wait time</p>
                        <p className="text-sm font-semibold text-card-foreground">{waitTime(p.checkInTime)}</p>
                      </div>
                      <Badge className={stageColor[p.currentStage] || ""}>{p.currentStage}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
