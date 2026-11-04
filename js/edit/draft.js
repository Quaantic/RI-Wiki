// ==== EDIT MODE: STATE DO RASCUNHO (GitHub draft file + documentos locais) ====

import {
  FILES,
  BACKUP_DIRECTORY,
  DRAFT_FILE,
  BRANCH,
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

export function setValue(name, path, value) {
  const segments = path.split('.');
  if (!segments.length) throw new Error(`Invalid path: ${path}`);
  const root = draftState.docs?.[name];
  if (!root) throw new Error(`Unknown document: ${name}`);
  const parentPath = segments.slice(0, -1).join('.');
  const holder = parentPath ? walkTo(root, parentPath) : root;
  if (holder == null || typeof holder !== 'object') {
    throw new Error(`Cannot write to "${path}" (broken path).`);
  }
  holder[segments.at(-1)] = value;
}

export function getValue(name, path) {
  const root = draftState.docs?.[name];
  if (!root) return undefined;
  return walkTo(root, path);
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
    if (result?.type === 'file' && typeof result.content === 'string') {
      const remote = JSON.parse(decodeBase64Content(result.content));
      validateDocuments(remote);
      draftState.draftSha = result.sha;
      draftState.savedDraftRaw = `${JSON.stringify(remote, null, 2)}\n`;
      draftState.docs = remote;
      draftLoaded = true;
    }
  } catch (error) {
    if (!/(404|not found)/i.test(error.message || '')) {
      throw new Error(`The inline draft file could not be read: ${error.message || error}`);
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
