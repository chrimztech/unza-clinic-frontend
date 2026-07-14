import TopBar from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { AlertTriangle, Play, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useRef, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { hasPermission } from "@/lib/navigation";

export default function Settings() {
  const { user, updateUser } = useAuth();
  const canManageSettings = hasPermission(user, ["settings.manage"]);
  const canExportBackup = hasPermission(user, ["backup.export", "settings.manage"]);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [clearingSeededData, setClearingSeededData] = useState(false);
  const [triggeringBackup, setTriggeringBackup] = useState(false);
  const [restoringBackup, setRestoringBackup] = useState(false);
  const restoreInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState({ name: "", email: "", department: "", password: "" });
  const [settings, setSettings] = useState({
    hospital_name: "",
    contact_phone: "",
    address: "",
    email_notifications: true,
    sms_notifications: true,
    low_stock_alerts: true,
    two_factor_auth: true,
    audit_logging: true,
    auto_logout: true,
    backup_enabled: true,
    backup_frequency: "Daily",
    backup_location: "",
    last_backup_at: "",
    demo_data_cleared: false,
  });

  useEffect(() => {
    if (user) {
      setProfile({ name: user.name || "", email: user.email || "", department: user.department || "", password: "" });
    }
  }, [user]);

  useEffect(() => {
    async function loadSettings() {
      try {
        setSettings(await api.settings.get());
      } catch {
        toast.error("Failed to load settings");
      }
    }
    loadSettings();
  }, []);

  const saveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    try {
      const updated = await api.users.update(user.id, profile);
      updateUser({
        name: updated.name,
        email: updated.email,
        department: updated.department,
        forcePasswordChange: updated.forcePasswordChange,
        status: updated.status,
        permissions: updated.permissions,
      });
      setProfile((prev) => ({ ...prev, password: "" }));
      toast.success("Profile updated successfully");
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const saveSettings = async () => {
    if (!canManageSettings) {
      toast.error("You do not have permission to change clinic settings");
      return;
    }
    setSavingSettings(true);
    try {
      const updated = await api.settings.update(settings);
      setSettings(updated);
      toast.success("Settings saved successfully");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSavingSettings(false);
    }
  };

  const downloadBackup = async () => {
    if (!canExportBackup) {
      toast.error("You do not have permission to export backups");
      return;
    }
    try {
      const snapshot = await api.backup.getFull();
      const now = new Date().toISOString();
      const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `unza-clinic-backup-${now.slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      const updated = await api.settings.update({ ...settings, last_backup_at: now });
      setSettings(updated);
      toast.success("Full backup exported successfully");
    } catch {
      toast.error("Failed to export backup");
    }
  };

  const triggerManualBackup = async () => {
    setTriggeringBackup(true);
    try {
      const result = await api.backup.manualTrigger();
      const now = new Date().toISOString();
      const updated = await api.settings.update({ ...settings, last_backup_at: now });
      setSettings(updated);
      toast.success(`Backup created: ${result.backupId}`);
    } catch {
      toast.error("Failed to trigger backup");
    } finally {
      setTriggeringBackup(false);
    }
  };

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const confirmed = window.confirm(
      "WARNING: Restoring from backup will REPLACE ALL current clinic data. This cannot be undone.\n\nAre you sure you want to continue?"
    );
    if (!confirmed) { e.target.value = ""; return; }
    setRestoringBackup(true);
    try {
      const text = await file.text();
      const backupData = JSON.parse(text);
      await api.backup.restore(backupData);
      toast.success("System restored successfully. Please refresh the page.");
    } catch (error: any) {
      toast.error(error?.message || "Failed to restore from backup");
    } finally {
      setRestoringBackup(false);
      e.target.value = "";
    }
  };

  const clearSeededData = async () => {
    if (!user || user.role !== "Admin") {
      toast.error("Only admin users can clear seeded data");
      return;
    }

    const confirmation = window.prompt('Type "CLEAR SEEDED DATA" to remove demo records before deployment.');
    if (confirmation === null) {
      return;
    }

    setClearingSeededData(true);
    try {
      const response = await api.admin.clearSeededData({
        userId: user.id,
        confirmation,
      });
      setSettings((prev) => ({ ...prev, demo_data_cleared: true }));
      const removed = Object.values(response.summary || {}).reduce((total: number, value: any) => total + Number(value || 0), 0);
      toast.success(`Seeded data cleared. ${removed} demo records removed.`);
    } catch (error: any) {
      toast.error(error.message || "Failed to clear seeded data");
    } finally {
      setClearingSeededData(false);
    }
  };

  return (
    <div>
      <TopBar title="Settings" subtitle="System configuration, notifications, and user profile" />
      <div className="p-6 max-w-3xl mx-auto space-y-8">
        <section className="rounded-xl bg-card p-6 shadow-card border border-border space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold font-display text-card-foreground">My Profile</h3>
            <Button className="gradient-primary text-primary-foreground" onClick={saveProfile} disabled={savingProfile}>
              {savingProfile ? "Saving..." : "Save Profile"}
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Full Name</Label>
              <Input value={profile.name} onChange={(e) => setProfile((prev) => ({ ...prev, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={profile.email} onChange={(e) => setProfile((prev) => ({ ...prev, email: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Department</Label>
              <Input value={profile.department} onChange={(e) => setProfile((prev) => ({ ...prev, department: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>New Password</Label>
              <Input type="password" value={profile.password} onChange={(e) => setProfile((prev) => ({ ...prev, password: e.target.value }))} placeholder="Leave blank to keep current" />
            </div>
          </div>
        </section>

        <section className="rounded-xl bg-card p-6 shadow-card border border-border space-y-4">
          <h3 className="font-semibold font-display text-card-foreground">Clinic Information</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Clinic Name</Label>
              <Input value={settings.hospital_name} onChange={(e) => setSettings((prev) => ({ ...prev, hospital_name: e.target.value }))} disabled={!canManageSettings} />
            </div>
            <div className="space-y-1.5">
              <Label>Contact Phone</Label>
              <Input value={settings.contact_phone} onChange={(e) => setSettings((prev) => ({ ...prev, contact_phone: e.target.value }))} disabled={!canManageSettings} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Address</Label>
              <Input value={settings.address} onChange={(e) => setSettings((prev) => ({ ...prev, address: e.target.value }))} disabled={!canManageSettings} />
            </div>
          </div>
        </section>

        <section className="rounded-xl bg-card p-6 shadow-card border border-border space-y-4">
          <h3 className="font-semibold font-display text-card-foreground">Notifications</h3>
          <div className="space-y-3">
            {[
              ["email_notifications", "Email Notifications", "Receive alerts via email"],
              ["sms_notifications", "SMS Notifications", "Send appointment reminders via SMS"],
              ["low_stock_alerts", "Low Stock Alerts", "Get notified when pharmacy stock is low"],
            ].map(([key, title, desc]) => (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-card-foreground">{title}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
                <Switch checked={Boolean(settings[key as keyof typeof settings])} onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, [key]: checked }))} disabled={!canManageSettings} />
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl bg-card p-6 shadow-card border border-border space-y-4">
          <h3 className="font-semibold font-display text-card-foreground">Security</h3>
          <div className="space-y-3">
            {[
              ["two_factor_auth", "Two-Factor Authentication", "Add an extra layer of security"],
              ["audit_logging", "Audit Logging", "Track all system activities"],
              ["auto_logout", "Auto-Logout", "Automatically log out after inactivity"],
            ].map(([key, title, desc]) => (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-card-foreground">{title}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
                <Switch checked={Boolean(settings[key as keyof typeof settings])} onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, [key]: checked }))} disabled={!canManageSettings} />
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl bg-card p-6 shadow-card border border-border space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold font-display text-card-foreground">Backup & Recovery</h3>
              <p className="text-sm text-muted-foreground">Keep export-ready records for recovery and audit purposes.</p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              {canManageSettings && (
                <Button variant="outline" size="sm" onClick={triggerManualBackup} disabled={triggeringBackup}>
                  <Play className="h-4 w-4 mr-1" />
                  {triggeringBackup ? "Running..." : "Run Now"}
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={downloadBackup} disabled={!canExportBackup}>Download Backup</Button>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium text-card-foreground">Automatic Backup</p>
                <p className="text-xs text-muted-foreground">Enable routine backup tracking</p>
              </div>
              <Switch checked={Boolean(settings.backup_enabled)} onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, backup_enabled: checked }))} disabled={!canManageSettings} />
            </div>
            <div className="space-y-1.5">
              <Label>Backup Frequency</Label>
              <Select value={settings.backup_frequency} onValueChange={(value) => setSettings((prev) => ({ ...prev, backup_frequency: value }))} disabled={!canManageSettings}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Hourly">Hourly</SelectItem>
                  <SelectItem value="Daily">Daily</SelectItem>
                  <SelectItem value="Weekly">Weekly</SelectItem>
                  <SelectItem value="Monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Backup Location</Label>
              <Input value={settings.backup_location} onChange={(e) => setSettings((prev) => ({ ...prev, backup_location: e.target.value }))} placeholder="e.g. secure local server, external drive, cloud vault" disabled={!canManageSettings} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Last Backup</Label>
              <Input value={settings.last_backup_at || "No backup recorded"} readOnly />
            </div>
          </div>
          {canManageSettings && (
            <div className="border-t border-border pt-4 space-y-2">
              <p className="text-sm font-medium text-card-foreground">Restore from Backup</p>
              <p className="text-xs text-muted-foreground">Upload a backup JSON file to restore all clinic data. All current data will be replaced — use with caution.</p>
              <input ref={restoreInputRef} type="file" accept=".json" className="hidden" onChange={handleRestoreFile} />
              <Button
                variant="destructive"
                size="sm"
                disabled={restoringBackup}
                onClick={() => restoreInputRef.current?.click()}
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                {restoringBackup ? "Restoring..." : "Restore from File"}
              </Button>
            </div>
          )}
        </section>

        {user?.role === "Admin" && canManageSettings && (
          <section className="rounded-xl border border-red-200 bg-red-50 p-6 space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
              <div className="space-y-1">
                <h3 className="font-semibold text-red-900">Deployment Danger Zone</h3>
                <p className="text-sm text-red-800">
                  Remove seeded demo records before go-live. This keeps your admin login and clinic settings, but clears demo patients, billing, visits, pharmacy stock, reports, forms, and other seeded operational data.
                </p>
                <p className="text-xs text-red-700">
                  Status: {settings.demo_data_cleared ? "Seeded data already cleared" : "Seeded data still present"}
                </p>
              </div>
            </div>
            <div className="flex justify-end">
              <Button variant="destructive" onClick={clearSeededData} disabled={clearingSeededData || settings.demo_data_cleared}>
                {clearingSeededData ? "Clearing Demo Data..." : settings.demo_data_cleared ? "Seeded Data Cleared" : "Clear Seeded Data"}
              </Button>
            </div>
          </section>
        )}

        <div className="flex justify-end">
          <Button className="gradient-primary text-primary-foreground" onClick={saveSettings} disabled={savingSettings || !canManageSettings}>
            {savingSettings ? "Saving..." : "Save Clinic Settings"}
          </Button>
        </div>
      </div>
    </div>
  );
}
