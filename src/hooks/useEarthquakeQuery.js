import { useState, useRef } from 'react';
import { validateFilters } from '../lib/validation.js';
import { fetchCount, fetchEarthquakes } from '../lib/api.js';
import { toEarthquakes } from '../lib/mappers.js';
import { toUserMessage, TOO_MANY_RESULTS } from '../lib/errorMessages.js';

const INITIAL = {
  status: 'idle',
  earthquakes: [],
  criteria: null,
  errors: {},
  errorMessage: null,
};

export function branchOnCount(count) {
  if (count > 20_000) return 'tooMany';
  if (count === 0) return 'empty';
  return 'fetch';
}

export function loadingState(criteria) {
  return { ...INITIAL, status: 'loading', criteria };
}

function errorState(criteria, error) {
  return { status: 'error', criteria, errorMessage: toUserMessage(error) };
}

function resultFromData(data) {
  const { earthquakes } = toEarthquakes(data);
  return earthquakes.length > 0
    ? { status: 'success', earthquakes }
    : { status: 'empty', earthquakes: [] };
}

// requestId guards both count and query legs; stale responses from either are discarded.
// This coordination is validated by inspection — @testing-library/react is not in this project.
async function runQuery(criteria, id, reqId, setState) {
  try {
    const count = await fetchCount(criteria);
    if (reqId.current !== id) return;
    const branch = branchOnCount(count);
    if (branch === 'tooMany') {
      setState((s) => ({ ...s, ...errorState(criteria, TOO_MANY_RESULTS) }));
      return;
    }
    if (branch === 'empty') {
      setState((s) => ({ ...s, status: 'empty', criteria, earthquakes: [] }));
      return;
    }
    const data = await fetchEarthquakes(criteria);
    if (reqId.current !== id) return;
    setState((s) => ({ ...s, ...resultFromData(data), criteria }));
  } catch (err) {
    if (reqId.current !== id) return;
    setState((s) => ({ ...s, ...errorState(criteria, err) }));
  }
}

export function useEarthquakeQuery() {
  const [state, setState] = useState(INITIAL);
  const reqId = useRef(0);

  function submit(raw) {
    const { valid, errors } = validateFilters(raw);
    if (!valid) {
      setState((s) => ({ ...s, errors }));
      return;
    }
    const criteria = { ...raw, minMagnitude: Number(raw.minMagnitude) };
    const id = ++reqId.current;
    setState(loadingState(criteria));
    runQuery(criteria, id, reqId, setState);
  }

  function retry() {
    const { criteria } = state;
    if (!criteria) return;
    const id = ++reqId.current;
    setState(loadingState(criteria));
    runQuery(criteria, id, reqId, setState);
  }

  const { status, earthquakes, criteria, errors, errorMessage } = state;
  return { status, earthquakes, criteria, errors, errorMessage, submit, retry };
}
