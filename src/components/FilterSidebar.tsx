import StatusBanner from './StatusBanner.jsx';
import FilterForm from './FilterForm.jsx';
import type { FetchStatus, FilterErrors, FilterInput } from '../types/index.js';

interface FilterSidebarProps {
  cls: string;
  status: FetchStatus;
  errorMessage: string | null;
  fp: {
    values: FilterInput;
    errors: FilterErrors;
    onChange: (name: keyof FilterInput, value: string) => void;
    onSubmit: (values: FilterInput) => void;
    disabled: boolean;
  };
}

export default function FilterSidebar({ cls, status, errorMessage, fp }: FilterSidebarProps) {
  return (
    <div
      className={`hidden sm:block absolute top-4 left-4 z-[1] bg-white rounded-lg p-4 w-[300px] shadow-[0_2px_8px_rgba(0,0,0,0.2)] ${cls}`}
    >
      <StatusBanner status={status} errorMessage={errorMessage} />
      <FilterForm {...fp} />
    </div>
  );
}
