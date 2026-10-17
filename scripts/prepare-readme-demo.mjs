import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// An isolated, local-only copy for documentation captures. Never seed the app
// or a configured Supabase project with these illustrative records.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const destination = resolve(process.argv[2] || join(root, 'work/readme-demo/site'));
if (existsSync(destination)) throw new Error(`Choose a new demo directory: ${destination}`);
mkdirSync(dirname(destination), { recursive: true });
cpSync(join(root, 'dist'), destination, {
  recursive: true,
  filter: source => !['supabase-config.json', 'supabase-config.js'].includes(source.split(/[\\/]/).at(-1))
});

const profile = { id: 'readme-demo-player', name: 'Demo Squad', photo: '' };
const reference = (id, image, label, note) => ({ id, image, label, note, path: '' });
const base = {
  map: 'club', side: 'attack', author: profile.name, authorId: profile.id,
  editor: '', editorId: '', operators: [], steps: [], entryType: 'strategy',
  createdAt: 1792195200000, updatedAt: 1792195200000
};
const records = [
  { ...base, id: 'demo-cctv', title: 'CCTV / Cash execute', site: '2-2', floor: 2,
    operators: ['ace', 'thatcher', 'sledge', 'nomad', 'ying'],
    steps: ['Assign roles', 'Check the reference', 'Call the plant', 'Cover the exit'],
    references: [
      reference('overview', 'assets/blueprints/club/2.jpg', 'Plant Spot', 'Demo reference · add your own in-game screenshot.'),
      reference('approach', 'assets/maps/club.jpg', 'Map Control', 'Demo reference · note the squad callout here.')
    ] },
  { ...base, id: 'demo-basement', title: 'Church / Arsenal clear', site: '0-4', floor: 0,
    operators: ['hibana', 'buck', 'dokkaebi'],
    references: [reference('basement', 'assets/blueprints/club/0.jpg', 'Map Control', 'Illustrative demo reference.')] },
  { ...base, id: 'demo-gym', title: 'Gym / Bedroom approach', site: '2-1', floor: 2,
    operators: ['thermite', 'nomad', 'twitch'],
    references: [reference('exterior', 'assets/maps/club.jpg', 'Other', 'Illustrative demo reference.')] },
  { ...base, id: 'demo-drone', title: 'Drone reference', site: '2-2', floor: 2,
    entryType: 'setup', setupType: 'Drone Placement',
    references: [reference('drone', 'assets/blueprints/club/2.jpg', 'Drone Placement', 'Demo only · replace with the exact drone view.')] },
  { ...base, id: 'demo-angle', title: 'Basement angle', site: '0-4', floor: 0,
    entryType: 'setup', setupType: 'Angle / LOS',
    references: [reference('angle', 'assets/blueprints/club/0.jpg', 'Angle / LOS', 'Demo only · replace with the exact angle.')] }
];
const seed = `// Synthetic README fixture; local browser storage on the demo origin only.\n` +
  `localStorage.setItem('squadbook.playerProfile', ${JSON.stringify(JSON.stringify(profile))});\n` +
  `localStorage.setItem('squadbook.strategies.v1', ${JSON.stringify(JSON.stringify(records))});\n`;
writeFileSync(join(destination, 'demo-seed.js'), seed);
const htmlPath = join(destination, 'index.html');
const html = readFileSync(htmlPath, 'utf8');
const marker = '  <script src="assets/vendor/supabase-2.117.1.min.js"></script>';
if (!html.includes(marker)) throw new Error('App script entry point changed; review the demo fixture.');
writeFileSync(htmlPath, html.replace(marker, '  <script src="demo-seed.js"></script>\n' + marker));
console.log(`Prepared synthetic local-only README demo: ${destination}`);
console.log(`python -m http.server 4187 --bind 127.0.0.1 --directory "${destination}"`);
