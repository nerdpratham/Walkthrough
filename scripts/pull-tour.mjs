// Pulls a tour and its referenced assets into an isolated local snapshot.
// Usage: node scripts/pull-tour.mjs <sourceSlug> [baseUrl] [deliverySlug]
import fs from 'fs/promises';
import path from 'path';
import { pathToFileURL } from 'url';

const SOURCE_SLUG = process.argv[2] || process.env.TOUR_SLUG;
const BASE = (process.argv[3] || process.env.TOUR_BASE_URL || 'https://tours.sixdx.ai').replace(/\/+$/, '');
const DELIVERY_SLUG = process.argv[4] || process.env.DELIVERY_SLUG || SOURCE_SLUG;

export function validateSlug(slug) {
  if (!slug || !/^[a-zA-Z0-9_-]+$/.test(slug)) {
    throw new Error(`invalid tour slug: ${slug ?? ''}`);
  }
  return slug;
}

export function tourSnapshotDir(slug) {
  return path.join('deliverables', 'tours', validateSlug(slug));
}

export function rewriteTourAssetUrls(config, sourceSlug, deliverySlug) {
  const sourcePrefix = `/tours/${validateSlug(sourceSlug)}/`;
  const deliveryPrefix = `/tours/${validateSlug(deliverySlug)}/`;
  const rewritten = structuredClone(config);
  const rewrite = (value) => typeof value === 'string' && value.startsWith(sourcePrefix)
    ? `${deliveryPrefix}${value.slice(sourcePrefix.length)}`
    : value;

  if (rewritten.meta) {
    rewritten.meta.logo = rewrite(rewritten.meta.logo);
    if (rewritten.meta.nadir) {
      rewritten.meta.nadir.image = rewrite(rewritten.meta.nadir.image);
    }
    if (rewritten.meta.floorPlan) {
      rewritten.meta.floorPlan.image = rewrite(rewritten.meta.floorPlan.image);
    }
  }
  for (const scene of rewritten.scenes ?? []) {
    scene.panorama = rewrite(scene.panorama);
    for (const marker of scene.infoMarkers ?? []) {
      marker.imageUrl = rewrite(marker.imageUrl);
      marker.documentUrl = rewrite(marker.documentUrl);
      marker.ctaUrl = rewrite(marker.ctaUrl);
    }
  }
  return rewritten;
}

export function panoramaFilenames(config) {
  return [...new Set(
    (config.scenes ?? [])
      .map((scene) => {
        const pathname = new URL(String(scene.panorama), 'http://local').pathname;
        return decodeURIComponent(pathname.split('/').pop() ?? '');
      })
      .filter(Boolean),
  )];
}

export function tourAssetPaths(config, slug) {
  const references = [
    config.meta?.logo,
    config.meta?.nadir?.image,
    config.meta?.floorPlan?.image,
    ...(config.scenes ?? []).flatMap((scene) => [
      scene.panorama,
      ...(scene.infoMarkers ?? []).flatMap((marker) => [
        marker.imageUrl,
        marker.documentUrl,
        marker.ctaUrl,
      ]),
    ]),
  ].filter(Boolean);
  const prefix = `/tours/${slug}/`;

  return [...new Set(references.flatMap((reference) => {
    const pathname = new URL(String(reference), `http://local${prefix}`).pathname;
    if (!pathname.startsWith(prefix)) return [];

    const segments = pathname
      .slice(prefix.length)
      .split('/')
      .map((segment) => decodeURIComponent(segment));
    if (
      segments.some((segment) =>
        !segment ||
        segment === '.' ||
        segment === '..' ||
        segment.includes('/') ||
        segment.includes('\\')
      )
    ) {
      throw new Error(`unsafe tour asset path: ${reference}`);
    }
    return [segments.join('/')];
  }))];
}

export async function replaceSnapshot(outDir, stageDir, operations = fs) {
  const backupDir = `${outDir}.previous`;
  let hasBackup = false;
  try {
    await operations.rename(outDir, backupDir);
    hasBackup = true;
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }

  try {
    await operations.rename(stageDir, outDir);
  } catch (error) {
    if (hasBackup) await operations.rename(backupDir, outDir);
    throw error;
  }

  if (hasBackup) await operations.rm(backupDir, { recursive: true, force: true });
}

async function main() {
  const sourceSlug = validateSlug(SOURCE_SLUG);
  const deliverySlug = validateSlug(DELIVERY_SLUG);

  const cfgRes = await fetch(`${BASE}/api/tours/${sourceSlug}/config`);
  if (!cfgRes.ok) throw new Error(`config fetch failed (${cfgRes.status}) for ${sourceSlug} at ${BASE}`);
  const config = await cfgRes.json();

  const files = panoramaFilenames(config);
  if (files.length === 0) throw new Error('config has no panoramas');
  const assets = tourAssetPaths(config, sourceSlug);
  const localConfig = rewriteTourAssetUrls(config, sourceSlug, deliverySlug);

  const toursRoot = path.join('deliverables', 'tours');
  const outDir = tourSnapshotDir(deliverySlug);
  await fs.mkdir(toursRoot, { recursive: true });
  const stageDir = await fs.mkdtemp(path.join(toursRoot, `.${deliverySlug}-pull-`));

  try {
    await fs.writeFile(
      path.join(stageDir, 'tour.config.json'),
      `${JSON.stringify(localConfig, null, 2)}\n`,
    );

    for (const asset of assets) {
      const assetUrl = asset.split('/').map(encodeURIComponent).join('/');
      const res = await fetch(`${BASE}/tours/${sourceSlug}/${assetUrl}`);
      if (!res.ok) throw new Error(`tour asset fetch failed (${res.status}): ${asset}`);
      const buf = Buffer.from(await res.arrayBuffer());
      const assetPath = path.join(stageDir, ...asset.split('/'));
      await fs.mkdir(path.dirname(assetPath), { recursive: true });
      await fs.writeFile(assetPath, buf);
      console.log(`  ok ${asset} (${(buf.length / 1048576).toFixed(1)}MB)`);
    }

    await replaceSnapshot(outDir, stageDir);
  } catch (error) {
    await fs.rm(stageDir, { recursive: true, force: true });
    throw error;
  }

  console.log(`Pulled ${files.length} panoramas from "${sourceSlug}" into "${deliverySlug}"`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
