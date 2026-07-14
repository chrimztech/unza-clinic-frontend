import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import { CssBaseline } from "@mui/material";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { theme } from "@/theme/mui-theme";
import AppLayout from "@/components/layout/AppLayout";
import Appointments from "@/pages/Appointments";
import Dashboard from "@/pages/Dashboard";
import ClinicSections from "@/pages/ClinicSections";
import ReceptionDesk from "@/pages/ReceptionDesk";
import RecordsDesk from "@/pages/RecordsDesk";
import Patients from "@/pages/Patients";
import PatientFlow from "@/pages/PatientFlow";
import Counseling from "@/pages/Counseling";
import PatientRegistration from "@/pages/PatientRegistration";
import PatientDetail from "@/pages/PatientDetail";
import Triage from "@/pages/Triage";
import Emergency from "@/pages/Emergency";
import DoctorSchedule from "@/pages/DoctorSchedule";
import MedicalRecords from "@/pages/MedicalRecords";
import MedicalExams from "@/pages/MedicalExams";
import ClinicForms from "@/pages/ClinicForms";
import Prescriptions from "@/pages/Prescriptions";
import Pharmacy from "@/pages/Pharmacy";
import PharmacyDispensing from "@/pages/PharmacyDispensing";
import MCHClinic from "@/pages/MCHClinic";
import ARTClinic from "@/pages/ARTClinic";
import DentalClinic from "@/pages/DentalClinic";
import EyeClinic from "@/pages/EyeClinic";
import STIClinic from "@/pages/STIClinic";
import Physiotherapy from "@/pages/Physiotherapy";
import Suppliers from "@/pages/Suppliers";
import Laboratory from "@/pages/Laboratory";
import Radiology from "@/pages/Radiology";
import BloodBank from "@/pages/BloodBank";
import Billing from "@/pages/Billing";
import InvoiceDetail from "@/pages/InvoiceDetail";
import TariffManager from "@/pages/TariffManager";
import Insurance from "@/pages/Insurance";
import Wards from "@/pages/Wards";
import Admissions from "@/pages/Admissions";
import Referrals from "@/pages/Referrals";
import Inventory from "@/pages/Inventory";
import StaffAttendance from "@/pages/StaffAttendance";
import Reports from "@/pages/Reports";
import ClinicalStatistics from "@/pages/ClinicalStatistics";
import Departments from "@/pages/Departments";
import UserManagement from "@/pages/UserManagement";
import AuditLogs from "@/pages/AuditLogs";
import Notifications from "@/pages/Notifications";
import Settings from "@/pages/Settings";
import Login from "@/pages/Login";
import ChangePassword from "@/pages/ChangePassword";
import DoctorQueue from "@/pages/DoctorQueue";
import StudentIntakeScreening from "@/pages/StudentIntakeScreening";
import BulkImport from "@/pages/BulkImport";
import NotFound from "@/pages/NotFound";
import { PatientJourneyProvider } from "@/context/PatientJourneyContext";
import { AuthProvider } from "@/context/AuthContext";
import { ProtectedRoute, PublicOnlyRoute } from "@/components/auth/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PatientJourneyProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <Routes>
                <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
                <Route path="/change-password" element={<ProtectedRoute><ChangePassword /></ProtectedRoute>} />
                <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/clinic-sections" element={<ClinicSections />} />
                  <Route path="/reception-desk" element={<ReceptionDesk />} />
                  <Route path="/records-desk" element={<RecordsDesk />} />
                  <Route path="/patients" element={<Patients />} />
                  <Route path="/patient-flow" element={<PatientFlow />} />
                  <Route path="/patients/register" element={<PatientRegistration />} />
                  <Route path="/patients/:id" element={<PatientDetail />} />
                  <Route path="/triage" element={<Triage />} />
                  <Route path="/emergency" element={<Emergency />} />
                  <Route path="/doctors" element={<Navigate to="/users" replace />} />
                  <Route path="/doctors/:id" element={<Navigate to="/users" replace />} />
                  <Route path="/doctor-schedule" element={<DoctorSchedule />} />
                  <Route path="/doctor-queue" element={<DoctorQueue />} />
                  <Route path="/student-intake-screening" element={<StudentIntakeScreening />} />
                  <Route path="/bulk-import" element={<BulkImport />} />
                  <Route path="/appointments" element={<Appointments />} />
                  <Route path="/medical-records" element={<MedicalRecords />} />
                  <Route path="/clinical-forms" element={<ClinicForms />} />
                  <Route path="/medical-exams" element={<MedicalExams />} />
                  <Route path="/prescriptions" element={<Prescriptions />} />
                  <Route path="/pharmacy" element={<Pharmacy />} />
                  <Route path="/pharmacy/dispensing" element={<PharmacyDispensing />} />
                  <Route path="/mch-clinic" element={<MCHClinic />} />
                  <Route path="/art-clinic" element={<ARTClinic />} />
                  <Route path="/dental-clinic" element={<DentalClinic />} />
                  <Route path="/eye-clinic" element={<EyeClinic />} />
                  <Route path="/sti-clinic" element={<STIClinic />} />
                  <Route path="/physiotherapy" element={<Physiotherapy />} />
                  <Route path="/suppliers" element={<Suppliers />} />
                  <Route path="/laboratory" element={<Laboratory />} />
                  <Route path="/radiology" element={<Radiology />} />
                  <Route path="/blood-bank" element={<BloodBank />} />
                  <Route path="/billing" element={<Billing />} />
                  <Route path="/billing/invoice/:id" element={<InvoiceDetail />} />
                  <Route path="/billing/tariffs" element={<TariffManager />} />
                  <Route path="/insurance" element={<Insurance />} />
                  <Route path="/wards" element={<Wards />} />
                  <Route path="/admissions" element={<Admissions />} />
                  <Route path="/referrals" element={<Referrals />} />
                  <Route path="/counseling" element={<Counseling />} />
                  <Route path="/inventory" element={<Inventory />} />
                  <Route path="/staff-attendance" element={<StaffAttendance />} />
                   <Route path="/reports" element={<Reports />} />
                   <Route path="/clinical-statistics" element={<ClinicalStatistics />} />
                   <Route path="/departments" element={<Departments />} />
                  <Route path="/users" element={<UserManagement />} />
                  <Route path="/audit-logs" element={<AuditLogs />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/settings" element={<Settings />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </PatientJourneyProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
