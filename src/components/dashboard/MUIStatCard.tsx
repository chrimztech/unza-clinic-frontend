import { LucideIcon } from "lucide-react";
import { Box, Typography, Paper } from "@mui/material";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { ReactElement } from "react";

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
}

export default function StatCard({ title, value, change, changeType = "neutral", icon: Icon }: StatCardProps) {
  const renderTrend = () => {
    if (!change) return null;

    const IconTrend = changeType === "positive" ? TrendingUp : changeType === "negative" ? TrendingDown : Minus;
    const colorMap = {
      positive: { color: "success.main", bg: "rgba(22, 100, 29, 0.08)" },
      negative: { color: "error.main", bg: "rgba(220, 38, 38, 0.08)" },
      neutral: { color: "text.secondary", bg: "rgba(0, 0, 0, 0.06)" }
    };
    const colors = colorMap[changeType];

    return (
      <Box
        sx={{
          display: "inline-flex",
          alignItems: "center",
          gap: 0.5,
          px: 1.5,
          py: 0.5,
          borderRadius: "9999px",
          fontSize: "0.75rem",
          fontWeight: 600,
          backgroundColor: colors.bg,
          color: colors.color,
        }}
      >
        <IconTrend className="h-3 w-3" />
        {change}
      </Box>
    );
  };

  const iconBgSx = {
    positive: { backgroundColor: "rgba(22, 100, 29, 0.08)" },
    negative: { backgroundColor: "rgba(220, 38, 38, 0.08)" },
    neutral: { backgroundColor: "rgba(212, 175, 55, 0.08)" }
  };

  const iconColor = {
    positive: "primary.main",
    negative: "error.main",
    neutral: "secondary.main"
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3.5,
        borderRadius: "16px",
        border: "1px solid rgba(0,0,0,0.08)",
        transition: "all 0.3s ease",
        position: "relative",
        overflow: "hidden",
        "&:hover": {
          boxShadow: "0 8px 30px rgba(0,0,0,0.1)",
          transform: "translateY(-4px)",
          borderColor: "rgba(212, 175, 55, 0.3)",
        },
        "&::before": {
          content: '""',
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "3px",
          background: "linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.3), transparent)",
          opacity: 0,
          transition: "opacity 0.3s ease",
        },
        "&:hover::before": {
          opacity: 1,
        }
      }}
    >
      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2" color="text.secondary" fontWeight={500} sx={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {title}
          </Typography>
          <Typography variant="h4" fontWeight={700} sx={{ mt: 1, fontSize: "2rem", lineHeight: 1, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
            {value}
          </Typography>
          {renderTrend()}
        </Box>

        <Box
          sx={{
            p: 1.5,
            borderRadius: "16px",
            transition: "transform 0.3s ease",
            "&:hover": {
              transform: "scale(1.1)",
            },
            ...iconBgSx[changeType],
          }}
        >
          <Icon className="h-5 w-5" style={{ color: changeType === "positive" ? "#16641D" : changeType === "negative" ? "#DC2626" : "#D4AF37" }} />
        </Box>
      </Box>
    </Paper>
  );
}

StatCard.displayName = "StatCard";
