// ==== ARTIGOS - EDITE AQUI ====
// Modelo de artigo (descomente e edite para adicionar o primeiro):
//
// const mainArticles = [
//   article({
//     id: 'meu-artigo',
//     category: 'dungeon',
//     subcategory: 'bones',
//     title: 'Titulo do Artigo',
//     description: 'Descricao curta.',
//     keywords: ['palavra', 'chave'],
//     updated: '2026-10-30',
//     views: 0,
//     stats: [stat('Dano', '100', 'sword')],
//     sections: [
//       section('Secao 1', [
//         p('Texto com ocorrencias de Energy, Bones e Gold Bars coloridas.'),
//         table(
//           [{ key: 'name', label: 'Nome' }, { key: 'value', label: 'Valor' }],
//           [{ name: 'Exemplo', value: '10' }],
//         ),
//       ]),
//     ],
//     related: ['outro-artigo'],
//   }),
// ];


const p = (text) => ({ type: 'p', text });

const list = (items, { ordered = false, checks = false } = {}) => ({
  type: 'list',
  items: items.map((it) => (typeof it === 'string' ? { text: it } : it)),
  ordered,
  checks,
});

const table = (columns, rows) => ({ type: 'table', columns, rows });

const kv = (pairs) => ({ type: 'kv', pairs });

const section = (title, blocks, { collapsed = false } = {}) => ({ title, blocks, collapsed });

function article(a) {
  return {
    keywords: [],
    stats: [],
    sections: [],
    related: [],
    updated: '2026-10-30',
    views: 0,
    featured: false,
    ...a,
  };
}

const stat = (label, value, icon = 'info') => ({ label, value, icon });


const ARTICLES = [];

const ARTICLE_INDEX = new Map(ARTICLES.map((a) => [a.id, a]));

export { ARTICLES, ARTICLE_INDEX };
