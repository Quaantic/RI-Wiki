// ==== UI: ICONES, COMPONENTES E SHELL (nao precisa editar) ====

import { qs, qsa, esc, html, debounce, fmtNum, fmtDateShort, markMatches, searchPages } from './utils.js';
import { CATEGORIES } from './data/wiki-data.js';
import { colorizeResources, resourceColor } from './data/resource-colors.js';
import { dataProvider } from './services.js';

export const ICONS = {
  "compass": `<path d="m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z" /><circle cx="12" cy="12" r="10" />`,
  "leaf": `<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" /><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />`,
  "branch": `<line x1="6" x2="6" y1="3" y2="15" /><circle cx="18" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M18 9a9 9 0 0 1-9 9" />`,
  "pickaxe": `<path d="M14.531 12.469 6.619 20.38a1 1 0 1 1-3-3l7.912-7.912" /><path d="M15.686 4.314A12.5 12.5 0 0 0 5.461 2.958 1 1 0 0 0 5.58 4.71a22 22 0 0 1 6.318 3.393" /><path d="M17.7 3.7a1 1 0 0 0-1.4 0l-4.6 4.6a1 1 0 0 0 0 1.4l2.6 2.6a1 1 0 0 0 1.4 0l4.6-4.6a1 1 0 0 0 0-1.4z" /><path d="M19.686 8.314a12.501 12.501 0 0 1 1.356 10.225 1 1 0 0 1-1.751-.119 22 22 0 0 0-3.393-6.319" />`,
  "castle": `<path d="M22 20v-9H2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2Z" /><path d="M18 11V4H6v7" /><path d="M15 22v-4a3 3 0 0 0-3-3a3 3 0 0 0-3 3v4" /><path d="M22 11V9" /><path d="M2 11V9" /><path d="M6 4V2" /><path d="M18 4V2" /><path d="M10 4V2" /><path d="M14 4V2" />`,
  "rune": `<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><path d="M10.5 7v10" /><path d="m10.5 11 4.6-2.8" /><path d="m10.5 14.6 4.6-2.8" /><path d="m10.5 11-2.6-1.6" /><path d="m10.5 14.6-2.6-1.6" />`,
  "spark": `<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" />`,
  "scroll": `<path d="M15 12h-5" /><path d="M15 8h-5" /><path d="M19 17V5a2 2 0 0 0-2-2H4" /><path d="M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3" />`,
  "search": `<path d="m21 21-4.34-4.34" /><circle cx="11" cy="11" r="8" />`,
  "menu": `<path d="M4 12h16" /><path d="M4 18h16" /><path d="M4 6h16" />`,
  "x": `<path d="M18 6 6 18" /><path d="m6 6 12 12" />`,
  "chevron-down": `<path d="m6 9 6 6 6-6" />`,
  "chevron-right": `<path d="m9 18 6-6-6-6" />`,
  "arrow-right": `<path d="M5 12h14" /><path d="m12 5 7 7-7 7" />`,
  "arrow-up": `<path d="m5 12 7-7 7 7" /><path d="M12 19V5" />`,
  "external": `<path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />`,
  "clock": `<path d="M12 6v6l4 2" /><circle cx="12" cy="12" r="10" />`,
  "calendar": `<path d="M8 2v4" /><path d="M16 2v4" /><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M3 10h18" />`,
  "eye": `<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" /><circle cx="12" cy="12" r="3" />`,
  "star": `<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" />`,
  "flame": `<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />`,
  "sort": `<path d="m3 16 4 4 4-4" /><path d="M7 20V4" /><path d="m21 8-4-4-4 4" /><path d="M17 4v16" />`,
  "book": `<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" />`,
  "list": `<path d="M3 12h.01" /><path d="M3 18h.01" /><path d="M3 6h.01" /><path d="M8 12h13" /><path d="M8 18h13" /><path d="M8 6h13" />`,
  "tag": `<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" /><circle cx="7.5" cy="7.5" r=".5" fill="currentColor" />`,
  "info": `<circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />`,
  "alert": `<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" /><path d="M12 9v4" /><path d="M12 17h.01" />`,
  "check": `<path d="M20 6 9 17l-5-5" />`,
  "check-circle": `<circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" />`,
  "gem": `<path d="M6 3h12l4 6-10 13L2 9Z" /><path d="M11 3 8 9l4 13 4-13-3-6" /><path d="M2 9h20" />`,
  "coin": `<circle cx="8" cy="8" r="6" /><path d="M18.09 10.37A6 6 0 1 1 10.34 18" /><path d="M7 6h1v4" /><path d="m16.71 13.88.7.71-2.82 2.82" />`,
  "hammer": `<path d="m15 12-8.373 8.373a1 1 0 1 1-3-3L12 9" /><path d="m18 15 4-4" /><path d="m21.5 11.5-1.914-1.914A2 2 0 0 1 19 8.172V7l-2.26-2.26a6 6 0 0 0-4.202-1.756L9 2.96l.92.82A6.18 6.18 0 0 1 12 8.4V10l2 2h1.172a2 2 0 0 1 1.414.586L18.5 14.5" />`,
  "flask": `<path d="M14 2v6a2 2 0 0 0 .245.96l5.51 10.08A2 2 0 0 1 18 22H6a2 2 0 0 1-1.755-2.96l5.51-10.08A2 2 0 0 0 10 8V2" /><path d="M6.453 15h11.094" /><path d="M8.5 2h7" />`,
  "skull": `<path d="m12.5 17-.5-1-.5 1h1z" /><path d="M15 22a1 1 0 0 0 1-1v-1a2 2 0 0 0 1.56-3.25 8 8 0 1 0-11.12 0A2 2 0 0 0 8 20v1a1 1 0 0 0 1 1z" /><circle cx="15" cy="12" r="1" /><circle cx="9" cy="12" r="1" />`,
  "sword": `<polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5" /><line x1="13" x2="19" y1="19" y2="13" /><line x1="16" x2="20" y1="16" y2="20" /><line x1="19" x2="21" y1="21" y2="19" />`,
  "shield": `<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" /><path d="m9 12 2 2 4-4" />`,
  "drop": `<path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z" /><path d="M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97" />`,
  "map-pin": `<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" /><circle cx="12" cy="10" r="3" />`,
  "users": `<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><path d="M16 3.128a4 4 0 0 1 0 7.744" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><circle cx="9" cy="7" r="4" />`,
  "layers": `<path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z" /><path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12" /><path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17" />`,
  "grid": `<rect width="7" height="7" x="3" y="3" rx="1" /><rect width="7" height="7" x="14" y="3" rx="1" /><rect width="7" height="7" x="14" y="14" rx="1" /><rect width="7" height="7" x="3" y="14" rx="1" />`,
  "key": `<path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z" /><circle cx="16.5" cy="7.5" r=".5" fill="currentColor" />`,
  "lock": `<rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />`,
  "refresh": `<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M8 16H3v5" />`,
  "target": `<circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />`,
  "dice": `<rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><path d="M16 8h.01" /><path d="M8 8h.01" /><path d="M8 16h.01" /><path d="M16 16h.01" /><path d="M12 12h.01" />`,
  "chart": `<path d="M3 3v16a2 2 0 0 0 2 2h16" /><path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" />`,
  "package": `<path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z" /><path d="M12 22V12" /><polyline points="3.29 7 12 12 20.71 7" /><path d="m7.5 4.27 9 5.15" />`,
  "book-open": `<path d="M12 7v14" /><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />`,
  "gauge": `<path d="m12 14 4-4" /><path d="M3.34 19a10 10 0 1 1 17.32 0" />`,
  "wrench": `<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />`,
  "hourglass": `<path d="M5 22h14" /><path d="M5 2h14" /><path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22" /><path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2" />`,
  "heart": `<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />`,
  "filter": `<path d="M10 20a1 1 0 0 0 .553.895l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .517-1.341L21.74 4.67A1 1 0 0 0 21 3H3a1 1 0 0 0-.742 1.67l7.225 7.989A2 2 0 0 1 10 14z" />`,
  "hex": `<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />`,
  "banknote": `<rect width="20" height="12" x="2" y="6" rx="2" /><circle cx="12" cy="12" r="2" /><path d="M6 12h.01M18 12h.01" />`,
  "card": `<rect width="20" height="14" x="2" y="5" rx="2" /><line x1="2" x2="22" y1="10" y2="10" />`,
  "ingot": `<path d="M7 4h10l3 6H4l3-6Z" /><path d="M5.5 10h13l3.5 7H2l3.5-7Z" />`,
  "diamond": `<path d="M2.7 10.3a2.41 2.41 0 0 0 0 3.41l7.59 7.59a2.41 2.41 0 0 0 3.41 0l7.59-7.59a2.41 2.41 0 0 0 0-3.41l-7.6-7.6a2.41 2.41 0 0 0-3.4 0Z" />`,
  "crown": `<path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.735H5.81a1 1 0 0 1-.957-.735L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z" /><path d="M5 21h14" />`,
  "cloud": `<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />`,
  "magnet": `<path d="m6 15-4-4 6.4-6.4a8 8 0 1 1 11.3 11.3l-4.2 4.2a2.4 2.4 0 0 1-3.4 0l-3.6-3.6a2.4 2.4 0 0 1 0-3.4l6.4-6.4" /><path d="m14 7 3 3" /><path d="m9 6 1.5 1.5" />`,
  "settings": `<line x1="21" x2="14" y1="4" y2="4" /><line x1="10" x2="3" y1="4" y2="4" /><line x1="21" x2="12" y1="12" y2="12" /><line x1="8" x2="3" y1="12" y2="12" /><line x1="21" x2="16" y1="20" y2="20" /><line x1="12" x2="3" y1="20" y2="20" /><line x1="14" x2="14" y1="2" y2="6" /><line x1="8" x2="8" y1="10" y2="14" /><line x1="16" x2="16" y1="18" y2="22" />`,
  "zap": `<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" />`,
  "hexagon": `<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />`,
  "coins": `<circle cx="8" cy="8" r="6" /><path d="M18.09 10.37A6 6 0 1 1 10.34 18" /><path d="M7 6h1v4" /><path d="m16.71 13.88.7.71-2.82 2.82" />`,
  "droplets": `<path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z" /><path d="M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97" />`,
  "moon": `<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />`,
  "orbit": `<circle cx="12" cy="12" r="3" /><circle cx="19" cy="5" r="2" /><circle cx="5" cy="19" r="2" /><path d="M10.4 21.9a10 10 0 0 0 9.941-15.416" /><path d="M13.5 2.1a10 10 0 0 0-9.841 15.416" />`,
  "cloud-rain": `<path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" /><path d="M16 14v6" /><path d="M8 14v6" /><path d="M12 16v6" />`,
  "cloud-lightning": `<path d="M6 16.326A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 .5 8.973" /><path d="m13 12-3 5h4l-3 5" />`,
  "wind": `<path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2" /><path d="M9.6 4.6A2 2 0 1 1 11 8H2" /><path d="M12.6 19.4A2 2 0 1 0 14 16H2" />`,
  "tornado": `<path d="M21 4H3" /><path d="M18 8H6" /><path d="M19 12H9" /><path d="M16 16h-6" /><path d="M11 20H9" />`,
  "sprout": `<path d="M7 20h10" /><path d="M10 20c5.5-2.5.8-6.4 3-10" /><path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z" /><path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z" />`,
  "mountain": `<path d="m8 3 4 8 5-5 5 15H2L8 3z" />`,
  "atom": `<circle cx="12" cy="12" r="1" /><path d="M20.2 20.2c2.04-2.03.02-7.36-4.5-11.9-4.54-4.52-9.87-6.54-11.9-4.5-2.04 2.03-.02 7.36 4.5 11.9 4.54 4.52 9.87 6.54 11.9 4.5Z" /><path d="M15.7 15.7c4.52-4.54 6.54-9.87 4.5-11.9-2.03-2.04-7.36-.02-11.9 4.5-4.52 4.54-6.54 9.87-4.5 11.9 2.03 2.04 7.36.02 11.9-4.5Z" />`,
  "sparkles": `<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" /><path d="M20 3v4" /><path d="M22 5h-4" /><path d="M4 17v2" /><path d="M5 18H3" />`,
  "bone": `<path d="M17 10c.7-.7 1.69 0 2.5 0a2.5 2.5 0 1 0 0-5 .5.5 0 0 1-.5-.5 2.5 2.5 0 1 0-5 0c0 .81.7 1.8 0 2.5l-7 7c-.7.7-1.69 0-2.5 0a2.5 2.5 0 0 0 0 5c.28 0 .5.22.5.5a2.5 2.5 0 1 0 5 0c0-.81-.7-1.8 0-2.5Z" />`,
  "medal": `<path d="M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15" /><path d="M11 12 5.12 2.2" /><path d="m13 12 5.88-9.8" /><path d="M8 7h8" /><circle cx="12" cy="17" r="5" /><path d="M12 18v-2h-.5" />`,
};

export function icon(name, size = 20, cls = '') {
  const body = ICONS[name] || ICONS.info;
  return `<svg ${cls ? `class="${cls}" ` : ''}width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
}

let uid = 0;

export function emblem(size = 32, cls = '') {
  const id = `ri-grad-${++uid}`;
  return `
<svg ${cls ? `class="${cls}" ` : ''}width="${size}" height="${size}" viewBox="0 0 64 64" fill="none" aria-hidden="true" focusable="false">
  <defs>
    <linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#C9FF74"/>
      <stop offset="1" stop-color="#86D62B"/>
    </linearGradient>
  </defs>
  <path d="M32 3.5 57.5 18.25v27.5L32 60.5 6.5 45.75v-27.5Z" fill="#1D241F" stroke="url(#${id})" stroke-width="3" stroke-linejoin="round"/>
  <path d="M32 46V29" stroke="#A8EF45" stroke-width="4" stroke-linecap="round"/>
  <path d="M32 34c0-8-5.5-12.5-14-12.5 0 8.5 5.5 12.5 14 12.5Z" fill="#A8EF45"/>
  <path d="M32 29c0-7 5-11 13-11 0 7.5-5 11-13 11Z" fill="#C9FF74"/>
</svg>`;
}

const ART = {
  main: `
    <circle cx="80" cy="80" r="62"/>
    <circle cx="80" cy="80" r="40" opacity=".55"/>
    <path d="M80 10v16M80 134v16M10 80h16M134 80h16M31 31l11 11M118 118l11 11M129 31l-11 11M42 118l-11 11" opacity=".7"/>
    <path d="M97 63 87 87 63 97 73 73Z" fill="currentColor" stroke="none"/>
    <path d="M80 74l2.5 3.5L86 80l-3.5 2.5L80 86l-2.5-3.5L74 80l3.5-2.5Z" fill="currentColor" stroke="none" opacity=".7"/>`,

  life: `
    <path d="M40 122C40 74 72 42 120 42c0 48-32 80-80 80Z"/>
    <path d="M40 122c20-38 44-60 70-70" opacity=".55"/>
    <path d="M92 132c0-20 14-34 34-34 0 20-14 34-34 34Z" opacity=".7"/>
    <path d="M118 60v0" opacity="0"/>
    <circle cx="30" cy="46" r="2.5" fill="currentColor" stroke="none" opacity=".6"/>
    <circle cx="136" cy="112" r="2.5" fill="currentColor" stroke="none" opacity=".6"/>
    <circle cx="112" cy="24" r="2.5" fill="currentColor" stroke="none" opacity=".6"/>`,

  'upgrade-tree': `
    <path d="M80 128V100M80 100 46 64M80 100l34-36M46 64 28 40M46 64l22-20M114 64 96 44M114 64l20-24" opacity=".85"/>
    <circle cx="80" cy="134" r="8"/>
    <circle cx="46" cy="64" r="7"/>
    <circle cx="114" cy="64" r="7"/>
    <circle cx="26" cy="36" r="5.5"/><circle cx="70" cy="40" r="5.5"/><circle cx="94" cy="40" r="5.5"/><circle cx="136" cy="36" r="5.5"/>
    <path d="M26 30v12M20 36h12" opacity=".5"/><path d="M136 30v12M130 36h12" opacity=".5"/>`,

  mining: `
    <path d="M56 134 42 88l14-38 14 38Z" opacity=".85"/>
    <path d="M80 140 60 80 80 24l20 56Z"/>
    <path d="M108 134 96 98l12-30 12 30Z" opacity=".85"/>
    <path d="M60 80h40" opacity=".5"/><path d="M80 24v116" opacity=".35"/>
    <path d="M26 134h108" opacity=".4"/>
    <path d="M24 60v12M18 66h12" opacity=".6"/><path d="M136 88v12M130 94h12" opacity=".6"/>`,

  dungeon: `
    <path d="M26 138V56h6V44h8v12h6v94"/>
    <path d="M134 138V56h-6V44h-8v12h-6v94"/>
    <path d="M52 138V90h56v48" opacity=".8"/>
    <path d="M66 138v-20a14 14 0 0 1 28 0v20"/>
    <path d="M73 122v16M80 119v19M87 122v16" opacity=".7"/>
    <path d="M112 26h16l-5 6 5 6h-16" opacity=".8"/>
    <path d="M112 26v18"/>
    <path d="M18 138h124" opacity=".4"/>`,

  runes: `
    <path d="M30 134V72a11 11 0 0 1 22 0v62Z" opacity=".85"/>
    <path d="M64 134V58a13 13 0 0 1 26 0v76Z"/>
    <path d="M100 134V80a10 10 0 0 1 20 0v54Z" opacity=".85"/>
    <path d="M76 74v40M68 88h16M68 102h16" opacity=".75"/>
    <path d="M41 92v28M35 104l12-8" opacity=".6"/>
    <path d="M110 98v22M104 110h12" opacity=".6"/>
    <path d="M20 134h122" opacity=".4"/>`,

  perks: `
    <path d="M80 24 92 68l44 12-44 12-12 44-12-44-44-12 44-12Z"/>
    <circle cx="80" cy="80" r="15" opacity=".6"/>
    <path d="M28 28l3 8 8 3-8 3-3 8-3-8-8-3 8-3Z" opacity=".65"/>
    <path d="M126 108l2.5 6.5 6.5 2.5-6.5 2.5-2.5 6.5-2.5-6.5-6.5-2.5 6.5-2.5Z" opacity=".65"/>
    <path d="M122 30v10M117 35h10" opacity=".5"/><path d="M30 116v10M25 121h10" opacity=".5"/>`,
};

export function categoryArt(categoryId, size = 160, cls = '') {
  const body = ART[categoryId] || ART.main;
  return `<svg ${cls ? `class="${cls}" ` : ''}width="${size}" height="${size}" viewBox="0 0 160 160" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
}

let observer = null;

function getObserver() {
  if (observer) return observer;
  observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    }
  }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });
  return observer;
}

export function initReveal(root = document) {
  const els = root.querySelectorAll('.reveal:not(.is-visible)');
  const io = getObserver();
  els.forEach((el) => io.observe(el));
}

export function reveal(index = 0, extra = '') {
  return `class="reveal ${extra}" style="--reveal-delay: ${Math.min(index * 55, 500)}ms"`;
}

const NUMERIC = /^[\d.,]+(k|M)?%?$/;

function cellHTML(v) {
  const s = String(v ?? '');
  return `<td${NUMERIC.test(s) ? ' class="num"' : ''}>${colorizeResources(esc(s))}</td>`;
}

function renderTable(b) {
  const head = b.columns
    .map((c) => `<th${c.align ? ` style="text-align:${c.align}"` : ''}>${esc(c.label)}</th>`)
    .join('');
  const rows = b.rows
    .map((r) => `<tr>${b.columns.map((c) => cellHTML(r[c.key])).join('')}</tr>`)
    .join('');
  return `<div class="table-wrap"><table class="data-table"><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
}

function renderList(b) {
  const cls = b.ordered ? 'block-list block-list--ordered' : 'block-list';
  const marker = b.ordered
    ? '' // ordered markers come from CSS counters
    : icon(b.checks ? 'check-circle' : 'hex', 15);
  const items = b.items
    .map((it) => `<li>${b.ordered ? '' : marker}<span>${colorizeResources(esc(it.text || it))}</span></li>`)
    .join('');
  return `<ul class="${cls}">${items}</ul>`;
}

export function renderNote(b) {
  const icons = { tip: 'check-circle', warning: 'alert', info: 'info' };
  return `
    <div class="callout callout--${esc(b.variant)}">
      ${icon(icons[b.variant] || 'info', 18)}
      <div>
        <span class="callout__title">${esc(b.title)}</span>
        ${colorizeResources(esc(b.text))}
      </div>
    </div>`;
}

function renderKv(b) {
  const rows = b.pairs
    .map((pr) => `<div class="kv-list__row"><span class="kv-list__key">${esc(pr.key)}</span><span>${colorizeResources(esc(pr.value))}</span></div>`)
    .join('');
  return `<div class="kv-list">${rows}</div>`;
}

export function renderBlocks(blocks = []) {
  return blocks
    .map((b) => {
      switch (b.type) {
        case 'p': return `<p>${colorizeResources(esc(b.text))}</p>`;
        case 'list': return renderList(b);
        case 'table': return renderTable(b);
        case 'note': return renderNote(b);
        case 'kv': return renderKv(b);
        default: return '';
      }
    })
    .join('');
}

export function renderSection(s, i = 0) {
  const body = `<div class="x-section__body"><div><div class="prose article-blocks x-section__inner">${renderBlocks(s.blocks)}</div></div></div>`;

  if (s.collapsed) {
    return `
      <div class="x-section${s.collapsed ? '' : ' x-section--open'}" data-x-section>
        <button class="x-section__head" type="button" aria-expanded="false">
          <span class="hex-dot"></span>
          <span>${esc(s.title)}</span>
          ${icon('chevron-down', 18, 'x-section__chevron')}
        </button>
        ${body}
      </div>`;
  }
  return `
    <div class="article-section" data-toc-anchor="s-${i}">
      <h2 class="article-section__title"><span class="hex-dot"></span>${esc(s.title)}</h2>
      <div class="prose article-blocks">${renderBlocks(s.blocks)}</div>
    </div>`;
}

export function renderStats(stats = []) {
  if (!stats.length) return '';
  return `<div class="article-stats">${stats.map(statCard).join('')}</div>`;
}

export function statCard(s) {
  return `
    <div class="stat-card">
      <span class="stat-card__icon">${icon(s.icon || 'info', 20)}</span>
      <span>
        <span class="stat-card__value">${esc(s.value)}</span>
        <span class="stat-card__label">${esc(s.label)}</span>
      </span>
    </div>`;
}

export function wireBlocks(root) {
  root.querySelectorAll('[data-x-section] .x-section__head').forEach((btn) => {
    btn.addEventListener('click', () => {
      const box = btn.closest('[data-x-section]');
      const open = box.classList.toggle('x-section--open');
      btn.setAttribute('aria-expanded', String(open));
    });
  });
}

export function articleCard(a, i = 0) {
  return `
  <a ${`class="article-card reveal" style="--reveal-delay: ${Math.min(i * 50, 400)}ms"`} href="#/article/${esc(a.id)}">
    <div class="article-card__art">${categoryArt(a.category, 120)}</div>
    <div class="article-card__body">
      <span class="article-card__meta">${icon('clock', 12)} ${fmtDateShort(a.updated)}</span>
      <span class="article-card__title">${colorizeResources(esc(a.title))}</span>
      <span class="article-card__desc">${esc(a.description)}</span>
      <span class="article-card__foot">
        ${icon('eye', 13)} ${fmtNum(a.views)} views
      </span>
    </div>
  </a>`;
}

export function articleRow(a, i = 0) {
  return `
  <a ${`class="article-row reveal" style="--reveal-delay: ${Math.min(i * 50, 400)}ms"`} href="#/article/${esc(a.id)}">
    <span class="article-row__icon">${icon('book', 17)}</span>
    <span style="min-width:0">
      <span class="article-row__title">${colorizeResources(esc(a.title))}</span>
      <span class="article-row__meta">${fmtDateShort(a.updated)} · ${fmtNum(a.views)} views</span>
    </span>
    ${icon('arrow-right', 15)}
  </a>`;
}

export function categoryCard(cat, articleCount, i = 0) {
  return `
  <a ${`class="cat-card reveal" style="--reveal-delay: ${Math.min(i * 50, 400)}ms"`} href="#/${esc(cat.id)}">
    <span class="cat-card__top">
      <span class="cat-card__icon">${icon(cat.icon, 22)}</span>
      ${icon('arrow-right', 18, 'cat-card__arrow')}
    </span>
    <span class="cat-card__name">${esc(cat.name)}</span>
    <span class="cat-card__blurb">${esc(cat.tagline.split('.')[0])}.</span>
    <span class="cat-card__count">${articleCount} article${articleCount === 1 ? '' : 's'} · ${cat.subcategories.length} subsections</span>
  </a>`;
}

export function infoCard(h, i = 0) {
  return `
  <div ${`class="info-card reveal" style="--reveal-delay: ${Math.min(i * 50, 400)}ms"`}>
    <span class="info-card__icon">${icon(h.icon || 'star', 18)}</span>
    <span class="info-card__title">${esc(h.title)}</span>
    <span class="info-card__text">${colorizeResources(esc(h.text))}</span>
  </div>`;
}

export function sectionHead(title, linkHref = '', linkLabel = 'View all') {
  return `
  <div class="section-head">
    <h2 class="section-title"><span class="hex-dot"></span>${esc(title)}</h2>
    ${linkHref ? `<a class="section-link" href="${esc(linkHref)}">${esc(linkLabel)} ${icon('arrow-right', 14)}</a>` : ''}
  </div>`;
}

export function skeleton(kind, count = 3) {
  if (kind === 'cards') {
    return `<div class="grid grid--cards">${'<div class="skeleton skeleton--card"></div>'.repeat(count)}</div>`;
  }
  if (kind === 'rows') {
    return `<div style="display:flex;flex-direction:column;gap:10px">${'<div class="skeleton skeleton--row"></div>'.repeat(count)}</div>`;
  }
  return `<div class="skeleton skeleton--title"></div><div class="skeleton skeleton--text" style="width:80%;margin-top:10px"></div>`;
}

const CAT_BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]));

export function mountSearchBox(root) {
  root.innerHTML = `
    <div class="searchbox">
      <div class="input-wrap" style="width:100%">
        ${icon('search', 17)}
        <input class="input" id="search-input" type="search" autocomplete="off"
               placeholder="Search the wiki…" aria-label="Search the wiki" role="combobox"
               aria-expanded="false" aria-controls="search-panel" />
        <span class="kbd searchbox__kbd">Ctrl K</span>
      </div>
      <div class="searchbox__panel" id="search-panel" role="listbox" hidden></div>
    </div>`;

  const input = root.querySelector('#search-input');
  const panel = root.querySelector('#search-panel');

  let items = [];
  let focusedIdx = -1;
  let reqToken = 0;

  const close = () => {
    panel.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    focusedIdx = -1;
  };

  const open = () => {
    panel.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  };

  const focusItem = (idx) => {
    const els = [...panel.querySelectorAll('.searchbox__item')];
    if (!els.length) return;
    focusedIdx = (idx + els.length) % els.length;
    els.forEach((el, i) => el.classList.toggle('is-focused', i === focusedIdx));
    els[focusedIdx].scrollIntoView({ block: 'nearest' });
  };

  const renderPanel = (results, query, total) => {
    if (!query) { close(); return; }
    open();

    const groups = groupByCategory(results);
    let body = '';
    const pages = searchPages(query, { limit: 4 });
    if (pages.length) {
      body += `<div class="dropdown__label">${icon('grid', 12)} Sections</div>`;
      body += pages.map((p) => `
        <a class="searchbox__item" role="option" href="#/${p.cat.id}/${p.sub.id}">
          <span class="searchbox__item-icon">${icon(p.cat.icon, 15)}</span>
          <span>
            <b>${markMatches(p.sub.name, query)}</b>
            <small>${esc(p.cat.name)} · ${esc(p.sub.blurb || '')}</small>
          </span>
        </a>`).join('');
    }
    if (!results.length && !pages.length) {
      panel.innerHTML = `<div class="searchbox__empty">No results for <b>"${esc(query)}"</b>.<br><small>Try a keyword like "voidstone", "respawn" or "crit".</small></div>`;
      return;
    }
    for (const [catId, entries] of groups) {
      const cat = CAT_BY_ID.get(catId);
      body += `<div class="dropdown__label">${icon(cat.icon, 12)} ${esc(cat.name)}</div>`;
      body += entries.map((r, i) => `
        <a class="searchbox__item" role="option" href="#/article/${esc(r.article.id)}" data-idx="${items.length + i}">
          <span class="searchbox__item-icon">${icon('book', 15)}</span>
          <span>
            <b>${markMatches(r.article.title, query)}</b>
            <small>${markMatches(r.snippet, query)}</small>
          </span>
        </a>`).join('');
    }

    panel.innerHTML = body + `
      <div class="searchbox__footer">
        <a href="#/search?q=${encodeURIComponent(query)}">
          See all ${total} result${total === 1 ? '' : 's'} for "${esc(query)}" ${icon('arrow-right', 13)}
        </a>
      </div>`;

    items = [...panel.querySelectorAll('.searchbox__item')].map((el) => ({ el, href: el.getAttribute('href') }));
  };

  const runSearch = debounce(async () => {
    const q = input.value.trim();
    if (q.length < 2) { close(); return; }
    const token = ++reqToken;
    panel.hidden = false;
    panel.innerHTML = `<div class="searchbox__loading"><span class="spinner"></span> Searching…</div>`;
    const results = await dataProvider.search(q, { limit: 9 });
    if (token !== reqToken) return;
    renderPanel(results, q, results.length);
  }, 140);

  input.addEventListener('input', runSearch);
  input.addEventListener('focus', () => { if (input.value.trim().length >= 2) open(); });

  input.addEventListener('keydown', (e) => {
    if (panel.hidden) {
      if (e.key === 'ArrowDown' && input.value.trim().length >= 2) { open(); e.preventDefault(); }
      return;
    }
    if (e.key === 'ArrowDown') { focusItem(focusedIdx + 1); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { focusItem(focusedIdx - 1); e.preventDefault(); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      const target = items[focusedIdx] || items[0];
      if (target) { window.location.hash = target.href.slice(1); close(); input.blur(); }
      else if (input.value.trim()) { window.location.hash = `/search?q=${encodeURIComponent(input.value.trim())}`; close(); }
    } else if (e.key === 'Escape') { close(); input.blur(); }
  });

  panel.addEventListener('click', () => close());

  document.addEventListener('click', (e) => {
    if (!root.contains(e.target)) close();
  });

  document.addEventListener('keydown', (e) => {
    const tag = document.activeElement?.tagName;
    const typing = tag === 'INPUT' || tag === 'TEXTAREA';
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      input.focus();
      input.select();
    } else if (e.key === '/' && !typing) {
      e.preventDefault();
      input.focus();
    }
  });

  window.addEventListener('hashchange', () => {
    close();
    input.value = '';
  });
}

export function fillStaticIcons() {
  qsa('[data-icon]').forEach((el) => { el.innerHTML = icon(el.dataset.icon, 20); });
  qsa('[data-icon-link]').forEach((el) => { el.innerHTML = icon(el.dataset.iconLink, 18); });
  qsa('[data-emblem]').forEach((el) => { el.innerHTML = emblem(parseInt(el.dataset.emblem, 10) || 24); });
}

function renderSubTree(catId, items, depth) {
  const boxCls = depth === 1 ? 'nav-sub' : `nav-sub${depth}`;
  const itemCls = depth === 1 ? 'nav-sub__item' : `nav-sub${depth}__item`;
  return `
    <div class="${boxCls}" data-parent-sub="${items[0]?.__parentId || ''}"><div>
      <div class="${boxCls}__list">
        ${items.map((s) => {
          const color = resourceColor(s.name);
          const dotStyle = color ? ` style="background:${color}"` : '';
          return `
          <a class="${itemCls}" data-sub="${s.id}" href="#/${catId}/${s.id}">
            <span class="nav-sub__dot"${dotStyle}></span><span class="nav-sub__label">${colorizeResources(esc(s.name))}</span>
          </a>
          ${(s.children || []).length
            ? renderSubTree(catId, s.children.map((c) => ({ ...c, __parentId: s.id })), depth + 1)
            : ''}`;
        }).join('')}
      </div>
    </div></div>`;
}

export function buildNav() {
  const nav = qs('#sidebar-nav');
  nav.innerHTML =
    '<span class="sidebar__label">Categories</span>' +
    CATEGORIES.map((c) => {
      const color = resourceColor(c.name);
      const iconStyle = color ? ` style="color:${color}"` : '';
      return `
      <div class="nav-group" data-cat="${c.id}">
        <a class="nav-item" data-cat="${c.id}" href="#/${c.id}">
          <span class="nav-item__icon"${iconStyle}>${icon(c.icon, 19)}</span>
          <span class="nav-item__label">${colorizeResources(esc(c.name))}</span>
          ${icon('chevron-down', 15, 'nav-item__chev')}
        </a>
        ${renderSubTree(c.id, c.subcategories, 1)}
      </div>`;
    }).join('');

  nav.addEventListener('click', (e) => {
    const item = e.target.closest('.nav-item');
    if (item) { openGroup(item.dataset.cat); return; }
    const subItem = e.target.closest('[data-sub]');
    if (subItem) {
      const wrapper = nav.querySelector(`[data-parent-sub="${subItem.dataset.sub}"]`);
      if (wrapper) wrapper.classList.toggle('open');
    }
  });
}

export function openGroup(catId) {
  qsa('.nav-group').forEach((g) => g.classList.toggle('open', g.dataset.cat === catId));
}

// ==== Indicador deslizante da categoria (a "linha verde") ====
let navIndicator = null;
let indicatorToken = 0;

function moveIndicator() {
  const nav = qs('#sidebar-nav');
  if (!nav) return;
  if (!navIndicator) {
    navIndicator = document.createElement('span');
    navIndicator.className = 'nav-indicator';
    navIndicator.setAttribute('aria-hidden', 'true');
    nav.appendChild(navIndicator);
  }
  const active = qs('.nav-item.active', nav);
  if (!active) {
    navIndicator.classList.add('is-hidden');
    return;
  }
  navIndicator.classList.remove('is-hidden');
  const sync = () => {
    const navRect = nav.getBoundingClientRect();
    const r = active.getBoundingClientRect();
    navIndicator.style.top = `${r.top - navRect.top + nav.scrollTop}px`;
    navIndicator.style.height = `${r.height}px`;
  };
  sync();
  const token = ++indicatorToken;
  const t0 = performance.now();
  const step = () => {
    if (token !== indicatorToken) return;
    sync();
    if (performance.now() - t0 < 650) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

export function setActiveNav(catId, subId = null) {
  qsa('.nav-item').forEach((el) => {
    el.classList.toggle('active', el.dataset.cat === catId);
  });
  qsa('[data-sub]').forEach((el) => {
    el.classList.toggle('active', !!catId && el.dataset.sub === subId);
  });
  if (catId) openGroup(catId);
  qsa('[data-parent-sub]').forEach((el) => {
    el.classList.toggle('open', el.dataset.parentSub === subId || !!el.querySelector('[data-sub].active'));
  });
  moveIndicator();
}

export function setCrumbs(items = []) {
  const root = qs('#crumbs');
  if (!items.length) { root.innerHTML = ''; return; }
  root.innerHTML = items
    .map((it, i) => {
      const last = i === items.length - 1;
      const iconHtml = it.icon ? icon(it.icon, 14) : '';
      const label = esc(it.label);
      if (last) return `<span class="crumbs__current">${iconHtml}<span>${label}</span></span>`;
      return `<a href="${it.href || '#/'}">${iconHtml}<span>${label}</span></a>${icon('chevron-right', 12)}`;
    })
    .join('');
}

export function setupDrawer() {
  const sidebar = qs('#sidebar');
  const menuBtn = qs('#menu-btn');

  const close = () => {
    sidebar.classList.remove('is-open');
    menuBtn.setAttribute('aria-expanded', 'false');
    qs('.sidebar-backdrop')?.remove();
  };

  const open = () => {
    sidebar.classList.add('is-open');
    menuBtn.setAttribute('aria-expanded', 'true');
    const backdrop = document.createElement('div');
    backdrop.className = 'sidebar-backdrop';
    backdrop.addEventListener('click', close);
    document.body.appendChild(backdrop);
  };

  menuBtn.addEventListener('click', () => {
    sidebar.classList.contains('is-open') ? close() : open();
  });

  sidebar.addEventListener('click', (e) => {
    if (e.target.closest('a')) close();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });

  window.addEventListener('hashchange', close);
}

export function setupBackTop() {
  const btn = qs('#back-top');
  const bar = document.createElement('div');
  bar.className = 'scroll-progress';
  document.body.appendChild(bar);
  const onScroll = () => {
    btn.classList.toggle('is-visible', window.scrollY > 620);
    const max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

// ==== Badge de update nova (! vermelho no Update Log) ====

const UPDATE_SEEN_KEY = 'ri-seen-update-id';

export function initUpdateBadge(latestId) {
  let unseen = true;
  try { unseen = localStorage.getItem(UPDATE_SEEN_KEY) !== latestId; } catch { /* file:// etc */ }
  qsa('[data-update-badge]').forEach((b) => { b.hidden = !unseen; });
}

export function markUpdateSeen(latestId) {
  try { localStorage.setItem(UPDATE_SEEN_KEY, latestId); } catch { /* ignore */ }
  qsa('[data-update-badge]').forEach((b) => { b.hidden = true; });
}

// ==== Settings ====

const SETTINGS_TOGGLES = {
  motion: {
    key: 'ri-motion',
    default: false,
    apply: (on) => document.documentElement.classList.toggle('reduce-motion', on),
  },
  'res-colors': {
    key: 'ri-res-colors',
    default: true,
    apply: (on) => document.documentElement.classList.toggle('res-off', !on),
  },
  textures: {
    key: 'ri-textures',
    default: true,
    apply: (on) => document.documentElement.classList.toggle('tex-off', !on),
  },
};

function settingState(id) {
  let v = null;
  try { v = localStorage.getItem(SETTINGS_TOGGLES[id].key); } catch { /* ignore */ }
  return v == null ? SETTINGS_TOGGLES[id].default : v === '1';
}

function applySetting(id, on) {
  SETTINGS_TOGGLES[id].apply(on);
  try { localStorage.setItem(SETTINGS_TOGGLES[id].key, on ? '1' : '0'); } catch { /* ignore */ }
}

export function applyStoredSettings() {
  Object.keys(SETTINGS_TOGGLES).forEach((id) => SETTINGS_TOGGLES[id].apply(settingState(id)));
}

export function setupSettings() {
  const btn = qs('#settings-btn');
  const menu = qs('#settings-menu');
  if (!btn || !menu) return;

  const setTheme = (theme) => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('ri-theme', theme); } catch { /* ignore */ }
    syncUI();
  };

  const syncUI = () => {
    const theme = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
    qsa('[data-set-theme]', menu).forEach((b) => b.classList.toggle('active', b.dataset.setTheme === theme));
    qsa('[data-toggle]', menu).forEach((row) => {
      const on = settingState(row.dataset.toggle);
      row.classList.toggle('on', on);
      row.setAttribute('aria-checked', String(on));
    });
  };

  btn.addEventListener('click', () => {
    const open = menu.hidden;
    menu.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
  });
  menu.addEventListener('click', (e) => {
    const themeBtn = e.target.closest('[data-set-theme]');
    if (themeBtn) { setTheme(themeBtn.dataset.setTheme); return; }
    const row = e.target.closest('[data-toggle]');
    if (row) {
      applySetting(row.dataset.toggle, !settingState(row.dataset.toggle));
      syncUI();
    }
  });
  document.addEventListener('click', (e) => {
    if (!btn.contains(e.target) && !menu.contains(e.target)) menu.hidden = true;
  });
  syncUI();
}

export function initShell() {
  fillStaticIcons();
  buildNav();
  setupDrawer();
  setupBackTop();
  mountSearchBox(qs('#search-root'));
  setupSettings();
  window.addEventListener('resize', moveIndicator);
  if (document.fonts?.ready) document.fonts.ready.then(moveIndicator);
}

