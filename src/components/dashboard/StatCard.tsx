import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  iconClassName?: string;
}

export default function StatCard({ title, value, change, changeType = "neutral", icon: Icon }: StatCardProps) {
  const renderTrend = () => {
    if (!change) return null;
    
    const IconTrend = changeType === "positive" ? TrendingUp : changeType === "negative" ? TrendingDown : Minus;
    const trendColor = {
      positive: "text-[#007A3D] bg-[#007A3D]/10",
      negative: "text-red-600 bg-red-50",
      neutral: "text-gray-500 bg-gray-100"
    }[changeType];
    
    const IconComponent = IconTrend;
    
    return (
      <div className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold", trendColor)}>
        <IconComponent className="h-3 w-3" />
        {change}
      </div>
    );
  };

  const iconBgStyles = {
    positive: "bg-gradient-to-br from-[#007A3D]/10 to-[#007A3D]/5",
    negative: "bg-gradient-to-br from-red-50 to-red-50/50",
    neutral: "bg-gradient-to-br from-[#F2A900]/10 to-[#F2A900]/5"
  };

  const iconStyles = {
    positive: "text-[#007A3D]",
    negative: "text-red-600",
    neutral: "text-[#F2A900]"
  };

  return (
    <div className="group relative bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-lg hover:border-[#F2A900]/30 hover:-translate-y-1 transition-all duration-300">
      {/* Subtle gold accent line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#F2A900]/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{title}</p>
          <p className="mt-2 text-3xl font-bold font-display text-gray-900 tracking-tight">{value}</p>
          {renderTrend()}
        </div>
        
        <div className={cn(
          "p-3.5 rounded-2xl transition-all duration-300 group-hover:scale-110",
          iconBgStyles[changeType]
        )}>
          <Icon className={cn("h-5 w-5", iconStyles[changeType])} />
        </div>
      </div>
    </div>
  );
}