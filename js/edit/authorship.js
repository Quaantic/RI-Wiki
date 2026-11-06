// Authorship is attached to values, not the last person to save the whole draft.
const signature = value => value === undefined ? 'undefined' : JSON.stringify(value);
function values(value, path = 'content', result = {}) {
  result[path] = signature(value);
  if (Array.isArray(value)) {
    const key = ['id', 'version', 'n', 'num'].find(key => value.every(item => item && typeof item === 'object' && item[key] !== undefined) && new Set(value.map(item => String(item[key]))).size === value.length);
    if (key) {
      result[`${path} order`] = signature(value.map(item => String(item[key])));
      value.forEach(item => values(item, `${path}[${item[key]}]`, result));
    }
  } else if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, item]) => values(item, `${path}.${key}`, result));
  }
  return result;
}
export function authorsForChanges(base, docs, authors = {}, actor = '') {
  const before = values(base), after = values(docs), next = { ...authors };
  for (const path of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (before[path] !== after[path]) next[path] = { actor, value: after[path] ?? 'undefined' };
  }
  return next;
}
export function priorityResolver(fallback, localAuthors, remoteAuthors) {
  const resolver = (...args) => fallback?.(...args);
  resolver.priority = ({ path, local, remote }) => {
    const isOwner = (record, value) => record?.actor?.toLowerCase() === 'quaantic' && record.value === signature(value);
    const left = isOwner(localAuthors[path], local), right = isOwner(remoteAuthors[path], remote);
    // Both owner tabs: keep the already saved value rather than replay stale edits.
    return right ? 'remote' : left ? 'local' : undefined;
  };
  resolver.resolveConflict = conflict => resolver.priority(conflict) ?? fallback?.resolveConflict?.(conflict);
  return resolver;
}
