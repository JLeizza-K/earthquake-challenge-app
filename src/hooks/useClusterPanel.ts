import { useState, useRef } from 'react';
import type { GeoJSONSource } from 'maplibre-gl';
import { mapLeavesToEarthquakes } from '../lib/clusterLeaves.js';
import type { Earthquake } from '../types/index.js';

export function useClusterPanel() {
  const [panelLeaves, setPanelLeaves] = useState<Earthquake[] | null>(null);
  const generationRef = useRef(0);

  function loadClusterLeaves(src: GeoJSONSource, clusterId: number): void {
    const gen = ++generationRef.current;
    void src.getClusterLeaves(clusterId, 500, 0).then((leaves) => {
      if (generationRef.current !== gen) return;
      setPanelLeaves(mapLeavesToEarthquakes(leaves));
    });
  }

  function resetPanel(): void {
    generationRef.current++;
    setPanelLeaves(null);
  }

  return { panelLeaves, setPanelLeaves, loadClusterLeaves, resetPanel };
}
