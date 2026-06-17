import type { FetchStatus } from '../types/index.js';

interface ErrorMessageProps {
  message: string | null;
  onRetry: () => void;
}

interface StatusBannerProps {
  status: FetchStatus;
  errorMessage: string | null;
  onRetry: () => void;
}

function LoadingOverlay() {
  return (
    <div className="status-overlay">
      <span>Loading…</span>
    </div>
  );
}

function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  return (
    <div className="status-message status-message--error">
      <p>{message}</p>
      <button type="button" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}

export default function StatusBanner({ status, errorMessage, onRetry }: StatusBannerProps) {
  if (status === 'loading') return <LoadingOverlay />;
  if (status === 'empty') {
    return <p className="status-message status-message--empty">No earthquakes found</p>;
  }
  if (status === 'error') {
    return <ErrorMessage message={errorMessage} onRetry={onRetry} />;
  }
  return null;
}
