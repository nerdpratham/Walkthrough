import fs from 'fs/promises';
import path from 'path';
import { randomBytes } from 'crypto';
import { toursDir } from '@/lib/tour-config';

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const MAX_FILENAME_ATTEMPTS = 5;
const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
};

function errorResponse(error: string, status: number): Response {
  return Response.json({ error }, { status });
}

function sanitizeBasename(filename: string): string {
  const sanitized = path
    .parse(filename)
    .name.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');

  return sanitized || 'asset';
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
): Promise<Response> {
  const { slug } = await params;
  if (!/^[a-zA-Z0-9_-]+$/.test(slug)) {
    return errorResponse('Invalid tour', 400);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return errorResponse('Choose one file', 400);
  }

  const entries = formData.getAll('file');
  if (entries.length !== 1 || !(entries[0] instanceof File)) {
    return errorResponse('Choose one file', 400);
  }

  const file = entries[0];
  if (file.size === 0) {
    return errorResponse('File is empty', 400);
  }
  if (file.size > MAX_FILE_SIZE) {
    return errorResponse('File must be 20 MB or smaller', 400);
  }

  const extension = path.extname(file.name).toLowerCase();
  const expectedMimeType = MIME_TYPES[extension];
  if (!expectedMimeType) {
    return errorResponse('Use JPG, PNG, WebP, or PDF', 400);
  }
  if (file.type !== expectedMimeType) {
    return errorResponse('File type does not match its extension', 400);
  }

  const basename = sanitizeBasename(file.name);
  const markersDir = path.resolve(toursDir(), slug, 'markers');

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    await fs.mkdir(markersDir, { recursive: true });

    for (let attempt = 0; attempt < MAX_FILENAME_ATTEMPTS; attempt += 1) {
      const suffix = randomBytes(3).toString('hex');
      const filename = `${basename}-${suffix}${extension}`;
      const target = path.resolve(markersDir, filename);
      if (!target.startsWith(`${markersDir}${path.sep}`)) {
        return errorResponse('Could not store file', 500);
      }

      try {
        await fs.writeFile(target, bytes, { flag: 'wx' });
        return Response.json({
          url: `/tours/${slug}/markers/${filename}`,
          filename,
        });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
          throw error;
        }
      }
    }
  } catch {
    return errorResponse('Could not store file', 500);
  }

  return errorResponse('Could not store file', 500);
}
