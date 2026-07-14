import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Eye, EyeOff, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { getDefaultPathForRole } from "@/lib/navigation";

export default function ChangePassword() {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();

  const passwordRequirements = [
    { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
    { label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
    { label: "One lowercase letter", test: (p: string) => /[a-z]/.test(p) },
    { label: "One number", test: (p: string) => /[0-9]/.test(p) },
  ];

  const validatePassword = (password: string) => {
    return passwordRequirements.every(req => req.test(password));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match", { description: "Please ensure both passwords are identical." });
      return;
    }

    if (!validatePassword(newPassword)) {
      toast.error("Password does not meet requirements", { description: "Please ensure your password meets all the security requirements." });
      return;
    }

    setSubmitting(true);
    try {
      const saved = await api.users.changePassword({
        email: user!.email,
        currentPassword: currentPassword,
        newPassword: newPassword,
      });
      
      updateUser({
        name: saved.name,
        email: saved.email,
        department: saved.department,
        role: saved.role,
        status: saved.status,
        forcePasswordChange: false,
        permissions: saved.permissions,
      });
      
      toast.success("Password updated successfully", { description: "Your password has been changed." });
      navigate(getDefaultPathForRole(user!));
    } catch {
      toast.error("Failed to update password", { description: "Please try again or contact your administrator." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-50 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="relative mx-auto mb-4 h-16 w-16">
            <div className="absolute inset-0 bg-gradient-to-br from-[#007A3D] to-[#F2A900] rounded-xl blur-lg opacity-40" />
            <div className="relative flex h-full w-full items-center justify-center rounded-xl bg-gradient-to-br from-[#007A3D] to-[#00A956] shadow-lg shadow-[#007A3D]/20">
              <Lock className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold font-display text-gray-900 tracking-tight">Change Your Password</h1>
          <p className="text-gray-500 mt-2">
            You're using a temporary password. Please set a new secure password.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current Password</Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter your current password"
                required
                className="h-12 pr-12 bg-gray-50 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#007A3D]/20 focus:border-[#007A3D] focus:bg-white transition-all"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showCurrentPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            <p className="text-xs text-gray-500">Enter your temporary password</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                required
                className="h-12 pr-12 bg-gray-50 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#007A3D]/20 focus:border-[#007A3D] focus:bg-white transition-all"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
                className="h-12 pr-12 bg-gray-50 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#007A3D]/20 focus:border-[#007A3D] focus:bg-white transition-all"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Password Requirements</p>
            <ul className="space-y-1">
              {passwordRequirements.map((req, index) => (
                <li key={index} className="flex items-center gap-2 text-sm">
                  {req.test(newPassword) ? (
                    <Check className="h-4 w-4 text-[#007A3D]" />
                  ) : (
                    <X className="h-4 w-4 text-gray-300" />
                  )}
                  <span className={req.test(newPassword) ? "text-[#007A3D] font-medium" : "text-gray-500"}>
                    {req.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="w-full h-12 bg-gradient-to-r from-[#007A3D] via-[#00A956] to-[#007A3D] hover:from-[#005C2E] hover:via-[#007A3D] hover:to-[#005C2E] text-white font-semibold rounded-xl shadow-lg shadow-[#007A3D]/20 transition-all duration-300 bg-[length:200%_100%] disabled:opacity-60"
          >
            {submitting ? "Updating..." : "Update Password"}
          </Button>
        </form>
      </div>
    </div>
  );
}
