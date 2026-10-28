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
  populateMaps, selectMap, renderStrategies, openStrategyEditor, openStrategy, operatorGroups,
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
const reseed = records => { api.seed({ maps, sites, records, store }); api.populateMaps(); api.selectMap("club"); api.renderStrategies(); };
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
assert.deepEqual(ids('#setup-list'), [], 'Legacy attack setups are hidden without deleting their records');
assert.equal(element('#setups-section').hidden, true);
await element('#side-switch').dispatch('click', sideButtons[1]);
assert.deepEqual(ids('#strategy-list'), ['defense-low'], 'Defense toggle isolates defense');
assert.deepEqual(ids('#setup-list'), [], 'Defense excludes attack setups');
await element('#side-switch').dispatch('click', sideButtons[0]);
await clickChip('#floor-chips', 'floor', '2');
assert.deepEqual(ids('#strategy-list'), ['attack-high'], 'Floor filter limits strategies');
assert.deepEqual(ids('#setup-list'), [], 'Attack never displays site setups');
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

// Power Spots are distinct defense records, shared across selected bomb sites.
assert.ok(html.indexOf('id="power-spots-section"') < html.indexOf('aria-labelledby="result-title"'), 'Power Spots precedes Strategies');
await element('#side-switch').dispatch('click', sideButtons[1]);
reseed([{ ...record('multi-site', 'basement', 0, 'defense', 'power-spot'), applicableSites: ['basement', 'upstairs'] },
  record('single-site', 'basement', 0, 'defense', 'power-spot'),
  record('invalid-attack', 'upstairs', 2, 'attack', 'power-spot')]);
assert.deepEqual(ids('#power-spot-list'), ['multi-site', 'single-site']);
assert.deepEqual(ids('#strategy-list'), [], 'Power Spots never appear as strategies');
assert.ok(element('#strategy-list').innerHTML.includes('data-default-plan'), 'Power Spots do not suppress the strategy draft');
assert.equal(element('#power-spots-section').hidden, false);
assert.ok(element('#power-spot-list').innerHTML.includes('B Church / Arsenal · 2F CCTV / Cash'), 'Cards show all applicable sites');
await clickChip('#floor-chips', 'floor', '2');
assert.deepEqual(ids('#power-spot-list'), ['multi-site'], 'A secondary applicable floor includes the Power Spot');
await clickChip('#site-chips', 'site', 'upstairs');
assert.deepEqual(ids('#power-spot-list'), ['multi-site'], 'A secondary applicable site includes the Power Spot');
await element('#side-switch').dispatch('click', sideButtons[0]);
assert.equal(element('#power-spots-section').hidden, true);
assert.deepEqual(ids('#power-spot-list'), [], 'Attack excludes even malformed attack Power Spots');
element('#strategy-dialog').close();
api.openStrategyEditor(null, 'power-spot');
assert.equal(element('#strategy-dialog').open, false, 'Attack cannot open a Power Spot editor');
await element('#side-switch').dispatch('click', sideButtons[1]);
api.openStrategyEditor(null, 'power-spot');
assert.equal(element('#power-spot-sites-section').hidden, false);
assert.equal(element('#strategy-location-section').hidden, true);
assert.equal(element('#strategy-form-title').textContent, 'Add Power Spot');
element('#strategy-title').value = 'Shared hold';
const togglePowerSite = async (id, checked) => {
  const target = new Element();
  target.dataset.powerSpotSite = id;
  target.checked = checked;
  await element('#power-spot-sites').dispatch('change', target);
};
await togglePowerSite('basement', true);
await element('#strategy-form').dispatch('submit');
const savedPowerSpot = saves.at(-1);
assert.equal(savedPowerSpot.entryType, 'power-spot');
assert.deepEqual(Array.from(savedPowerSpot.applicableSites), ['basement', 'upstairs']);
assert.equal(savedPowerSpot.references.length, 0, 'Power Spots can start without photos');
api.openStrategyEditor(savedPowerSpot);
assert.ok(element('#power-spot-sites').innerHTML.includes('data-power-spot-site="upstairs" checked'), 'Editing restores multiple selections');
await togglePowerSite('basement', false);
await element('#strategy-form').dispatch('submit');
assert.equal(saves.at(-1).site, 'upstairs');
assert.equal(saves.at(-1).floor, 2);
assert.deepEqual(Array.from(saves.at(-1).applicableSites), ['upstairs']);
api.openStrategyEditor(saves.at(-1));
await togglePowerSite('upstairs', false);
const saveCount = saves.length;
await element('#strategy-form').dispatch('submit');
assert.equal(saves.length, saveCount, 'Empty applicability is rejected');
assert.equal(alerts.at(-1), 'Select at least one defense bomb site for this Power Spot.');
console.log('Passed: defense-only Power Spots, empty category, multi-site/floor filtering, applicability labels, editor save/edit, and empty-selection rejection.');

reseed([
  { ...record('Blue stairs hold', 'basement', 0, 'defense', 'power-spot'), applicableSites: ['basement', 'upstairs'],
    references: [1, 2, 3].map(i => ({id: `stairs-${i}`, label: 'Power Spot', note: `Stairs angle ${i}`, image: `synthetic-stairs-${i}`})) },
  { ...record('Garage rafters', 'basement', 0, 'defense', 'power-spot'), applicableSites: ['basement'],
    references: [{id:'garage', label:'Power Spot', note:'Garage angle', image:'synthetic-garage'}] },
]);
assert.equal(ids('#power-spot-list').length, 2, 'A site can have multiple titled Power Spots');
assert.ok(element('#power-spot-list').innerHTML.includes('Blue stairs hold'));
assert.ok(element('#power-spot-list').innerHTML.includes('Garage rafters'));
assert.ok(element('#power-spot-list').innerHTML.includes('3 photos'), 'Card shows the number of photos grouped under its title');
api.openStrategy(api.records()[0]);
assert.equal(element('#detail-title').textContent, 'Blue stairs hold');
assert.equal((element('#reference-media').innerHTML.match(/class="reference-card"/g) || []).length, 3, 'All photos appear beneath the selected title');
assert.ok(!element('#reference-media').innerHTML.includes('synthetic-garage'), 'Other Power Spot photos stay in their own title group');
api.openStrategyEditor(api.records()[0]);
assert.equal((element('#reference-editor-list').innerHTML.match(/class="reference-editor"/g) || []).length, 3, 'Editor restores every photo for this title');
console.log('Passed: multiple titled Power Spots per site, multi-photo title groups, gallery separation, and editing multiple photos.');

// Startup defaults to Bank, with a safe fallback when Bank is unavailable.
api.populateMaps();
assert.equal(element('#map').value, 'bank');
api.seed({ maps: [maps[0]], sites, records: [], store });
api.populateMaps();
assert.equal(element('#map').value, 'club');
reseed([]);
await element('#side-switch').dispatch('click', sideButtons[0]);
api.openStrategyEditor();
const chooseOperator = async slug => {
  const button = element('#operator-picker').children.find(node => node.dataset.operator === slug);
  assert.ok(button, `Available operator ${slug}`);
  await element('#operator-picker').dispatch('click', button);
};
const chooseAlternative = async index => {
  const button = element('#operator-lineup-editor').children.find(node => node.dataset.addAlternative === String(index));
  assert.ok(button);
  await element('#operator-lineup-editor').dispatch('click', button);
};
await chooseOperator('thermite');
await chooseAlternative(0);
await chooseOperator('ace');
await chooseOperator('nomad');
element('#strategy-title').value = 'Alternative attack';
await element('#strategy-form').dispatch('submit');
assert.deepEqual(Array.from(saves.at(-1).operators), ['thermite|ace', 'nomad'], 'Alternatives save as one lineup slot, singletons remain unchanged');
api.openStrategy(saves.at(-1));
assert.ok(element('#operators').innerHTML.includes('Thermite or Ace'));
assert.ok(!element('#operators').innerHTML.includes('thermite|ace.svg'), 'Groups never become invalid asset names');
api.openStrategyEditor(saves.at(-1));
assert.ok(element('#operator-lineup-editor').innerHTML.includes('Remove Ace'), 'Edit restores alternatives');
const removeThermite = element('#operator-lineup-editor').children.find(node => node.dataset.removeOperator === 'thermite');
await element('#operator-lineup-editor').dispatch('click', removeThermite);
await element('#strategy-form').dispatch('submit');
assert.deepEqual(Array.from(saves.at(-1).operators), ['ace', 'nomad'], 'Removing primary retains its alternative as a singleton');
await element('#side-switch').dispatch('click', sideButtons[1]);
api.openStrategyEditor(null, 'power-spot');
assert.equal(element('#operator-section').hidden, false, 'Power Spots expose lineups');
await chooseOperator('bandit');
await chooseAlternative(0);
await chooseOperator('kaid');
element('#strategy-title').value = 'Alternative defense hold';
await element('#strategy-form').dispatch('submit');
assert.deepEqual(Array.from(saves.at(-1).operators), ['bandit|kaid']);
api.openStrategy(saves.at(-1));
assert.equal(element('#operator-panel').hidden, false, 'Power Spot detail shows its lineup');
assert.ok(element('#operators').innerHTML.includes('Bandit or Kaid'));
assert.ok(element('#power-spot-list').innerHTML.includes('Bandit or Kaid'), 'Power Spot card shows alternatives');
assert.deepEqual(Array.from(api.operatorGroups(['thermite|ace','thermite','nomad','bandit','invalid'], 'attack'), group => Array.from(group)), [['thermite','ace'],['nomad']], 'Side validation and deduplication keep groups valid');
api.openStrategyEditor(null, 'setup');
assert.equal(element('#operator-section').hidden, true, 'Site setup behavior is unchanged');
console.log('Passed: Bank startup/fallback, attack/defense alternative slots, Power Spot lineup edit/save/display, removal, legacy singletons, and side validation.');

await element('#side-switch').dispatch('click', sideButtons[0]);
reseed([{ ...record('Lobby drone watch', 'basement', 0, 'attack', 'flank-watch'), applicableSites:['basement','upstairs'], operators:['nomad|gridlock'] }, record('wrong-side-watch', 'basement', 0, 'defense', 'flank-watch')]);
assert.equal(element('#flank-watch-section').hidden, false);
assert.deepEqual(ids('#flank-watch-list'), ['Lobby drone watch']);
assert.deepEqual(ids('#setup-list'), []);
assert.deepEqual(ids('#strategy-list'), []);
await clickChip('#floor-chips','floor','2');
assert.deepEqual(ids('#flank-watch-list'), ['Lobby drone watch']);
await element('#side-switch').dispatch('click', sideButtons[1]);
assert.equal(element('#flank-watch-section').hidden, true);
assert.deepEqual(ids('#flank-watch-list'), [], 'Malformed defense flank watch is excluded');
element('#strategy-dialog').close();
api.openStrategyEditor(null,'flank-watch');
assert.equal(element('#strategy-dialog').open,false, 'Defense cannot add a flank watch');
await element('#side-switch').dispatch('click', sideButtons[0]);
api.openStrategyEditor(null,'flank-watch');
assert.equal(element('#strategy-form-title').textContent,'Add Flank Watch');
assert.equal(element('#operator-section').hidden,false);
element('#strategy-title').value='Nomad flank coverage';
await chooseOperator('nomad');
await chooseAlternative(0);
await chooseOperator('gridlock');
api.references([{id:'flank-photo',image:'synthetic-drone',label:'Other',note:'Watch lobby stairs'}]);
await element('#strategy-form').dispatch('submit');
assert.equal(saves.at(-1).entryType,'flank-watch');
assert.equal(saves.at(-1).side,'attack');
assert.equal(saves.at(-1).references[0].label,'Flank Watch');
assert.deepEqual(Array.from(saves.at(-1).operators),['nomad|gridlock']);
api.openStrategy(saves.at(-1));
assert.ok(element('#detail-path').textContent.includes('Flank Watch'));
assert.equal(element('#operator-panel').hidden,false);
assert.ok(element('#operators').innerHTML.includes('Nomad or Gridlock'));
assert.ok(!element('#operators').innerHTML.includes('class="operator-or"'), 'Display bundles overlap icons instead of inserting a small or');
console.log('Passed: attack-only Flank Watch category, secondary-floor filtering, editor/save/photos, operator alternatives, and bundle markup.');

assert.ok(html.indexOf('aria-labelledby="result-title"') < html.indexOf('id="flank-watch-section"'), 'Strategies precedes Flank Watch');
await element('#side-switch').dispatch('click', sideButtons[0]);
assert.equal(element('#setups-section').hidden,true);
assert.equal(element('#add-setup').disabled,true);
element('#strategy-dialog').close();
api.openStrategyEditor(null,'setup');
assert.equal(element('#strategy-dialog').open,false,'Attack cannot open the setup editor');
assert.ok(api.records().some(item => item.entryType === 'flank-watch'), 'Category visibility does not remove records');
await element('#side-switch').dispatch('click', sideButtons[1]);
assert.equal(element('#setups-section').hidden,false);
assert.equal(element('#add-setup').disabled,false);
api.openStrategyEditor(null,'setup');
assert.equal(element('#strategy-dialog').open,true,'Defense retains setup editing');
console.log('Passed: Attack section order is Strategies then Flank Watch; Site setups are defense-only and existing records are preserved.');

reseed([{ ...record('echo-defense','basement',0,'defense','setup'),setupType:'Drone Placement', references:[{id:'echo-photo',label:'Drone Placement',image:'synthetic-echo',note:'Cross angle'}] }]);
assert.deepEqual(ids('#setup-list'),['echo-defense'],'Defense displays a drone setup');
api.openStrategyEditor(api.records()[0]);
assert.equal(element('#setup-type').value,'Drone Placement','Editing a defense Echo setup preserves its drone classification');
console.log('Passed: defense drone setups remain visible and retain their setup type on edit.');
