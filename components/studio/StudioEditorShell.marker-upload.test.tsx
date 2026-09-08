import { act, fireEvent, render, screen } from '@testing-library/react';
import { TourConfigSchema, type TourConfig } from '@/lib/types';

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('./StudioViewer', () => ({ StudioViewer: () => null }));
jest.mock('./SceneNavigator', () => ({ SceneNavigator: () => null }));
jest.mock('./CalibrationStrip', () => ({ CalibrationStrip: () => null }));
jest.mock('./PanoramaUploader', () => ({ PanoramaUploader: () => null }));
jest.mock('./StudioTopBar', () => ({ StudioTopBar: () => null }));

import { StudioEditorShell } from './StudioEditorShell';

const config: TourConfig = TourConfigSchema.parse({
  meta: { title: 'Office', site: '', startScene: 'scene-1' },
  zones: [{ id: 'main', label: 'Main' }],
  scenes: [{
    id: 'scene-1',
    label: 'Lobby',
    zone: 'main',
    panorama: 'lobby.jpg',
    infoMarkers: [{
      id: 'marker-1',
      yaw: 10,
      pitch: 2,
      enabled: true,
      title: 'Welcome',
    }],
  }],
});

const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
});

test('does not restore a deleted marker when its upload finishes with the inspector unmounted', async () => {
  let resolveUpload!: (value: unknown) => void;
  fetchMock.mockReturnValue(new Promise((resolve) => { resolveUpload = resolve; }));
  render(<StudioEditorShell slug="office-demo" initialConfig={config} />);

  fireEvent.click(screen.getByRole('button', { name: /Welcome/ }));
  fireEvent.change(screen.getByLabelText('Upload Image URL'), {
    target: { files: [new File(['photo'], 'photo.jpg', { type: 'image/jpeg' })] },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Incoming' }));
  fireEvent.keyDown(window, { key: 'Delete' });

  await act(async () => {
    resolveUpload({
      ok: true,
      json: async () => ({ url: '/tours/office-demo/markers/photo.jpg' }),
    });
  });

  fireEvent.click(screen.getByRole('button', { name: 'Scene' }));
  expect(screen.getByText('No info markers in this scene.')).toBeVisible();
});
