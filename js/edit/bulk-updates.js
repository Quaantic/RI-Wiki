// Import one update per header line: category;page;title;description.
// All non-header lines after an entry continue its description, including blank lines.
export const BULK_CATEGORIES = ['Feature', 'Changes', 'UI', 'Bugs'];
const isEmpty = value => !value || /^(?:empty|none|null|-)$/i.test(value.trim());
export function parseBulkUpdates(text) {
  const entries=[];
  const errors=[];
  let current=null;
  const lines=String(text || '').replace(/\r\n?/g,'\n').split('\n');
  for (let index=0;index<lines.length;index++) {
    const line=lines[index];
    const parts=line.split(';');
    const first=(parts[0]||'').trim();
    const normalized=BULK_CATEGORIES.find(cat=>cat.toLowerCase()===first.toLowerCase());
    const looksLikeHeader=parts.length>=4 && (Boolean(normalized) || isEmpty(first));
    if (looksLikeHeader) {
      const page=parts[1].trim(), title=parts[2].trim();
      if (!title || isEmpty(title)) {errors.push(`Line ${index+1}: title is required.`);current=null;continue;}
      current={line:index+1,context:normalized||'Changes',page:isEmpty(page)?'':page,title,description:parts.slice(3).join(';').trim()};
      entries.push(current);
    } else if (line.trim() && parts.length>=4 && /^[a-z][\w -]{0,24}$/i.test(first) && !normalized) {
      errors.push(`Line ${index+1}: unknown category "${first}". Use Feature, Changes, UI, Bugs or leave it blank.`);
      current=null;
    } else if (current) {
      // A line without the 4-column header is always a continuation.
      current.description += `\n${line}`;
    } else if (line.trim()) {
      errors.push(`Line ${index+1}: expected category;page;title;description.`);
    }
  }
  for(const entry of entries)entry.description=entry.description.trim();
  if(!entries.length&&!errors.length)errors.push('Paste at least one update.');
  return {entries,errors};
}
