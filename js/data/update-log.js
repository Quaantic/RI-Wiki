// ==== UPDATE LOG ====
// O jogo/wiki ainda nao lancou: existe so a v1 e ela NAO deve ser atualizada.
//
// ================== MODELO (copie daqui quando lancar) ==================
// Cada versao e um bloco assim (o de cima e sempre o mais recente):
//
// {
//   version: '1.1',              <- aparece como v1.1
//   date: '2026-10-30',          <- data (formato ano-mes-dia)
//   entries: [
//     { context: 'Feature', title: 'Titulo curto', description: 'Explica o que entrou.' },
//     { context: 'UI',       title: 'Titulo curto', description: 'Mudanca visual/interacao.' },
//     { context: 'Bugs',     title: 'Titulo curto', description: 'O que foi corrigido.' },
//     { context: 'Changes',  title: 'Titulo curto', description: 'Textos, organizacao, ajustes gerais.' },
//   ],
// },
//
// Contextos disponiveis (ja estilizados no site): Feature | UI | Bugs | Changes
// Depois de adicionar uma versao: suba o LATEST_UPDATE_ID (abaixo) para acender
// o (!) vermelho no Update Log de quem ja visitou.
// ========================================================================

export const UPDATE_LOG = [
  {
    version: '1',
    date: '2026-10-30',
    entries: [{ context: 'Feature', title: 'Release', description: 'Regrowth Incremental WIKI has been released' },],
  },
];

// ==== ID DA UPDATE (nao mexer enquanto nao lancar) ====
export const LATEST_UPDATE_ID = '1';

export const LATEST_UPDATE = UPDATE_LOG[0];

export const UPDATE_ENTRY_COUNT = UPDATE_LOG.reduce((n, v) => n + v.entries.length, 0);
