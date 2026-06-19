import MapView from './components/MapView.jsx';
import FilterPanel from './components/FilterPanel.jsx';
import { useEarthquakeQuery } from './hooks/useEarthquakeQuery.js';
import { useClusterPanel, ClusterPanelOpenContext } from './hooks/useClusterPanel.js';

export default function App() {
  const query = useEarthquakeQuery(),
    panel = useClusterPanel();
  const isClusterOpen = panel.panelLeaves !== null,
    closePanel = () => panel.resetPanel();
  return (
    <ClusterPanelOpenContext.Provider value={isClusterOpen}>
      <FilterPanel
        status={query.status}
        criteria={query.criteria}
        errors={query.errors}
        errorMessage={query.errorMessage}
        onSubmit={query.submit}
        onCloseClusterPanel={closePanel}
      />
      <MapView
        earthquakes={query.earthquakes}
        panelLeaves={panel.panelLeaves}
        loadClusterLeaves={panel.loadClusterLeaves}
        onClosePanel={closePanel}
        resetPanel={panel.resetPanel}
      />
    </ClusterPanelOpenContext.Provider>
  );
}
