import { render, screen } from '@testing-library/react';
import type { TourConfig } from '@/lib/types';
import { StartScreen } from './StartScreen';

const config: TourConfig = {
  meta: {
    title: 'SixDX',
    site: 'SixDX',
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

test('does not render a separate flat panorama image over the live viewer', () => {
  const { container } = render(<StartScreen config={config} onStart={jest.fn()} />);

  expect(container.querySelector('img[src="/tours/demo/panoramas/scene1.jpg"]')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: /begin tour/i })).toBeInTheDocument();
});
