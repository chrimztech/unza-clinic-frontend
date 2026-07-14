import AppSidebar from "./AppSidebar";
import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { Dialog, DialogTitle, DialogContent, DialogActions, Box, Typography, InputLabel, OutlinedInput } from "@mui/material";
import { Button } from "@/components/ui/mui-button";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { toast } from "sonner";

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ password: "", confirmPassword: "" });
  const { user, updateUser, logout } = useAuth();

  useEffect(() => {
    setPasswordDialogOpen(Boolean(user?.forcePasswordChange));
  }, [user?.forcePasswordChange]);

  const handlePasswordChange = async () => {
    if (!user) return;
    if (!passwordForm.password.trim()) {
      toast.error("Enter a new password");
      return;
    }
    if (passwordForm.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (passwordForm.password !== passwordForm.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setSavingPassword(true);
    try {
      const updated = await api.users.update(user.id, {
        password: passwordForm.password,
        forcePasswordChange: false,
      });
      updateUser({
        forcePasswordChange: updated.forcePasswordChange,
      });
      setPasswordForm({ password: "", confirmPassword: "" });
      setPasswordDialogOpen(false);
      toast.success("Password updated");
    } catch {
      toast.error("Failed to update password");
    } finally {
      setSavingPassword(false);
    }
  };

return (
      <>
        <div className="flex min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
          <AppSidebar collapsed={collapsed} onCollapsedChange={setCollapsed} />
          <div className="transition-all duration-300 flex-1 min-w-0 flex flex-col">
            <Outlet />
          </div>
        </div>

        <Dialog open={passwordDialogOpen} onClose={() => {}}>
          <DialogContent sx={{ sm: { maxWidth: 448 }, p: 4, borderRadius: "16px" }}>
            <DialogTitle sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontWeight: 700, fontSize: "1.5rem", mb: 1 }}>
              Change Temporary Password
            </DialogTitle>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, fontSize: "0.875rem" }}>
              Set a new private password before continuing to use the clinic system. This account is still marked with a temporary or recently reset password. Set a new private password to continue using the clinic system securely.
            </Typography>
           <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
             <Box>
               <InputLabel htmlFor="new-password" sx={{ mb: 1, fontWeight: 500, fontSize: "0.875rem" }}>
                 New Password
               </InputLabel>
               <OutlinedInput
                 id="new-password"
                 type="password"
                 value={passwordForm.password}
                 onChange={(e) => setPasswordForm((prev) => ({ ...prev, password: e.target.value }))}
                 fullWidth
                 sx={{ borderRadius: "8px" }}
               />
             </Box>
             <Box>
               <InputLabel htmlFor="confirm-password" sx={{ mb: 1, fontWeight: 500, fontSize: "0.875rem" }}>
                 Confirm Password
               </InputLabel>
               <OutlinedInput
                 id="confirm-password"
                 type="password"
                 value={passwordForm.confirmPassword}
                 onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                 fullWidth
                 sx={{ borderRadius: "8px" }}
               />
             </Box>
             <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, mt: 1 }}>
               <Button
                 type="button"
                 variant="outline"
                 onClick={() => {
                   logout();
                   window.location.href = "/login";
                 }}
               >
                 Sign Out
               </Button>
               <Button
                 variant="primary"
                 disabled={savingPassword}
                 onClick={handlePasswordChange}
                 sx={{
                   background: "linear-gradient(135deg, #007A3D 0%, #00A956 100%)",
                   "&:hover": { background: "linear-gradient(135deg, #024023 0%, #007A3D 100%)" },
                 }}
               >
                 {savingPassword ? "Saving..." : "Update Password"}
               </Button>
             </Box>
           </Box>
         </DialogContent>
       </Dialog>
     </>
   );
}
