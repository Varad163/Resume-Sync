import type { ButtonHTMLAttributes, ReactNode } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  children,
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  const sizeClass = size === "sm" ? "sm" : size === "lg" ? "lg" : "";
  const fullClassName = `btn ${variant} ${sizeClass} ${className}`.trim();

  return (
    <button type={type} className={fullClassName} {...props}>
      {children}
    </button>
  );
}
