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
   última alteração do rascunho), **Save draft**, **Discard**, **Publish**, um
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
6. **Colors**: abre o gerenciador de cores dos recursos. Cada recurso tem um
   seletor de cor (pinta o nome do recurso em todos os textos) e um seletor de
   página (transforma o nome em link para aquela página). Há uma **busca** para
   filtrar recursos pelo nome. **Add** cria um recurso novo; o X remove. As
   mudanças aparecem na hora.
7. **Versions**: lista as versões salvas em `content/backups/` — cada Publish
   cria uma automaticamente (a versão anterior do conteúdo), e **Save version
   now** cria uma manual. A lista mantém as **25 mais recentes** (quando a 26 é
   criada, a mais antiga é removida; versões não podem ser apagadas à mão).
   **Restore** devolve aquele estado ao site: ele salva uma versão de segurança
   do conteúdo atual antes de restaurar.
8. Itens dentro de listas (ores, runas, upgrades, fatos, entradas…) têm o botão
   **Delete** no rodapé do popover: remove aquele item do rascunho (só sai de
   vez no Publish, que antes cria um backup).
9. Botões **＋ New…** criam itens onde aparecem: **New category** (home),
   **New page** (topo de categoria e listagens de subpáginas), **New release /
   New update** (update log), **New upgrade** (fórmulas) e **New bonus**
   (calculadoras).
10. **Apply** aplica e mostra a mudança na hora (a página inteira re-renderiza
   preservando a posição da rolagem). **Cancel/Esc** Fecha sem aplicar.
11. **Save draft**: precisa parar no meio? Salve um rascunho. Ele fica salvo no GitHub como
    `content/drafts/inline-draft.json` e reaparece ao voltar (restaurado e
    aplicado na página automaticamente). O site público nunca lê esse arquivo.
12. **Publish**: grava o conteúdo definitivo. Um backup completo é criado antes,
    o rascunho é apagado e a Vercel publica. **Discard** joga fora o rascunho e
    volta ao conteúdo publicado.
13. Imagens de avatar (página Credits): no campo **Avatar image** escolha o
    arquivo (max ~2 MB); ele sobe direto para `images/credits/` no GitHub.
14. Saia com **Sign out** ao terminar (Alt+E também entra/sai do modo).

No modo **Edit** a navegação pelos elementos editáveis vira edição; para
navegar normalmente use **Preview** (primeiro botão da barra) ou pressione
**Alt+E** novamente.

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

## Acesso

O login não concede acesso por si só: cada editor precisa de permissão de
escrita no repositório GitHub. O Client Secret OAuth permanece no servidor da
Vercel. Como as edições são commits, o histórico do GitHub também mantém o
histórico normal do conteúdo; a ferramenta **Versions** fornece cópias
completas para restauração fácil sem navegar pelo Git.
