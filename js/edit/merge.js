// Three-way merge: only a changed value can replace the shared baseline.
// Lists with stable IDs merge by identity so concurrent page additions survive.
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const copy = (value) => value === undefined ? undefined : structuredClone(value);
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

export class SyncConflict extends Error {
  constructor(path) {
    super(`Both editors changed ${path}. Your work is still here. Download your draft before resolving this conflict.`);
    this.name = 'SyncConflict';
    this.path = path;
  }
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
        const release = /^content\.updates\.versions\[([^\]]+)\]\.entries$/.exec(path);
        if (!release || !keepLocalOrder?.(release[1])) throw new SyncConflict(`${path} order`);
      }
      const order = localReorder ? [...localIds, ...remoteIds] : [...remoteIds, ...localIds];
      return [...new Set(order)].map((id) => merged.get(id)).filter((item) => item !== undefined);
    }
  }
  if (object(local) && object(remote) && (base === undefined || object(base))) {
    const merged = {};
    for (const key of new Set([...Object.keys(base || {}), ...Object.keys(local), ...Object.keys(remote)])) {
      const value = mergeDocuments(base?.[key], local[key], remote[key], `${path}.${key}`, keepLocalOrder);
      if (value !== undefined) Object.defineProperty(merged, key, { value, enumerable: true, writable: true, configurable: true });
    }
    return merged;
  }
  throw new SyncConflict(path);
}
