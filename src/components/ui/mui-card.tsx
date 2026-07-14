import { Card, CardProps as MuiCardProps, CardContent, CardHeader, CardTitle } from "@mui/material";
import { forwardRef } from "react";

export interface CardProps extends MuiCardProps {
  className?: string;
}

export const MuiCard = forwardRef<HTMLDivElement, CardProps>(
  ({ className, children, sx, ...props }, ref) => {
    return (
      <Card
        ref={ref}
        className={className}
        sx={{
          borderRadius: "12px",
          border: "1px solid rgba(0, 0, 0, 0.08)",
          boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
          transition: "all 0.3s ease",
          "&:hover": {
            boxShadow: "0 8px 30px rgba(0, 0, 0, 0.1)",
            transform: "translateY(-2px)",
          },
          ...sx,
        }}
        {...props}
      >
        {children}
      </Card>
    );
  }
);

export { CardContent, CardHeader, CardTitle };
