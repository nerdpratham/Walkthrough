import fs from 'fs/promises';
import path from 'path';
import { TourConfigSchema, type TourConfig } from './types';

export function toursDir(): string {
  return process.env.TOURS_DATA_DIR ?? path.join(process.cwd(), 'public', 'tours');
}

export async function loadTourConfig(slug: string): Promise<TourConfig> {
  const configPath = path.join(toursDir(), slug, 'tour.config.json');
  const raw = await fs.readFile(configPath, 'utf-8');
  return TourConfigSchema.parse(JSON.parse(raw));
}
