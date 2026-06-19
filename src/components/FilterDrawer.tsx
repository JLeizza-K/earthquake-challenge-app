import StatusBanner from './StatusBanner.jsx';
import FilterForm from './FilterForm.jsx';
import type { FetchStatus, FilterErrors, FilterInput } from '../types/index.js';

interface FilterDrawerProps {
  status: FetchStatus;
  errorMessage: string | null;
  fp: {
    values: FilterInput;
    errors: FilterErrors;
    onChange: (name: keyof FilterInput, value: string) => void;
    onSubmit: (values: FilterInput) => void;
    disabled: boolean;
  };
  onClose: () => void;
}

export default function FilterDrawer({ status, errorMessage, fp, onClose }: FilterDrawerProps) {
  return (
    <div className="fixed inset-0 z-20 bg-white p-4 pt-12 overflow-y-auto">
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute top-4 right-4 text-2xl text-gray-500"
      >
        ✕
      </button>
      <StatusBanner status={status} errorMessage={errorMessage} />
      <FilterForm {...fp} />
    </div>
  );
}
