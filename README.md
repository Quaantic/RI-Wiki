# RI Gaming Wiki

Wiki frontend para Regrowth Idle — HTML + CSS + JS puro, sem build e sem dependências.
Rode com qualquer servidor estático (VS Code Live Server, `npx serve`, GitHub Pages).

## Estrutura

```
index.html            página única (SPA por hash: #/mining, #/article/ore-iron…)
css/                  tokens, base, components, layout, pages
images/               favicon, hex-pattern, hex-badge
js/
  main.js             boot (não editar)
  router.js           rotas (não editar)
  ui.js               ícones, componentes e sidebar (não editar)
  utils.js            helpers de DOM, formatação e busca (não editar)
  views.js            páginas (não editar)
  services.js         camada de dados (dataProvider) + placeholder do Excel
  data/
    wiki-data.js      ← EDITE: 7 categorias, subseções, textos das páginas
    articles.js       ← EDITE: todos os artigos
    update-log.js     ← EDITE: update log
```

## Como editar textos

- **Páginas das categorias** (nome, descrição, cards de destaque): `js/data/wiki-data.js`
- **Artigos** (título, tabelas, listas, seções): `js/data/articles.js`
- **Update Log**: `js/data/update-log.js` — versão mais nova no topo;
  `context` aceita só `'Feature' | 'UI' | 'Bugs'`

Cada arquivo tem instruções de uma linha no cabeçalho. Depois de editar, salve e
recarregue o navegador (F5).

## Excel (fase futura)

A interface nunca lê os dados diretamente — tudo passa por `js/services.js`.
Quando a planilha for integrada, basta trocar a fonte
(`dataProvider.setDataSource('excel')`) sem tocar nas páginas. Ver
`docs/EXCEL_INTEGRATION.md`.
