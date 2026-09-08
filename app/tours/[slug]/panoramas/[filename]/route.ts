import fs from 'fs/promises';
import path from 'path';
import { toursDir } from '@/lib/tour-config';

interface Params {
  params: Promise<{ slug: string; filename: string }>;
}

export async function GET(_req: Request, { params }: Params) {
  const { slug, filename } = await params;
  const base = path.resolve(toursDir());
  const filePath = path.resolve(path.join(base, slug, 'panoramas', filename));

  if (!filePath.startsWith(base + path.sep) && filePath !== base) {
    return new Response('Forbidden', { status: 403 });
  }

  try {
    const file = await fs.readFile(filePath);
    return new Response(file, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
