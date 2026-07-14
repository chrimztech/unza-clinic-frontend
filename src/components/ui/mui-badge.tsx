import { Chip, ChipProps } from "@mui/material";

export interface BadgeProps extends Omit<ChipProps, "color"> {
  variant?: "default" | "primary" | "secondary" | "success" | "warning" | "destructive";
}

export function Badge({ variant = "default", children, sx, ...props }: BadgeProps) {
  const getColor = () => {
    switch (variant) {
      case "primary":
        return "success";
      case "secondary":
        return "default";
      case "success":
        return "success";
      case "warning":
        return "warning";
      case "destructive":
        return "error";
      default:
        return "default";
    }
  };

  return (
    <Chip
      label={children}
      color={getColor()}
      size="small"
      sx={{
        fontWeight: 500,
        borderRadius: "9999px",
        ...(variant === "primary" && {
          backgroundColor: "rgba(22, 100, 29, 0.1)",
          color: "#16641D",
          "& .MuiChip-icon": { color: "#16641D" },
        }),
        ...(variant === "gold" && {
          backgroundColor: "rgba(212, 175, 55, 0.1)",
          color: "#946d22",
        }),
        ...(variant === "success" && {
          backgroundColor: "rgba(22, 100, 29, 0.1)",
        }),
        ...sx,
      }}
      {...props}
    />
  );
}
