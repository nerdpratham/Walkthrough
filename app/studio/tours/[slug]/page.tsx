import { StudioEditorShell } from '@/components/studio/StudioEditorShell';
import { loadTourConfig } from '@/lib/tour-config';
import { TourConfigSchema, type TourConfig } from '@/lib/types';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  return { title: `Studio - ${slug}` };
}

export default async function StudioTourPage({ params }: Props) {
  const { slug } = await params;

  let config: TourConfig;
  try {
    config = await loadTourConfig(slug);
  } catch {
    // The tour doesn't exist on disk yet — this is a brand-new tour. Open the
    // editor on a blank config; it's written to disk on the first upload. The
    // name defaults to "New Tour" and is editable on the empty-state page.
    config = TourConfigSchema.parse({
      meta: { title: '', site: '', startScene: '' },
      zones: [{ id: 'main', label: 'Main' }],
      scenes: [],
    });
  }

  return <StudioEditorShell slug={slug} initialConfig={config} />;
}
