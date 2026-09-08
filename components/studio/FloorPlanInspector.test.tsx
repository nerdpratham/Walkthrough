import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { TourConfig } from '@/lib/types';
import { FloorPlanInspector } from './FloorPlanInspector';

const fetchMock = jest.fn();

const base: TourConfig = {
  meta: {
    title: 'T', site: 't', startScene: 'a', floorPlan: false,
    transition: { effect: 'crossfade', speedMs: 900, rotation: true, zoomToHotspot: true, zoomLevel: 55, blendMs: 360, lockInput: true },
    nadir: { enabled: false, size: 360, opacity: 0.9 },
  },
  zones: [{ id: 'z1', label: 'Zone 1' }],
  scenes: ['a', 'b'].map((id) => ({
    id, label: id.toUpperCase(), zone: 'z1', panorama: `/${id}.jpg`,
    defaultYaw: 0, defaultPitch: 0, links: [], infoMarkers: [],
  })),
};

const withPlan: TourConfig = {
  ...base,
  meta: {
    ...base.meta,
    floorPlan: { image: '/tours/t/floorplan.png', markers: [{ sceneId: 'a', x: 10, y: 20, size: 20 }] },
  },
};

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
});

test('shows only the upload field when no floor plan is set', () => {
  render(<FloorPlanInspector slug="t" config={base} activeSceneId="a" onConfigChange={jest.fn()} />);
  expect(screen.getByText('No file')).toBeInTheDocument();
  expect(screen.queryByText('Edit Markers')).not.toBeInTheDocument();
});

test('uploading an image turns the floor plan on', async () => {
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ url: '/tours/t/floorplan.png' }) });
  const onChange = jest.fn();
  render(<FloorPlanInspector slug="t" config={base} activeSceneId="a" onConfigChange={onChange} />);

  const file = new File(['plan'], 'plan.png', { type: 'image/png' });
  fireEvent.change(screen.getByLabelText('Upload floor plan image'), { target: { files: [file] } });

  await waitFor(() => expect(onChange).toHaveBeenCalledWith(
    expect.objectContaining({
      meta: expect.objectContaining({ floorPlan: { image: '/tours/t/floorplan.png', markers: [] } }),
    }),
  ));
});

test('shows marker count and an Edit Markers button once a floor plan exists', () => {
  render(<FloorPlanInspector slug="t" config={withPlan} activeSceneId="a" onConfigChange={jest.fn()} />);
  expect(screen.getByText('1 marker')).toBeInTheDocument();
  expect(screen.getByText('Edit Markers')).toBeInTheDocument();
});

test('clearing the image turns the floor plan back off', () => {
  const onChange = jest.fn();
  render(<FloorPlanInspector slug="t" config={withPlan} activeSceneId="a" onConfigChange={onChange} />);
  fireEvent.click(screen.getByText('Clear'));
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
    meta: expect.objectContaining({ floorPlan: false }),
  }));
});

test('Edit Markers opens the floor plan editor modal', () => {
  render(<FloorPlanInspector slug="t" config={withPlan} activeSceneId="a" onConfigChange={jest.fn()} />);
  fireEvent.click(screen.getByText('Edit Markers'));
  expect(screen.getByRole('dialog', { name: 'Floor plan marker editor' })).toBeInTheDocument();
});
