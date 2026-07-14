import { Input as MuiInput, InputProps as MuiInputProps, OutlinedInput } from "@mui/material";
import { forwardRef } from "react";

export interface InputProps extends Omit<MuiInputProps, "classes"> {
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, sx, ...props }, ref) => {
    return (
      <OutlinedInput
        ref={ref}
        className={className}
        error={error}
        sx={{
          backgroundColor: "white",
          borderRadius: "8px",
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: "rgba(0, 0, 0, 0.12)",
            borderWidth: "1px",
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: "#007A3D",
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: "#007A3D",
            borderWidth: "2px",
          },
          ...sx,
        }}
        {...props}
      />
    );
  }
);

Input.displayName = "MuiInput";
