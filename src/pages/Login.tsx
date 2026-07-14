import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Shield, Activity, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import api, { RateLimitError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { getDefaultPathForRole } from "@/lib/navigation";

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [blockedFor, setBlockedFor] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, []);

  const startCountdown = (seconds: number) => {
    setBlockedFor(seconds);
    countdownRef.current = setInterval(() => {
      setBlockedFor((prev) => {
        if (prev <= 1) { clearInterval(countdownRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (blockedFor > 0) return;
    setSubmitting(true);
    try {
      const response = await api.login(email, password);
      login({
        id: response.user.id,
        userId: response.user.userId,
        name: response.user.name,
        email: response.user.email,
        role: response.user.role,
        department: response.user.department,
        staffId: response.user.staffId,
        manNumber: response.user.manNumber,
        status: response.user.status,
        forcePasswordChange: response.user.forcePasswordChange,
        permissions: response.user.permissions,
        accessToken: response.accessToken,
        tokenType: response.tokenType,
        expiresAt: response.expiresAt,
      }, response.refreshToken);
      toast.success("Login successful", { description: `Welcome ${response.user.name}` });
      if (response.user.forcePasswordChange) {
        toast.info("Password reset recommended", { description: "This account is still using a temporary or recently reset password." });
      }
      navigate(getDefaultPathForRole({
        id: response.user.id,
        userId: response.user.userId,
        name: response.user.name,
        email: response.user.email,
        role: response.user.role,
        department: response.user.department,
        staffId: response.user.staffId,
        manNumber: response.user.manNumber,
        status: response.user.status,
        forcePasswordChange: response.user.forcePasswordChange,
        permissions: response.user.permissions,
        accessToken: response.accessToken,
        tokenType: response.tokenType,
        expiresAt: response.expiresAt,
      }));
    } catch (err) {
      if (err instanceof RateLimitError) {
        startCountdown(err.retryAfter);
        toast.error("Account temporarily blocked", {
          description: `Too many failed attempts. Try again in ${err.retryAfter}s.`,
        });
      } else {
        toast.error("Invalid credentials", { description: "Use a backend-backed clinic account." });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:flex lg:w-[55%] relative bg-[#0c0c0c] overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#16641D]/20 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#D4AF37]/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: "1s" }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-red-600/5 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: "2s" }} />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center w-full px-16">
          <div className="relative mb-12">
            <div className="absolute inset-0 bg-gradient-to-br from-[#16641D] to-[#D4AF37] rounded-3xl blur-2xl opacity-40 animate-pulse" />
            <div className="relative flex h-28 w-28 items-center justify-center rounded-3xl bg-white shadow-[0_0_40px_rgba(22,100,29,0.35)]">
              <img src="/logo.png" alt="UNZA Clinic logo" className="h-20 w-20 object-contain" />
            </div>
          </div>

          <h1 className="text-5xl font-bold font-display text-white text-center tracking-tight leading-tight mb-6">
            UNZA Clinic
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] to-[#e8c34a]">Management System</span>
          </h1>

          <p className="text-gray-400 text-center max-w-lg leading-relaxed mb-8">
            A connected digital platform for the University of Zambia clinic.
            Staff access, clinic records, and student or personnel identities stay aligned with the backend in one place.
          </p>

          <div className="flex items-center gap-8 text-sm">
            <div className="flex items-center gap-2 text-gray-500">
              <Shield className="h-4 w-4 text-[#16641D]" />
              <span>Secure & Private</span>
            </div>
            <div className="flex items-center gap-2 text-gray-500">
              <Activity className="h-4 w-4 text-green-500" />
              <span>Backend Synced</span>
            </div>
            <div className="flex items-center gap-2 text-gray-500">
              <Lock className="h-4 w-4 text-[#D4AF37]" />
              <span>Role Based Access</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex w-full lg:w-[45%] items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-[#16641D] to-[#D4AF37] rounded-xl blur-lg opacity-50" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-xl bg-white">
                <img src="/logo.png" alt="UNZA Clinic logo" className="h-12 w-12 object-contain" />
              </div>
            </div>
          </div>

          <div className="text-center">
            <h2 className="text-3xl font-bold font-display text-gray-900 tracking-tight">Welcome back</h2>
            <p className="text-gray-500 mt-2">Sign in with your clinic account</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 bg-gray-50 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#16641D]/20 focus:border-[#16641D] focus:bg-white transition-all"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">Password</Label>
                <span className="text-sm text-[#16641D] font-medium">Health personnel access</span>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 bg-gray-50 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#16641D]/20 focus:border-[#16641D] focus:bg-white transition-all pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={submitting || blockedFor > 0}
              className="w-full h-12 bg-gradient-to-r from-[#16641D] via-[#1e7a27] to-[#16641D] hover:from-[#145019] hover:via-[#16641D] hover:to-[#145019] text-white font-semibold rounded-xl shadow-lg shadow-[#16641D]/20 transition-all duration-300 bg-[length:200%_100%] disabled:opacity-60"
            >
              {submitting ? "Signing In..." : blockedFor > 0 ? `Try again in ${blockedFor}s` : "Sign In"}
            </Button>
            {blockedFor > 0 && (
              <p className="text-center text-xs text-red-500">
                Too many failed attempts — account blocked for {blockedFor} more second{blockedFor !== 1 ? "s" : ""}.
              </p>
            )}
          </form>

          <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            Sign in with a backend user account linked to clinic staff data. Seeded local accounts still work where available.
          </div>

          <div className="flex items-center justify-center gap-4">
            <div className="h-px w-10 bg-gray-200" />
            <span className="text-xs text-gray-400">Copyright 2026 University of Zambia</span>
            <div className="h-px w-10 bg-gray-200" />
          </div>
        </div>
      </div>
    </div>
  );
}
