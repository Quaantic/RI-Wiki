import { FILES, validateDocuments } from './content-schema.js';

// Leave enabled on this isolated copy, including any test deployment.
export const REDESIGN_TEST = true;
const key = 'ri-redesign-test-v9';
const read = () => JSON.parse(localStorage.getItem(key) || '{}');
const write = data => localStorage.setItem(key, JSON.stringify(data));

function makeCheckpoint(state, documents, action, revision) {
  const id = (state.versions?.[0]?.id || 0) + 1;
  const version = { id, action, revision, created_at: new Date().toISOString(), created_by: 'redesign-test', documents };
  state.versions = [version, ...(state.versions || [])].slice(0, 3);
  return version;
}

export function listTestVersions() {
  return (read().versions || []).map(({ documents, ...metadata }) => metadata);
}

export function readTestVersion(id) {
  const version = read().versions?.find(item => item.id === id);
  if (!version) throw new Error('The checkpoint is no longer available.');
  return version.documents;
}

export function saveTestVersion(documents, action = 'save') {
  validateDocuments(documents);
  const state = read();
  const version = makeCheckpoint(state, documents, action, state.revision || 0);
  write(state);
  return version;
}

// Preserve existing v3 local test drafts when updating to v4. New content sections
// are copied only when absent; never overwrite a user's edited currencies.
async function ensureCurrencySection(documents) {
  if (documents?.game?.currencies) return documents;
  const response = await fetch(new URL('../content/game-data.json', import.meta.url));
  if (response.ok) {
    const defaults = await response.json();
    if (defaults.currencies && documents?.game) documents.game.currencies = structuredClone(defaults.currencies);
  }
  return documents;
}

export async function publishedTestDocuments() {
  const stored = read().published;
  if (stored) return ensureCurrencySection(stored);
  const documents = Object.fromEntries(await Promise.all(Object.entries(FILES).map(async ([name, path]) => {
    const response = await fetch(new URL(`../${path}`, import.meta.url));
    if (!response.ok) throw new Error(`Could not load ${path} (HTTP ${response.status}).`);
    return [name, await response.json()];
  })));
  return ensureCurrencySection(documents);
}

export async function testLive(action, extra) {
  const state = read();
  const revision = state.revision || 0;
  const publishedRevision = state.publishedRevision || 0;
  if (action === 'peek') return { revision, publishedRevision, ready: true };
  if (action === 'read') return { revision, publishedRevision, ready: true, documents: await ensureCurrencySection(state.draft || await publishedTestDocuments()) };
  if (action === 'save') {
    if (extra.revision !== revision) throw Object.assign(new Error('The test draft changed in another tab.'), { status: 409 });
    validateDocuments(extra.documents);
    write({ ...state, draft: extra.documents, revision: revision + 1 });
    return { saved: true, revision: revision + 1 };
  }
  if (action === 'presence') return { users: [] };
  if (action === 'history') return { entries: [] };
  if (action === 'versions') return { versions: listTestVersions() };
  if (action === 'version') return { documents: readTestVersion(extra.id) };
  if (action === 'snapshot') return saveTestVersion(state.draft || await publishedTestDocuments(), extra.versionAction);
  throw new Error('This shared editor action requires a connected test backend.');
}

export async function publishTestDraft(revision) {
  const state = read();
  if (revision !== state.revision || !state.draft) throw new Error('Save the test draft before publishing.');
  validateDocuments(state.draft);
  makeCheckpoint(state, state.draft, 'publish', revision);
  write({ ...state, published: state.draft, publishedRevision: revision });
  return { revision, shas: Object.fromEntries(Object.keys(FILES).map(name => [name, String(revision)])) };
}
