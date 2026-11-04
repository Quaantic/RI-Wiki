import { FILES, DRAFT_FILE, BRANCH, REPOSITORY, decodeBase64Content, validateDocuments } from '../content-schema.js';
import { githubRequest, githubContentsUrl } from '../github.js';
import { mergeDocuments } from './merge.js';

// The shared draft records the published blob SHAs it was based on. This
// preserves new site content when a collaborator keeps editing an older draft.
export async function readSharedDraft(file, published, shas, token) {
  const payload = JSON.parse(decodeBase64Content(file.content));
  const docs = { wiki: payload.wiki, game: payload.game, updates: payload.updates };
  validateDocuments(docs);
  let original;
  if (payload._baseShas) {
    const entries = await Promise.all(Object.entries(FILES).map(async ([name]) => {
      const sha = payload._baseShas[name];
      if (!sha) throw new Error('The shared draft is missing its published baseline.');
      if (sha === shas[name]) return [name, published[name]];
      const blob = await githubRequest(`https://api.github.com/repos/${REPOSITORY}/git/blobs/${encodeURIComponent(sha)}`, token);
      return [name, JSON.parse(decodeBase64Content(blob.content))];
    }));
    original = Object.fromEntries(entries);
  } else {
    // Migration for drafts written by older editors: the published documents
    // at that draft's last commit are the best available shared baseline.
    const commits = await githubRequest(`https://api.github.com/repos/${REPOSITORY}/commits?path=${encodeURIComponent(DRAFT_FILE)}&sha=${BRANCH}&per_page=1`, token);
    const ref = commits?.[0]?.sha;
    if (!ref) throw new Error('Cannot identify the old draft baseline. Keep your browser recovery copy and retry.');
    const entries = await Promise.all(Object.entries(FILES).map(async ([name, path]) => {
      const old = await githubRequest(githubContentsUrl(path).replace(/\?ref=.*/, `?ref=${encodeURIComponent(ref)}`), token);
      return [name, JSON.parse(decodeBase64Content(old.content))];
    }));
    original = Object.fromEntries(entries);
  }
  validateDocuments(original);
  const merged = mergeDocuments(original, docs, published);
  validateDocuments(merged);
  return merged;
}
