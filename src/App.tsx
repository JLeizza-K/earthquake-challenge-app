import MapView from './components/MapView.jsx';
import FilterPanel from './components/FilterPanel.jsx';
import { useEarthquakeQuery } from './hooks/useEarthquakeQuery.js';

export default function App() {
  const { status, earthquakes, criteria, errors, errorMessage, submit, retry } =
    useEarthquakeQuery();

  return (
    <div className="relative w-full h-screen">
      <FilterPanel
        status={status}
        criteria={criteria}
        errors={errors}
        errorMessage={errorMessage}
        onSubmit={submit}
        onRetry={retry}
      />
      <MapView earthquakes={earthquakes} />
    </div>
  );
}
