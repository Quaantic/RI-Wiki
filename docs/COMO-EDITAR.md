# Como editar a Wiki

Abra `/admin/` no site publicado e conecte uma conta GitHub com permissão de
escrita no repositório `Quaantic/RI-Wiki`. Faça as alterações no Content Studio
e clique em **Save changes**; não é necessário editar arquivos de código.

## Abas

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
