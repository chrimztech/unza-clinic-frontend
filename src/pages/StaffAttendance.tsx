import TopBar from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable, Column } from "@/components/ui/data-table";
import StatCard from "@/components/dashboard/StatCard";
import { Users, Clock, CheckCircle, XCircle, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import api from "@/lib/api";

const statusColors: Record<string, string> = {
  "on-duty": "bg-green-100 text-green-800",
  "off-duty": "bg-gray-100 text-gray-800",
  late: "bg-orange-100 text-orange-800",
  absent: "bg-red-100 text-red-800",
};

export default function StaffAttendance() {
  const [records, setRecords] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadAttendance() {
      try {
        setRecords(await api.attendance.getAll());
      } catch (error) {
        toast.error("Failed to load staff attendance");
      }
    }
    loadAttendance();
  }, []);

  const today = records[0]?.date ?? "";
  const todayRecords = records.filter((record) => record.date === today);
  const onDuty = todayRecords.filter((record) => record.status === "on-duty" || record.status === "late").length;
  const absent = todayRecords.filter((record) => record.status === "absent").length;
  const late = todayRecords.filter((record) => record.status === "late").length;

  const handleCheckOut = async (id: number) => {
    const updated = await api.attendance.checkout(id);
    setRecords((prev) => prev.map((record) => record.id === id ? updated : record));
    toast.success("Check-out recorded");
  };

  const filtered = records.filter((record) => record.name.toLowerCase().includes(search.toLowerCase()) || record.department.toLowerCase().includes(search.toLowerCase()));

  const columns: Column<any>[] = [
    { header: "Staff ID", accessor: "staffId" },
    { header: "Name", accessor: (record) => <div><p className="text-sm font-medium">{record.name}</p><p className="text-xs text-muted-foreground">{record.role}</p></div> },
    { header: "Department", accessor: "department" },
    { header: "Shift", accessor: "shift" },
    { header: "Check In", accessor: (record) => record.checkIn || <span className="text-muted-foreground">-</span> },
    { header: "Check Out", accessor: (record) => record.checkOut || <span className="text-muted-foreground">-</span> },
    { header: "Status", accessor: (record) => <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${statusColors[record.status]}`}>{record.status.replace("-", " ")}</span> },
    { header: "Actions", accessor: (record) => (record.status === "on-duty" || record.status === "late") ? <Button size="sm" variant="outline" onClick={() => handleCheckOut(record.id)}>Check Out</Button> : null },
  ];

  return (
    <div>
      <TopBar title="Staff Attendance" subtitle="Track staff check-in, shifts, and duty status" />
      <div className="p-6 space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Users} title="Total Staff" value={String(todayRecords.length)} />
          <StatCard icon={CheckCircle} title="On Duty" value={String(onDuty)} changeType="positive" />
          <StatCard icon={Clock} title="Late Arrivals" value={String(late)} changeType="negative" />
          <StatCard icon={XCircle} title="Absent" value={String(absent)} changeType="negative" />
        </div>

        <div className="grid gap-3 grid-cols-3">
          {["Morning", "Afternoon", "Night"].map((shift) => (
            <div key={shift} className="rounded-xl bg-card p-4 shadow-card border border-border text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">{shift} Shift</p>
              <p className="text-2xl font-bold font-display text-card-foreground mt-1">{todayRecords.filter((record) => record.shift === shift).length}</p>
              <p className="text-xs text-muted-foreground">staff</p>
            </div>
          ))}
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search staff..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <DataTable columns={columns} data={filtered} />
      </div>
    </div>
  );
}
