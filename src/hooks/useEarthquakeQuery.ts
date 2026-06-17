import { useState, useRef, Dispatch, SetStateAction } from 'react';
import { validateFilters } from '../lib/validation.js';
import { fetchCount, fetchEarthquakes } from '../lib/api.js';
import { toEarthquakes } from '../lib/mappers.js';
import { toUserMessage, TOO_MANY_RESULTS } from '../lib/errorMessages.js';
import type {
  Earthquake,
  FilterCriteria,
  FilterErrors,
  FilterInput,
  FetchStatus,
} from '../types/index.js';

interface QueryState {
  status: FetchStatus;
  earthquakes: Earthquake[];
  criteria: FilterCriteria | null;
  errors: FilterErrors;
  errorMessage: string | null;
}

const INITIAL: QueryState = {
  status: 'idle',
  earthquakes: [],
  criteria: null,
  errors: {},
  errorMessage: null,
};

export function branchOnCount(count: number): 'tooMany' | 'empty' | 'fetch' {
  if (count > 20_000) return 'tooMany';
  if (count === 0) return 'empty';
  return 'fetch';
}

export function loadingState(criteria: FilterCriteria): QueryState {
  return { ...INITIAL, status: 'loading', criteria };
}

function errorState(
  criteria: FilterCriteria,
  error: unknown,
): Pick<QueryState, 'status' | 'criteria' | 'errorMessage'> {
  return { status: 'error', criteria, errorMessage: toUserMessage(error) };
}

function resultFromData(
  data: Parameters<typeof toEarthquakes>[0],
): Pick<QueryState, 'status' | 'earthquakes'> {
  const { earthquakes } = toEarthquakes(data);
  return earthquakes.length > 0
    ? { status: 'success', earthquakes }
    : { status: 'empty', earthquakes: [] };
}

function applyBranch(
  branch: 'tooMany' | 'empty',
  criteria: FilterCriteria,
  setState: Dispatch<SetStateAction<QueryState>>,
): void {
  if (branch === 'tooMany') {
    setState((s) => ({ ...s, ...errorState(criteria, TOO_MANY_RESULTS) }));
  } else {
    setState((s) => ({ ...s, status: 'empty', criteria, earthquakes: [] }));
  }
}

// requestId guards both count and query legs; stale responses from either are discarded.
// This coordination is validated by inspection — @testing-library/react is not in this project.
async function runQuery(
  criteria: FilterCriteria,
  id: number,
  reqId: { current: number },
  setState: Dispatch<SetStateAction<QueryState>>,
): Promise<void> {
  try {
    const count = await fetchCount(criteria);
    if (reqId.current !== id) return;
    const branch = branchOnCount(count);
    if (branch !== 'fetch') {
      applyBranch(branch, criteria, setState);
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
  const [state, setState] = useState<QueryState>(INITIAL);
  const reqId = useRef(0);

  function submit(raw: FilterInput): void {
    const { valid, errors } = validateFilters(raw);
    if (!valid) {
      setState((s) => ({ ...s, errors }));
      return;
    }
    const criteria: FilterCriteria = { ...raw, minMagnitude: Number(raw.minMagnitude) };
    const id = ++reqId.current;
    setState(loadingState(criteria));
    void runQuery(criteria, id, reqId, setState);
  }

  function retry(): void {
    const { criteria } = state;
    if (!criteria) return;
    const id = ++reqId.current;
    setState(loadingState(criteria));
    void runQuery(criteria, id, reqId, setState);
  }

  const { status, earthquakes, criteria, errors, errorMessage } = state;
  return { status, earthquakes, criteria, errors, errorMessage, submit, retry };
}
