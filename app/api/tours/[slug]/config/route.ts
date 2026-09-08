import { loadTourConfig } from '@/lib/tour-config';

interface Params {
  params: Promise<{ slug: string }>;
}

// Public, read-only. The tour is already viewable at /tours/<slug>; this just
// exposes the same config as JSON for the viewer build's pull step.
export async function GET(_request: Request, { params }: Params) {
  const { slug } = await params;
  if (!/^[a-zA-Z0-9_-]+$/.test(slug)) {
    return Response.json({ error: 'Invalid tour' }, { status: 400 });
  }
  try {
    const config = await loadTourConfig(slug);
    return Response.json(config);
  } catch {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }
}
