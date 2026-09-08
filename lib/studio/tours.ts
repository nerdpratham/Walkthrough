import fs from 'fs/promises';
import path from 'path';
import { TourConfigSchema } from '@/lib/types';
import { toursDir, loadTourConfig } from '@/lib/tour-config';

export interface TourSummary {
  slug: string;
  title: string;
  sceneCount: number;
}

/**
 * Reads every tour directory in the data dir and returns a summary for each.
 * A tour whose config is missing or invalid still appears, using its folder
 * name as the title so the in-house person can find and fix it.
 */
export async function listTours(): Promise<TourSummary[]> {
  const dir = toursDir();

  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  return Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => {
        try {
          const raw = await fs.readFile(
            path.join(dir, entry.name, 'tour.config.json'),
            'utf-8'
          );
          const config = TourConfigSchema.parse(JSON.parse(raw));
          return {
            slug: entry.name,
            title: config.meta.title,
            sceneCount: config.scenes.length,
          };
        } catch {
          return { slug: entry.name, title: entry.name, sceneCount: 0 };
        }
      })
  );
}

/**
 * Deletes a tour folder and everything in it (config + panoramas). The slug is
 * restricted to safe characters so a crafted value can't escape the data dir.
 */
export async function deleteTour(slug: string): Promise<void> {
  if (!/^[a-zA-Z0-9_-]+$/.test(slug)) {
    throw new Error(`Invalid tour slug: ${slug}`);
  }
  await fs.rm(path.join(toursDir(), slug), { recursive: true, force: true });
}

/**
 * Renames a tour by updating meta.title in its config. Throws if the slug is
 * unsafe or the tour can't be loaded.
 */
export async function renameTour(slug: string, title: string): Promise<void> {
  if (!/^[a-zA-Z0-9_-]+$/.test(slug)) {
    throw new Error(`Invalid tour slug: ${slug}`);
  }
  const config = await loadTourConfig(slug);
  config.meta.title = title;
  await fs.writeFile(
    path.join(toursDir(), slug, 'tour.config.json'),
    `${JSON.stringify(config, null, 2)}\n`,
    'utf-8',
  );
}
