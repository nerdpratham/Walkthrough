import { fireEvent, render, screen } from '@testing-library/react';
import type { TourConfig, GuidedTourStep } from '@/lib/types';
import { GuidedTourInspector } from './GuidedTourInspector';

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

const step = (id: string, label?: string): GuidedTourStep => label ? { sceneId: id, label } : { sceneId: id };
const withRoute = (steps: GuidedTourStep[]): TourConfig => ({ ...base, meta: { ...base.meta, guidedTour: steps } });

test('shows the off state and adding a scene appends it', () => {
  const onChange = jest.fn();
  render(<GuidedTourInspector config={base} onConfigChange={onChange} />);
  expect(screen.getByText('off')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Add scene'), { target: { value: 'b' } });
  expect(onChange).toHaveBeenCalledTimes(1);
  expect(onChange.mock.calls[0][0].meta.guidedTour).toEqual([step('b')]);
});

test('lists steps in order and only offers scenes not yet in the route', () => {
  render(<GuidedTourInspector config={withRoute([step('a'), step('c')])} onConfigChange={() => {}} />);
  expect(screen.getByText('2 steps')).toBeInTheDocument();
  const options = Array.from(screen.getByLabelText('Add scene').querySelectorAll('option')).map((o) => o.textContent);
  expect(options).toEqual([expect.stringMatching(/Select/), 'B']);
});

test('reorders a step up', () => {
  const onChange = jest.fn();
  render(<GuidedTourInspector config={withRoute([step('a'), step('b'), step('c')])} onConfigChange={onChange} />);
  fireEvent.click(screen.getByLabelText('Move C up'));
  expect(onChange.mock.calls[0][0].meta.guidedTour).toEqual([step('a'), step('c'), step('b')]);
});

test('removes a step', () => {
  const onChange = jest.fn();
  render(<GuidedTourInspector config={withRoute([step('a'), step('b'), step('c')])} onConfigChange={onChange} />);
  fireEvent.click(screen.getByLabelText('Remove B'));
  expect(onChange.mock.calls[0][0].meta.guidedTour).toEqual([step('a'), step('c')]);
});

test('pressing Enter in the rename field closes it', () => {
  const onChange = jest.fn();
  render(<GuidedTourInspector config={withRoute([step('a')])} onConfigChange={onChange} />);
  fireEvent.mouseDown(screen.getByLabelText('Rename step A'));
  const input = screen.getByPlaceholderText('A');
  fireEvent.change(input, { target: { value: 'Lobby' } });
  fireEvent.keyDown(input, { key: 'Enter' });
  expect(screen.queryByPlaceholderText('A')).not.toBeInTheDocument();
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
    meta: expect.objectContaining({ guidedTour: [step('a', 'Lobby')] }),
  }));
});

test('de-dupes a hand-edited route with repeated ids', () => {
  const onChange = jest.fn();
  render(<GuidedTourInspector config={withRoute([step('a'), step('a'), step('b')])} onConfigChange={onChange} />);
  expect(screen.getByText('2 steps')).toBeInTheDocument();
  fireEvent.click(screen.getByLabelText('Move B up'));
  expect(onChange.mock.calls[0][0].meta.guidedTour).toEqual([step('b'), step('a')]);
});
