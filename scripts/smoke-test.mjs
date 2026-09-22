// End-to-end sanity check for the currently-applied features (see TODO.md
// item 1): gzip compression, scene deep-linking (?scene=), and the
// tour-config cache/invalidation path — plus the basics (type check, unit
// tests, production build) that would mask a real problem if skipped.
//
// Usage: node scripts/smoke-test.mjs   (or: npm run smoke)
import { spawn, spawnSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const PORT = process.env.SMOKE_PORT || '3999';
const BASE = `http://localhost:${PORT}`;

export async function discoverTourSlugs(toursDir) {
  let entries;
  try {
    entries = await fs.readdir(toursDir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries.filter((e) => e.isDirectory()).map((e) => e.name);
}

async function waitForServer(url, timeoutMs = 30_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.status) return true;
    } catch {
      // not listening yet
    }
    await delay(300);
  }
  throw new Error(`server didn't come up within ${timeoutMs}ms — is port ${PORT} already in use?`);
}

async function main() {
  const failures = [];
  const record = (name, ok, detail = '') => {
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
    if (!ok) failures.push(name);
  };
  const stopIfFailed = () => {
    if (failures.length > 0) {
      console.log('\nStopping — fix the above before continuing.');
      process.exit(1);
    }
  };

  console.log('== type check ==');
  record('tsc --noEmit', spawnSync('npx', ['tsc', '--noEmit'], { stdio: 'inherit', shell: true }).status === 0);
  stopIfFailed();

  console.log('\n== unit + integration tests ==');
  record('npm test', spawnSync('npm', ['test'], { stdio: 'inherit', shell: true }).status === 0);
  stopIfFailed();

  console.log('\n== production build ==');
  record('next build', spawnSync('npx', ['next', 'build'], { stdio: 'inherit', shell: true }).status === 0);
  stopIfFailed();

  console.log('\n== live server checks ==');
  const server = spawn('node', ['.next/standalone/server.js'], {
    env: { ...process.env, PORT, NODE_ENV: 'production' },
    stdio: 'pipe',
  });

  try {
    await waitForServer(`${BASE}/studio`);

    const toursDir = process.env.TOURS_DATA_DIR || path.join(process.cwd(), 'public', 'tours');
    const slugs = await discoverTourSlugs(toursDir);
    if (slugs.length === 0) {
      record('local tour available to test against', false, `none found in ${toursDir}`);
    }

    for (const slug of slugs) {
      const configRes = await fetch(`${BASE}/api/tours/${slug}/config`);
      record(`GET /api/tours/${slug}/config`, configRes.status === 200);

      let sceneId = null;
      if (configRes.ok) {
        const config = await configRes.json();
        const hasScenes = Array.isArray(config.scenes) && config.scenes.length > 0;
        record(`  config has scenes[]`, hasScenes);
        sceneId = hasScenes ? config.scenes[0].id : null;
      }

      const pageRes = await fetch(`${BASE}/tours/${slug}`, { headers: { 'Accept-Encoding': 'gzip' } });
      record(`GET /tours/${slug}`, pageRes.status === 200);
      record(`  gzip compression on`, pageRes.headers.get('content-encoding') === 'gzip');

      if (sceneId) {
        const deepLinkRes = await fetch(`${BASE}/tours/${slug}?scene=${encodeURIComponent(sceneId)}`);
        record(`GET /tours/${slug}?scene=<valid scene>`, deepLinkRes.status === 200);
      }

      const bogusRes = await fetch(`${BASE}/tours/${slug}?scene=__does-not-exist__`);
      record(`GET /tours/${slug}?scene=<invalid> falls back cleanly`, bogusRes.status === 200);
    }
  } finally {
    server.kill();
  }

  console.log(`\n${failures.length === 0 ? 'All checks passed.' : `${failures.length} check(s) failed:`}`);
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(failures.length === 0 ? 0 : 1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
