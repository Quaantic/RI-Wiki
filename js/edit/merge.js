// Three-way merge: only a changed value can replace the shared baseline.
// Lists with stable IDs merge by identity so concurrent page additions survive.
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const copy = (value) => value === undefined ? undefined : structuredClone(value);
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

export class SyncConflict extends Error {
  constructor(path, release) {
    super(release
      ? `Update Log ${release} has competing entry orders. Your edits are still here. Use Sync to review the conflict before publishing.`
      : `Both editors changed ${path}. Your work is still here. Use Sync to choose which version to keep; cancel to continue editing.`);
    this.name = 'SyncConflict';
    this.path = path;
    this.release = release;
  }
}

function resolveConflict(path, local, remote, resolver) {
  const choice = resolver?.resolveConflict?.({ path, local: copy(local), remote: copy(remote) });
  if (choice === 'local') return copy(local);
  if (choice === 'remote') return copy(remote);
  throw new SyncConflict(path);
}

export function mergeDocuments(base, local, remote, path = 'content', keepLocalOrder) {
  if (equal(local, remote) || equal(base, remote)) return copy(local);
  if (equal(base, local)) return copy(remote);
  if (Array.isArray(local) && Array.isArray(remote) && (base === undefined || Array.isArray(base))) {
    const original = base || [];
    const items = [...original, ...local, ...remote];
    const key = ['id', 'version', 'n', 'num'].find((field) => items.every((item) => object(item) && item[field] !== undefined)
      && [original, local, remote].every((list) => new Set(list.map((item) => String(item[field]))).size === list.length));
    if (key) {
      const index = (list) => new Map(list.map((item) => [String(item[key]), item]));
      const b = index(original), l = index(local), r = index(remote);
      const baseIds = original.map((item) => String(item[key]));
      const localIds = local.map((item) => String(item[key]));
      const remoteIds = remote.map((item) => String(item[key]));
      const common = new Set(baseIds.filter((id) => l.has(id) && r.has(id)));
      const localOrder = localIds.filter((id) => common.has(id));
      const remoteOrder = remoteIds.filter((id) => common.has(id));
      const localReorder = !equal(localOrder, [...common]);
      const remoteReorder = !equal(remoteOrder, [...common]);
      const merged = new Map([...new Set([...remoteIds, ...localIds])].map((id) => [
        id, mergeDocuments(b.get(id), l.get(id), r.get(id), `${path}[${id}]`, keepLocalOrder),
      ]));
      if (localReorder && remoteReorder && !equal(localOrder, remoteOrder)) {
        const priority = keepLocalOrder?.priority?.({ path: `${path} order`, local: localIds, remote: remoteIds });
        if (priority) {
          const preferred = priority === 'local' ? localIds : remoteIds;
          return [...new Set([...preferred, ...remoteIds, ...localIds])].map((id) => merged.get(id)).filter((item) => item !== undefined);
        }
        const release = /^content\.updates\.versions\[([^\]]+)\]\.entries$/.exec(path);
        if (release) {
          if (!keepLocalOrder?.(release[1])) throw new SyncConflict(`${path} order`, release[1]);
        } else {
          const chosen = resolveConflict(`${path} order`, localIds, remoteIds, keepLocalOrder);
          return [...new Set([...chosen, ...remoteIds, ...localIds])].map((id) => merged.get(id)).filter((item) => item !== undefined);
        }
      }
      const order = localReorder ? [...localIds, ...remoteIds] : [...remoteIds, ...localIds];
      return [...new Set(order)].map((id) => merged.get(id)).filter((item) => item !== undefined);
    }
  }
  // Lists without stable IDs (form rows, strings, numbers, etc.) also need
  // per-entry merging. The old implementation treated the WHOLE list as one
  // value, so editing element 0 while another edited element 4 looked like a
  // collision and could discard unrelated work. Keep unchanged indexes as
  // independent fields. If both sides only append, retain both additions.
  if (Array.isArray(local) && Array.isArray(remote) && Array.isArray(base)) {
    const originalLength = base.length;
    const localRetainsPositions = local.length >= originalLength;
    const remoteRetainsPositions = remote.length >= originalLength;
    if (localRetainsPositions && remoteRetainsPositions) {
      const merged = base.map((item, index) => mergeDocuments(item, local[index], remote[index], `${path}[${index}]`, keepLocalOrder));
      const newRemote = remote.slice(originalLength), newLocal = local.slice(originalLength);
      // Added items have no common base. Preserve both independent appends;
      // same-value additions are deduplicated to avoid identical duplicates.
      const appended = [...newRemote];
      for (const item of newLocal) if (!appended.some(existing => equal(existing, item))) appended.push(item);
      return [...merged, ...appended];
    }
    // Index deletion/reorder cannot be safely inferred for unkeyed arrays:
    // require an explicit choice rather than silently replacing unrelated work.
  }
  if (object(local) && object(remote) && (base === undefined || object(base))) {
    const merged = {};
    for (const key of new Set([...Object.keys(base || {}), ...Object.keys(local), ...Object.keys(remote)])) {
      const value = mergeDocuments(base?.[key], local[key], remote[key], `${path}.${key}`, keepLocalOrder);
      if (value !== undefined) Object.defineProperty(merged, key, { value, enumerable: true, writable: true, configurable: true });
    }
    return merged;
  }
  return resolveConflict(path, local, remote, keepLocalOrder);
}
