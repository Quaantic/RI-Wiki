// Short names use manually uploaded PNGs; existing image paths still work.
export function creditAvatar(value) {
  const name = String(value || '').trim();
  if (!name) return '';
  if (name.startsWith('images/credits/') || name.startsWith('/images/credits/') || /^https?:\/\//i.test(name)) return name;
  if (/[\\/]/.test(name) || name === '.' || name === '..') return '';
  const filename = /\.(png|jpe?g|webp|gif)$/i.test(name) ? name : `${name}.png`;
  return `images/credits/${encodeURIComponent(filename)}`;
}
