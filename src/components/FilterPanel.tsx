import { useState, useContext, useEffect } from 'react';
import HamburgerBtn from './HamburgerBtn.jsx';
import FilterSidebar from './FilterSidebar.jsx';
import FilterDrawer from './FilterDrawer.jsx';
import { ClusterPanelOpenContext } from '../hooks/useClusterPanel.js';
import type { FilterCriteria, FilterErrors, FilterInput, FetchStatus } from '../types/index.js';

interface FilterPanelProps {
  status: FetchStatus;
  criteria: FilterCriteria | null;
  errors: FilterErrors;
  errorMessage: string | null;
  onSubmit: (raw: FilterInput) => void;
  onCloseClusterPanel?: () => void;
}

const EMPTY_VALUES: FilterInput = { starttime: '', endtime: '', minMagnitude: '' };

function getViewport() {
  const w = window.innerWidth;
  return { isNarrow: w < 640, isMedium: w >= 640 && w < 1024 };
}

function isTerminal(s: FetchStatus) {
  return s === 'success' || s === 'empty' || s === 'error';
}

function toValues(criteria: FilterCriteria): FilterInput {
  return {
    starttime: criteria.starttime,
    endtime: criteria.endtime,
    minMagnitude: String(criteria.minMagnitude),
  };
}

export default function FilterPanel(props: FilterPanelProps) {
  const { status, criteria, errors, errorMessage, onSubmit, onCloseClusterPanel } = props;
  const [values, setValues] = useState<FilterInput>(EMPTY_VALUES);
  const [prevCriteria, setPrevCriteria] = useState<FilterCriteria | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const isClusterOpen = useContext(ClusterPanelOpenContext);
  if (criteria !== prevCriteria) setPrevCriteria(criteria);
  if (criteria !== prevCriteria && criteria) setValues(toValues(criteria));
  const close = () => setIsDrawerOpen(false);
  useEffect(() => void (isClusterOpen && queueMicrotask(close)), [isClusterOpen]);
  useEffect(() => void (isTerminal(status) && queueMicrotask(close)), [status]);
  // prettier-ignore
  const v = getViewport(), b = v.isMedium && isClusterOpen ? 'invisible pointer-events-none' : '';
  const ch = (f: keyof FilterInput, vl: string) => setValues((p) => ({ ...p, [f]: vl }));
  const fp = { values, errors, onChange: ch, onSubmit, disabled: status === 'loading' };
  const toggle = () => onCloseClusterPanel?.() || setIsDrawerOpen((p) => !p);
  return (
    <>
      <HamburgerBtn show={v.isNarrow || (v.isMedium && isClusterOpen)} onToggle={toggle} />
      <FilterSidebar cls={b} status={status} errorMessage={errorMessage} fp={fp} />
      {isDrawerOpen && (
        <FilterDrawer status={status} errorMessage={errorMessage} fp={fp} onClose={close} />
      )}
    </>
  );
}
