import type { ReactNode } from "react";

export interface EmptyStateProps {
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className="empty">
      {icon && <div className="empty-icon-box">{icon}</div>}
      <h3>{title}</h3>
      {description && <div className="empty-description">{description}</div>}
      {action && <div className="empty-action" style={{ marginTop: 16 }}>{action}</div>}
    </div>
  );
}
