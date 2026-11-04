# RI Gaming Wiki

Wiki frontend para Regrowth Idle — HTML + CSS + JS puro, sem build e sem dependências.
Rode com qualquer servidor estático (VS Code Live Server, `npx serve`, GitHub Pages).

## Estrutura

```
index.html            página única (SPA por hash: categorias, páginas e busca)
css/                  tokens, base, components, layout, pages, edit (editor inline)
images/               favicon, hex-pattern, hex-badge
content/              conteúdo editável em JSON (rascunhos inline em content/drafts/)
admin/                painel editorial em /admin/
api/                  autenticação OAuth (compartilhada pelo painel e pelo editor inline)
js/
  main.js             boot (não editar)
  router.js           rotas + rerender() para o editor inline (não editar)
  ui.js               ícones, componentes e sidebar (não editar)
  utils.js            helpers de DOM, formatação e busca (não editar)
  views.js            páginas (não editar)
  services.js         camada de dados (dataProvider) + placeholder do Excel
  content-schema.js   repositório, validação e codificação compartilhados
  github.js           OAuth popup + API do GitHub (compartilhados com o admin)
  edit/
    ed-attr.js        helper data-edit das ligações editáveis
    draft.js          estado do rascunho (draft em content/drafts/inline-draft.json)
    edit-mode.js      barra, popover e sessão do editor inline
  data/
    wiki-data.js      helpers da árvore JSON da Wiki (inclui créditos)
    update-log.js     estado derivado do JSON do update log
```

## Como editar o conteúdo

- Abra `/admin/` no site e conecte uma conta GitHub com permissão de escrita no repositório.
- Use **Wiki pages** para páginas, **Game data** para upgrades e dados de jogo,
  **Update log** para notas de versão e **Versions** para backups/restauração.
- **Save changes** cria um backup completo e grava os JSON no branch principal;
  a Vercel publica a atualização.

## Editando direto no site (editor inline)

Quem pode editar também pode fazê-lo nas próprias páginas públicas, sem abrir
o painel: entre no menu **Settings → Sign in to edit** (ou pressione **Alt+E**).
Aparece uma barra fixa no topo com **Edit/Preview**, **Save draft**, **Discard**,
**Publish** e um indicador de pendências; clique em qualquer título, texto,
card, fato, ore, stage, área, equipamento, entrada do update log ou crédito
para editar in-place com botões **Apply/Cancel**.

- **Apply** aplica a alteração na página em tempo real (preview ao vivo).
- **Save draft** grava um rascunho em `content/drafts/inline-draft.json`
  (carregado apenas pelo editor; o site público nunca lê esse arquivo).
- **Publish** valida o conteúdo, cria um backup e publica no repositório
  (mesmo fluxo do painel).
- **Discard** volta ao conteúdo publicado.

Ver `docs/COMO-EDITAR.md` para o passo a passo.

O dono do site configura o OAuth do GitHub e as variáveis do Vercel uma vez.
Cada editor precisa de acesso de escrita ao repositório. O conteúdo editável
fica em `content/*.json`; os módulos em `js/data/` são renderizadores e lógica
do site.

## Excel (fase futura)

A interface nunca lê os dados diretamente — tudo passa por `js/services.js`.
Quando a planilha for integrada, basta trocar a fonte
(`dataProvider.setDataSource('excel')`) sem tocar nas páginas. Ver
`docs/EXCEL_INTEGRATION.md`.
