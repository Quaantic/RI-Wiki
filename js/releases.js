// Older editors could save several releases with the same version. Coalesce
// those releases while retaining every distinct entry and its original data.
export function normalizeReleases(versions) {
  if (!Array.isArray(versions)) return versions;
  const result = [], byVersion = new Map();
  for (const source of versions) {
    const version = String(source.version || '').trim();
    if (!byVersion.has(version)) {
      const release = { ...source, version, entries: [...(source.entries || [])] };
      result.push(release); byVersion.set(version, release);
    } else {
      const release = byVersion.get(version);
      const seen = new Set(release.entries.map((entry) => JSON.stringify(entry)));
      for (const entry of source.entries || []) {
        const key = JSON.stringify(entry);
        if (!seen.has(key)) { release.entries.push(entry); seen.add(key); }
      }
    }
  }
  for (const release of result) {
    const occurrences = new Map();
    const usedIds = new Set();
    release.entries = release.entries.map((entry) => {
      if (entry.id && !usedIds.has(entry.id)) { usedIds.add(entry.id); return { ...entry }; }
      const text = JSON.stringify([entry.context,entry.title,entry.href,entry.description]);
      let hash = 2166136261;
      for (const character of text) hash = Math.imul(hash ^ character.charCodeAt(0),16777619) >>> 0;
      let occurrence = occurrences.get(hash) || 0;
      let id;
      do { id = `entry-${hash.toString(16)}-${occurrence++}`; } while (usedIds.has(id));
      occurrences.set(hash,occurrence); usedIds.add(id);
      return { ...entry, id };
    });
  }
  return result;
}

export function nextReleaseVersion(versions) {
  const used = new Set((versions || []).map((release) => release.version.trim()));
  const latest = (versions || []).map((release) => release.version.trim()).find((version) => /^v?\d+(?:\.\d+)+$/i.test(version));
  if (latest) {
    const parts = latest.split('.');
    const width = parts.at(-1).length;
    let number = Number(parts.pop()) + 1;
    let version;
    do { version = [...parts,String(number++).padStart(width,'0')].join('.'); } while (used.has(version));
    return version;
  }
  let patch = 1;
  while (used.has(`v0.0.${patch}`)) patch += 1;
  return `v0.0.${patch}`;
}
export function formatReleaseVersion(version){return `v${String(version||'—').replace(/^v/i,'')}`;}

export function releaseKind(release){
  const entries=release.entries||[];
  const features=entries.filter(entry=>entry.context==='Feature').length;
  const changes=entries.filter(entry=>entry.context==='Changes').length;
  if(features>=3)return 'major';
  if(features+changes>=3)return 'minor';
  if(entries.length&&entries.every(entry=>['UI','Bugs'].includes(entry.context)))return 'hotfix';
  return 'other';
}
