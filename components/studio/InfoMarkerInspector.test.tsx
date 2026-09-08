import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { updateInfoMarker } from '@/lib/studio/editor-state';
import { TourConfigSchema, type TourConfig } from '@/lib/types';
import { InfoMarkerInspector } from './InfoMarkerInspector';

const initialConfig: TourConfig = TourConfigSchema.parse({
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
      body: 'Original body',
    }],
  }],
});

const fetchMock = jest.fn();

function InspectorHarness({ onConfigChangeSpy = jest.fn() }: { onConfigChangeSpy?: jest.Mock }) {
  const [config, setConfig] = useState(initialConfig);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>('marker-1');

  const applyConfig = (next: TourConfig) => {
    onConfigChangeSpy(next);
    setConfig(next);
  };
  const applyMarkerAsset = (
    sceneId: string,
    markerId: string,
    field: 'imageUrl' | 'documentUrl',
    url: string,
  ) => {
    setConfig((current) => {
      const markerStillExists = current.scenes
        .find((scene) => scene.id === sceneId)
        ?.infoMarkers?.some((marker) => marker.id === markerId);
      if (!markerStillExists) return current;

      const patch = field === 'imageUrl' ? { imageUrl: url } : { documentUrl: url };
      const next = updateInfoMarker(current, sceneId, markerId, patch);
      onConfigChangeSpy(next);
      return next;
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setConfig((current) => updateInfoMarker(
          current,
          'scene-1',
          'marker-1',
          { body: 'Concurrent body' },
        ))}
      >
        Make concurrent edit
      </button>
      <output data-testid="markers">
        {JSON.stringify(config.scenes[0].infoMarkers ?? [])}
      </output>
      <InfoMarkerInspector
        slug="office-demo"
        config={config}
        sceneId="scene-1"
        selectedMarkerId={selectedMarkerId}
        currentYaw={0}
        currentPitch={0}
        isPlacingInfoMarker={false}
        onConfigChange={applyConfig}
        onSelectMarker={setSelectedMarkerId}
        onStartPlace={jest.fn()}
        onMarkerAssetChange={applyMarkerAsset}
      />
    </>
  );
}

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
});

test('applies an upload result to the latest config without losing concurrent edits', async () => {
  let resolveUpload!: (value: unknown) => void;
  fetchMock.mockReturnValue(new Promise((resolve) => { resolveUpload = resolve; }));
  render(<InspectorHarness />);

  fireEvent.change(screen.getByLabelText('Upload Image URL'), {
    target: { files: [new File(['photo'], 'photo.jpg', { type: 'image/jpeg' })] },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Make concurrent edit' }));
  expect(screen.getByDisplayValue('Concurrent body')).toBeVisible();

  resolveUpload({
    ok: true,
    json: async () => ({ url: '/tours/office-demo/markers/photo.jpg' }),
  });

  await waitFor(() => {
    expect(screen.getByLabelText('Image URL')).toHaveValue('/tours/office-demo/markers/photo.jpg');
  });
  expect(screen.getByDisplayValue('Concurrent body')).toBeVisible();
});

test('ignores an upload result when its original marker was deleted', async () => {
  let resolveUpload!: (value: unknown) => void;
  fetchMock.mockReturnValue(new Promise((resolve) => { resolveUpload = resolve; }));
  const onConfigChangeSpy = jest.fn();
  render(<InspectorHarness onConfigChangeSpy={onConfigChangeSpy} />);

  fireEvent.change(screen.getByLabelText('Upload Image URL'), {
    target: { files: [new File(['photo'], 'photo.jpg', { type: 'image/jpeg' })] },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
  expect(screen.getByTestId('markers')).toHaveTextContent('[]');
  expect(onConfigChangeSpy).toHaveBeenCalledTimes(1);

  await act(async () => {
    resolveUpload({
      ok: true,
      json: async () => ({ url: '/tours/office-demo/markers/photo.jpg' }),
    });
  });

  expect(screen.getByTestId('markers')).toHaveTextContent('[]');
  expect(onConfigChangeSpy).toHaveBeenCalledTimes(1);
});
