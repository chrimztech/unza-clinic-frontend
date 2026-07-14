import { useEffect, useMemo, useState } from "react";
import TopBar from "@/components/layout/TopBar";
import { useAuth } from "@/context/AuthContext";
import { hasPermission } from "@/lib/navigation";
import api from "@/lib/api";
import { toast } from "sonner";
import { DataTable, Column } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/mui-button";
import { Input } from "@/components/ui/mui-input";
import {
  Box,
  Grid,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import { CalendarPlus, Search } from "lucide-react";

interface Appointment {
  id: number;
  appointmentId: string;
  patientId: string;
  patientName: string;
  doctorId?: string;
  doctorName: string;
  department: string;
  date: string;
  time: string;
  type?: string;
  status: string;
  notes?: string;
}

const appointmentTypes = ["Walk-In Review", "Follow Up", "Procedure", "Lab Review", "Consultation"];

export default function Appointments() {
  const { user } = useAuth();
  const canBook = hasPermission(user, ["schedules.view"]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    patientId: "",
    doctorId: "",
    department: "",
    date: "",
    time: "",
    type: "Consultation",
    notes: "",
  });

  useEffect(() => {
    async function loadData() {
      try {
        const [appointmentData, patientData, staffData] = await Promise.all([
          api.appointments.getAll(),
          api.patients.getAll(),
          api.staff.getAll(),
        ]);
        setAppointments(appointmentData || []);
        setPatients(patientData || []);
        setStaff(staffData || []);
      } catch (error: any) {
        toast.error(error?.message || "Failed to load appointments");
      }
    }

    loadData();
  }, []);

  const filteredAppointments = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return appointments;
    return appointments.filter((entry) =>
      [entry.appointmentId, entry.patientName, entry.patientId, entry.doctorName, entry.department]
        .some((value) => String(value || "").toLowerCase().includes(term))
    );
  }, [appointments, search]);

  const selectedPatient = patients.find((entry) => (entry.patient_id || entry.clinic_number) === form.patientId);
  const selectedDoctor = staff.find((entry) => String(entry.staff_id || entry.id) === form.doctorId);

  const columns: Column<Appointment>[] = [
    { header: "Appointment", accessor: "appointmentId", width: 150 },
    { header: "Patient", accessor: "patientName", width: 180, minWidth: 150 },
    { header: "Doctor", accessor: "doctorName", width: 180, minWidth: 150 },
    { header: "Department", accessor: "department", width: 160 },
    { header: "Date", accessor: "date", width: 120 },
    { header: "Time", accessor: "time", width: 100 },
    { header: "Type", accessor: (row) => row.type || "-", width: 140 },
    { header: "Status", accessor: (row) => <StatusBadge status={row.status} />, width: 120 },
  ];

  const saveAppointment = async () => {
    if (!selectedPatient || !selectedDoctor || !form.date || !form.time || !form.department) {
      toast.error("Complete the appointment form before saving");
      return;
    }

    setSaving(true);
    try {
      const created = await api.appointments.create({
        patientId: selectedPatient.patient_id || selectedPatient.clinic_number,
        patientName: selectedPatient.name,
        doctorId: selectedDoctor.staff_id || selectedDoctor.id,
        doctorName: selectedDoctor.name,
        department: form.department,
        date: form.date,
        time: form.time,
        type: form.type,
        notes: form.notes,
      });
      setAppointments((current) => [created, ...current]);
      setForm({
        patientId: "",
        doctorId: "",
        department: "",
        date: "",
        time: "",
        type: "Consultation",
        notes: "",
      });
      toast.success("Appointment scheduled successfully");
    } catch (error: any) {
      toast.error(error?.message || "Failed to schedule appointment");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ pb: 4 }}>
      <TopBar title="Appointments" subtitle="Schedule outpatient visits and keep doctors aligned with clinic demand" />

      <Grid container spacing={3} sx={{ mt: 2 }}>
        {canBook && <Grid size={{ xs: 12, xl: 4 }}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: "16px", border: "1px solid rgba(0,0,0,0.08)" }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
              <Box>
                <Typography variant="h6" fontWeight={700}>Book Appointment</Typography>
                <Typography variant="body2" color="text.secondary">
                  Capture planned reviews and clinician bookings
                </Typography>
              </Box>
              <CalendarPlus className="h-5 w-5" />
            </Box>

            <Box sx={{ display: "grid", gap: 2 }}>
              <TextField
                select
                label="Patient"
                value={form.patientId}
                onChange={(event) => setForm((current) => ({ ...current, patientId: event.target.value }))}
              >
                {patients.map((entry) => (
                  <MenuItem key={entry.id} value={entry.patient_id || entry.clinic_number}>
                    {entry.name} ({entry.patient_id || entry.clinic_number})
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                label="Doctor / Staff"
                value={form.doctorId}
                onChange={(event) => {
                  const nextDoctor = staff.find((entry) => String(entry.staff_id || entry.id) === event.target.value);
                  setForm((current) => ({
                    ...current,
                    doctorId: event.target.value,
                    department: nextDoctor?.department || current.department,
                  }));
                }}
              >
                {staff.map((entry) => (
                  <MenuItem key={entry.id} value={entry.staff_id || entry.id}>
                    {entry.name} ({entry.role})
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label="Department"
                value={form.department}
                onChange={(event) => setForm((current) => ({ ...current, department: event.target.value }))}
              />

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Date"
                    type="date"
                    value={form.date}
                    slotProps={{ inputLabel: { shrink: true } }}
                    onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Time"
                    type="time"
                    value={form.time}
                    slotProps={{ inputLabel: { shrink: true } }}
                    onChange={(event) => setForm((current) => ({ ...current, time: event.target.value }))}
                  />
                </Grid>
              </Grid>

              <TextField
                select
                label="Visit Type"
                value={form.type}
                onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}
              >
                {appointmentTypes.map((entry) => (
                  <MenuItem key={entry} value={entry}>{entry}</MenuItem>
                ))}
              </TextField>

              <TextField
                label="Notes"
                multiline
                minRows={3}
                value={form.notes}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              />

              <Button onClick={saveAppointment} disabled={saving || !canBook}>
                {saving ? "Scheduling..." : "Schedule Appointment"}
              </Button>
            </Box>
          </Paper>
        </Grid>}

        <Grid size={{ xs: 12, xl: canBook ? 8 : 12 }}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: "16px", border: "1px solid rgba(0,0,0,0.08)" }}>
            <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, gap: 2, justifyContent: "space-between", mb: 3 }}>
              <Box>
                <Typography variant="h6" fontWeight={700}>Scheduled Appointments</Typography>
                <Typography variant="body2" color="text.secondary">
                  Track booked visits, assigned clinicians, and date/time windows
                </Typography>
              </Box>
              <Box sx={{ width: { xs: "100%", md: 320 } }}>
                <Input
                  placeholder="Search appointments..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  startAdornment={<Search className="h-4 w-4" />}
                />
              </Box>
            </Box>

            <DataTable columns={columns} data={filteredAppointments} />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
