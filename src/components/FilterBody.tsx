import StatusBanner from './StatusBanner.jsx';
import FilterForm from './FilterForm.jsx';
import type { FetchStatus, FilterErrors, FilterInput } from '../types/index.js';

interface FilterFormProps {
  values: FilterInput;
  errors: FilterErrors;
  onChange: (name: keyof FilterInput, value: string) => void;
  onSubmit: (values: FilterInput) => void;
  disabled: boolean;
}

interface FilterBodyProps {
  status: FetchStatus;
  errorMessage: string | null;
  fp: FilterFormProps;
}

export default function FilterBody({ status, errorMessage, fp }: FilterBodyProps) {
  return (
    <>
      <StatusBanner status={status} errorMessage={errorMessage} />
      <FilterForm {...fp} />
    </>
  );
}
