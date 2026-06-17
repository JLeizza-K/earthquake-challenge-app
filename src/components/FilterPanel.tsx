import { useState } from 'react';
import FilterForm from './FilterForm.jsx';
import StatusBanner from './StatusBanner.jsx';
import type { FilterCriteria, FilterErrors, FilterInput, FetchStatus } from '../types/index.js';

interface FilterPanelProps {
  status: FetchStatus;
  criteria: FilterCriteria | null;
  errors: FilterErrors;
  errorMessage: string | null;
  onSubmit: (raw: FilterInput) => void;
  onRetry: () => void;
}

interface BannerRenderProps {
  status: FetchStatus;
  errorMessage: string | null;
  onRetry: () => void;
}

interface FormRenderProps {
  values: FilterInput;
  errors: FilterErrors;
  onChange: (name: keyof FilterInput, value: string) => void;
  onSubmit: (values: FilterInput) => void;
  disabled: boolean;
}

const EMPTY_VALUES: FilterInput = { starttime: '', endtime: '', minMagnitude: '' };

function toValues(criteria: FilterCriteria): FilterInput {
  return {
    starttime: criteria.starttime,
    endtime: criteria.endtime,
    minMagnitude: String(criteria.minMagnitude),
  };
}

function renderPanel(bannerProps: BannerRenderProps, formProps: FormRenderProps) {
  return (
    <div className="absolute top-4 left-4 z-[1] bg-white rounded-lg p-4 w-[300px] shadow-[0_2px_8px_rgba(0,0,0,0.2)]">
      <StatusBanner {...bannerProps} />
      <FilterForm {...formProps} />
    </div>
  );
}

export default function FilterPanel(props: FilterPanelProps) {
  const { status, criteria, errors, errorMessage, onSubmit, onRetry } = props;
  const [values, setValues] = useState<FilterInput>(EMPTY_VALUES);
  const [prevCriteria, setPrevCriteria] = useState<FilterCriteria | null>(null);

  // Sync form to last submitted criteria during render (React-recommended pattern over useEffect for state-to-state sync)
  if (criteria !== prevCriteria) {
    setPrevCriteria(criteria);
    if (criteria) setValues(toValues(criteria));
  }

  function handleChange(field: keyof FilterInput, value: string): void {
    setValues((prev) => ({ ...prev, [field]: value }));
  }

  return renderPanel(
    { status, errorMessage, onRetry },
    { values, errors, onChange: handleChange, onSubmit, disabled: status === 'loading' },
  );
}
