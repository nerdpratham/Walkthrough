import { deleteTour, renameTour } from '@/lib/studio/tours';

interface Params {
  params: Promise<{ slug: string }>;
}

export async function DELETE(_request: Request, { params }: Params) {
  const { slug } = await params;
  try {
    await deleteTour(slug);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: 'Invalid tour' }, { status: 400 });
  }
}

export async function PATCH(request: Request, { params }: Params) {
  const { slug } = await params;
  const body = await request.json().catch(() => null);
  const title = body?.title;
  if (typeof title !== 'string' || !title.trim()) {
    return Response.json({ error: 'Title required' }, { status: 400 });
  }
  try {
    await renameTour(slug, title.trim());
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: 'Could not rename tour' }, { status: 400 });
  }
}
