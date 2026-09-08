'use client';

import { useRef, useState, type ChangeEvent } from 'react';

const genericError = 'Upload failed. Try again.';
const supportedFileError = 'Choose a supported file type.';

export function useAssetUpload(
  slug: string,
  accept: string,
  onChange: (url: string) => void,
) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allowedExtensions = accept
    .split(',')
    .map((ext) => ext.trim().toLowerCase())
    .filter((ext) => ext.startsWith('.'));

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const fileInput = event.currentTarget;
    const file = fileInput.files?.[0];
    if (!file) return;

    const hasAllowedExtension = allowedExtensions.some((ext) =>
      file.name.toLowerCase().endsWith(ext)
    );
    if (!hasAllowedExtension) {
      setError(supportedFileError);
      fileInput.value = '';
      return;
    }

    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`/api/studio/tours/${slug}/marker-assets`, {
        method: 'POST',
        body: formData,
      });
      const result: unknown = await response.json();

      if (
        !response.ok &&
        typeof result === 'object' &&
        result !== null &&
        'error' in result &&
        typeof result.error === 'string'
      ) {
        setError(result.error);
        return;
      }

      if (
        response.ok &&
        typeof result === 'object' &&
        result !== null &&
        'url' in result &&
        typeof result.url === 'string'
      ) {
        onChange(result.url);
        return;
      }

      setError(genericError);
    } catch {
      setError(genericError);
    } finally {
      fileInput.value = '';
      setIsUploading(false);
    }
  };

  return { fileInputRef, isUploading, error, upload };
}
