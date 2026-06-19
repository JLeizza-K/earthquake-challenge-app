import MapView from './components/MapView.jsx';
import FilterPanel from './components/FilterPanel.jsx';
import { useEarthquakeQuery } from './hooks/useEarthquakeQuery.js';
import { useClusterPanel, ClusterPanelOpenContext } from './hooks/useClusterPanel.js';

export default function App() {
  const q = useEarthquakeQuery(),
    u = useClusterPanel();
  const isClusterOpen = u.panelLeaves !== null,
    onClose = () => u.resetPanel();
  return (
    <ClusterPanelOpenContext.Provider value={isClusterOpen}>
      <FilterPanel
        status={q.status}
        criteria={q.criteria}
        errors={q.errors}
        errorMessage={q.errorMessage}
        onSubmit={q.submit}
        onCloseClusterPanel={onClose}
      />
      <MapView
        earthquakes={q.earthquakes}
        panelLeaves={u.panelLeaves}
        loadClusterLeaves={u.loadClusterLeaves}
        onClosePanel={onClose}
        resetPanel={u.resetPanel}
      />
    </ClusterPanelOpenContext.Provider>
  );
}
