import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('../dist/assets/shared-store.js', import.meta.url), 'utf8');
const oldPath = 'plan/references/photo.jpg';
const record = {
  id: 'plan', map: 'club', side: 'attack', site: '2-2', floor: 2,
  title: 'Synthetic plan', authorId: 'tester', author: 'Tester', operators: [], steps: [],
  previousReferences: [{ path: oldPath }],
  references: [{ id: 'photo', path: oldPath, image: 'https://example.invalid/saved.jpg', label: 'Other', note: '' }]
};

// The real adapter runs against an in-memory fake: no credentials or network.
function harness({ databaseError = false, uploadError = false, cleanupError = false } = {}) {
  const calls = [];
  const values = new Map();
  const media = new Map([[oldPath, 'original image']]);
  let payload;
  const client = {
    storage: { from(bucket) {
      assert.equal(bucket, 'strategy-media');
      return {
        async upload(path) {
          calls.push(['upload', path]);
          if (uploadError) return { error: new Error('Upload unavailable') };
          media.set(path, 'new image');
          return {};
        },
        async remove(paths) {
          calls.push(['remove', ...paths]);
          if (cleanupError) return { error: new Error('Cleanup unavailable') };
          paths.forEach(path => media.delete(path));
          return {};
        },
        async createSignedUrl(path) { return { data: { signedUrl: `https://example.invalid/${path}` } }; }
      };
    } },
    from(table) {
      assert.equal(table, 'strategies');
      return { upsert(next) {
        calls.push(['save']);
        payload = next;
        return { select() { return { async single() {
          if (databaseError) return { error: new Error('Database unavailable') };
          return { data: { ...next, created_at: '2026-10-17T00:00:00Z', updated_at: '2026-10-17T00:00:00Z' } };
        } }; } };
      } };
    }
  };
  const context = vm.createContext({
    window: { supabase: { createClient: () => client } },
    localStorage: { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) },
    crypto: { randomUUID: () => 'new-version' },
    atob: value => Buffer.from(value, 'base64').toString('binary'), Uint8Array, Blob,
    console: { warn: (...args) => calls.push(['warning', args[0]]) }
  });
  vm.runInContext(source, context);
  return {
    store: context.window.createSquadbookStore({ url: 'https://example.invalid', publishableKey: 'synthetic' }),
    calls, media, payload: () => payload
  };
}

test('failed database save preserves a removed screenshot', async () => {
  const h = harness({ databaseError: true });
  await assert.rejects(h.store.saveStrategy({ ...record, references: [] }), /Database unavailable/);
  assert.equal(h.media.get(oldPath), 'original image');
  assert.ok(!h.calls.some(([kind]) => kind === 'remove'));
});

test('failed replacement save does not overwrite or remove the saved image', async () => {
  const h = harness({ databaseError: true });
  await assert.rejects(h.store.saveStrategy({ ...record, references: [{ ...record.references[0], image: 'data:image/jpeg;base64,YQ==' }] }), /Database unavailable/);
  assert.equal(h.media.get(oldPath), 'original image');
  assert.notEqual(h.calls.find(([kind]) => kind === 'upload')[1], oldPath);
  assert.ok(!h.calls.some(([kind]) => kind === 'remove'));
});

test('failed upload preserves the saved image and does not save metadata', async () => {
  const h = harness({ uploadError: true });
  await assert.rejects(h.store.saveStrategy({ ...record, references: [{ ...record.references[0], image: 'data:image/jpeg;base64,YQ==' }] }), /Upload unavailable/);
  assert.equal(h.media.get(oldPath), 'original image');
  assert.ok(!h.calls.some(([kind]) => kind === 'save' || kind === 'remove'));
});

test('successful replacement commits its new path before deleting old media', async () => {
  const h = harness();
  const saved = await h.store.saveStrategy({ ...record, references: [{ ...record.references[0], image: 'data:image/jpeg;base64,YQ==' }] });
  assert.equal(saved.references[0].path, 'plan/references/photo-new-version.jpg');
  assert.equal(h.media.get(saved.references[0].path), 'new image');
  assert.equal(h.media.has(oldPath), false);
  assert.deepEqual(h.calls.map(([kind]) => kind), ['upload', 'save', 'remove']);
});

test('cleanup failure still returns and caches the committed record', async () => {
  const h = harness({ cleanupError: true });
  const saved = await h.store.saveStrategy({ ...record, references: [] });
  assert.equal(saved.references.length, 0);
  assert.equal((await h.store.loadCachedStrategies())[0].id, record.id);
  assert.equal(h.media.get(oldPath), 'original image');
  assert.ok(h.calls.some(([kind]) => kind === 'warning'));
});

test('metadata-only edits keep the existing media without upload or deletion', async () => {
  const h = harness();
  const saved = await h.store.saveStrategy(record);
  assert.equal(saved.references[0].path, oldPath);
  assert.deepEqual(h.calls.map(([kind]) => kind), ['save']);
});

test('Power Spots preserve multiple applicable sites through shared save and cache', async () => {
  const h = harness();
  const saved = await h.store.saveStrategy({ ...record, side: 'defense', entryType: 'power-spot', applicableSites: ['2-2', '0-4'] });
  assert.equal(h.payload().entry_type, 'power-spot');
  assert.deepEqual(h.payload().applicable_sites, ['2-2', '0-4']);
  assert.deepEqual(saved.applicableSites, ['2-2', '0-4']);
  assert.equal(saved.entryType, 'power-spot');
  assert.deepEqual(Array.from((await h.store.loadCachedStrategies())[0].applicableSites), ['2-2', '0-4']);
});

test('existing strategies do not require the Power Spot column before migration', async () => {
  const h = harness();
  await h.store.saveStrategy(record);
  assert.equal('applicable_sites' in h.payload(), false);
});

test('operator alternative slots survive shared save and cache without changing legacy singletons', async () => {
  const h = harness();
  const saved = await h.store.saveStrategy({ ...record, operators: ['thermite|ace', 'nomad'] });
  assert.deepEqual(h.payload().operators, ['thermite|ace', 'nomad']);
  assert.deepEqual(saved.operators, ['thermite|ace', 'nomad']);
  assert.deepEqual(Array.from((await h.store.loadCachedStrategies())[0].operators), ['thermite|ace', 'nomad']);
});

test('Flank Watch preserves attack category, applicable sites and lineup alternatives', async () => {
  const h = harness();
  const saved = await h.store.saveStrategy({ ...record, entryType: 'flank-watch', applicableSites: ['2-2', '0-4'], operators: ['nomad|gridlock'] });
  assert.equal(h.payload().entry_type, 'flank-watch');
  assert.deepEqual(h.payload().applicable_sites, ['2-2', '0-4']);
  assert.equal(saved.entryType, 'flank-watch');
  assert.deepEqual(saved.operators, ['nomad|gridlock']);
  assert.deepEqual(Array.from((await h.store.loadCachedStrategies())[0].applicableSites), ['2-2', '0-4']);
});
