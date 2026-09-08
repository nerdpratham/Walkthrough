import { fireEvent, render, screen } from '@testing-library/react';
import { GuidedTourBar } from './GuidedTourBar';

const route = ['a', 'b', 'c'];

test('renders nothing when the route is empty', () => {
  const { container } = render(
    <GuidedTourBar route={[]} currentSceneId="a" onGoToScene={() => {}} />,
  );
  expect(container).toBeEmptyDOMElement();
});

test('Prev is disabled on the first step, Next advances', () => {
  const go = jest.fn();
  render(<GuidedTourBar route={route} currentSceneId="a" onGoToScene={go} />);
  expect(screen.getByRole('button', { name: 'Previous step' })).toBeDisabled();
  expect(screen.getByText('1 / 3')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
  expect(go).toHaveBeenCalledWith('b');
});

test('Next is disabled on the last step, Prev goes back', () => {
  const go = jest.fn();
  render(<GuidedTourBar route={route} currentSceneId="c" onGoToScene={go} />);
  expect(screen.getByRole('button', { name: 'Next step' })).toBeDisabled();
  expect(screen.getByText('3 / 3')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Previous step' }));
  expect(go).toHaveBeenCalledWith('b');
});

test('position tracks the current scene', () => {
  const { rerender } = render(
    <GuidedTourBar route={route} currentSceneId="a" onGoToScene={() => {}} />,
  );
  expect(screen.getByText('1 / 3')).toBeInTheDocument();
  rerender(<GuidedTourBar route={route} currentSceneId="b" onGoToScene={() => {}} />);
  expect(screen.getByText('2 / 3')).toBeInTheDocument();
});

test('resumes from the last in-route step when the visitor wanders off-route', () => {
  const go = jest.fn();
  const { rerender } = render(
    <GuidedTourBar route={route} currentSceneId="b" onGoToScene={go} />,
  );
  // Visitor free-navigates to a scene that is not part of the guided tour.
  rerender(<GuidedTourBar route={route} currentSceneId="offroute" onGoToScene={go} />);
  fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
  expect(go).toHaveBeenCalledWith('c');
});

test('shows custom label when provided', () => {
  render(
    <GuidedTourBar route={route} labels={{ b: 'Reception' }} currentSceneId="b" onGoToScene={() => {}} />,
  );
  expect(screen.getByText('Reception')).toBeInTheDocument();
});

test('starts the route from the beginning when off-route from the start', () => {
  const go = jest.fn();
  render(<GuidedTourBar route={route} currentSceneId="offroute" onGoToScene={go} />);
  expect(screen.getByRole('button', { name: 'Previous step' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
  expect(go).toHaveBeenCalledWith('a');
});
