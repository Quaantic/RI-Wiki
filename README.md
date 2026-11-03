# RI Gaming Wiki

Wiki frontend para Regrowth Idle — HTML + CSS + JS puro, sem build e sem dependências.
Rode com qualquer servidor estático (VS Code Live Server, `npx serve`, GitHub Pages).

## Estrutura

```
index.html            página única (SPA por hash: #/mining, #/article/ore-iron…)
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
    wiki-data.js      estrutura inicial das categorias
    articles.js       estrutura inicial dos artigos
    update-log.js     estrutura inicial do update log
```

## Como editar o conteúdo

- Abra `/admin/` no site e entre com uma conta convidada do GitHub.
- Use **Wiki pages**, **Articles** ou **Update log** para editar os textos pelos formulários.
- Salvar cria um rascunho para revisão; o site é atualizado pelo Vercel após a publicação.

O dono precisa configurar o OAuth do GitHub e as variáveis do Vercel uma vez. Veja
[`docs/ADMIN_SETUP.md`](docs/ADMIN_SETUP.md). O GitHub exige acesso de escrita
ao repositório para cada editor convidado; consulte as limitações de acesso no guia.

## Excel (fase futura)

A interface nunca lê os dados diretamente — tudo passa por `js/services.js`.
Quando a planilha for integrada, basta trocar a fonte
(`dataProvider.setDataSource('excel')`) sem tocar nas páginas. Ver
`docs/EXCEL_INTEGRATION.md`.
