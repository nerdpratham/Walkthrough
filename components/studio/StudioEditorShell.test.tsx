import { render, screen, fireEvent } from '@testing-library/react';
import { TourConfigSchema, type TourConfig } from '@/lib/types';

// The shell renders a PSV viewer and several heavy panels; none are needed to
// exercise the rename. Mock them to nothing so the shell mounts in jsdom, but
// keep the real StudioTopBar — that's where the rename interaction happens.
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('./StudioViewer', () => ({ StudioViewer: () => null }));
jest.mock('./SceneNavigator', () => ({ SceneNavigator: () => null }));
jest.mock('./InspectorPanel', () => ({ InspectorPanel: () => null }));
jest.mock('./CalibrationStrip', () => ({ CalibrationStrip: () => null }));
jest.mock('./PanoramaUploader', () => ({ PanoramaUploader: () => null }));

import { StudioEditorShell } from './StudioEditorShell';

const config: TourConfig = TourConfigSchema.parse({
  meta: { title: 'Old Name', site: '', startScene: 's1' },
  zones: [{ id: 'main', label: 'Main' }],
  scenes: [{ id: 's1', label: 'Scene 1', zone: 'main', panorama: 'a.jpg' }],
});

const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) });

beforeEach(() => {
  fetchMock.mockClear();
  global.fetch = fetchMock as unknown as typeof fetch;
});

test('renaming the tour in the editor persists immediately via PATCH', () => {
  render(<StudioEditorShell slug="tour-1" initialConfig={config} />);

  // Double-click the title in the top bar, type a new name, press Enter.
  fireEvent.doubleClick(screen.getByText('Old Name'));
  const input = screen.getByDisplayValue('Old Name');
  fireEvent.change(input, { target: { value: 'Renamed Tour' } });
  fireEvent.keyDown(input, { key: 'Enter' });

  // The rename must hit the server right away — not wait for an explicit Save.
  expect(fetchMock).toHaveBeenCalledWith(
    '/api/studio/tours/tour-1',
    expect.objectContaining({
      method: 'PATCH',
      body: JSON.stringify({ title: 'Renamed Tour' }),
    }),
  );
});
