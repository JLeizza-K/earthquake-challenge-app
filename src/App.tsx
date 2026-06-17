import MapView from './components/MapView.jsx';
import FilterPanel from './components/FilterPanel.jsx';
import { useEarthquakeQuery } from './hooks/useEarthquakeQuery.js';
import './App.css';

export default function App() {
  const { status, earthquakes, criteria, errors, errorMessage, submit, retry } =
    useEarthquakeQuery();

  return (
    <div className="app">
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
