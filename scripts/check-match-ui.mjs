import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

// Exercise the real UI logic with synthetic data and an in-memory store only.
// This intentionally does not initialize the app, fetch data, or load its adapter.
const htmlPath = fileURLToPath(new URL('../dist/index.html', import.meta.url));
const html = readFileSync(htmlPath, 'utf8');
const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)?.[1];
assert.ok(inline, 'App inline script exists');
const source = inline.slice(0, inline.lastIndexOf('\n    initialize();'));

class Element {
  constructor() {
    this.value = '';
    this.hidden = false;
    this.disabled = false;
    this.open = false;
    this.textContent = '';
    this.dataset = {};
    this.style = {};
    this.options = [];
    this.children = [];
    this.handlers = new Map();
    this.previousElementSibling = { textContent: '' };
    const classes = new Set();
    this.classList = { add: (...names) => names.forEach(name => classes.add(name)), remove: (...names) => names.forEach(name => classes.delete(name)), contains: name => classes.has(name) };
  }
  set innerHTML(value) {
    this._html = value;
    this.children = [];
    this.options = [...value.matchAll(/<option\b([^>]*)>([\s\S]*?)<\/option>/g)].map(match => ({ value: match[1].match(/value="([^"]*)"/)?.[1] || '', textContent: match[2].replace(/<[^>]*>/g, ''), selected: /\bselected\b/.test(match[1]) }));
    if (this.options.length) this.value = (this.options.find(option => option.selected) || this.options[0]).value;
    for (const match of value.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)) {
      const child = new Element();
      child.textContent = match[2].replace(/<[^>]*>/g, '');
      for (const attribute of match[1].matchAll(/data-([a-z-]+)="([^"]*)"/g)) {
        child.dataset[attribute[1].replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = attribute[2];
      }
      child.attributes = match[1];
      this.children.push(child);
    }
  }
  get innerHTML() { return this._html || ''; }
  get selectedOptions() { return this.options.filter(option => option.value === this.value); }
  matches(selector) {
    if (selector === 'button') return true;
    const key = selector.match(/^\[data-([a-z-]+)\]$/)?.[1]?.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    return key ? key in this.dataset : false;
  }
  closest(selector) { return this.matches(selector) ? this : null; }
  querySelectorAll(selector) { return this.children.filter(child => child.matches(selector)); }
  querySelector(selector) {
    if (selector === '[type="submit"]') return this.submitButton ||= new Element();
    return this.querySelectorAll(selector)[0] || null;
  }
  addEventListener(type, handler) {
    const handlers = this.handlers.get(type) || [];
    handlers.push(handler);
    this.handlers.set(type, handlers);
  }
  async dispatch(type, target = this) {
    for (const handler of this.handlers.get(type) || []) await handler({ target, preventDefault() {} });
  }
  setAttribute(name, value) { this[name] = value; }
  removeAttribute(name) { delete this[name]; }
  showModal() { this.open = true; }
  close() { this.open = false; }
  focus() {}
  append() {}
  replaceChildren() {}
}

const elements = new Map();
const element = selector => {
  if (!elements.has(selector)) elements.set(selector, new Element());
  return elements.get(selector);
};
const checkpointInputs = Array.from({ length: 4 }, () => new Element());
const sideButtons = ['attack', 'defense'].map(side => Object.assign(new Element(), { dataset: { side } }));
const document = {
  querySelector: element,
  querySelectorAll: selector => selector === '#checkpoint-grid input' ? checkpointInputs : selector === '[data-side]' ? sideButtons : [...elements.values()].flatMap(node => node.querySelectorAll(selector)),
  body: new Element(),
};
element('#side').value = 'attack';
element('#blueprint-card').hidden = true;
const alerts = [];
const context = vm.createContext({
  document,
  window: { addEventListener() {}, scrollTo() {}, scrollBy() {} },
  crypto: { randomUUID: (() => { let id = 0; return () => `synthetic-${++id}`; })() },
  requestAnimationFrame: callback => callback(),
  alert: message => alerts.push(message),
  confirm: () => true,
  console,
  Date,
});
vm.runInContext(`${source}\nglobalThis.harness = {
  populateMaps, renderStrategies, openStrategyEditor,
  seed(next) { maps = next.maps; sitesByMap = next.sites; strategies = normalizeStrategies(next.records); playerProfile = {id:'tester',name:'Tester'}; store = next.store; browseFloor = 'all'; browseSite = 'all'; },
  records() { return strategies; },
  references(next) { pendingReferences = next; },
};`, context, { filename: htmlPath });
const api = context.harness;
const maps = [{ id: 'club', name: 'Clubhouse', minFloorNumber: 0, maxFloorNumber: 3 }, { id: 'bank', name: 'Bank', minFloorNumber: 0, maxFloorNumber: 3 }];
const sites = { club: [{ id: 'basement', label: 'B Church / Arsenal', floor: 0 }, { id: 'upstairs', label: '2F CCTV / Cash', floor: 2 }], bank: [{ id: 'bank-site', label: 'B Lockers / CCTV', floor: 0 }] };
const record = (id, site, floor, side = 'attack', entryType = 'strategy', map = 'club') => ({ id, title: id, site, floor, side, entryType, map, author: 'Tester', authorId: 'tester', operators: [], steps: [], references: [] });
const saves = [];
const store = { mode: 'local', async saveStrategy(value) { saves.push(value); return value; } };
const reseed = records => { api.seed({ maps, sites, records, store }); api.populateMaps(); api.renderStrategies(); };
const ids = selector => element(selector).querySelectorAll('[data-id]').map(node => node.dataset.id);
const clickChip = async (container, key, value) => {
  const chip = element(container).children.find(node => node.dataset[key] === value);
  assert.ok(chip, `Chip ${key}=${value} exists`);
  await element(container).dispatch('click', chip);
};

reseed([
  record('attack-low', 'basement', 0),
  record('attack-high', 'upstairs', 2),
  record('defense-low', 'basement', 0, 'defense'),
  record('attack-setup', 'upstairs', 2, 'attack', 'setup'),
  record('other-map', 'bank-site', 0, 'attack', 'strategy', 'bank'),
]);
assert.deepEqual(ids('#strategy-list'), ['attack-low', 'attack-high'], 'Initially show every selected-side strategy across sites');
assert.deepEqual(ids('#setup-list'), ['attack-setup'], 'Initially show selected-side setups');
await element('#side-switch').dispatch('click', sideButtons[1]);
assert.deepEqual(ids('#strategy-list'), ['defense-low'], 'Defense toggle isolates defense');
assert.deepEqual(ids('#setup-list'), [], 'Defense excludes attack setups');
await element('#side-switch').dispatch('click', sideButtons[0]);
await clickChip('#floor-chips', 'floor', '2');
assert.deepEqual(ids('#strategy-list'), ['attack-high'], 'Floor filter limits strategies');
assert.deepEqual(ids('#setup-list'), ['attack-setup'], 'Floor filter limits setups');
await clickChip('#floor-chips', 'floor', 'all');
await clickChip('#site-chips', 'site', 'basement');
assert.deepEqual(ids('#strategy-list'), ['attack-low'], 'Site filter limits strategies');
assert.deepEqual(ids('#setup-list'), [], 'Site filter limits setups');
assert.ok(!element('#strategy-list').innerHTML.includes('data-default-plan'), 'A filtered empty site is not presented as a missing map-wide plan');

reseed([record('setup-only', 'upstairs', 2, 'attack', 'setup')]);
const draft = element('#strategy-list').querySelector('[data-default-plan]');
assert.ok(draft, 'A side with no real plan has a virtual default');
assert.equal(element('#result-count').textContent, '0', 'Virtual default is not a persisted strategy count');
await draft.dispatch('click');
assert.equal(element('#strategy-title').value, 'Default attack plan', 'Default opens a named editor');
assert.equal(element('#strategy-id').value, '', 'Default opens a new entry');
assert.equal(api.records().length, 1, 'Default click does not append a record');
assert.equal(saves.length, 0, 'Default click does not save');
element('#strategy-dialog').close();

await clickChip('#site-chips', 'site', 'basement');
api.openStrategyEditor();
element('#strategy-title').value = 'New plan';
element('#strategy-location').value = 'upstairs';
await element('#strategy-location').dispatch('change');
assert.ok(element('#strategy-context').textContent.includes('2F CCTV / Cash'), 'Changing editor site updates context');
assert.equal(element('#floor').value, '0', 'Editor selection does not rely on browsing floor');
await element('#strategy-form').dispatch('submit');
assert.equal(saves.at(-1).site, 'upstairs', 'New strategy saves editor bomb site');
assert.equal(saves.at(-1).floor, 2, 'New strategy saves site-owned floor');
assert.equal(saves.at(-1).entryType, 'strategy', 'New strategy retains entry type');
assert.ok(ids('#strategy-list').includes(saves.at(-1).id), 'A different editor site adjusts browse filters so the saved card stays visible');

await element('#side-switch').dispatch('click', sideButtons[1]);
api.openStrategyEditor(null, 'setup');
element('#strategy-title').value = 'New camera';
element('#strategy-location').value = 'upstairs';
api.references([{ id: 'photo', label: 'Other', note: ' square ', image: 'data:image/png;base64,synthetic', path: '' }]);
await element('#strategy-form').dispatch('submit');
assert.equal(saves.at(-1).site, 'upstairs', 'New setup saves editor bomb site');
assert.equal(saves.at(-1).floor, 2, 'New setup saves site-owned floor');
assert.equal(saves.at(-1).entryType, 'setup', 'New setup retains entry type');
assert.equal(saves.at(-1).side, 'defense', 'New setup saves selected side');
assert.equal(saves.at(-1).references[0].label, 'Camera Placement', 'Setup photo uses setup type');
assert.equal(saves.at(-1).references[0].note, 'square', 'Setup note is trimmed');

const original = { ...record('existing-id', 'upstairs', 2, 'defense', 'setup'), setupType: 'Wall Setup', createdAt: 42, author: 'Original', authorId: 'original', references: [{ id: 'existing-photo', label: 'Wall Setup', note: '', image: 'synthetic-existing', path: 'existing.png' }] };
reseed([original]);
api.openStrategyEditor(api.records()[0]);
assert.equal(element('#strategy-location').value, 'upstairs', 'Edit uses existing site');
element('#strategy-title').value = 'Moved setup';
element('#strategy-location').value = 'basement';
await element('#strategy-form').dispatch('submit');
assert.equal(saves.at(-1).id, 'existing-id', 'Edit retains stable id');
assert.equal(saves.at(-1).site, 'basement', 'Edit supports site move');
assert.equal(saves.at(-1).floor, 0, 'Edit updates destination floor');
assert.equal(saves.at(-1).entryType, 'setup', 'Edit retains setup type');
assert.equal(saves.at(-1).createdAt, 42, 'Edit retains creation time');
assert.equal(saves.at(-1).authorId, 'original', 'Edit retains creator');
assert.equal(saves.at(-1).editorId, 'tester', 'Edit records latest editor');
assert.equal(api.records().length, 1, 'Edit replaces existing record');
assert.equal(alerts.length, 0, 'All valid saves succeed without alerts');
console.log('Passed: selected-side all-site results, side/floor/site filters, virtual default, new strategy/setup location, and edit/move identity. No shared storage or browser APIs used.');
