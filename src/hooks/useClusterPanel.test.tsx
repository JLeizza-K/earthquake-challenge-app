// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act, useContext } from 'react';
import { ClusterPanelOpenContext } from './useClusterPanel.js';

function render(el: React.ReactElement) {
  const div = document.createElement('div');
  const root: Root = createRoot(div);
  act(() => root.render(el));
  return { root, container: div };
}

function Consumer() {
  const value = useContext(ClusterPanelOpenContext);
  return <div>{String(value)}</div>;
}

describe('ClusterPanelOpenContext', () => {
  it('defaults to false', () => {
    const { container } = render(<Consumer />);
    expect(container.textContent).toBe('false');
  });

  it('receives true from a Provider with value={true}', () => {
    const { container } = render(
      <ClusterPanelOpenContext.Provider value={true}>
        <Consumer />
      </ClusterPanelOpenContext.Provider>,
    );
    expect(container.textContent).toBe('true');
  });
});
