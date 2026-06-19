import type { FormEvent } from 'react';
import type { FilterInput, FilterErrors } from '../types/index.js';

type ChangeHandler = (name: keyof FilterInput, value: string) => void;

interface DateFieldProps {
  label: string;
  name: keyof FilterInput;
  value: string;
  error: string | undefined;
  onChange: ChangeHandler;
  disabled: boolean;
}

interface MagnitudeFieldProps {
  value: string;
  error: string | undefined;
  onChange: ChangeHandler;
  disabled: boolean;
}

interface FilterFormProps {
  values: FilterInput;
  errors: FilterErrors;
  onChange: ChangeHandler;
  onSubmit: (values: FilterInput) => void;
  disabled: boolean;
}

function DateField({ label, name, value, error, onChange, disabled }: DateFieldProps) {
  return (
    <div className="flex flex-col gap-1 mb-3">
      <label htmlFor={name} className="text-[13px] font-semibold">
        {label}
      </label>
      <input
        type="date"
        id={name}
        className="py-1.5 px-2 border border-[#ccc] rounded text-sm"
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
        disabled={disabled}
      />
      {error && <span className="text-xs text-[#c0392b]">{error}</span>}
    </div>
  );
}

function MagnitudeField({ value, error, onChange, disabled }: MagnitudeFieldProps) {
  return (
    <div className="flex flex-col gap-1 mb-3">
      <label htmlFor="minMagnitude" className="text-[13px] font-semibold">
        Min magnitude
      </label>
      <input
        type="number"
        id="minMagnitude"
        min="0"
        max="10"
        step="0.1"
        className="py-1.5 px-2 border border-[#ccc] rounded text-sm"
        value={value}
        onChange={(e) => onChange('minMagnitude', e.target.value)}
        disabled={disabled}
      />
      {error && <span className="text-xs text-[#c0392b]">{error}</span>}
    </div>
  );
}

const BTN_CLS =
  'w-full p-2 bg-[#2c3e50] text-white border-0 rounded text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

export default function FilterForm({
  values,
  errors,
  onChange,
  onSubmit,
  disabled,
}: FilterFormProps) {
  // prettier-ignore
  const date = (l: string, n: keyof FilterInput) => ({ label: l, name: n, value: values[n], error: errors[n], onChange, disabled });
  const magn = { value: values.minMagnitude, error: errors.minMagnitude, onChange, disabled };
  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onSubmit(values);
  }
  return (
    <form onSubmit={handleSubmit}>
      <DateField {...date('Start date', 'starttime')} />
      <DateField {...date('End date', 'endtime')} />
      <MagnitudeField {...magn} />
      <button type="submit" disabled={disabled} className={BTN_CLS}>
        Search
      </button>
    </form>
  );
}
