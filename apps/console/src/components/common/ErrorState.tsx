
export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ title = "Unable to load data", message, onRetry }: ErrorStateProps) {
  return (
    <div className="banner alert-error" style={{ margin: "20px 0" }}>
      <div>
        <b>{title}:</b> {message}
      </div>
      {onRetry && (
        <button
          type="button"
          className="btn ghost sm"
          style={{ marginTop: 8 }}
          onClick={onRetry}
        >
          Retry
        </button>
      )}
    </div>
  );
}
