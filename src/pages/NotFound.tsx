import { Link } from "react-router-dom";
import { Home, ShieldAlert } from "lucide-react";

const NotFound = () => {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0c0c0c] p-6">
      <div className="absolute inset-0">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#007A3D]/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[420px] h-[420px] bg-[#F2A900]/10 rounded-full blur-[100px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      <div className="relative z-10 w-full max-w-md text-center">
        <div className="relative mx-auto mb-8 h-20 w-20">
          <div className="absolute inset-0 bg-gradient-to-br from-[#007A3D] to-[#F2A900] rounded-2xl blur-xl opacity-40" />
          <div className="relative flex h-full w-full items-center justify-center rounded-2xl bg-white/5 border border-white/10">
            <ShieldAlert className="h-9 w-9 text-[#F2A900]" />
          </div>
        </div>

        <p className="font-display text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#F2A900] to-[#FFC233] tracking-tight">
          404
        </p>
        <h1 className="mt-3 font-display text-2xl font-bold text-white">Page not found</h1>
        <p className="mt-2 text-sm text-gray-400 leading-relaxed">
          The page you're looking for doesn't exist or may have moved. Check the address or head back to the clinic dashboard.
        </p>

        <Link
          to="/"
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#007A3D] via-[#00A956] to-[#007A3D] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#007A3D]/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl"
        >
          <Home className="h-4 w-4" />
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
