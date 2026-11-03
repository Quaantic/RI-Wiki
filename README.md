# RI Gaming Wiki

Wiki frontend para Regrowth Idle — HTML + CSS + JS puro, sem build e sem dependências.
Rode com qualquer servidor estático (VS Code Live Server, `npx serve`, GitHub Pages).

## Estrutura

```
index.html            página única (SPA por hash: categorias, páginas e busca)
css/                  tokens, base, components, layout, pages
images/               favicon, hex-pattern, hex-badge
content/              conteúdo editável em JSON
admin/                painel editorial em /admin/
api/                  autenticação OAuth do painel no Vercel
js/
  main.js             boot (não editar)
  router.js           rotas (não editar)
  ui.js               ícones, componentes e sidebar (não editar)
  utils.js            helpers de DOM, formatação e busca (não editar)
  views.js            páginas (não editar)
  services.js         camada de dados (dataProvider) + placeholder do Excel
  data/
    wiki-data.js      carregamento da árvore JSON da Wiki
    update-log.js     estado derivado do JSON do update log
```

## Como editar o conteúdo

- Abra `/admin/` no site e conecte uma conta GitHub com permissão de escrita no repositório.
- Use **Wiki pages** para editar a estrutura, descrições e informações das páginas; use **Update log** para as notas de versão.
- **Save changes** grava os JSON diretamente no branch principal; o Vercel publica a atualização.

O dono do site configura o OAuth do GitHub e as variáveis do Vercel uma vez.
Cada editor precisa de acesso de escrita ao repositório. Os textos ficam em
`content/*.json`; calculadoras e regras de jogo continuam em `js/data/`.

## Excel (fase futura)

A interface nunca lê os dados diretamente — tudo passa por `js/services.js`.
Quando a planilha for integrada, basta trocar a fonte
(`dataProvider.setDataSource('excel')`) sem tocar nas páginas. Ver
`docs/EXCEL_INTEGRATION.md`.
