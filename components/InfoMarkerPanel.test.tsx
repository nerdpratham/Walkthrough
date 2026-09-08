import { fireEvent, render, screen, within } from '@testing-library/react';
import type { InfoMarker } from '@/lib/types';
import { InfoMarkerPanel } from './InfoMarkerPanel';

jest.mock('./PdfViewer', () => ({
  PdfViewer: ({ title, url, onClose, closeButtonRef }: { title: string; url: string; onClose: () => void; closeButtonRef: React.RefObject<HTMLButtonElement> }) => (
    <div>
      <canvas aria-label={`${title}, page 1`} data-url={url} />
      <button type="button" aria-label="Next page">Next</button>
      <button type="button" aria-label="Zoom in">Zoom</button>
      <button ref={closeButtonRef} type="button" aria-label="Close document" onClick={onClose}>Close</button>
    </div>
  ),
}));

const marker: InfoMarker = {
  id: 'document-marker',
  yaw: 0,
  pitch: 0,
  enabled: true,
  imageDisplay: 'lightbox',
  showLabel: false,
  title: 'Site brochure',
  documentUrl: '/tours/sixdx/markers/site-brochure.pdf',
};

test('opens a marker document immediately when the marker is clicked', () => {
  render(
    <InfoMarkerPanel
      hoverMarker={null}
      openMarker={{ marker, x: 100, y: 100 }}
      onClose={jest.fn()}
    />,
  );

  expect(screen.getByRole('dialog', { name: 'Site brochure' })).toBeInTheDocument();
});

test('opens the marker document inside a dialog', () => {
  render(
    <InfoMarkerPanel
      hoverMarker={null}
      openMarker={{ marker, x: 100, y: 100 }}
      onClose={jest.fn()}
    />,
  );

  const dialog = screen.getByRole('dialog', { name: 'Site brochure' });
  expect(dialog).toBeInTheDocument();
  expect(screen.getByLabelText('Site brochure, page 1')).toHaveAttribute(
    'data-url',
    '/tours/sixdx/markers/site-brochure.pdf',
  );
});

test('uses custom document controls instead of the browser PDF viewer', () => {
  render(
    <InfoMarkerPanel
      hoverMarker={null}
      openMarker={{ marker, x: 100, y: 100 }}
      onClose={jest.fn()}
    />,
  );

  expect(screen.queryByTitle('Site brochure document')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Next page' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Zoom in' })).toBeInTheDocument();
});

test('keeps the document inside the custom viewer', () => {
  render(
    <InfoMarkerPanel
      hoverMarker={null}
      openMarker={{ marker, x: 100, y: 100 }}
      onClose={jest.fn()}
    />,
  );

  expect(screen.queryByRole('link', { name: 'Open in new tab' })).not.toBeInTheDocument();
});

test('closes with Escape and clears the open marker', () => {
  const onClose = jest.fn();
  render(
    <InfoMarkerPanel
      hoverMarker={null}
      openMarker={{ marker, x: 100, y: 100 }}
      onClose={onClose}
    />,
  );

  const dialog = screen.getByRole('dialog');
  expect(within(dialog).getByRole('button', { name: 'Close document' })).toHaveFocus();

  fireEvent.keyDown(window, { key: 'Escape' });

  expect(onClose).toHaveBeenCalledTimes(1);
});

test('closes when the document backdrop is clicked', () => {
  const onClose = jest.fn();
  render(
    <InfoMarkerPanel
      hoverMarker={null}
      openMarker={{ marker, x: 100, y: 100 }}
      onClose={onClose}
    />,
  );

  fireEvent.click(screen.getByRole('dialog'));

  expect(onClose).toHaveBeenCalledTimes(1);
});
