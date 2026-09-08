import fs from 'fs/promises';
import path from 'path';
import { revalidatePath } from 'next/cache';
import { TourConfigSchema } from '@/lib/types';
import { toursDir } from '@/lib/tour-config';

interface Params {
  params: Promise<{ slug: string }>;
}

export async function PUT(request: Request, { params }: Params) {
  const { slug } = await params;
  if (!/^[a-zA-Z0-9_-]+$/.test(slug)) {
    return Response.json({ error: 'Invalid tour' }, { status: 400 });
  }
  const body = await request.json();
  const config = TourConfigSchema.parse(body);
  const tourDir = path.join(toursDir(), slug);
  // Create the folder on first save — brand-new tours have nothing on disk yet.
  await fs.mkdir(tourDir, { recursive: true });
  await fs.writeFile(path.join(tourDir, 'tour.config.json'), `${JSON.stringify(config, null, 2)}\n`, 'utf-8');
  revalidatePath(`/tours/${slug}`);
  return Response.json({ ok: true, config });
}
