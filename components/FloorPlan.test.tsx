import { fireEvent, render, screen } from '@testing-library/react';
import type { TourConfig } from '@/lib/types';
import { FloorPlan } from './FloorPlan';

const config: TourConfig = {
  meta: {
    title: 'Demo',
    site: 'Demo Site',
    startScene: 'a',
    floorPlan: {
      image: '/floor.png',
      markers: [
        { sceneId: 'a', x: 10, y: 20, label: '1', size: 20 },
        { sceneId: 'b', x: 30, y: 40, label: '2', size: 20 },
      ],
    },
    transition: {
      effect: 'crossfade',
      speedMs: 900,
      rotation: true,
      zoomToHotspot: true,
      zoomLevel: 55,
      blendMs: 360,
      lockInput: true,
    },
    nadir: { enabled: false, size: 360, opacity: 0.9 },
  },
  zones: [{ id: 'z1', label: 'Zone 1' }],
  scenes: [
    { id: 'a', label: 'Front Glass Loader', zone: 'z1', panorama: '/a.jpg', defaultYaw: 0, defaultPitch: 0, links: [], infoMarkers: [] },
    { id: 'b', label: 'Auto Layup', zone: 'z1', panorama: '/b.jpg', defaultYaw: 0, defaultPitch: 0, links: [], infoMarkers: [] },
  ],
};

function openFloorPlan() {
  fireEvent.click(screen.getByLabelText('Open floor plan'));
}

test('shows the scene label on hover and hides it on mouse leave', () => {
  render(<FloorPlan config={config} currentSceneId="a" onGoToScene={jest.fn()} />);
  openFloorPlan();

  const dot = screen.getByLabelText('Go to 1');
  expect(screen.queryByText('Front Glass Loader')).not.toBeInTheDocument();

  fireEvent.mouseEnter(dot);
  expect(screen.getByText('Front Glass Loader')).toBeInTheDocument();

  fireEvent.mouseLeave(dot);
  expect(screen.queryByText('Front Glass Loader')).not.toBeInTheDocument();
});

test('shows the correct label for each marker independently', () => {
  render(<FloorPlan config={config} currentSceneId="a" onGoToScene={jest.fn()} />);
  openFloorPlan();

  fireEvent.mouseEnter(screen.getByLabelText('Go to 2'));
  expect(screen.getByText('Auto Layup')).toBeInTheDocument();
  expect(screen.queryByText('Front Glass Loader')).not.toBeInTheDocument();
});

test('does not show a tooltip for a marker with no matching scene', () => {
  const configWithOrphanMarker: TourConfig = {
    ...config,
    meta: {
      ...config.meta,
      floorPlan: {
        image: '/floor.png',
        markers: [{ sceneId: 'missing', x: 10, y: 20, label: '3', size: 20 }],
      },
    },
  };
  render(<FloorPlan config={configWithOrphanMarker} currentSceneId="a" onGoToScene={jest.fn()} />);
  openFloorPlan();

  fireEvent.mouseEnter(screen.getByLabelText('Go to 3'));
  expect(screen.queryByText('Front Glass Loader')).not.toBeInTheDocument();
});
