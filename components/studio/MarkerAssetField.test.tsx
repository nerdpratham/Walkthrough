import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MarkerAssetField } from './MarkerAssetField';

const fetchMock = jest.fn();

function renderField(overrides: Partial<React.ComponentProps<typeof MarkerAssetField>> = {}) {
  const props: React.ComponentProps<typeof MarkerAssetField> = {
    slug: 'office-demo',
    label: 'Image URL',
    value: '/existing/image.jpg',
    accept: '.jpg,.jpeg,.png,.webp',
    helper: 'JPG, PNG or WebP',
    onChange: jest.fn(),
    ...overrides,
  };

  return { ...render(<MarkerAssetField {...props} />), props };
}

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
});

test('shows the accepted file types and helper text', () => {
  renderField();

  const urlInput = screen.getByLabelText('Image URL');
  const fileInput = screen.getByLabelText('Upload Image URL');
  const status = screen.getByText('JPG, PNG or WebP');

  expect(fileInput).toHaveAttribute(
    'accept',
    '.jpg,.jpeg,.png,.webp',
  );
  expect(status).toBeVisible();
  expect(status).toHaveAttribute('aria-live', 'polite');
  expect(urlInput).toHaveAttribute('aria-describedby', status.id);
  expect(fileInput).toHaveAttribute('aria-describedby', status.id);
});

test('uploads the selected file and returns the uploaded URL', async () => {
  fetchMock.mockResolvedValue({
    ok: true,
    json: async () => ({ url: '/tours/office-demo/markers/photo.webp', filename: 'photo.webp' }),
  });
  const { props } = renderField();
  const file = new File(['photo'], 'PHOTO.WEBP', { type: 'image/webp' });

  fireEvent.change(screen.getByLabelText('Upload Image URL'), {
    target: { files: [file] },
  });

  await waitFor(() => expect(props.onChange).toHaveBeenCalledWith('/tours/office-demo/markers/photo.webp'));
  expect(fetchMock).toHaveBeenCalledWith(
    '/api/studio/tours/office-demo/marker-assets',
    expect.objectContaining({ method: 'POST', body: expect.any(FormData) }),
  );
  const request = fetchMock.mock.calls[0][1];
  expect((request.body as FormData).get('file')).toBe(file);
});

test('rejects a file whose extension is not accepted by this field', async () => {
  const { props } = renderField();
  const fileInput = screen.getByLabelText('Upload Image URL');

  fireEvent.change(fileInput, {
    target: { files: [new File(['document'], 'brochure.pdf', { type: 'application/pdf' })] },
  });

  expect(await screen.findByText('Choose a supported file type.')).toBeVisible();
  expect(screen.getByLabelText('Image URL')).toHaveValue('/existing/image.jpg');
  expect(fileInput).toHaveValue('');
  expect(fetchMock).not.toHaveBeenCalled();
  expect(props.onChange).not.toHaveBeenCalled();
});

test('disables only this field while the upload is pending', async () => {
  let resolveUpload!: (value: unknown) => void;
  fetchMock.mockReturnValue(new Promise((resolve) => { resolveUpload = resolve; }));
  renderField();

  fireEvent.change(screen.getByLabelText('Upload Image URL'), {
    target: { files: [new File(['photo'], 'photo.jpg', { type: 'image/jpeg' })] },
  });

  expect(screen.getByLabelText('Image URL')).toBeDisabled();
  expect(screen.getByLabelText('Upload Image URL')).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Uploading...' })).toBeDisabled();

  resolveUpload({
    ok: true,
    json: async () => ({ url: '/tours/office-demo/markers/photo.jpg' }),
  });
  await waitFor(() => expect(screen.getByRole('button', { name: 'Upload' })).toBeEnabled());
});

test('shows a server error without changing the current value', async () => {
  fetchMock.mockResolvedValue({
    ok: false,
    json: async () => ({ error: 'PDF files only.' }),
  });
  const { props } = renderField();

  fireEvent.change(screen.getByLabelText('Upload Image URL'), {
    target: { files: [new File(['bad'], 'bad.jpg', { type: 'image/jpeg' })] },
  });

  expect(await screen.findByText('PDF files only.')).toBeVisible();
  expect(screen.getByLabelText('Image URL')).toHaveValue('/existing/image.jpg');
  expect(props.onChange).not.toHaveBeenCalled();
});

test.each([
  ['network failure', () => Promise.reject(new Error('offline'))],
  ['invalid response', () => Promise.resolve({ ok: true, json: async () => ({ filename: 'photo.jpg' }) })],
])('shows a generic error for %s', async (_name, response) => {
  fetchMock.mockImplementation(response);
  const { props } = renderField();

  fireEvent.change(screen.getByLabelText('Upload Image URL'), {
    target: { files: [new File(['photo'], 'photo.jpg', { type: 'image/jpeg' })] },
  });

  expect(await screen.findByText('Upload failed. Try again.')).toBeVisible();
  expect(props.onChange).not.toHaveBeenCalled();
});

test('allows the same file to be selected again after an upload completes', async () => {
  fetchMock.mockResolvedValue({
    ok: true,
    json: async () => ({ url: '/tours/office-demo/markers/photo.jpg' }),
  });
  renderField();
  const input = screen.getByLabelText('Upload Image URL');
  const file = new File(['photo'], 'photo.jpg', { type: 'image/jpeg' });

  fireEvent.change(input, { target: { files: [file] } });
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Upload' })).toBeEnabled());
  expect(input).toHaveValue('');

  fireEvent.change(input, { target: { files: [file] } });
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
});

test('passes manual URL edits through to onChange', () => {
  const { props } = renderField();

  fireEvent.change(screen.getByLabelText('Image URL'), {
    target: { value: '/manual/image.png' },
  });

  expect(props.onChange).toHaveBeenCalledWith('/manual/image.png');
});
