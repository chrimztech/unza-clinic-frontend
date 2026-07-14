import { Button as MuiButton, ButtonProps as MuiButtonProps } from "@mui/material";
import { forwardRef } from "react";

export interface ButtonProps extends Omit<MuiButtonProps, "variant"> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive" | "gold";
  size?: "sm" | "md" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", children, className, sx, ...props }, ref) => {
    const getVariant = () => {
      switch (variant) {
        case "primary":
          return "contained";
        case "outline":
          return "outlined";
        case "ghost":
          return "text";
        case "destructive":
          return "contained";
        case "gold":
          return "contained";
        case "secondary":
        default:
          return "contained";
      }
    };

    const getSize = () => {
      switch (size) {
        case "sm":
          return "small";
        case "lg":
          return "large";
        case "md":
        default:
          return "medium";
      }
    };

    return (
      <MuiButton
        ref={ref}
        variant={getVariant()}
        size={getSize()}
        sx={{
          fontWeight: 600,
          borderRadius: "8px",
          boxShadow: "none",
          textTransform: "none",
          ...(variant === "primary" && {
            backgroundColor: "#16641D",
            "&:hover": {
              backgroundColor: "#1e7a29",
              boxShadow: "0 6px 20px rgba(22, 100, 29, 0.3)",
            },
          }),
          ...(variant === "gold" && {
            backgroundColor: "#D4AF37",
            color: "#000",
            "&:hover": {
              backgroundColor: "#deb840",
              boxShadow: "0 6px 20px rgba(212, 175, 55, 0.35)",
            },
          }),
          ...(variant === "outline" && {
            borderColor: "#16641D",
            color: "#16641D",
            "&:hover": {
              borderColor: "#16641D",
              backgroundColor: "rgba(22, 100, 29, 0.08)",
            },
          }),
          ...(variant === "ghost" && {
            color: "rgba(0, 0, 0, 0.7)",
            "&:hover": {
              backgroundColor: "rgba(0, 0, 0, 0.08)",
            },
          }),
          ...(variant === "destructive" && {
            backgroundColor: "#DC2626",
            "&:hover": {
              backgroundColor: "#b91c1c",
              boxShadow: "0 6px 20px rgba(220, 38, 38, 0.35)",
            },
          }),
          ...(size === "sm" && {
            padding: "4px 12px",
            fontSize: "0.875rem",
          }),
          ...(size === "lg" && {
            padding: "12px 24px",
            fontSize: "1rem",
          }),
          ...sx,
        }}
        className={className}
        {...props}
      >
        {children}
      </MuiButton>
    );
  }
);

Button.displayName = "MuiButton";

export default Button;
