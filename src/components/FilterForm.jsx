function DateField({ label, name, value, error, onChange, disabled }) {
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <input
        type="date"
        id={name}
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
        disabled={disabled}
      />
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}

function MagnitudeField({ value, error, onChange, disabled }) {
  return (
    <div className="field">
      <label htmlFor="minMagnitude">Min magnitude</label>
      <input
        type="number"
        id="minMagnitude"
        min="0"
        max="10"
        step="0.1"
        value={value}
        onChange={(e) => onChange('minMagnitude', e.target.value)}
        disabled={disabled}
      />
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}

function DateFields({ values, errors, onChange, disabled }) {
  return (
    <>
      <DateField
        label="Start date"
        name="starttime"
        value={values.starttime}
        error={errors.starttime}
        onChange={onChange}
        disabled={disabled}
      />
      <DateField
        label="End date"
        name="endtime"
        value={values.endtime}
        error={errors.endtime}
        onChange={onChange}
        disabled={disabled}
      />
    </>
  );
}

function FormFields({ values, errors, onChange, disabled }) {
  const shared = { onChange, disabled };
  return (
    <>
      <DateFields values={values} errors={errors} {...shared} />
      <MagnitudeField value={values.minMagnitude} error={errors.minMagnitude} {...shared} />
    </>
  );
}

export default function FilterForm({ values, errors, onChange, onSubmit, disabled }) {
  function handleSubmit(e) {
    e.preventDefault();
    onSubmit(values);
  }
  return (
    <form onSubmit={handleSubmit}>
      <FormFields values={values} errors={errors} onChange={onChange} disabled={disabled} />
      <button type="submit" disabled={disabled}>
        Search
      </button>
    </form>
  );
}
