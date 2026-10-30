import { fireEvent, render, screen } from '@testing-library/react';
import type { TourConfig } from '@/lib/types';
import { ZonesInspector } from './ZonesInspector';

const base: TourConfig = {
  meta: {
    title: 'T', site: 't', startScene: 'a', floorPlan: false,
    transition: { effect: 'crossfade', speedMs: 900, rotation: true, zoomToHotspot: true, zoomLevel: 55, blendMs: 360, lockInput: true },
    nadir: { enabled: false, size: 360, opacity: 0.9 },
  },
  zones: [{ id: 'z1', label: 'Zone 1' }],
  scenes: ['a', 'b', 'c'].map((id) => ({
    id, label: id.toUpperCase(), zone: 'z1', panorama: `/${id}.jpg`,
    defaultYaw: 0, defaultPitch: 0, links: [], infoMarkers: [],
  })),
};

test('creating a zone adds it with a slugified id', () => {
  const onChange = jest.fn();
  render(<ZonesInspector config={base} onConfigChange={onChange} />);

  fireEvent.change(screen.getByPlaceholderText('New zone name'), { target: { value: 'Upper Floor' } });
  fireEvent.click(screen.getByText('Add'));

  expect(onChange).toHaveBeenCalledTimes(1);
  expect(onChange.mock.calls[0][0].zones).toEqual([
    { id: 'z1', label: 'Zone 1' },
    { id: 'upper-floor', label: 'Upper Floor' },
  ]);
});

test('does not add a zone with a blank name', () => {
  const onChange = jest.fn();
  render(<ZonesInspector config={base} onConfigChange={onChange} />);
  expect(screen.getByText('Add')).toBeDisabled();
});

test('dedupes a zone id that collides with an existing one', () => {
  const withZone = { ...base, zones: [...base.zones, { id: 'upper-floor', label: 'Existing' }] };
  const onChange = jest.fn();
  render(<ZonesInspector config={withZone} onConfigChange={onChange} />);

  fireEvent.change(screen.getByPlaceholderText('New zone name'), { target: { value: 'Upper Floor' } });
  fireEvent.click(screen.getByText('Add'));

  expect(onChange.mock.calls[0][0].zones.at(-1)).toEqual({ id: 'upper-floor-2', label: 'Upper Floor' });
});

test('adding a scene to a new zone moves it out of its old one', () => {
  const withZone = { ...base, zones: [...base.zones, { id: 'z2', label: 'Zone 2' }] };
  const onChange = jest.fn();
  render(<ZonesInspector config={withZone} onConfigChange={onChange} />);

  fireEvent.change(screen.getByLabelText('Add scene to Zone 2'), { target: { value: 'b' } });

  const next = onChange.mock.calls[0][0] as TourConfig;
  expect(next.scenes.find((s) => s.id === 'b')?.zone).toBe('z2');
  expect(next.scenes.find((s) => s.id === 'a')?.zone).toBe('z1');
});

test('delete is disabled for a zone with scenes and enabled for an empty one', () => {
  const withZone = { ...base, zones: [...base.zones, { id: 'z2', label: 'Zone 2' }] };
  render(<ZonesInspector config={withZone} onConfigChange={() => {}} />);

  expect(screen.getByLabelText('Delete zone Zone 1')).toBeDisabled();
  expect(screen.getByLabelText('Delete zone Zone 2')).not.toBeDisabled();
});

test('deleting an empty zone removes it', () => {
  const withZone = { ...base, zones: [...base.zones, { id: 'z2', label: 'Zone 2' }] };
  const onChange = jest.fn();
  render(<ZonesInspector config={withZone} onConfigChange={onChange} />);

  fireEvent.click(screen.getByLabelText('Delete zone Zone 2'));
  expect(onChange.mock.calls[0][0].zones).toEqual([{ id: 'z1', label: 'Zone 1' }]);
});

test('moving a scene out of a zone reassigns it to another zone', () => {
  const withZone = { ...base, zones: [...base.zones, { id: 'z2', label: 'Zone 2' }] };
  const onChange = jest.fn();
  render(<ZonesInspector config={withZone} onConfigChange={onChange} />);

  fireEvent.click(screen.getByLabelText('Move A out of Zone 1'));
  const next = onChange.mock.calls[0][0] as TourConfig;
  expect(next.scenes.find((s) => s.id === 'a')?.zone).toBe('z2');
});

test('renaming a zone via its label button', () => {
  const onChange = jest.fn();
  render(<ZonesInspector config={base} onConfigChange={onChange} />);

  fireEvent.click(screen.getByText('Zone 1'));
  const input = screen.getByDisplayValue('Zone 1');
  fireEvent.change(input, { target: { value: 'Ground Floor' } });

  expect(onChange.mock.calls.at(-1)?.[0].zones).toEqual([{ id: 'z1', label: 'Ground Floor' }]);
});
