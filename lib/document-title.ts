import type { InfoMarker, Scene } from '@/lib/types';

interface ResolveDocumentTitleInput {
  tourTitle: string;
  activeScene: Pick<Scene, 'label'> | null;
  openMarker: Pick<InfoMarker, 'title' | 'tabTitle'> | null;
}

function withTourTitle(label: string | undefined, tourTitle: string): string {
  const trimmed = label?.trim();
  return trimmed ? `${trimmed} - ${tourTitle}` : tourTitle;
}

export function resolveDocumentTitle({
  tourTitle,
  activeScene,
  openMarker,
}: ResolveDocumentTitleInput): string {
  return withTourTitle(
    openMarker?.tabTitle ?? openMarker?.title ?? activeScene?.label,
    tourTitle,
  );
}
