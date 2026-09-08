import type { TourConfig } from '@/lib/types';

export function exportTourConfig(config: TourConfig, filename = 'tour.config.json') {
  const blob = new Blob([`${JSON.stringify(config, null, 2)}\n`], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
