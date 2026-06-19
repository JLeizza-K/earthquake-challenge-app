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

function useFilterPanelState(
  criteria: FilterCriteria | null,
  status: FetchStatus,
  isClusterOpen: boolean,
) {
  const [values, setValues] = useState<FilterInput>(EMPTY_VALUES);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  useEffect(() => {
    if (criteria) setValues(toValues(criteria));
  }, [criteria]);
  useEffect(() => {
    if (isClusterOpen) setIsDrawerOpen(false);
  }, [isClusterOpen]);
  useEffect(() => {
    if (isTerminal(status)) setIsDrawerOpen(false);
  }, [status]);
  return { values, setValues, isDrawerOpen, setIsDrawerOpen };
}

export default function FilterPanel(props: FilterPanelProps) {
  const { status, criteria, errors, errorMessage, onSubmit, onCloseClusterPanel } = props;
  const isClusterOpen = useContext(ClusterPanelOpenContext);
  const { values, setValues, isDrawerOpen, setIsDrawerOpen } = useFilterPanelState(
    criteria,
    status,
    isClusterOpen,
  );
  const closeDrawer = () => setIsDrawerOpen(false);
  const v = getViewport();
  const hide = v.isMedium && isClusterOpen;
  const cls = hide ? 'invisible pointer-events-none' : '';
  const onFieldChange = (f: keyof FilterInput, vl: string) => setValues((p) => ({ ...p, [f]: vl }));
  const formProps = {
    values,
    errors,
    onChange: onFieldChange,
    onSubmit,
    disabled: status === 'loading',
  };
  const toggle = () => {
    onCloseClusterPanel?.();
    setIsDrawerOpen((p) => !p);
  };
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
