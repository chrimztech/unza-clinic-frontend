import TopBar from "@/components/layout/TopBar";
import { DataTable, Column } from "@/components/ui/data-table";
import { Input } from "@/components/ui/mui-input";
import { Search, Stethoscope, Pill, FlaskConical, Activity } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { buildPatientJourneys, type JourneyEvent } from "@/lib/journey";
import { useAuth } from "@/context/AuthContext";
import { hasPermission } from "@/lib/navigation";
import {
  Tabs,
  Tab,
  Box,
  Paper,
  Typography,
  Grid,
  TextField,
} from "@mui/material";

type EventWithName = JourneyEvent & { patientName: string };

export default function MedicalRecords() {
  const [search, setSearch] = useState("");
  const [staffList, setStaffList] = useState<any[]>([]);
  const [journeyPatients, setJourneyPatients] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    async function loadWorkspace() {
      try {
        const [staffData, patients, triage, labTests, prescriptions, admissions, billing, encounters, clinicalForms] = await Promise.all([
          hasPermission(user, ["staff.view"]) ? api.staff.getAll() : Promise.resolve([]),
          hasPermission(user, ["patients.view"]) ? api.patients.getAll() : Promise.resolve([]),
          hasPermission(user, ["triage.view"]) ? api.triage.getAll() : Promise.resolve([]),
          hasPermission(user, ["laboratory.view"]) ? api.labTests.getAll() : Promise.resolve([]),
          hasPermission(user, ["prescriptions.view", "pharmacy.view"]) ? api.prescriptions.getAll() : Promise.resolve([]),
          hasPermission(user, ["admissions.view"]) ? api.admissions.getAll() : Promise.resolve([]),
          hasPermission(user, ["billing.view"]) ? api.billing.getAll() : Promise.resolve([]),
          hasPermission(user, ["walkin.view"]) ? api.encounters.getAll() : Promise.resolve([]),
          hasPermission(user, ["forms.view"]) ? api.clinicalForms.getAll() : Promise.resolve([]),
        ]);
        setStaffList(staffData || []);
        setJourneyPatients(buildPatientJourneys({
          patients: patients || [],
          triage: triage || [],
          labTests: labTests || [],
          prescriptions: prescriptions || [],
          admissions: admissions || [],
          billing: billing || [],
          encounters: encounters || [],
          clinicalForms: clinicalForms || [],
        }));
      } catch (error) {
        console.error("Failed to load medical records", error);
      }
    }
    loadWorkspace();
  }, [user]);

  const allEvents: EventWithName[] = journeyPatients.flatMap((patient, patientIndex) =>
    patient.journey.map((event, eventIndex) => ({
      ...event,
      patientName: patient.name,
      id: buildMedicalRecordRowId(event, patient.patientId, patient.name, patientIndex, eventIndex),
    }))
  );

  const filter = (events: EventWithName[]) =>
    events.filter((event) => event.patientName.toLowerCase().includes(search.toLowerCase()));

  const consultations = filter(allEvents.filter((event) => event.type === "consultation"));
  const prescriptions = filter(allEvents.filter((event) => event.type === "prescription" || event.type === "dispensed"));
  const labEvents = filter(allEvents.filter((event) => event.type === "lab-request" || event.type === "lab-result"));
  const allFiltered = filter(allEvents);

  const staffMap = useMemo(() => {
    const map = new Map<string, any>();
    staffList.forEach((staff) => {
      map.set(staff.name, staff);
    });
    return map;
  }, [staffList]);

  const renderPerformedBy = (name: string) => {
    const staff = staffMap.get(name);
    if (staff) {
      return (
        <Box>
          <Typography variant="body2" fontWeight={500} fontSize="0.875rem">
            {staff.name}
          </Typography>
          <Typography variant="caption" color="text.secondary" fontSize="0.75rem">
            {staff.role} • {staff.department}
          </Typography>
        </Box>
      );
    }
    return (
      <Box>
        <Typography variant="body2" fontWeight={500} fontSize="0.875rem">
          {name || "Unknown user"}
        </Typography>
        <Typography variant="caption" color="text.secondary" fontSize="0.75rem">
          Staff details not linked
        </Typography>
      </Box>
    );
  };

  const allCols: Column<EventWithName>[] = [
    {
      header: "Time",
      accessor: (row) => {
        const date = new Date(row.timestamp);
        return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
      },
      width: 170,
    },
    { header: "Patient", accessor: "patientName", width: 150 },
    {
      header: "Type",
      accessor: (row) => (
        <Typography
          variant="caption"
          sx={{
            display: "inline-block",
            px: 1,
            py: 0.5,
            borderRadius: "9999px",
            fontSize: "0.7rem",
            fontWeight: 500,
            bgcolor: "rgba(0,0,0,0.08)",
            color: "text.primary",
          }}
        >
          {row.type.replace("-", " ")}
        </Typography>
      ),
      width: 130,
    },
    { header: "Title", accessor: "title", minWidth: 200 },
    { header: "Performed By", accessor: (row) => renderPerformedBy(row.performedBy), minWidth: 180 },
    { header: "Department", accessor: "department", width: 140 },
  ];

  const consultCols: Column<EventWithName>[] = [
    { header: "Date", accessor: (row) => new Date(row.timestamp).toLocaleDateString(), width: 120 },
    { header: "Patient", accessor: "patientName", width: 150 },
    { header: "Doctor", accessor: (row) => renderPerformedBy(row.performedBy), minWidth: 180 },
    { header: "Department", accessor: "department", width: 140 },
    { header: "Diagnosis", accessor: (row) => row.data?.diagnosis || "-", minWidth: 200 },
  ];

  const rxCols: Column<EventWithName>[] = [
    { header: "Date", accessor: (row) => new Date(row.timestamp).toLocaleDateString(), width: 120 },
    { header: "Patient", accessor: "patientName", width: 150 },
    { header: "Details", accessor: (row) => row.description.substring(0, 80) + (row.description.length > 80 ? "..." : ""), minWidth: 250 },
    { header: "Prescribed By", accessor: (row) => renderPerformedBy(row.performedBy), minWidth: 180 },
    {
      header: "Type",
      accessor: (row) => (
        <Typography
          variant="caption"
          sx={{
            display: "inline-block",
            px: 1,
            py: 0.5,
            borderRadius: "9999px",
            fontSize: "0.7rem",
            fontWeight: 500,
            bgcolor: "rgba(0,0,0,0.08)",
            color: "text.primary",
          }}
        >
          {row.type.replace("-", " ")}
        </Typography>
      ),
      width: 130,
    },
  ];

  const labCols: Column<EventWithName>[] = [
    { header: "Date", accessor: (row) => new Date(row.timestamp).toLocaleDateString(), width: 120 },
    { header: "Patient", accessor: "patientName", width: 150 },
    { header: "Test", accessor: (row) => row.data?.test || row.title, minWidth: 180 },
    { header: "Details", accessor: (row) => row.description.substring(0, 80) + (row.description.length > 80 ? "..." : ""), minWidth: 250 },
    { header: "Performed By", accessor: (row) => renderPerformedBy(row.performedBy), minWidth: 180 },
    {
      header: "Type",
      accessor: (row) => (
        <Typography
          variant="caption"
          sx={{
            display: "inline-block",
            px: 1,
            py: 0.5,
            borderRadius: "9999px",
            fontSize: "0.7rem",
            fontWeight: 500,
            bgcolor: "rgba(0,0,0,0.08)",
            color: "text.primary",
          }}
        >
          {row.type.replace("-", " ")}
        </Typography>
      ),
      width: 130,
    },
  ];

  const stats = useMemo(() => ({
    total: allFiltered.length,
    consultations: consultations.length,
    prescriptions: prescriptions.length,
    lab: labEvents.length,
  }), [allFiltered.length, consultations.length, prescriptions.length, labEvents.length]);

  const openPatientRecord = (row: EventWithName) => {
    if (!row.patientId || row.patientId === "null") {
      return;
    }
    navigate(`/patients/${row.patientId}`);
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
      <TopBar
        title="Electronic Medical Records"
        subtitle="Comprehensive patient health records and clinical data, including who performed each action"
      />

      <Box sx={{ mt: 3 }}>
        {/* Search */}
        <Box sx={{ maxWidth: 400, mb: 3 }}>
          <Input
            placeholder="Search by patient name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            startAdornment={<Search sx={{ fontSize: 16, color: "text.secondary" }} />}
          />
        </Box>

        {/* Stats */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
           <Grid size={{ xs: 6, sm: 3 }}>
             <Paper sx={{ p: 2.5, borderRadius: "12px", border: "1px solid rgba(0,0,0,0.08)", textAlign: "center" }}>
               <Typography variant="h5" fontWeight={700} color="text.primary">
                 {stats.total}
               </Typography>
               <Typography variant="body2" color="text.secondary">
                 All Events
               </Typography>
             </Paper>
           </Grid>
           <Grid size={{ xs: 6, sm: 3 }}>
             <Paper sx={{ p: 2.5, borderRadius: "12px", border: "1px solid rgba(0,0,0,0.08)", textAlign: "center" }}>
               <Typography variant="h5" fontWeight={700} color="primary.main">
                 {stats.consultations}
               </Typography>
               <Typography variant="body2" color="text.secondary">
                 Consultations
               </Typography>
             </Paper>
           </Grid>
           <Grid size={{ xs: 6, sm: 3 }}>
             <Paper sx={{ p: 2.5, borderRadius: "12px", border: "1px solid rgba(0,0,0,0.08)", textAlign: "center" }}>
               <Typography variant="h5" fontWeight={700} color="secondary.main">
                 {stats.prescriptions}
               </Typography>
               <Typography variant="body2" color="text.secondary">
                 Prescriptions
               </Typography>
             </Paper>
           </Grid>
           <Grid size={{ xs: 6, sm: 3 }}>
             <Paper sx={{ p: 2.5, borderRadius: "12px", border: "1px solid rgba(0,0,0,0.08)", textAlign: "center" }}>
               <Typography variant="h5" fontWeight={700} color="info.main">
                 {stats.lab}
               </Typography>
               <Typography variant="body2" color="text.secondary">
                 Lab
               </Typography>
             </Paper>
           </Grid>
         </Grid>

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
          <Tabs value={activeTab} onChange={(_, val) => setActiveTab(val)}>
            <Tab
              icon={<Activity sx={{ fontSize: 16 }} />}
              iconPosition="start"
              label={`All Events (${stats.total})`}
            />
            <Tab
              icon={<Stethoscope sx={{ fontSize: 16 }} />}
              iconPosition="start"
              label={`Consultations (${stats.consultations})`}
            />
            <Tab
              icon={<Pill sx={{ fontSize: 16 }} />}
              iconPosition="start"
              label={`Prescriptions (${stats.prescriptions})`}
            />
            <Tab
              icon={<FlaskConical sx={{ fontSize: 16 }} />}
              iconPosition="start"
              label={`Lab (${stats.lab})`}
            />
          </Tabs>
        </Box>

        {/* Tables */}
        <Box sx={{ mt: 2 }}>
          {activeTab === 0 && (
            <DataTable columns={allCols} data={allFiltered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())} onRowClick={openPatientRecord} />
          )}
          {activeTab === 1 && (
            <DataTable columns={consultCols} data={consultations} onRowClick={openPatientRecord} />
          )}
          {activeTab === 2 && (
            <DataTable columns={rxCols} data={prescriptions} onRowClick={openPatientRecord} />
          )}
          {activeTab === 3 && (
            <DataTable columns={labCols} data={labEvents} onRowClick={openPatientRecord} />
          )}
        </Box>
      </Box>
    </Box>
  );
}

function buildMedicalRecordRowId(
  event: JourneyEvent,
  patientId: string | undefined,
  patientName: string,
  patientIndex: number,
  eventIndex: number
) {
  const safeBaseId = event.id || event.type || "journey";
  const safePatientId = patientId && patientId !== "null" ? patientId : `${patientName}-${patientIndex}`;
  const safeTimestamp = event.timestamp || `event-${eventIndex}`;
  return `${safeBaseId}-${safePatientId}-${safeTimestamp}-${eventIndex}`;
}
