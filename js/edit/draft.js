// ==== EDIT MODE: STATE DO RASCUNHO (GitHub draft file + documentos locais) ====

import {
  FILES,
  BACKUP_DIRECTORY,
  DRAFT_FILE,
  BRANCH,
  REPOSITORY,
  validateDocuments,
  encodeBase64Content,
  decodeBase64Content,
} from '../content-schema.js';
import {
  githubRequest,
  githubContentsUrl,
} from '../github.js';
import { applyWikiContent, applyUpdateContent, applyGameData } from '../services.js';

const draftState = {
  token: '',
  baseDocs: null,
  docs: null,
  shas: {},
  draftSha: null,
  savedDraftRaw: '',
};

const clone = (value) => JSON.parse(JSON.stringify(value));

function walkTo(docs, path) {
  const segments = path.split('.');
  let node = docs;
  for (const key of segments) {
    if (node == null || typeof node !== 'object') {
      throw new Error(`Cannot write to "${path}" (broken path).`);
    }
    node = node[key];
  }
  return node;
}

// Histórico para o undo (Ctrl+Z / botão Undo). Alvos explícitos para não
// depender da ordem das edições: cada entrada sabe desfazer sozinha.
const history = [];
const HISTORY_MAX = 80;

function remember(entry) {
  history.push(entry);
  if (history.length > HISTORY_MAX) history.shift();
}

export function canUndo() {
  return history.length > 0;
}

function readAt(name, path) {
  try {
    return walkTo(draftState.docs?.[name] ?? {}, path);
  } catch {
    return undefined;
  }
}

function writeAt(name, path, value) {
  const segments = path.split('.');
  if (!segments.length) throw new Error(`Invalid path: ${path}`);
  const root = draftState.docs?.[name];
  if (!root) throw new Error(`Unknown document: ${name}`);
  let holder = root;
  for (let i = 0; i < segments.length - 1; i += 1) {
    const key = segments[i];
    const nextIsIndex = /^\d+$/.test(segments[i + 1]);
    if (holder == null || typeof holder !== 'object') {
      throw new Error(`Cannot write to "${path}" (broken path).`);
    }
    if (holder[key] == null || typeof holder[key] !== 'object') {
      holder[key] = nextIsIndex ? [] : {};
    }
    holder = holder[key];
  }
  if (holder == null || typeof holder !== 'object') {
    throw new Error(`Cannot write to "${path}" (broken path).`);
  }
  holder[segments.at(-1)] = value;
}

export function setValue(name, path, value) {
  const prev = readAt(name, path);
  writeAt(name, path, value);
  remember({ type: 'set', name, path, value: prev === undefined ? undefined : clone(prev) });
}

function undoSet(entry) {
  if (entry.value === undefined) {
    const segments = entry.path.split('.');
    const parent = walkTo(draftState.docs[entry.name], segments.slice(0, -1).join('.'));
    delete parent[segments.at(-1)];
    return 'field removed';
  }
  writeAt(entry.name, entry.path, entry.value);
  return 'field restored';
}

export function removeValue(name, path) {
  const segments = path.split('.');
  if (segments.length < 2) throw new Error(`"${path}" is not inside a list.`);
  const root = draftState.docs?.[name];
  if (!root) throw new Error(`Unknown document: ${name}`);
  const parent = walkTo(root, segments.slice(0, -1).join('.'));
  if (!Array.isArray(parent)) throw new Error(`"${path}" is not inside a list.`);
  const index = Number(segments.at(-1));
  if (!Number.isInteger(index) || index < 0 || index >= parent.length) {
    throw new Error(`Nothing to delete at "${path}".`);
  }
  const [value] = parent.splice(index, 1);
  remember({ type: 'remove', name, parentPath: segments.slice(0, -1).join('.'), index, value: clone(value) });
}

function undoRemove(entry) {
  const list = walkTo(draftState.docs[entry.name], entry.parentPath);
  if (!Array.isArray(list)) throw new Error(`Cannot undo the removal (list no longer exists).`);
  list.splice(entry.index, 0, entry.value);
  return 'restored item';
}

export function getValue(name, path) {
  const root = draftState.docs?.[name];
  if (!root) return undefined;
  return walkTo(root, path);
}

export function pushValue(name, path, value) {
  const root = draftState.docs?.[name];
  if (!root) throw new Error(`Unknown document: ${name}`);
  const list = walkTo(root, path);
  if (!Array.isArray(list)) throw new Error(`"${path}" is not a list.`);
  const index = list.length;
  list.push(value);
  remember({ type: 'push', name, path, index });
  return index;
}

function undoPush(entry) {
  const list = walkTo(draftState.docs[entry.name], entry.path);
  if (!Array.isArray(list) || entry.index >= list.length) {
    throw new Error('Cannot undo that addition (the list changed).');
  }
  list.splice(entry.index, 1);
  return 'item removed';
}

// Move um item entre listas (reordenar páginas, trocar de categoria/nível).
export function moveValue(name, fromPath, fromIndex, toPath, toIndex, skipHistory = false) {
  const root = draftState.docs?.[name];
  if (!root) throw new Error(`Unknown document: ${name}`);
  const source = walkTo(root, fromPath);
  if (!Array.isArray(source) || fromIndex < 0 || fromIndex >= source.length) {
    throw new Error(`Origin list is invalid.`);
  }
  if (fromPath === toPath && toIndex === fromIndex) return false;
  let destIndex = toIndex;
  if (fromPath === toPath && destIndex > fromIndex) destIndex -= 1;
  const [item] = source.splice(fromIndex, 1);
  if (item == null || typeof item !== 'object') {
    throw new Error('Only items can be moved (the origin list is odd).');
  }
  try {
    const dest = fromPath === toPath ? source : walkTo(root, toPath);
    if (!Array.isArray(dest)) throw new Error(`Destination "${toPath}" is not a list.`);
    dest.splice(destIndex, 0, item);
  } catch (error) {
    source.splice(fromIndex, 0, item);
    throw error;
  }
  if (!skipHistory) {
    remember({ type: 'move', name, fromPath, fromIndex, toPath, toIndex: destIndex });
  }
  return true;
}

function undoMove(entry) {
  moveValue(
    entry.name,
    entry.toPath,
    entry.toIndex,
    entry.fromPath,
    entry.fromIndex,
    true,
  );
  return 'restored position';
}

// Desfaz a última ação do rascunho. Retorna uma mensagem curta ou null
// quando não havia o que desfazer. Quem chama deve re-aplicar + re-renderizar.
export function undoLast() {
  const entry = history.pop();
  if (!entry) return null;
  try {
    if (entry.type === 'set') return { message: undoSet(entry) };
    if (entry.type === 'push') return { message: undoPush(entry) };
    if (entry.type === 'remove') return { message: undoRemove(entry) };
    if (entry.type === 'move') return { message: undoMove(entry) };
    history.push(entry);
    return null;
  } catch (error) {
    history.push(entry);
    throw error;
  }
}

export function doc(name) {
  return draftState.docs?.[name] ?? null;
}

export function isLoaded() {
  return Boolean(draftState.docs);
}

function changedFiles() {
  if (!draftState.docs) return [];
  return Object.keys(FILES).filter(
    (name) => JSON.stringify(draftState.docs[name]) !== JSON.stringify(draftState.baseDocs[name]),
  );
}

function currentDraftRaw() {
  return `${JSON.stringify(draftState.docs, null, 2)}\n`;
}

export function draftOnline() {
  return Boolean(draftState.savedDraftRaw);
}

export function draftDirty() {
  if (!draftState.docs) return false;
  return currentDraftRaw() !== draftState.savedDraftRaw;
}

export function changedCount() {
  return changedFiles().length;
}

// Fires appliers from services.js so every visible section on the page
// instantly reflects the working copy (rerender is invoked by the edit layer).
export function applyDraftToSite() {
  if (!draftState.docs) return;
  applyWikiContent(draftState.docs.wiki);
  applyUpdateContent(draftState.docs.updates.versions);
  applyGameData(draftState.docs.game);
}

export function appPublishedDocs(name) {
  return clone(draftState.baseDocs?.[name] ?? {});
}

export async function initSession(token) {
  draftState.token = token;
  draftState.baseDocs = {};
  draftState.shas = {};
  draftState.draftSha = null;
  draftState.savedDraftRaw = '';
  await Promise.all(Object.entries(FILES).map(async ([name, path]) => {
    const result = await githubRequest(githubContentsUrl(path), token);
    if (result.type !== 'file' || typeof result.content !== 'string') {
      throw new Error(`GitHub did not return ${path} as a file.`);
    }
    draftState.shas[name] = result.sha;
    draftState.baseDocs[name] = JSON.parse(decodeBase64Content(result.content));
  }));
  draftState.docs = clone(draftState.baseDocs);
  let draftLoaded = false;
  try {
    const result = await githubRequest(githubContentsUrl(DRAFT_FILE), token, { allowNotFound: true });
    if (result === null) {
      // Esboco ausente no GitHub: primeiro uso do editor (normal).
      console.info('[inline-editor] No inline draft on GitHub yet — that is normal before the first "Save draft".');
      draftLoaded = false;
    } else if (result?.type === 'file' && typeof result.content === 'string') {
      const remote = JSON.parse(decodeBase64Content(result.content));
      validateDocuments(remote);
      draftState.draftSha = result.sha;
      draftState.savedDraftRaw = `${JSON.stringify(remote, null, 2)}\n`;
      draftState.docs = remote;
      draftLoaded = true;
    }
  } catch (error) {
    const msg = error.message || '';
    if (/(401|403|credential|forbidden|permission)/i.test(msg)) {
      // Nao mascarar problemas de acesso como "esboco ausente".
      throw new Error(`Your GitHub session cannot read the inline draft (${msg}). Sign in again or ask for write access to ${REPOSITORY}.`);
    }
    if (!/(404|not found)/i.test(msg)) {
      throw new Error(`The inline draft file could not be read: ${msg}`);
    }
    draftLoaded = false;
  }
  return { draftLoaded };
}

export async function saveDraft(token) {
  validateDocuments(draftState.docs);
  await githubRequest(githubContentsUrl(DRAFT_FILE), token, {
    method: 'PUT',
    body: JSON.stringify({
      message: 'Save inline draft',
      content: encodeBase64Content(currentDraftRaw()),
      sha: draftState.draftSha || undefined,
      branch: BRANCH,
    }),
  }).then((result) => {
    draftState.draftSha = result.content.sha;
    draftState.savedDraftRaw = currentDraftRaw();
  });
}

export async function discardDraft(token) {
  if (draftState.draftSha) {
    await githubRequest(githubContentsUrl(DRAFT_FILE), token, {
      method: 'DELETE',
      body: JSON.stringify({
        message: 'Discard inline draft',
        sha: draftState.draftSha,
        branch: BRANCH,
      }),
    }).catch((error) => {
      if (!/(404|not found)/i.test(error.message || '')) throw error;
    });
  }
  draftState.draftSha = null;
  draftState.savedDraftRaw = '';
  draftState.docs = clone(draftState.baseDocs);
  applyDraftToSite();
}

export async function publishChanges(token) {
  validateDocuments(draftState.docs);
  const changed = changedFiles();
  if (changed.length) {
    const backupName = `inline-editor-${Date.now()}.json`;
    const documents = { format: 1, createdAt: new Date().toISOString(), documents: draftState.baseDocs };
    await githubRequest(githubContentsUrl(`${BACKUP_DIRECTORY}/${backupName}`), token, {
      method: 'PUT',
      body: JSON.stringify({
        message: `Backup before publishing inline changes (${new Date().toLocaleString()})`,
        content: encodeBase64Content(`${JSON.stringify(documents, null, 2)}\n`),
        branch: BRANCH,
      }),
    });
    for (const name of changed) {
      const path = FILES[name];
      const content = `${JSON.stringify(draftState.docs[name], null, 2)}\n`;
      const result = await githubRequest(githubContentsUrl(path), token, {
        method: 'PUT',
        body: JSON.stringify({
          message: `Update ${path.split('/').at(-1).replace('.json', '')} content via inline editor`,
          content: encodeBase64Content(content),
          sha: draftState.shas[name],
          branch: BRANCH,
        }),
      });
      draftState.shas[name] = result.content.sha;
    }
  }
  draftState.baseDocs = clone(draftState.docs);
  if (draftState.draftSha) {
    await githubRequest(githubContentsUrl(DRAFT_FILE), token, {
      method: 'DELETE',
      body: JSON.stringify({
        message: 'Publish inline edits',
        sha: draftState.draftSha,
        branch: BRANCH,
      }),
    }).catch((error) => {
      if (!/(404|not found)/i.test(error.message || '')) throw error;
    });
  }
  draftState.draftSha = null;
  draftState.savedDraftRaw = '';
}

export function uploadStatus() {
  return {
    loaded: Boolean(draftState.docs),
    draftOnline: draftState.savedDraftRaw !== '',
    hasUnsavedChanges: draftState.docs ? changedFiles().length > 0 : false,
  };
}

// SOMENTE TESTES: injeta documentos simulados (mesmo fluxo do editor,
// sem GitHub). Zera o histórico para recomeçar limpo.
export function __testInjectDocs(docs) {
  draftState.docs = docs;
  draftState.baseDocs = JSON.parse(JSON.stringify(docs));
  history.length = 0;
}
