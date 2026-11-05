# RI Gaming Wiki

### Compact game presentation

Imported Markdown is reference material, not page copy. The compact presentation
migration removes only generated `notes-*` sections, preserving custom editor
sections and the extracted calculators. Milestones use responsive grid cards;
owned-amount bonuses use compact rows. Frost Generators has three interactive
machines with Level, Speed, Tier, tier multiplier, output and upgrade costs.
Tier multipliers are entered from the game because the source did not specify
their exact formula. The update log is not changed by this migration.

Deploy both `js/` and `css/`, including new modules. The v2 presentation migration
also repairs previously saved v1 drafts, so the old note tables do not reappear.

### Correção da entrega do conteúdo importado

As informações dos cinco arquivos também estão em `js/data/imported-notes.js`.
`js/content-migrations.js` aplica essa importação uma vez tanto no carregamento
público quanto no editor, inclusive sobre JSON/rascunhos antigos. As páginas
registram `contentMigrations` após Save/Publish, preservando edições posteriores.
Energies e Frost Conversion removem as antigas subpáginas e mantêm redirecionamentos.
O Update Log não faz parte dessa importação.

Ao enviar a atualização, inclua os arquivos novos da pasta `js/`, especialmente
`data/imported-notes.js` e `content-migrations.js`, além de `services.js` e
`edit/draft.js`. Atualizar só arquivos que já existiam não instala os módulos novos.
`node scripts/build-content-patch.cjs` regenera o pacote de dados a partir dos
JSONs locais importados. `node scripts/verify-live-content-repair.cjs` faz uma
auditoria de leitura do site e salva o antes/depois simulado em `artifacts/`.

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
página** para torná-la filha dela), **Colors** (rota `#/colors` com as cores
dos recursos — Add no topo, busca e campo de link pesquisável) e **Versions**
(rota `#/versions` com as últimas 25 versões do conteúdo e o **Update
History** automático de cada mudança).

- **Apply** aplica a alteração na página em tempo real (preview ao vivo).
- **Save for everyone** grava o rascunho compartilhado em `content/drafts/inline-draft.json`.
  Os editores verificam atualizações a cada 15 segundos e ao voltar à janela.
  A sincronização combina mudanças independentes por ID de página, mantendo
  edições locais ainda não salvas, sem forçar F5. Não há sincronização enquanto
  um formulário ou arraste está aberto. Save e Publish também sincronizam antes
  de gravar; o SHA do GitHub impede sobrescrever um save simultâneo.
  Se duas pessoas alterarem o mesmo campo, o save é bloqueado e as alterações
  locais permanecem disponíveis. Use **Download draft** para guardar uma cópia.
  A sessão também mantém recuperação de alterações aplicadas no mesmo navegador/aba.
  O site público continua usando somente o conteúdo publicado.
- **Publish** valida o conteúdo, cria um backup do estado anterior e publica
  no repositório (a versão anterior fica listada em **Versions**).
- **Discard** volta ao conteúdo publicado.

O **Update History** registra somente alterações reais, com o login GitHub
do editor, sem duplicar entradas a cada Save. Entradas anteriores sem autoria
aparecem como `Legacy edit`. **Reorder / nest** ativa Edit automaticamente;
arraste pelas bordas para reordenar ou pelo centro para aninhar. Em **Rare Saps**,
use **Add sap group** para criar um sap e **New bonus** para adicionar seus bônus.

## Conteúdo de páginas existentes

No modo Edit, cada página tem **Page content → Add content**: adicione
**Evolution**, **Stage**, **Upgrade**, **Bonus** ou **Text / FAQ** sem recriar a
página. Tipos diferentes podem coexistir. Text / FAQ contém um título e texto
com quebras de linha; o conteúdo é salvo em `wiki.categories[…].sections`.
Evolutions usa o mesmo formato de requirements/boosts de Stages, com o título
Evolutions. A criação de páginas também oferece esse tipo.

O formulário de bônus mostra nome, fórmula, formato de exibição, um máximo
opcional e um desbloqueio opcional (nível ou quantidade, conforme a calculadora).
IDs internos são automáticos. Metadados antigos não editados são preservados.

Em **Versions**, **Recover missing pages** recupera categorias/páginas ausentes
de um backup para o rascunho e mantém o conteúdo atual. Depois revise e salve.
Essa recuperação depende de a página existir em uma versão salva; não reconstrói
texto perdido que nunca chegou ao repositório.

Depois de enviar esta atualização ao site, todos os colaboradores devem
recarregar uma vez para usar o novo sincronizador.

Para testar a interface sem login nem gravações no GitHub, rode
`node tests/admin-preview.cjs` e abra `http://127.0.0.1:4173/`.
Esse servidor usa somente dados em memória e deve ser encerrado após o teste.

## Edição no celular e novos conteúdos

No celular, a barra tem **Preview**, **Save**, **Publish** e **More** (Undo,
Download, Discard e Sign out). O menu **Add content** expande dentro da página;
os formulários abrem como painéis com botões sempre acessíveis.

**Stage / evolution / milestone** usa um único formato. Clique no título da
seção para definir o nome da seção e o nome dos itens. **Table** permite editar
colunas e adicionar linhas; **Fact**, **Highlight** e **Grouped bonuses** também
podem ser adicionados à página existente. Listas de ores, mastery, layers, runes,
training e gear têm controles para adicionar itens. O campo de quantidade da
calculadora pode ser renomeado ou ocultado em **Calculator settings**, mantendo
os bônus e usando uma quantidade padrão.

As páginas mantêm uma referência estável ao conteúdo do jogo ao mudar de
categoria ou de URL; isso também vale para os filhos. Conteúdo antigo sem essa
referência é localizado pelo ID quando não há ambiguidade.

O Update Log preserva releases vazias no modo Edit, tem **Add update** em cada
release, sugere uma versão inédita e recupera releases duplicadas mantendo as
entradas. As entradas têm IDs estáveis para combinar adições de colaboradores.
Os rascunhos registram os SHAs do conteúdo publicado que lhes serviu de base,
para combinar novas publicações com alterações ainda não publicadas.

Os cinco arquivos de referência fornecidos foram importados para Energies,
Golden Points, Frost Generators, Frost Conversion e os milestones de Golden
Research, Californium e Astatine Power. Energies e Frost Conversion concentram
seus tipos em uma página; URLs antigas redirecionam para a página agrupada.
Fórmulas e tabelas mantêm as ressalvas da fonte, incluindo efeitos não
identificados e multiplicadores exclusivos do servidor.

O importador reproduzível é `scripts/import-game-notes.cjs`. Ele recebe a pasta
dos cinco Markdown como argumento, valida o resultado e grava somente
`content/wiki-data.json` e `content/game-data.json`; não grava o Update Log.

Ver `docs/COMO-EDITAR.md` para o passo a passo.

O dono do site configura o OAuth do GitHub e as variáveis do Vercel uma vez.
Cada editor precisa de acesso de escrita ao repositório. O conteúdo editável
fica em `content/*.json`; os módulos em `js/data/` são renderizadores e lógica
do site.

## Editor safety and release log

Applied edits and unfinished form text are automatically backed up on this
device, using local storage with a session-storage fallback. Refreshing restores
the draft after editor sign-in. **Close** and **Escape** keep unfinished forms;
**Resume edit** reopens them. Opening another form keeps earlier unfinished
forms too. **Cancel** explicitly discards only that form's typing. Form
validation completes before any field is changed. If storage is unavailable,
the editor reports the problem and warns before leaving; **Download draft**
includes unfinished forms as well as applied content.

**Save for everyone** applies the open form and shares the draft through GitHub.
**Publish** publishes it to the public wiki. Local recovery is specific to the
browser and GitHub account; use Save before switching devices or clearing site
storage.

Frost Generators have **Edit generator & formulas**, including an **Advanced
formulas** section. Variables: `L` level, `S` speed, `T` tier, `scale`,
`baseIncome`, `baseTime`, `tierPrice`, `levelPrice`, and `speedPrice`. Tier and
global upgrade multipliers are applied after the base formulas.

The Update Log has collapsible releases and category groups. Icons appear on
category headers, with plain update rows. **Major Releases** have at least three
Features; **Minor Updates** have at least three Features + Changes combined
without meeting Major; **Hotfixes** contain only UI/Bugs. Smaller mixed releases
remain under **All Updates**. Creating a release returns to All so it stays
visible while editing.

Static backgrounds live in `images/backgrounds/`: one compressed landscape and
two small SVG textures, reused across banners and release cards. They add no
animation loop, canvas, particles or third-party image requests.

## Concurrent saves and adaptive layout

Save merges each editor's changes into the latest shared revision. Unchanged
fields keep the other editor's values; saving without changes does not write a
new draft revision. If another save wins between the read and write, the editor
automatically re-reads, merges and retries (up to four attempts). The activity
history uses the same revision protection. Conflicting edits to the same field
stop the save and keep the local recovery copy.

Rendering no longer inserts generator defaults into untouched documents, and
the completed compact content import is not re-run. Generator forms show the
built-in formulas as defaults and apply only fields you changed.

The sidebar preserves expanded branches and reopens the current page's full
ancestor chain after save/sync. Navigation supports deeper nesting as well.

`css/adaptive.css` carries the forest palette across the page, sidebar, cards
and footer. Grids choose their column count from available space. Short
progression cards share a row; longer cards request more columns. This also
applies to bonus groups, generators, milestones, upgrades and custom text/FAQ
sections. Long descriptions and tables retain the space they need. There are
no new animated backgrounds or additional image assets.

For a two-editor browser check, run `node tests/admin-preview.cjs` and open
`http://127.0.0.1:4173/?editor=editor-a#/updates` and
`http://127.0.0.1:4173/?editor=editor-b#/life/tree` in separate tabs. The repository
and saves are mocked in memory; no GitHub credentials or remote writes are used.

## Excel (fase futura)

A interface nunca lê os dados diretamente — tudo passa por `js/services.js`.
Quando a planilha for integrada, basta trocar a fonte
(`dataProvider.setDataSource('excel')`) sem tocar nas páginas. Ver
`docs/EXCEL_INTEGRATION.md`.
