import type { HTMLAttributes, ReactNode } from "react";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  elevated?: boolean;
}

export function Card({ children, className = "", elevated = false, ...props }: CardProps) {
  return (
    <div className={`card ${elevated ? "elevated" : ""} ${className}`} {...props}>
      {children}
    </div>
  );
}
