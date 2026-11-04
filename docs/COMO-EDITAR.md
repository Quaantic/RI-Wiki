# Como editar a Wiki

Dá para editar de dois jeitos, usando a mesma conta GitHub com permissão de
escrita no repositório `Quaantic/RI-Wiki`:

1. **Editor inline** — edita no próprio site, clicando no conteúdo das páginas
   (recomendado para textos, cards, ores, stages, entry do update log e créditos).
2. **Content Studio (`/admin/`)** — painel completo, indicado para estruturar
   páginas novas, fórmulas e listas longas.

Não é necessário editar arquivos de código em nenhum dos dois.

## Editor inline

1. Entre no menu **Settings** (engrenagem) e clique **Sign in to edit**, ou
   simplesmente pressione **Alt+E**. O popup da GitHub costuma abrir uma vez
   por sessão do navegador.
2. Depois de entrar, aparece a **barra do editor** no topo com:
   **Edit/Preview** (liga e desliga o modo de edição), **Save draft**,
   **Discard**, **Publish**, um indicador de pendências e botão **Sign out**.
3. Clique em qualquer elemento editável (títulos, descrições, cards, fatos,
   destaques, ores, layers, runas com seus boosts, stages com áreas/placas
   desbloqueadas, áreas de treino, equipamentos, fórmulas e preços de upgrades,
   calculadoras de reset, custos de desbloqueio Tier 2, entradas do update log,
   créditos e textos da home). Um popover abre com os campos daquele item.
4. Itens dentro de listas (ores, runas, upgrades, fatos, entradas…) têm o botão
   **Delete** no rodapé do popover: remove aquele item do rascunho (só sai de
   vez no Publish, que antes cria um backup).
5. Botões **＋ New…** criam itens onde aparecem: **New category** (home),
   **New page** (topo de categoria e listagens de subpáginas), **New release /
   New update** (update log), **New upgrade** (fórmulas) e **New bonus**
   (calculadoras).
6. **Apply** aplica e mostra a mudança na hora (a página inteira re-renderiza
   preservando a posição da rolagem). **Cancel/Esc** Fecha sem aplicar.
7. **Save draft**: precisa parar no meio? Salve um rascunho. Ele fica salvo no GitHub como
   `content/drafts/inline-draft.json` e reaparece ao voltar (restaurado e
   aplicado na página automaticamente). O site público nunca lê esse arquivo.
8. **Publish**: grava o conteúdo definitivo. Um backup completo é criado antes,
   o rascunho é apagado e a Vercel publica. **Discard** joga fora o rascunho e
   volta ao conteúdo publicado.
9. Imagens de avatar (página Credits): no campo **Avatar image** escolha o
   arquivo (max ~2 MB); ele sobe direto para `images/credits/` no GitHub.
10. Saia com **Sign out** ao terminar (Alt+E também entra/sai do modo).

No modo **Edit** a navegação pelos elementos editáveis vira edição; para
navegar normalmente use **Preview** (primeiro botão da barra) ou pressione
**Alt+E** novamente.

## Content Studio (`/admin/`)

- **Wiki pages**: categorias, páginas e subpáginas; descrições, fatos,
  destaques, ícones e informações importantes. Cada seta ao lado de um item
  expande ou recolhe aquela parte da árvore. Use **Expand all / Collapse all**
  para controlar tudo de uma vez.
- **Game data**: upgrades e fórmulas, rotas de upgrades, stages, barns, ranks,
  ascensions, runas, ores, mastery, layers, preços de mineração, treinamento,
  equipamentos, calculadoras, cores e links dos recursos. Selecione um item na
  árvore lateral para editar seus campos; listas permitem adicionar, remover e
  reordenar itens.
- **Update log**: versões e notas de atualização.
- **Versions**: cópias completas restauráveis da Wiki, dados de jogo e update
  log. O painel cria uma cópia antes de cada salvamento e permite criar uma
  manualmente. Restaurar também preserva uma cópia do estado atual antes de
  aplicar a escolhida.

O painel salva em `content/wiki-data.json`, `content/game-data.json` e
`content/update-log.json`, os mesmos arquivos carregados pelo site. As
alterações são commits no branch principal e a Vercel as publica.

## Fórmulas

No **Game data**, fórmulas de upgrades são campos de preço e efeito. As
calculadoras usam expressões iniciadas por `formula:`; por exemplo:
`formula: Math.max(1, amount / 10)`. São aceitos números, variáveis já usadas
na calculadora, `+ - * / ^`, parênteses e as funções `min`, `max`, `floor`,
`ceil`, `round`, `abs`, `log10` e `sqrt`. Não coloque JavaScript nesses campos.

## Preferência de notação científica

Cada visitante pode ativar ou desativar **Scientific notation** no menu
**Settings**. Ela vem desativada por padrão e a preferência fica salva naquele
navegador.

## Acesso

O login não concede acesso por si só: cada editor precisa de permissão de
escrita no repositório GitHub. O Client Secret OAuth permanece no servidor da
Vercel. Como as edições são commits, o histórico do GitHub também mantém o
histórico normal do conteúdo; a aba **Versions** fornece cópias completas para
restauração fácil sem navegar pelo Git.
