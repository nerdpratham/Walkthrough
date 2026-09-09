import fs from 'fs/promises';
import path from 'path';
import { TourConfigSchema, type TourConfig } from './types';

export function toursDir(): string {
  return process.env.TOURS_DATA_DIR ?? path.join(process.cwd(), 'public', 'tours');
}

// Short-lived in-memory cache so repeat requests for the same tour don't
// re-read and re-validate the JSON file every time. Bounded by TTL rather
// than exact invalidation, so a missed invalidation call site degrades to
// brief staleness instead of a lasting bug.
const CACHE_TTL_MS = 10_000;
const cache = new Map<string, { config: TourConfig; expiresAt: number }>();

export function invalidateTourConfig(slug: string): void {
  cache.delete(slug);
}

export function clearTourConfigCache(): void {
  cache.clear();
}

export async function loadTourConfig(slug: string): Promise<TourConfig> {
  const cached = cache.get(slug);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.config;
  }
  const configPath = path.join(toursDir(), slug, 'tour.config.json');
  const raw = await fs.readFile(configPath, 'utf-8');
  const config = TourConfigSchema.parse(JSON.parse(raw));
  cache.set(slug, { config, expiresAt: Date.now() + CACHE_TTL_MS });
  return config;
}
