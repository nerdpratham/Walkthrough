import { render, screen } from '@testing-library/react';
import type { Scene } from '@/lib/types';
import { SceneBanner } from './SceneBanner';

const scene = (overrides: Partial<Scene> = {}): Scene => ({
  id: 'a',
  label: 'Front Desk',
  zone: 'z1',
  panorama: '/p.jpg',
  defaultYaw: 0,
  defaultPitch: 0,
  links: [],
  infoMarkers: [],
  ...overrides,
});

test('renders nothing without a caption', () => {
  const { container } = render(<SceneBanner scene={scene()} />);
  expect(container).toBeEmptyDOMElement();
});

test('renders nothing when scene is null', () => {
  const { container } = render(<SceneBanner scene={null} />);
  expect(container).toBeEmptyDOMElement();
});

test('shows caption without scene label', () => {
  render(<SceneBanner scene={scene({ caption: 'Sign in and grab a badge' })} />);
  expect(screen.getByText('Sign in and grab a badge')).toBeInTheDocument();
  expect(screen.queryByText('Front Desk')).not.toBeInTheDocument();
});
