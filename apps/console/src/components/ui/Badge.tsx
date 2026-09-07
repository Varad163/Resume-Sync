import type { ReactNode } from "react";

export interface BadgeProps {
  variant?: "green" | "red" | "orange" | "yellow" | "blue" | "purple" | "gray";
  children: ReactNode;
  className?: string;
}

export function Badge({ variant = "gray", children, className = "" }: BadgeProps) {
  const badgeClasses: Record<string, string> = {
    green: "badge-green",
    red: "badge-red",
    orange: "badge-orange",
    yellow: "badge-yellow",
    blue: "badge-blue",
    purple: "badge-purple",
    gray: "badge-gray",
  };

  return (
    <span className={`${badgeClasses[variant] || "badge-gray"} ${className}`}>
      {children}
    </span>
  );
}
