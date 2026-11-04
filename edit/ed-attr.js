// ==== EDIT ATTR: helper de marcacao [data-edit] usada pelas views ====
// Cria os atributos que o Editor inline (js/edit/edit-mode.js) usa para
// descobrir cual campo do content/*.json aquele elemento representa.
// Formato do path: "<doc>:<segments>" (doc = wiki | updates | game) e os
// segments sao chaves/indices separados por ponto (chaves nunca tem ponto).

import { esc } from '../utils.js';

export function ed(path, kind, label) {
  return ` data-edit="${esc(path)}" data-edit-kind="${esc(kind)}" data-edit-label="${esc(label)}"`;
}
