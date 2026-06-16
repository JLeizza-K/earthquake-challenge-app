function isValidDate(str) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  return !isNaN(new Date(`${str}T00:00:00`).getTime());
}

function validateDateField(value, label) {
  if (!value) return `${label} is required.`;
  if (!isValidDate(value)) return `${label} must be a valid date (YYYY-MM-DD).`;
  if (value > new Date().toISOString().slice(0, 10)) return `${label} cannot be in the future.`;
  return null;
}

function validateMagnitude(value) {
  if (value === '' || value === null || value === undefined)
    return 'Minimum magnitude is required.';
  const mag = Number(value);
  if (isNaN(mag)) return 'Minimum magnitude must be a number.';
  if (mag < 0 || mag > 10) return 'Minimum magnitude must be between 0 and 10.';
  return null;
}

export function validateFilters(criteria) {
  const { starttime, endtime, minMagnitude } = criteria;
  const errors = {};

  const startErr = validateDateField(starttime, 'Start date');
  if (startErr) errors.starttime = startErr;

  const endErr = validateDateField(endtime, 'End date');
  if (endErr) errors.endtime = endErr;

  if (!errors.starttime && !errors.endtime && starttime > endtime) {
    errors.starttime = 'Start date must be on or before end date.';
  }

  const magErr = validateMagnitude(minMagnitude);
  if (magErr) errors.minMagnitude = magErr;

  return { valid: Object.keys(errors).length === 0, errors };
}
