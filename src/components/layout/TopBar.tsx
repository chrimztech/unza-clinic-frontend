import { useState, useEffect } from "react";
import { Bell, LogOut, Search as SearchIcon, User, Settings as SettingsIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/mui-button";
import { GlobalSearch, useKeyboardShortcut } from "./GlobalSearch";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { toast } from "sonner";
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Avatar,
  Badge,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  InputAdornment,
} from "@mui/material";

interface TopBarProps {
  title: string;
  subtitle?: string;
}

export default function TopBar({ title, subtitle }: TopBarProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: "", email: "", department: "", password: "" });
  const [unreadCount, setUnreadCount] = useState(0);
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();

  useKeyboardShortcut("k", () => setSearchOpen(true), { ctrl: true });

  useEffect(() => {
    if (!user) return;
    setProfileForm({ name: user.name || "", email: user.email || "", department: user.department || "", password: "" });
  }, [user]);

  useEffect(() => {
    async function loadUnreadCount() {
      try {
      const notifications = await api.notifications.getAll();
      setUnreadCount(notifications.filter((item) => !item.read).length);
      } catch {
        setUnreadCount(0);
      }
    }
    loadUnreadCount();
  }, []);

  const handleProfileSave = async () => {
    if (!user) return;
    setSavingProfile(true);
    try {
      const updated = await api.users.update(user.id, {
        name: profileForm.name,
        email: profileForm.email,
        department: profileForm.department,
        password: profileForm.password || undefined,
      });
      updateUser({
        name: updated.name,
        email: updated.email,
        department: updated.department,
        forcePasswordChange: updated.forcePasswordChange,
        status: updated.status,
        permissions: updated.permissions,
      });
      setProfileForm((prev) => ({ ...prev, password: "" }));
      setProfileOpen(false);
      toast.success("Profile updated");
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <>
       <AppBar
         position="sticky"
         color="default"
         elevation={0}
         sx={{
           background: 'linear-gradient(90deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)',
           backdropFilter: 'blur(20px) saturate(180%)',
           borderBottom: '1px solid rgba(242, 169, 0, 0.15)',
           boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
           zIndex: (theme) => theme.zIndex.drawer + 1,
           position: 'sticky',
           top: 0,
         }}
       >
        <Toolbar sx={{ justifyContent: 'space-between', py: 1 }}>
           {/* Title Section */}
           <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
             <Typography variant="h5" sx={{ fontWeight: 800, fontSize: '1.375rem', lineHeight: 1.2, color: '#024023', fontFamily: '"Plus Jakarta Sans", sans-serif', letterSpacing: '-0.5px', textShadow: '0 0 10px rgba(15, 61, 22, 0.3)' }}>
               {title}
             </Typography>
             {subtitle && (
               <Typography variant="body2" sx={{ color: '#F2A900', fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                 {subtitle}
               </Typography>
             )}
           </Box>

          {/* Actions Section */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
             {/* Search */}
             <Box sx={{ position: 'relative', display: { md: 'block' }, mr: 1 }}>
               <TextField
                 placeholder="Search... (Ctrl+K)"
                 size="small"
                 readOnly
                 onClick={() => setSearchOpen(true)}
                 slotProps={{
                   input: {
                     startAdornment: (
                       <InputAdornment position="start">
                         <SearchIcon className="h-4 w-4" style={{ color: '#F2A900' }} />
                       </InputAdornment>
                     ),
                   },
                 }}
                 sx={{
                   width: 220,
                   background: 'linear-gradient(135deg, rgba(242, 169, 0, 0.08) 0%, rgba(242, 169, 0, 0.04) 100%)',
                   border: '1px solid rgba(242, 169, 0, 0.2)',
                   '& .MuiOutlinedInput-root': {
                     borderRadius: '12px',
                     backgroundColor: 'transparent',
                     '& fieldset': { border: 'none' },
                     '&:hover fieldset': { border: 'none' },
                     '&.Mui-focused fieldset': { border: 'none' },
                   },
                   cursor: 'pointer',
                   transition: 'all 0.3s ease',
                   '&:hover': {
                     background: 'linear-gradient(135deg, rgba(242, 169, 0, 0.12) 0%, rgba(242, 169, 0, 0.06) 100%)',
                     transform: 'translateY(-1px)',
                     boxShadow: '0 4px 12px rgba(242, 169, 0, 0.15)',
                   }
                 }}
               />
             </Box>

            {/* Notifications */}
            <IconButton size="small" onClick={() => navigate("/notifications")} sx={{ color: 'text.secondary' }}>
              <Badge badgeContent={unreadCount} color="error">
                <Bell className="h-5 w-5" />
              </Badge>
            </IconButton>

            {/* Profile & Actions */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 2, pl: 3, borderLeft: '1px solid rgba(0,0,0,0.08)' }}>
              {/* User Profile */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer' }} onClick={() => setProfileOpen(true)}>
                <Box sx={{ display: { xs: 'none', sm: 'block' }, textAlign: 'right' }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.875rem', color: 'text.primary' }}>
                    {user?.name || "Clinic User"}
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                    {user?.role || "Signed in"}
                  </Typography>
                </Box>
                <Avatar
                  sx={{
                    width: 40,
                    height: 40,
                    background: 'linear-gradient(135deg, #007A3D 0%, #00A956 100%)',
                    color: 'white',
                  }}
                >
                  <User className="h-4 w-4" style={{ color: 'white' }} />
                </Avatar>
              </Box>

              {/* Settings */}
              <IconButton size="small" onClick={() => navigate("/settings")} sx={{ color: 'text.secondary' }}>
                <SettingsIcon className="h-4 w-4" />
              </IconButton>

              {/* Logout */}
              <IconButton size="small" onClick={() => { logout(); navigate("/login"); }} sx={{ color: 'text.secondary' }}>
                <LogOut className="h-4 w-4" />
              </IconButton>
            </Box>
          </Box>
        </Toolbar>
      </AppBar>

      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />

      {/* Profile Dialog */}
      <Dialog
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: '16px' } }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontFamily: '"Plus Jakarta Sans", sans-serif', mb: 1 }}>
          User Profile
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Review your account details, department, and password settings.
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box>
              <TextField
                label="Full Name"
                size="small"
                fullWidth
                value={profileForm.name}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, name: e.target.value }))}
              />
            </Box>
            <Box>
              <TextField
                label="Email"
                type="email"
                size="small"
                fullWidth
                value={profileForm.email}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, email: e.target.value }))}
              />
            </Box>
            <Box>
              <TextField
                label="Department"
                size="small"
                fullWidth
                value={profileForm.department}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, department: e.target.value }))}
              />
            </Box>
            <Box>
              <TextField
                label="New Password"
                type="password"
                size="small"
                fullWidth
                placeholder="Leave blank to keep current"
                value={profileForm.password}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, password: e.target.value }))}
              />
            </Box>
            <DialogActions sx={{ px: 0, pt: 2 }}>
              <Button variant="outline" onClick={() => setProfileOpen(false)}>Close</Button>
              <Button variant="primary" disabled={savingProfile} onClick={handleProfileSave}>
                {savingProfile ? "Saving..." : "Save Profile"}
              </Button>
            </DialogActions>
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
}
