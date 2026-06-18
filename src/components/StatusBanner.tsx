import type { FetchStatus } from '../types/index.js';

interface StatusBannerProps {
  status: FetchStatus;
  errorMessage: string | null;
}

function LoadingOverlay() {
  return (
    <div className="absolute inset-0 bg-[rgba(200,200,200,0.7)] flex items-center justify-center rounded-lg z-[2] font-semibold">
      <span>Loading…</span>
    </div>
  );
}

function ErrorMessage({ message }: { message: string | null }) {
  return (
    <div className="mb-3 p-2 rounded text-[13px] bg-[#fdedec] text-[#922b21]">
      <p className="mb-2">{message}</p>
    </div>
  );
}

export default function StatusBanner({ status, errorMessage }: StatusBannerProps) {
  if (status === 'loading') return <LoadingOverlay />;
  if (status === 'empty') {
    return (
      <p className="mb-3 p-2 rounded text-[13px] bg-[#eaf4fb] text-[#1a5276]">
        No earthquakes found
      </p>
    );
  }
  if (status === 'error') {
    return <ErrorMessage message={errorMessage} />;
  }
  return null;
}
