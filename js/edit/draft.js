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

// Diario automatico de edicoes ("Update History"). Em memoria durante a
// sessao; "Save draft" grava pendente em content/edit-history.json,
// "Publish" grava como definitivo, "Discard" limpa pendentes.
const changeLog = [];
const CHANGE_LOG_MAX = 400;
const HISTORY_FILE = 'content/edit-history.json';
const LOG_STORAGE_MAX = 300;

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
  const lastKey = segments.at(-1);
  if (value === undefined) {
    // Salvar undefined = remover a chave (nunca deixar undefined no objeto:
    // quebraria a validacao de conteudo em applyDraftToSite).
    delete holder[lastKey];
  } else {
    holder[lastKey] = value;
  }
}

function itemLabel(item) {
  return item && typeof item === 'object' ? (item.name ?? item.title ?? item.version ?? item.id ?? '') : '';
}

function shortValue(value) {
  if (value == null) return '';
  const text = typeof value === 'string' ? value : JSON.stringify(value) || '';
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > 44 ? `${clean.slice(0, 43)}…` : clean;
}

function labelAt(name, path) {
  const segments = path.split('.');
  for (let i = segments.length; i >= 1; i -= 1) {
    const label = itemLabel(readAt(name, segments.slice(0, i).join('.')));
    if (label) return label;
  }
  return '';
}

function fieldWord(key) {
  return String(key || '').replace(/([a-z0-9])([A-Z])/g, '$1 $2');
}

function logChange(kind, text) {
  changeLog.push({ at: Date.now(), kind, text });
  if (changeLog.length > CHANGE_LOG_MAX) changeLog.shift();
}

function describeSet(name, path, prev, value) {
  const colorMatch = /^resources\.colors\.(.+)$/.exec(path);
  if (colorMatch) {
    return value == null ? `Removed the color of "${colorMatch[1]}"` : `Colored "${colorMatch[1]}" (${value})`;
  }
  const linkMatch = /^resources\.pageLinks\.(.+)$/.exec(path);
  if (linkMatch) {
    return value ? `Linked "${linkMatch[1]}" to ${value}` : `Removed the link of "${linkMatch[1]}"`;
  }
  const segments = path.split('.');
  const last = segments.at(-1);
  const parentLabel = itemLabel(readAt(name, segments.slice(0, -1).join('.'))) || labelAt(name, segments.slice(0, -1).join('.'));
  if (last === 'name' && typeof value === 'string') {
    return prev == null ? `Created "${value}"` : `Renamed "${prev}" to "${value}"`;
  }
  const target = parentLabel ? `"${parentLabel}"` : `"${segments.slice(0, -2).at(-1) ?? last}"`;
  const field = last === 'name' || last === 'title' ? 'text' : fieldWord(last);
  return prev === undefined
    ? `Set ${field} of ${target} (${shortValue(value)})`
    : `Updated ${field} of ${target}: ${shortValue(prev) || 'empty'} to ${shortValue(value) || 'empty'}`;
}

export function setValue(name, path, value) {
  const prev = readAt(name, path);
  writeAt(name, path, value);
  remember({ type: 'set', name, path, value: prev === undefined ? undefined : clone(prev) });
  try {
    logChange(/^(wiki|game|updates)$/.test(name) ? (path.startsWith('resources.') ? 'colors' : 'content') : 'content', describeSet(name, path, prev, value));
  } catch { /* o diario nunca bloqueia a edicao */ }
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
  const removedLabel = itemLabel(parent[index]) || shortValue(parent[index]) || 'item';
  const [value] = parent.splice(index, 1);
  remember({ type: 'remove', name, parentPath: segments.slice(0, -1).join('.'), index, value: clone(value) });
  try {
    logChange('content', `Removed "${removedLabel}"`);
  } catch { /* o diario nunca bloqueia a edicao */ }
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
  try {
    return walkTo(root, path);
  } catch {
    // Caminho inexistente (ex.: item removido por outro campo): o campo
    // mostra "(missing)" em vez de derrubar o popover inteiro.
    return undefined;
  }
}

export function pushValue(name, path, value) {
  const root = draftState.docs?.[name];
  if (!root) throw new Error(`Unknown document: ${name}`);
  const list = walkTo(root, path);
  if (!Array.isArray(list)) throw new Error(`"${path}" is not a list.`);
  const index = list.length;
  list.push(value);
  remember({ type: 'push', name, path, index });
  try {
    logChange('content', `Added "${itemLabel(value) || shortValue(value) || 'item'}"`);
  } catch { /* o diario nunca bloqueia a edicao */ }
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
  const movedLabel = itemLabel(item) || 'item';
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
    try {
      logChange('content', `Moved "${movedLabel}"`);
    } catch { /* o diario nunca bloqueia a edicao */ }
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

// Autocura: uma entrada invalida de colors/pageLinks (ex.: rota digitada
// errada) NAO pode derrubar applyDraftToSite e travar TODA a edicao. Entras
// ruins sao removidas do rascunho antes do uso, com aviso.
function sanitizeResources() {
  const resources = draftState.docs?.game?.resources;
  if (!resources || typeof resources !== 'object') return 0;
  const reserved = ['__proto__', 'constructor', 'prototype'];
  const validName = (key) => key && key.trim() && !reserved.includes(key);
  let dropped = 0;
  const colors = resources.colors;
  if (colors && typeof colors === 'object' && !Array.isArray(colors)) {
    for (const key of Object.keys(colors)) {
      const value = colors[key];
      if (!validName(key) || typeof value !== 'string' || !/^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(value)) {
        delete colors[key];
        dropped += 1;
      }
    }
  }
  const links = resources.pageLinks;
  if (links && typeof links === 'object' && !Array.isArray(links)) {
    for (const key of Object.keys(links)) {
      const value = links[key];
      if (!validName(key) || typeof value !== 'string' || !/^#\/[\w-]+(?:\/[\w-]+)*$/.test(value)) {
        delete links[key];
        dropped += 1;
      }
    }
  }
  return dropped;
}

export async function initSession(token) {
  draftState.token = token;
  draftState.baseDocs = {};
  draftState.shas = {};
  draftState.draftSha = null;
  draftState.savedDraftRaw = '';
  changeLog.length = 0;
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
  const dropped = sanitizeResources();
  return { draftLoaded, sanitized: dropped };
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
  // Diario: pendencias vao para o arquivo (marcadas "pending").
  if (changeLog.length) {
    await writeHistory(token, changeLog.map((entry) => ({ at: entry.at, kind: entry.kind, text: entry.text })), true).catch(() => {});
  }
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
  changeLog.length = 0;
  // Descartou o rascunho: as pendencias do diario caducam junto.
  await writeHistory(token, [], false).catch(() => {});
}

export async function publishChanges(token) {
  validateDocuments(draftState.docs);
  const changed = changedFiles();
  if (changed.length) {
    // Mesmo formato de nome/timestamp dos backups ("backup-*.json") listados
    // pela ferramenta Versions do editor inline.
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.(\d{3})Z$/, '$1Z');
    const backupName = `backup-inline-${stamp}.json`;
    const documents = { format: 1, createdAt: new Date().toISOString(), documents: draftState.baseDocs };
    await githubRequest(githubContentsUrl(`${BACKUP_DIRECTORY}/${backupName}`), token, {
      method: 'PUT',
      body: JSON.stringify({
        message: `Backup before publishing inline changes (${new Date().toLocaleString()})`,
        content: encodeBase64Content(`${JSON.stringify(documents, null, 2)}\n`),
        branch: BRANCH,
      }),
    });
    // Mantem a lista de versoes dentro do limite (25). Best-effort: nao
    // bloqueia a publicacao se a limpeza falhar.
    await pruneVersions(token).catch(() => {});
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
  if (changeLog.length) {
    // Diario definitivo: pendencias antigas do arquivo sao substituidas
    // pelas mesmas entradas agora marcadas como publicadas.
    const published = changeLog.map((entry) => ({ at: entry.at, kind: entry.kind, text: entry.text }));
    changeLog.length = 0;
    await writeHistory(token, published, false).catch(() => {});
  }
}

// Grava o diario no repositorio. pending=true marca como "nao publicado"
// (vem do "Save draft"); pending=false grava como definitivo (Publish) e
// limpa pendencias antigas. `newEntries` = entradas novas desta sessao.
async function writeHistory(token, newEntries, pending) {
  if (!newEntries.length && pending) return;
  let older = [];
  let sha;
  const current = await githubRequest(githubContentsUrl(HISTORY_FILE), token, { allowNotFound: true });
  if (current?.type === 'file') {
    sha = current.sha;
    try {
      const parsed = JSON.parse(decodeBase64Content(current.content));
      older = Array.isArray(parsed?.entries) ? parsed.entries : [];
    } catch {
      older = [];
    }
    if (!pending) older = older.filter((entry) => !entry.pending);
  }
  const entries = [...older, ...newEntries]
    .sort((a, b) => (b.at || 0) - (a.at || 0))
    .slice(0, LOG_STORAGE_MAX);
  await githubRequest(githubContentsUrl(HISTORY_FILE), token, {
    method: 'PUT',
    body: JSON.stringify({
      message: pending ? 'Log inline editor activity (pending)' : 'Log inline editor activity (published)',
      content: encodeBase64Content(`${JSON.stringify({ format: 1, entries }, null, 2)}\n`),
      sha,
      branch: BRANCH,
    }),
  });
}

// Lista do "Update History": pendencias da sessao + arquivo no GitHub
// (mais recentes primeiro).
export async function listEditHistory(token) {
  let fileEntries = [];
  const current = await githubRequest(githubContentsUrl(HISTORY_FILE), token, { allowNotFound: true });
  if (current?.type === 'file') {
    try {
      const parsed = JSON.parse(decodeBase64Content(current.content));
      fileEntries = Array.isArray(parsed?.entries) ? parsed.entries : [];
    } catch {
      fileEntries = [];
    }
  }
  const pending = changeLog.map((entry) => ({ at: entry.at, kind: entry.kind, text: entry.text, pending: true }));
  return [...pending, ...fileEntries].sort((a, b) => (b.at || 0) - (a.at || 0)).slice(0, LOG_STORAGE_MAX);
}

// ==== VERSOES (backups no GitHub; substitui o painel /admin/) ====
// A lista vive em content/backups/ ("backup-*.json"). Limite de 25: ao criar
// a 26, a mais antiga e removida. Versoes nao podem ser apagadas a mao.

const VERSIONS_MAX = 25;

function backupStamp() {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\.(\d{3})Z$/, '$1Z');
}

export function versionLabel(name) {
  const match = /^backup-(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/.exec(name || '');
  if (!match) return name;
  const [, y, mo, d, h, mi] = match;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[Number(mo) - 1]} ${Number(d)}, ${y} at ${h}:${mi} UTC`;
}

export async function listVersions(token) {
  const result = await githubRequest(githubContentsUrl(BACKUP_DIRECTORY), token, { allowNotFound: true });
  return Array.isArray(result)
    ? result
        .filter((item) => item.type === 'file' && /^backup-.*\.json$/.test(item.name))
        .map((item) => ({ name: item.name, sha: item.sha }))
        .sort((a, b) => b.name.localeCompare(a.name))
    : [];
}

export async function pruneVersions(token, keep = VERSIONS_MAX) {
  const versions = await listVersions(token);
  const excess = versions.slice(keep); // ordenada desc: tudo alem do limite e o mais antigo
  for (const item of excess) {
    await githubRequest(githubContentsUrl(`${BACKUP_DIRECTORY}/${item.name}`), token, {
      method: 'DELETE',
      body: JSON.stringify({
        message: `Prune old version ${item.name} (limit ${keep})`,
        sha: item.sha,
        branch: BRANCH,
      }),
    });
  }
  return excess.map((item) => item.name);
}

export async function createVersion(token, documents = draftState.baseDocs, message = 'Manual version') {
  const stamp = backupStamp();
  const name = `backup-${stamp}.json`;
  const payload = { format: 1, createdAt: new Date().toISOString(), documents: clone(documents) };
  await githubRequest(githubContentsUrl(`${BACKUP_DIRECTORY}/${name}`), token, {
    method: 'PUT',
    body: JSON.stringify({
      message: `${message} (${stamp})`,
      content: encodeBase64Content(`${JSON.stringify(payload, null, 2)}\n`),
      branch: BRANCH,
    }),
  });
  await pruneVersions(token);
  return name;
}

export async function restoreVersion(token, name) {
  const result = await githubRequest(githubContentsUrl(`${BACKUP_DIRECTORY}/${encodeURIComponent(name)}`), token, {});
  const backup = JSON.parse(decodeBase64Content(result.content));
  if (backup.format !== 1 || !backup.documents?.wiki || !backup.documents?.updates || !backup.documents?.game) {
    throw new Error('This version is incomplete or has an unsupported format.');
  }
  const restored = { wiki: backup.documents.wiki, updates: backup.documents.updates, game: backup.documents.game };
  validateDocuments(restored);
  // Seguranca: guarda o estado publicado atual como versao antes de restaurar.
  await createVersion(token, draftState.baseDocs, 'Safety version before restore');
  for (const docName of Object.keys(FILES)) {
    const path = FILES[docName];
    const content = `${JSON.stringify(restored[docName], null, 2)}\n`;
    const put = await githubRequest(githubContentsUrl(path), token, {
      method: 'PUT',
      body: JSON.stringify({
        message: `Restore ${path.split('/').at(-1).replace('.json', '')} from ${name}`,
        content: encodeBase64Content(content),
        sha: draftState.shas[docName],
        branch: BRANCH,
      }),
    });
    draftState.shas[docName] = put.content.sha;
  }
  draftState.baseDocs = clone(restored);
  draftState.docs = clone(restored);
  history.length = 0;
  changeLog.length = 0;
  logChange('content', `Restored the version "${versionLabel(name)}" (pending edits were replaced)`);
  applyDraftToSite();
  return name;
}

// Copia do estado atual do rascunho (inclui mudancas nao publicadas) para
// criar uma versao manual.
export function snapshotDocs() {
  return draftState.docs ? clone(draftState.docs) : null;
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
  changeLog.length = 0;
}

// SOMENTE TESTES: descarta o diario pendente (para encadear cenarios).
export function __testChangeLog() {
  return changeLog.map((entry) => ({ at: entry.at, kind: entry.kind, text: entry.text }));
}
