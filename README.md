# RI Gaming Wiki

Wiki frontend para Regrowth Idle — HTML + CSS + JS puro, sem build e sem dependências.
Rode com qualquer servidor estático (VS Code Live Server, `npx serve`, GitHub Pages).

## Estrutura

```
index.html            página única (SPA por hash: categorias, páginas e busca)
css/                  tokens, base, components, layout, pages, edit (editor inline)
images/               favicon, hex-pattern, hex-badge
content/              conteúdo editável em JSON (rascunhos inline em content/drafts/,
                      versões/restauração em content/backups/)
api/                  autenticação OAuth (usada pelo editor inline)
js/
  main.js             boot (não editar)
  router.js           rotas + rerender() para o editor inline (não editar)
  ui.js               ícones, componentes e sidebar (não editar)
  utils.js            helpers de DOM, formatação e busca (não editar)
  views.js            páginas (não editar)
  services.js         camada de dados (dataProvider) + placeholder do Excel
  content-schema.js   repositório, validação e codificação compartilhados
  github.js           OAuth popup + API do GitHub (usados pelo editor inline)
  edit/
    ed-attr.js        helper data-edit das ligações editáveis
    draft.js          estado do rascunho (draft em content/drafts/inline-draft.json)
    edit-mode.js      barra, popover e sessão do editor inline
  data/
    wiki-data.js      helpers da árvore JSON da Wiki (inclui créditos)
    update-log.js     estado derivado do JSON do update log
```

## Como editar o conteúdo

- Entre no site e use o menu **Settings → Sign in to edit** (ou **Alt+E**) com
  uma conta GitHub com permissão de escrita no repositório.
- Toda a edição acontece nas próprias páginas (editor inline); a ferramenta
  **Versions** na barra lateral lista as versões salvas em `content/backups/`,
  permite restaurar e mantém o limite de 25 (a mais antiga sai quando a 26 é criada).
- **Publish** valida o conteúdo, cria uma versão do estado anterior e publica
  no branch principal; a Vercel publica a atualização.

## Editando direto no site (editor inline)

Quem pode editar também pode fazê-lo nas próprias páginas públicas, sem abrir
o painel: entre no menu **Settings → Sign in to edit** (ou pressione **Alt+E**).
Aparece uma barra fixa no topo com **Edit/Preview**, **Undo (Ctrl+Z)**,
**Save draft**, **Discard**, **Publish** e um indicador de pendências; clique em
qualquer título, texto, card, fato, ore, layer, runa (com boosts), stage (com
requirements e desbloqueios), área de treino, equipamento, upgrade/fórmula,
calculadora de reset, custo de desbloqueio, entrada do update log, crédito ou
texto da home para editar in-place com botões **Apply/Cancel**. Campos de ícone
têm seletor visual (grade pesquisável com preview). Itens de lista têm
**Delete** no popover, botões **＋ New…** criam categorias, subpáginas,
releases, entradas de update, upgrades e bônus; na **barra lateral** há
**Add pages** (criar categoria/página), **Reorder / nest** (arrastar páginas:
solte **entre dois itens** para reposicionar ou **no meio de uma categoria ou
página** para torná-la filha dela), **Colors** (cores dos recursos, busca e a
página para a qual cada nome aponta) e **Versions** (lista/restaura as
últimas 25 versões do conteúdo).

- **Apply** aplica a alteração na página em tempo real (preview ao vivo).
- **Save draft** grava um rascunho em `content/drafts/inline-draft.json`
  (carregado apenas pelo editor; o site público nunca lê esse arquivo).
- **Publish** valida o conteúdo, cria um backup do estado anterior e publica
  no repositório (a versão anterior fica listada em **Versions**).
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
