import { useState } from 'react';
import FilterForm from './FilterForm.jsx';
import StatusBanner from './StatusBanner.jsx';

const EMPTY_VALUES = { starttime: '', endtime: '', minMagnitude: '' };

function toValues(criteria) {
  return {
    starttime: criteria.starttime,
    endtime: criteria.endtime,
    minMagnitude: String(criteria.minMagnitude),
  };
}

function renderPanel(bannerProps, formProps) {
  return (
    <div className="filter-panel">
      <StatusBanner {...bannerProps} />
      <FilterForm {...formProps} />
    </div>
  );
}

export default function FilterPanel(props) {
  const { status, criteria, errors, errorMessage, onSubmit, onRetry } = props;
  const [values, setValues] = useState(EMPTY_VALUES);
  const [prevCriteria, setPrevCriteria] = useState(null);

  // Sync form to last submitted criteria during render (React-recommended pattern over useEffect for state-to-state sync)
  if (criteria !== prevCriteria) {
    setPrevCriteria(criteria);
    if (criteria) setValues(toValues(criteria));
  }

  function handleChange(field, value) {
    setValues((prev) => ({ ...prev, [field]: value }));
  }

  const bannerProps = { status, errorMessage, onRetry };
  const formProps = {
    values,
    errors,
    onChange: handleChange,
    onSubmit,
    disabled: status === 'loading',
  };
  return renderPanel(bannerProps, formProps);
}
