import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { validateSlug } from './pull-tour.mjs';

export async function createBuildSpec(slug, imageTag, root = process.cwd()) {
  const safeSlug = validateSlug(slug);
  const tag = imageTag || 'site-tour-viewer:latest';
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._/:@-]*$/.test(tag)) {
    throw new Error(`invalid image tag: ${tag}`);
  }

  const configPath = path.join(
    root,
    'deliverables',
    'tours',
    safeSlug,
    'tour.config.json',
  );
  try {
    await fs.access(configPath);
  } catch {
    throw new Error(`tour snapshot not found: ${safeSlug}`);
  }

  return {
    tag,
    args: [
      'build',
      '-f', 'Dockerfile.viewer',
      '--build-arg', `SLUG=${safeSlug}`,
      '--build-context', `tour=${path.dirname(configPath)}`,
      '-t', tag,
      '.',
    ],
  };
}

async function main() {
  const spec = await createBuildSpec(process.argv[2], process.argv[3]);
  const result = spawnSync('docker', spec.args, { stdio: 'inherit', shell: false });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
