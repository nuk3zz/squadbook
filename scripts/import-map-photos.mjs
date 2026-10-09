// Import the official Ubisoft catalog's exterior/keyart images as small JPEGs.
// Requires Node 18+ and macOS sips. Attribution lives in map-photos.json.
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const run = promisify(execFile);
const root = fileURLToPath(new URL('../', import.meta.url));
const catalogUrl = 'https://www.ubisoft.com/en-us/game/rainbow-six/siege/game-info/maps';
const aliases = {
  club: 'clubhouse', casino: 'calypso-casino', emerald: 'emerald-plains',
  hereford: 'hereford-base', kafe: 'kafe-dostoyevsky', labs: 'nighthaven-labs',
  plane: 'presidential-plane', stadiumalpha: 'stadium-alpha',
  stadiumbravo: 'stadium-bravo', themepark: 'theme-park',
};
const excluded = new Set(['bartlett', 'closequarters', 'district']);
// Their current catalog cards use interiors; these official images show exteriors.
const exteriorImages = {
  consulate: 'https://staticctf.ubisoft.com/J3yJr34U2pZ2Ieem48Dwy9uqj5PNUQTn/6PR2sBla9E6TNurVUfJ0mc/5c9b8d1b0da4bad3a577104f2f9a9291/ModernizedMap_Consulate_meta.jpg',
  lair: 'https://staticctf.ubisoft.com/J3yJr34U2pZ2Ieem48Dwy9uqj5PNUQTn/5IDuFIeUKutcVCNi4kYeLP/de27e964c81361b2616608f862a94675/ModernizedMap_Lair_meta.jpg',
  labs: 'https://staticctf.ubisoft.com/J3yJr34U2pZ2Ieem48Dwy9uqj5PNUQTn/1D0ACxAFvDqM0t2IloFBDJ/9cef51e080d37730bed650106f7bf1b6/Nighthaven_Labs.jpg',
};
const metadata = JSON.parse(await readFile(join(root, 'dist/data/map-metadata.json'), 'utf8'));
const requested = new Set(process.argv.slice(2));
const maps = metadata.maps.filter(map => !excluded.has(map.id) && (!requested.size || requested.has(map.id)));
if (!maps.length) throw new Error('No supported maps selected');

const catalogResponse = await fetch(catalogUrl);
if (!catalogResponse.ok) throw new Error(`Catalog HTTP ${catalogResponse.status}`);
const catalog = await catalogResponse.text();
const cards = [...catalog.matchAll(/<a[^>]+class="maplist__card"[^>]+href="([^"]+)"[^>]*><img[^>]+src="([^"]+)"[^>]+alt="([^"]+)"/g)]
  .map(match => ({ slug: match[1].split('/').at(-1), image: match[2] }));
for (const map of maps) {
  if (!cards.some(card => card.slug === (aliases[map.id] || map.id))) {
    throw new Error(`Official map image unavailable: ${map.name}`);
  }
}

const output = join(root, 'dist/assets/maps');
await mkdir(output, { recursive: true });
const temporary = await mkdtemp(join(tmpdir(), 'squadbook-map-photos-'));
let total = 0;
try {
  let next = 0;
  const worker = async () => {
    while (next < maps.length) {
      const map = maps[next++];
      const card = cards.find(item => item.slug === (aliases[map.id] || map.id));
      const response = await fetch(exteriorImages[map.id] || card.image);
      if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) {
        throw new Error(`${map.name}: invalid image response (${response.status})`);
      }
      const original = join(temporary, `${map.id}.source`);
      const destination = join(output, `${map.id}.jpg`);
      await writeFile(original, Buffer.from(await response.arrayBuffer()));
      await run('/usr/bin/sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '72', '--resampleWidth', '360', original, '--out', destination]);
      const size = (await stat(destination)).size;
      total += size;
      console.log(`${map.id}: ${(size / 1024).toFixed(1)} KB`);
    }
  };
  // Await every worker before deleting only this run's temporary originals.
  const results = await Promise.allSettled(Array.from({ length: Math.min(4, maps.length) }, worker));
  const failed = results.find(result => result.status === 'rejected');
  if (failed) throw failed.reason;
  console.log(`${maps.length} map photos: ${(total / 1024).toFixed(1)} KB total`);
} finally {
  await rm(temporary, { recursive: true, force: true });
}
