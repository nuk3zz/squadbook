import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const dist = new URL('dist/', root);
const read = path => readFileSync(new URL(path, root), 'utf8');
const json = path => JSON.parse(read(path));
const requireAsset = path => assert.ok(existsSync(new URL(path.split('?')[0], dist)), `Missing asset: ${path}`);
const html = read('dist/index.html');
for (const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) {
  new vm.Script(match[1], { filename: 'dist/index.html inline script' });
}
for (const path of ['dist/assets/shared-store.js', 'dist/sw.js']) new vm.Script(read(path), { filename: path });
for (const match of html.matchAll(/(?:src|href)="([^"<>]+)"/g)) {
  const path = match[1];
  if (!path.includes('${') && !/^(?:#|[a-z]+:|\/\/)/i.test(path)) requireAsset(path);
}
const shell = vm.runInNewContext(`${read('dist/sw.js').split('self.addEventListener')[0]}\nAPP_SHELL`);
shell.forEach(requireAsset);
const adapter = html.match(/src="(assets\/shared-store\.js\?v=\d+)"/)[1];
assert.ok(shell.includes(`./${adapter}`), 'App and service worker use the same adapter version');
for (const icon of json('dist/manifest.webmanifest').icons) requireAsset(icon.src);
const excluded = new Set(['bartlett', 'closequarters', 'district']);
const maps = json('dist/data/map-metadata.json').maps.filter(map => !excluded.has(map.id));
const sites = json('dist/data/bomb-sites.json');
assert.equal(maps.length, 26);
let siteCount = 0;
for (const map of maps) {
  requireAsset(`assets/maps/${map.id}.jpg`);
  assert.ok(sites[map.id]?.length, `No sites for ${map.id}`);
  assert.equal(new Set(sites[map.id].map(site => site.id)).size, sites[map.id].length, `Duplicate site IDs for ${map.id}`);
  for (let floor = map.minFloorNumber; floor < map.maxFloorNumber; floor += 1) requireAsset(`assets/blueprints/${map.id}/${floor}.jpg`);
  for (const site of sites[map.id]) {
    requireAsset(`assets/blueprints/${map.id}/${site.floor}.jpg`);
    siteCount += 1;
  }
}
const operatorSource = html.match(/const operatorIdsBySide = (\{[\s\S]*?\n    \});/)[1];
const operators = Object.values(vm.runInNewContext(`(${operatorSource})`)).flat();
for (const slug of operators) requireAsset(`assets/operators/${slug}.svg`);
for (const path of ['start-local.sh', 'start-local.command']) assert.ok(!read(path).includes('\r'), `${path} must retain LF line endings`);
for (const name of readdirSync(new URL('dist/data/', root))) {
  if (name.endsWith('.json') && name !== 'supabase-config.json') json(`dist/data/${name}`);
}
console.log(`Passed: JavaScript/JSON syntax, ${maps.length} maps, ${siteCount} sites, ${operators.length} operator references, runtime assets, PWA shell, adapter versions, and Unix launcher line endings.`);
