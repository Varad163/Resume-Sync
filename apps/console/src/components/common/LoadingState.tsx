export interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = "Loading data..." }: LoadingStateProps) {
  return (
    <div className="loading-state-container" style={{ padding: "40px 0", textAlign: "center", color: "var(--text-muted)" }}>
      <div className="spinner" style={{ margin: "0 auto 12px" }} />
      <span>{message}</span>
    </div>
  );
}
