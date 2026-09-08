import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { toursDir } from '@/lib/tour-config';

interface Params {
  params: Promise<{ slug: string }>;
}

// Same target as scripts/optimize-panoramas.js — keep the two in sync.
const PANORAMA_WIDTH = 6144;
const PANORAMA_HEIGHT = 3072;

export async function GET(_request: Request, { params }: Params) {
  const { slug } = await params;
  if (!/^[a-zA-Z0-9_-]+$/.test(slug)) {
    return Response.json({ error: 'Invalid tour' }, { status: 400 });
  }
  const panoramasDir = path.join(toursDir(), slug, 'panoramas');
  try {
    const files = await fs.readdir(panoramasDir);
    return Response.json(files.filter((f) => /\.(jpe?g)$/i.test(f)));
  } catch {
    return Response.json([]);
  }
}

export async function POST(request: Request, { params }: Params) {
  const { slug } = await params;
  if (!/^[a-zA-Z0-9_-]+$/.test(slug)) {
    return Response.json({ error: 'Invalid tour' }, { status: 400 });
  }
  const panoramasDir = path.join(toursDir(), slug, 'panoramas');
  await fs.mkdir(panoramasDir, { recursive: true });

  const formData = await request.formData();
  const files = formData.getAll('files').filter((f): f is File => f instanceof File);

  const results = await Promise.all(
    files.map(async (file) => {
      // Keep the original filename (spaces, case) but drop any directory parts
      // so a crafted name can't escape the panoramas folder.
      const original = (file.name.split(/[\\/]/).pop() ?? '').trim();
      if (!/\.(jpe?g)$/i.test(original)) {
        return { filename: file.name, error: 'Only JPG files are supported' };
      }
      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const info = await sharp(buffer)
          .resize(PANORAMA_WIDTH, PANORAMA_HEIGHT, { fit: 'fill' })
          .jpeg({ quality: 92, progressive: true, mozjpeg: true })
          .toFile(path.join(panoramasDir, original));
        return { filename: original, size: info.size };
      } catch {
        return { filename: file.name, error: 'Could not process image' };
      }
    }),
  );

  return Response.json({ files: results });
}
