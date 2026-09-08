import fs from 'fs/promises';
import path from 'path';
import { toursDir } from '@/lib/tour-config';

const MIME_BY_EXTENSION: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
};

interface Params {
  params: Promise<{ slug: string; filename: string }>;
}

export async function GET(
  _request: Request,
  { params }: Params
): Promise<Response> {
  const { slug, filename } = await params;
  if (
    !/^[a-zA-Z0-9_-]+$/.test(slug) ||
    !/^[a-zA-Z0-9._-]+$/.test(filename)
  ) {
    return new Response('Bad request', { status: 400 });
  }

  const contentType = MIME_BY_EXTENSION[path.extname(filename).toLowerCase()];
  if (!contentType) {
    return new Response('Not found', { status: 404 });
  }

  const markersDir = path.resolve(toursDir(), slug, 'markers');
  const target = path.resolve(markersDir, filename);
  if (!target.startsWith(`${markersDir}${path.sep}`)) {
    return new Response('Bad request', { status: 400 });
  }

  try {
    const bytes = await fs.readFile(target);
    return new Response(bytes, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
