// Shows all panoramas in timestamp order alongside their tour.config.json mapping.
// Use this to verify scene IDs, zones, and to calibrate hotspotYaw / arrivalYaw.
// Usage: node scripts/list-panoramas.js

const http = require('http');
const fs = require('fs');
const path = require('path');

const TOUR_DIR = path.join(__dirname, '..', 'public', 'tours', 'office-demo');
const PANORAMA_DIR = path.join(TOUR_DIR, 'panoramas');
const CONFIG_PATH = path.join(TOUR_DIR, 'tour.config.json');

const files = fs.readdirSync(PANORAMA_DIR)
  .filter((f) => /\.jpg$/i.test(f))
  .sort();

const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));

// Build a lookup: panorama filename → scene config
const sceneByFile = {};
for (const scene of config.scenes) {
  const filename = scene.panorama.split('/').pop();
  sceneByFile[filename] = scene;
}

const zoneColors = {
  reception: '#4f9de0',
  lounge: '#e0914f',
  'work-area': '#5ec25e',
  'meeting-rooms': '#c25e9a',
  cabins: '#c2a85e',
};

function linkRow(link) {
  return `<tr>
    <td>→ ${link.toScene}</td>
    <td>${link.hotspotYaw}°</td>
    <td>${link.hotspotPitch}°</td>
    <td>${link.arrivalYaw}°</td>
  </tr>`;
}

const rows = files.map((f, i) => {
  const scene = sceneByFile[f];
  const zoneColor = scene ? (zoneColors[scene.zone] || '#888') : '#555';
  const sceneInfo = scene
    ? `<div class="scene-id">${scene.id}</div>
       <div class="scene-label">${scene.label}</div>
       <div class="scene-zone" style="background:${zoneColor}22;border-color:${zoneColor}">${scene.zone}</div>
       ${scene.links.length > 0 ? `
       <table class="links">
         <thead><tr><th>To</th><th>hotspotYaw</th><th>hotspotPitch</th><th>arrivalYaw</th></tr></thead>
         <tbody>${scene.links.map(linkRow).join('')}</tbody>
       </table>` : '<div class="no-links">no links (dead end)</div>'}`
    : '<div class="unmapped">⚠ not in config</div>';

  return `
  <div class="row">
    <div class="num">${String(i + 1).padStart(2, '0')}</div>
    <img src="/tours/office-demo/panoramas/${f}" alt="${f}" />
    <div class="meta">
      <div class="filename">${f}</div>
      ${sceneInfo}
    </div>
  </div>`;
}).join('');

const html = `<!DOCTYPE html>
<html>
<head>
<title>Panorama Inventory — ${config.meta.title}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: monospace; background: #0e0e0e; color: #ddd; padding: 2rem; margin: 0; }
  h2 { color: #fff; margin-bottom: 0.25rem; }
  p.sub { color: #555; margin-bottom: 2rem; font-size: 13px; }
  .row {
    display: flex; gap: 1.25rem; align-items: flex-start;
    margin-bottom: 1.25rem; padding: 1rem;
    background: #1a1a1a; border-radius: 10px;
    border: 1px solid #2a2a2a;
  }
  .num { color: #444; min-width: 2rem; font-size: 18px; font-weight: bold; padding-top: 4px; }
  img { width: 360px; height: 180px; object-fit: cover; border-radius: 6px; flex-shrink: 0; }
  .meta { flex: 1; }
  .filename { color: #555; font-size: 11px; margin-bottom: 6px; }
  .scene-id { color: #7c83fd; font-size: 15px; font-weight: bold; margin-bottom: 2px; }
  .scene-label { color: #eee; font-size: 14px; margin-bottom: 6px; }
  .scene-zone {
    display: inline-block; font-size: 11px; padding: 2px 8px;
    border-radius: 12px; border: 1px solid; margin-bottom: 8px;
  }
  .unmapped { color: #f66; font-size: 13px; }
  .no-links { color: #666; font-size: 12px; font-style: italic; }
  table.links { border-collapse: collapse; font-size: 12px; width: 100%; }
  table.links th { color: #666; text-align: left; padding: 2px 8px 2px 0; font-weight: normal; }
  table.links td { color: #aaa; padding: 2px 8px 2px 0; }
  table.links td:first-child { color: #7c83fd; }
  .legend { display: flex; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
  .leg { display: flex; align-items: center; gap: 6px; font-size: 12px; }
  .leg-dot { width: 12px; height: 12px; border-radius: 50%; }
</style>
</head>
<body>
<h2>Panorama Inventory — ${files.length} images / ${config.scenes.length} scenes</h2>
<p class="sub">
  To fix directions: for each scene, drag the panorama in the tour at localhost:3001, find where the
  path leads, note the yaw angle shown in PSV (bottom-left), then update hotspotYaw in tour.config.json.
  arrivalYaw = the angle you want to face when arriving from that direction.
</p>
<div class="legend">
  ${Object.entries(zoneColors).map(([z, c]) =>
    `<div class="leg"><div class="leg-dot" style="background:${c}"></div>${z}</div>`
  ).join('')}
</div>
${rows}
</body></html>`;

const server = http.createServer((req, res) => {
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
    return;
  }
  const filePath = path.join(__dirname, '..', 'public', req.url);
  if (fs.existsSync(filePath)) {
    const ext = path.extname(filePath).toLowerCase();
    const ct = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': ct });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404);
    res.end();
  }
});

function tryListen(port) {
  server.listen(port, () => {
    console.log(`Open http://localhost:${port}`);
    console.log('Each row: thumbnail | filename | scene ID + zone | hotspot link table');
  });
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${port} in use, trying ${port + 1}...`);
      server.removeAllListeners('error');
      tryListen(port + 1);
    } else {
      throw err;
    }
  });
}

tryListen(4000);
