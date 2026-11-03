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
    wiki-data.js      helpers da árvore JSON da Wiki
    update-log.js     estado derivado do JSON do update log
```

## Como editar o conteúdo

- Abra `/admin/` no site e conecte uma conta GitHub com permissão de escrita no repositório.
- Use **Wiki pages** para páginas, **Game data** para upgrades e dados de jogo,
  **Update log** para notas de versão e **Versions** para backups/restauração.
- **Save changes** cria um backup completo e grava os JSON no branch principal;
  a Vercel publica a atualização.

O dono do site configura o OAuth do GitHub e as variáveis do Vercel uma vez.
Cada editor precisa de acesso de escrita ao repositório. O conteúdo editável
fica em `content/*.json`; os módulos em `js/data/` são renderizadores e lógica
do site.

## Excel (fase futura)

A interface nunca lê os dados diretamente — tudo passa por `js/services.js`.
Quando a planilha for integrada, basta trocar a fonte
(`dataProvider.setDataSource('excel')`) sem tocar nas páginas. Ver
`docs/EXCEL_INTEGRATION.md`.
