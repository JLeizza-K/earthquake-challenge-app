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

function applyToggle(
  onClose: (() => void) | undefined,
  set: React.Dispatch<React.SetStateAction<boolean>>,
): void {
  onClose?.();
  set((prev) => !prev);
}

function useFilterPanelState(
  criteria: FilterCriteria | null,
  status: FetchStatus,
  isClusterOpen: boolean,
  errors: FilterErrors,
  onSubmit: (raw: FilterInput) => void,
) {
  const [values, setValues] = useState<FilterInput>(EMPTY_VALUES);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- populate form from submitted criteria; no cascade risk
    if (criteria) setValues(toValues(criteria));
  }, [criteria]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- close drawer when cluster opens; no cascade risk
    if (isClusterOpen) setIsDrawerOpen(false);
  }, [isClusterOpen]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- close drawer after fetch completes; no cascade risk
    if (isTerminal(status)) setIsDrawerOpen(false);
  }, [status]);
  const onChange = (f: keyof FilterInput, vl: string) => setValues((p) => ({ ...p, [f]: vl }));
  const formProps = { values, errors, onChange, onSubmit, disabled: status === 'loading' };
  return { isDrawerOpen, setIsDrawerOpen, closeDrawer: () => setIsDrawerOpen(false), formProps };
}

export default function FilterPanel(props: FilterPanelProps) {
  const { status, criteria, errors, errorMessage, onSubmit, onCloseClusterPanel } = props;
  const isClusterOpen = useContext(ClusterPanelOpenContext);
  const state = useFilterPanelState(criteria, status, isClusterOpen, errors, onSubmit);
  const { isDrawerOpen, setIsDrawerOpen, closeDrawer, formProps } = state;
  const v = getViewport();
  const hide = v.isMedium && isClusterOpen;
  const cls = hide ? 'invisible pointer-events-none' : '';
  const toggle = () => applyToggle(onCloseClusterPanel, setIsDrawerOpen);
  return (
    <>
      <HamburgerBtn show={v.isNarrow || hide} onToggle={toggle} />
      <FilterSidebar cls={cls} status={status} errorMessage={errorMessage} fp={formProps} />
      {isDrawerOpen && (
        <FilterDrawer
          status={status}
          errorMessage={errorMessage}
          fp={formProps}
          onClose={closeDrawer}
        />
      )}
    </>
  );
}
