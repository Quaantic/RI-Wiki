# Como editar a Wiki

Toda a edição acontece no próprio site, com a mesma conta GitHub com permissão
de escrita no repositório `Quaantic/RI-Wiki`:

1. **Editor inline** — edita clicando no conteúdo das páginas: textos, cards,
   ores, stages, entradas do update log, créditos, fórmulas, além de criar,
   reordenar e aninhar páginas, cores dos recursos e versões/restauração.

Não é necessário editar arquivos de código.

## Editor inline

1. Entre no menu **Settings** (engrenagem) e clique **Sign in to edit**, ou
   simplesmente pressione **Alt+E**. O popup da GitHub costuma abrir uma vez
   por sessão do navegador.
2. Depois de entrar, aparece a **barra do editor** no topo com:
   **Edit/Preview** (liga e desliga o modo de edição), **Undo** (Ctrl+Z desfaz a
   última alteração do rascunho), **Save for everyone**, **Download draft**, **Discard**, **Publish**, um
   indicador de pendências e botão **Sign out**.
3. **Páginas**: no rodapé da barra lateral há quatro ferramentas —
   **Add pages** (cria categoria ou página dentro de uma categoria),
   **Reorder / nest** (ativa o modo arrastar: arraste o nome e solte
   **entre duas páginas** para reposicionar, ou **no meio de uma categoria
   ou página** para torná-la filha dela — em qualquer nível; arraste uma
   categoria **entre outras duas** para reordenar), **Colors** (cores dos
   recursos) e **Versions** (versões salvas do conteúdo).
4. Clique em qualquer elemento editável (títulos, descrições, cards, fatos,
   destaques, ores, layers, runas com seus boosts, stages com áreas/placas
   desbloqueadas, áreas de treino, equipamentos, fórmulas e preços de upgrades,
   calculadoras de reset, custos de desbloqueio Tier 2, entradas do update log,
   créditos e textos da home). Um popover abre com os campos daquele item.
5. **Ícones**: os campos de ícone têm botão **Browse**, que abre uma grade
   pesquisável (com preview) de todos os ícones lucide — clique no que quiser.
6. **Colors**: abre a página `#/colors` com todas as cores dos recursos:
    **Add** no topo (nome + cor), **busca** para filtrar e um campo de link
    **pesquisável** por linha — clique e digite para achar qualquer página,
    inclusive aninhadas (Tree › Sap › Rare Saps). O X remove o recurso. No fim
    da página há o histórico das mudanças de cores. As mudanças aparecem na
    hora, inclusive fora da página (a atualização vale para o site todo).
7. **Versions**: página `#/versions` com as versões salvas em `content/backups/` —
   cada Publish cria uma automaticamente (a versão anterior do conteúdo), e
   **Save version now** cria uma manual. A lista mantém as **25 mais recentes**
   (quando a 26 é criada, a mais antiga é removida; versões não podem ser
   apagadas à mão). **Restore** devolve aquele estado ao site: ele salva uma
   versão de segurança do conteúdo atual antes de restaurar. Abaixo da lista,
   o **Update History** registra automaticamente toda mudança — criado,
   renomeado, removido, movido, cores e links — com data/hora; entradas
   *pending* ficam permanentes no Publish.
8. Itens dentro de listas (ores, runas, upgrades, fatos, entradas…) têm o botão
   **Delete** no rodapé do popover: remove aquele item do rascunho (só sai de
   vez no Publish, que antes cria um backup).
9. Botões **＋ New…** criam itens onde aparecem: **New category** (home),
    **New page** (topo de categoria e listagens de subpáginas), **New release /
    New update** (update log), **New upgrade** (fórmulas) e **New bonus**
    (calculadoras). Em **Add pages** dá para escolher o **tipo da página** —
    genérica, Stages, Barns, Ranks, Ascensions, Life Ranks, Core Ranks,
    Upgrades (fórmulas) ou um dos 5 tipos de calculadora de bônus — e a página
    já nasce com o conteúdo certo (e um item de exemplo) pronto para editar.
    Páginas de Stages/Barns/Ranks também têm o botão **＋ New stage/barn/rank**.
10. **Apply** aplica e mostra a mudança na hora (a página inteira re-renderiza
   preservando a posição da rolagem). **Cancel/Esc** Fecha sem aplicar.
11. **Save for everyone**: precisa parar no meio? Salve um rascunho. Ele fica salvo no GitHub como
    `content/drafts/inline-draft.json` e reaparece ao voltar (restaurado e
    aplicado na página automaticamente). O site público nunca lê esse arquivo.
    As alterações dos colaboradores são combinadas a cada 15 segundos sem F5,
    preservando edições locais. Formulários abertos aguardam Apply/Cancel para
    sincronizar. Se o mesmo campo foi alterado por duas pessoas, o save é
    bloqueado: **Download draft** guarda uma cópia para resolver o conflito.
    Alterações aplicadas também têm uma cópia de recuperação na sessão da aba.
12. **Publish**: grava o conteúdo definitivo. Um backup completo é criado antes,
    o rascunho é apagado e a Vercel publica. **Discard** joga fora o rascunho e
    volta ao conteúdo publicado.
13. Imagens de avatar (página Credits): no campo **Avatar image** escolha o
    arquivo (max ~2 MB); ele sobe direto para `images/credits/` no GitHub.
14. Saia com **Sign out** ao terminar (Alt+E também entra/sai do modo).

No modo **Edit** a navegação pelos elementos editáveis vira edição; para
navegar normalmente use **Preview** (primeiro botão da barra) ou pressione
**Alt+E** novamente.

## Adicionar conteúdo a uma página existente

Em **Edit**, use **Page content → Add content** na própria página. Escolha
**Evolution**, **Stage**, **Upgrade**, **Bonus** ou **Text / FAQ**. Não é preciso
criar outra página; evoluções, upgrades, bônus e texto podem coexistir.
**Text / FAQ** tem um título/pergunta e um texto/resposta com quebras de linha.
O formulário de bônus tem apenas uma configuração de máximo e uma de desbloqueio,
adequada à calculadora (nível ou quantidade); o ID é automático.

**Stage / evolution / milestone** é uma única opção: clique no título da seção
para escolher sua nomenclatura. **Table** cria colunas editáveis e tem **Add row**
para adicionar linhas. **Fact**, **Highlight** e **Grouped bonuses** permitem
ampliar páginas existentes. O campo “owned” de um bônus é editável e pode ser
ocultado em **Calculator settings**, sem remover os bônus.

Mover páginas entre categorias mantém o conteúdo de jogo e seus vínculos de
edição. Em versões antigas, o conteúdo é recuperado pelo ID quando existe um
único conjunto de dados correspondente.

No Update Log, **New release** sugere uma versão livre e a coloca no início.
Mesmo vazia, a release aparece no modo Edit com **Add update**. Duplicatas
antigas são reunidas sem perder entradas; não use uma versão já existente ao
renomear uma release.

Se uma página sumiu, **Versions → Recover missing pages** adiciona páginas
ausentes de uma versão salva ao rascunho sem substituir o conteúdo atual.
Revise e use **Save for everyone**. A versão precisa conter o texto perdido.

Após atualizar os arquivos do site, todos os colaboradores devem recarregar
uma vez para usar o novo sincronizador.

## Celular

A barra mostra **Preview / Save / Publish / More**. Abra **More** para Undo,
Download draft, Discard e Sign out. **Add content** expande no fluxo da página;
formulários têm rolagem interna e controles de Apply/Cancel no rodapé.

O menu **Settings** fica no topo em qualquer tela (os ícones de Update Log e
Feedback é que se escondem em telas pequenas). No celular, um **deslize da
borda esquerda para a direita** abre o menu lateral; deslize para a esquerda
(com o menu aberto) ou toque fora para fechar. Contas sem permissão de
escrita nunca veem os botões de editar — eles só aparecem depois que a
permissão é confirmada.

## Fórmulas

As fórmulas de upgrades são campos de preço e efeito editáveis nos próprios
cards. As calculadoras usam expressões iniciadas por `formula:`; por exemplo:
`formula: Math.max(1, amount / 10)`. São aceitos números, variáveis já usadas
na calculadora, `+ - * / ^`, parênteses e as funções `min`, `max`, `floor`,
`ceil`, `round`, `abs`, `log10` e `sqrt`. Não coloque JavaScript nesses campos.

## Preferência de notação científica

Cada visitante pode ativar ou desativar **Scientific notation** no menu
**Settings**. Ela vem desativada por padrão e a preferência fica salva naquele
navegador.

## Proteção de rascunhos

As alterações aplicadas e o texto ainda aberto no formulário são guardados
automaticamente neste navegador. Depois de F5, entre na mesma conta para
continuar. **Close** ou **Escape** preservam o formulário; **Resume edit** o
reabre. Você pode editar outro item sem apagar os formulários anteriores.
**Cancel** descarta somente o texto daquele formulário. Clicar fora não fecha
o painel, inclusive ao soltar o mouse depois de selecionar texto.

**Save for everyone** aplica o formulário aberto e salva o rascunho compartilhado
no GitHub. **Publish** publica no site. Antes de mudar de dispositivo ou limpar
os dados do navegador, salve. **Download draft** inclui os formulários pendentes
em `_unfinishedForm`. Se o armazenamento falhar, aparece um aviso e uma
confirmação antes de sair da página.

Em Frost Generators, use **Edit generator & formulas**. Os valores básicos ficam
no início e as expressões em **Advanced formulas**. `L`, `S` e `T` representam
level, speed e tier; `baseIncome`, `baseTime`, `scale`, `tierPrice`, `levelPrice`
e `speedPrice` vêm das configurações do gerador.

No Update Log, os títulos de categorias abrem e fecham seus itens. Major exige
3+ Features; Minor exige 3+ Features + Changes sem atingir Major; Hotfix contém
somente UI/Bugs. Releases menores de outros tipos aparecem em All Updates.

## Duas pessoas editando ao mesmo tempo

Cada Save combina suas alterações com a revisão compartilhada mais recente.
Você pode editar o Update Log enquanto outra pessoa edita páginas; campos que
você não alterou mantêm o valor dela. Save sem alterações não cria uma nova
revisão. Se os saves ocorrerem juntos, o editor busca a nova revisão e tenta
novamente. Alterações incompatíveis no mesmo campo geram um aviso e preservam
seu rascunho local.

A barra lateral mantém os ramos abertos e mostra o caminho completo da página
atual depois de Save ou sincronização. Os cartões agora se distribuem conforme
o espaço disponível: tiers, stages, bônus e outros itens curtos cabem juntos;
conteúdos longos e tabelas recebem mais espaço automaticamente.

## Carregamento e Preview

Com a sessão de editor aberta, a primeira página aguarda o rascunho
compartilhado. Home, sidebar, Edit e Preview mostram o mesmo conteúdo, inclusive
categorias ainda não publicadas. A escolha de Preview/Edit é mantida ao dar F5
na mesma sessão. Para visitantes sem sessão de editor, o site continua
mostrando a publicação atual; Save compartilha o rascunho e Publish publica.

Clique no nome de um ramo como Apples para abrir ou fechar seus filhos. Salvar
mantém o fechamento explícito; abrir um filho pela busca revela seus pais.
Links antigos de Tree Milestones abrem Tree Tier quando a página foi renomeada.

Os cards de progressão alinham altura e linhas por fileira. Stages detalhados
mostram Requirements, Boosts e Unlocks em linhas amplas; as observações dos
boosts ficam junto dos respectivos valores.

## Acesso

O login não concede acesso por si só: cada editor precisa de permissão de
escrita no repositório GitHub. O Client Secret OAuth permanece no servidor da
Vercel. Como as edições são commits, o histórico do GitHub também mantém o
histórico normal do conteúdo; a ferramenta **Versions** fornece cópias
completas para restauração fácil sem navegar pelo Git.
