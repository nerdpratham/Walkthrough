import { fireEvent, render, screen } from '@testing-library/react';
import type { TourConfig } from '@/lib/types';
import { FloorPlanEditor } from './FloorPlanEditor';

const config: TourConfig = {
  meta: {
    title: 'T', site: 't', startScene: 'a',
    floorPlan: {
      image: '/tours/t/floorplan.png',
      markers: [{ sceneId: 'a', x: 10, y: 20, size: 20, label: '1' }],
    },
    transition: { effect: 'crossfade', speedMs: 900, rotation: true, zoomToHotspot: true, zoomLevel: 55, blendMs: 360, lockInput: true },
    nadir: { enabled: false, size: 360, opacity: 0.9 },
  },
  zones: [{ id: 'z1', label: 'Zone 1' }],
  scenes: ['a', 'b'].map((id) => ({
    id, label: id.toUpperCase(), zone: 'z1', panorama: `/${id}.jpg`,
    defaultYaw: 0, defaultPitch: 0, links: [], infoMarkers: [],
  })),
};

beforeEach(() => {
  jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    x: 0, y: 0, left: 0, top: 0, width: 400, height: 200, right: 400, bottom: 200,
    toJSON: () => {},
  } as DOMRect);
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('renders nothing when there is no floor plan', () => {
  const noPlan: TourConfig = { ...config, meta: { ...config.meta, floorPlan: false } };
  const { container } = render(
    <FloorPlanEditor config={noPlan} activeSceneId="a" onConfigChange={jest.fn()} onClose={jest.fn()} />,
  );
  expect(container).toBeEmptyDOMElement();
});

test('clicking the floor plan image adds a marker at that position for the selected scene', () => {
  const onConfigChange = jest.fn();
  render(<FloorPlanEditor config={config} activeSceneId="b" onConfigChange={onConfigChange} onClose={jest.fn()} />);

  fireEvent.click(screen.getByAltText('Floor plan'), { clientX: 100, clientY: 50 });

  expect(onConfigChange).toHaveBeenCalledWith(expect.objectContaining({
    meta: expect.objectContaining({
      floorPlan: expect.objectContaining({
        markers: [
          { sceneId: 'a', x: 10, y: 20, size: 20, label: '1' },
          { sceneId: 'b', x: 25, y: 25, size: 20 },
        ],
      }),
    }),
  }));
});

test('clicking an existing marker selects it and shows the edit panel', () => {
  render(<FloorPlanEditor config={config} activeSceneId="a" onConfigChange={jest.fn()} onClose={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Marker 1' }));
  expect(screen.getByLabelText('Label')).toHaveValue('1');
});

test('editing the label updates the selected marker', () => {
  const onConfigChange = jest.fn();
  render(<FloorPlanEditor config={config} activeSceneId="a" onConfigChange={onConfigChange} onClose={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Marker 1' }));
  fireEvent.change(screen.getByLabelText('Label'), { target: { value: 'Lobby' } });
  expect(onConfigChange).toHaveBeenCalledWith(expect.objectContaining({
    meta: expect.objectContaining({
      floorPlan: expect.objectContaining({
        markers: [{ sceneId: 'a', x: 10, y: 20, size: 20, label: 'Lobby' }],
      }),
    }),
  }));
});

test('changing the scene dropdown reassigns the selected marker', () => {
  const onConfigChange = jest.fn();
  render(<FloorPlanEditor config={config} activeSceneId="a" onConfigChange={onConfigChange} onClose={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Marker 1' }));
  fireEvent.change(screen.getByLabelText('Scene'), { target: { value: 'b' } });
  expect(onConfigChange).toHaveBeenCalledWith(expect.objectContaining({
    meta: expect.objectContaining({
      floorPlan: expect.objectContaining({
        markers: [{ sceneId: 'b', x: 10, y: 20, size: 20, label: '1' }],
      }),
    }),
  }));
});

test('Delete button removes the selected marker', () => {
  const onConfigChange = jest.fn();
  render(<FloorPlanEditor config={config} activeSceneId="a" onConfigChange={onConfigChange} onClose={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Marker 1' }));
  fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
  expect(onConfigChange).toHaveBeenCalledWith(expect.objectContaining({
    meta: expect.objectContaining({ floorPlan: expect.objectContaining({ markers: [] }) }),
  }));
});

test('Delete key removes the selected marker', () => {
  const onConfigChange = jest.fn();
  render(<FloorPlanEditor config={config} activeSceneId="a" onConfigChange={onConfigChange} onClose={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Marker 1' }));
  fireEvent.keyDown(window, { key: 'Delete' });
  expect(onConfigChange).toHaveBeenCalledWith(expect.objectContaining({
    meta: expect.objectContaining({ floorPlan: expect.objectContaining({ markers: [] }) }),
  }));
});

test('dragging a marker updates its position and does not add a new marker', () => {
  const onConfigChange = jest.fn();
  render(<FloorPlanEditor config={config} activeSceneId="a" onConfigChange={onConfigChange} onClose={jest.fn()} />);

  const marker = screen.getByRole('button', { name: 'Marker 1' });
  fireEvent.mouseDown(marker, { clientX: 40, clientY: 40 });
  fireEvent.mouseMove(window, { clientX: 200, clientY: 100 });
  fireEvent.mouseUp(window);

  expect(onConfigChange).toHaveBeenCalledTimes(1);
  expect(onConfigChange).toHaveBeenCalledWith(expect.objectContaining({
    meta: expect.objectContaining({
      floorPlan: expect.objectContaining({
        markers: [{ sceneId: 'a', x: 50, y: 50, size: 20, label: '1' }],
      }),
    }),
  }));

  // When mouseup lands back over the marker itself, the browser fires the
  // resulting click on the marker (not the container), so it goes through
  // handleMarkerClick, not handleImageClick. That click must still consume
  // the "just dragged" flag -- otherwise the next real click elsewhere on
  // the floor plan (meant to add a new marker) gets silently swallowed.
  fireEvent.click(marker);
  fireEvent.click(screen.getByAltText('Floor plan'), { clientX: 300, clientY: 150 });
  expect(onConfigChange).toHaveBeenCalledTimes(2);
  expect(onConfigChange).toHaveBeenLastCalledWith(expect.objectContaining({
    meta: expect.objectContaining({
      floorPlan: expect.objectContaining({
        // `config` is the controlled prop and the test never feeds an
        // updated config back in, so this call still starts from the
        // original single marker plus the newly-added one.
        markers: [
          { sceneId: 'a', x: 10, y: 20, size: 20, label: '1' },
          { sceneId: 'a', x: 75, y: 75, size: 20 },
        ],
      }),
    }),
  }));
});

test('Escape closes the modal', () => {
  const onClose = jest.fn();
  render(<FloorPlanEditor config={config} activeSceneId="a" onConfigChange={jest.fn()} onClose={onClose} />);
  fireEvent.keyDown(window, { key: 'Escape' });
  expect(onClose).toHaveBeenCalled();
});

test('the close button closes the modal', () => {
  const onClose = jest.fn();
  render(<FloorPlanEditor config={config} activeSceneId="a" onConfigChange={jest.fn()} onClose={onClose} />);
  fireEvent.click(screen.getByLabelText('Close floor plan editor'));
  expect(onClose).toHaveBeenCalled();
});
