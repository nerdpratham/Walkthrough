import { render, waitFor } from '@testing-library/react';
import type { TourConfig } from '@/lib/types';
import { TourViewer } from './TourViewer';

const mockVirtualTourPlugin = function VirtualTourPlugin() {};
const mockMarkersPlugin = function MarkersPlugin() {};
const mockVt = {
  setNodes: jest.fn(),
  setCurrentNode: jest.fn(),
  addEventListener: jest.fn(),
};
const mockMarkers = {
  addEventListener: jest.fn(),
};
const mockViewer = {
  getPlugin: jest.fn((plugin) => {
    if (plugin === mockVirtualTourPlugin) return mockVt;
    if (plugin === mockMarkersPlugin) return mockMarkers;
    return null;
  }),
  addEventListener: jest.fn(),
  destroy: jest.fn(),
  rotate: jest.fn(),
  getZoomLevel: jest.fn(() => 50),
};
const mockViewerConstructor = jest.fn(() => mockViewer);

jest.mock('@photo-sphere-viewer/core', () => ({
  Viewer: mockViewerConstructor,
}));

jest.mock('@photo-sphere-viewer/virtual-tour-plugin', () => ({
  VirtualTourPlugin: mockVirtualTourPlugin,
}));

jest.mock('@photo-sphere-viewer/markers-plugin', () => ({
  MarkersPlugin: mockMarkersPlugin,
}));

const config: TourConfig = {
  meta: {
    title: 'Demo',
    site: 'Site',
    startScene: 'scene1',
    floorPlan: false,
    transition: {
      effect: 'walk-in',
      speedMs: 900,
      rotation: false,
      zoomToHotspot: true,
      zoomLevel: 55,
      blendMs: 500,
      lockInput: true,
    },
    nadir: {
      enabled: false,
      size: 360,
      opacity: 0.9,
    },
  },
  zones: [{ id: 'main', label: 'Main' }],
  scenes: [
    {
      id: 'scene1',
      label: 'Scene 1',
      zone: 'main',
      panorama: '/tours/demo/panoramas/scene1.jpg',
      defaultYaw: 0,
      defaultPitch: 0,
      links: [],
      infoMarkers: [],
    },
  ],
};

const noop = () => {};

beforeEach(() => {
  jest.clearAllMocks();
});

test('initializes the PSV viewer before the start screen is dismissed', async () => {
  render(
    <TourViewer
      config={config}
      initialSceneId="scene1"
      onSceneChange={noop}
      onTransitionStart={noop}
      onTransitionEnd={noop}
      onBackReady={noop}
      registerGoBack={noop}
      registerSelectScene={noop}
      isStarted={false}
      onHoverInfoMarker={noop}
      onOpenInfoMarker={noop}
    />
  );

  await waitFor(() => expect(mockViewerConstructor).toHaveBeenCalledTimes(1));

  expect(mockVt.setNodes).toHaveBeenCalledWith(
    expect.arrayContaining([
      expect.objectContaining({
        id: 'scene1',
        panorama: '/tours/demo/panoramas/scene1.jpg',
      }),
    ]),
    'scene1'
  );
});

test('marks the viewer as pre-start while it initializes behind the start screen', () => {
  const { container, rerender } = render(
    <TourViewer
      config={config}
      initialSceneId="scene1"
      onSceneChange={noop}
      onTransitionStart={noop}
      onTransitionEnd={noop}
      onBackReady={noop}
      registerGoBack={noop}
      registerSelectScene={noop}
      isStarted={false}
      onHoverInfoMarker={noop}
      onOpenInfoMarker={noop}
    />
  );

  expect(container.firstElementChild).toHaveClass('tour-viewer-prestart');

  rerender(
    <TourViewer
      config={config}
      initialSceneId="scene1"
      onSceneChange={noop}
      onTransitionStart={noop}
      onTransitionEnd={noop}
      onBackReady={noop}
      registerGoBack={noop}
      registerSelectScene={noop}
      isStarted={true}
      onHoverInfoMarker={noop}
      onOpenInfoMarker={noop}
    />
  );

  expect(container.firstElementChild).not.toHaveClass('tour-viewer-prestart');
});
