# COMO EDITAR A WIKI (guia completo e simples)

Para editar conteúdo sem tocar no código, abra `/admin/` no site publicado e
conecte uma conta GitHub com permissão **Write** no repositório `Quaantic/RI-Wiki`.
Use **Wiki pages** para navegar por todas as categorias e páginas, ou **Update
log** para as notas de versão. A árvore começa expandida; use **Collapse all**
ou **Expand all** para organizar a navegação. Em uma categoria ou página,
**View live page** abre a rota correspondente na Wiki publicada.

O painel carrega `content/wiki-data.json` e `content/update-log.json` do
repositório e salva as alterações diretamente no branch principal. Esses são
os mesmos arquivos consumidos pelo site; a Vercel publica cada alteração.
Atualmente a árvore contém 7 categorias e 136 páginas.

O painel controla textos e dados editoriais. Fórmulas, calculadoras, recursos,
regras de jogo e layout ainda são código e precisam de uma alteração técnica.
Os arquivos JSON em `content/` são a fonte única dos textos editáveis.

## Preferência de notação científica

Cada visitante pode ativar ou desativar **Scientific notation** no menu **Settings**.
Ela vem desativada por padrão e a preferência fica salva naquele navegador.

**Índice rápido — "quero..."**

| Quero... | Edite |
|---|---|
| Criar/alterar uma página, seção ou subpágina | **Wiki pages** no painel (`content/wiki-data.json`) |
| Colocar os upgrades de algo (com slider de nível) | `js/data/formulas.js` |
| Colocar Stages, Barns, Ranks, Ascensions, Life Ranks ou Core Ranks | `js/data/progress.js` |
| Editar calculadoras de Dungeon Level, Special Gears ou Bone Dust | `js/data/reset-layers.js` |
| Trocar a cor de um recurso (Energy, Bones...) | `js/data/resource-colors.js` |
| Preços de upgrades de mineração por nível | `js/data/mining-prices.js` |
| Runas / Ores / Bestiário / Espadas / Áreas | `runes.js`, `ores.js`, `dungeon.js` |
| Log de updates | **Update log** no painel (`content/update-log.json`) |

---

## 1. PÁGINAS E MENU — painel **Wiki pages**

No painel, abra **Wiki pages**. A árvore lateral mostra categorias, páginas e
subpáginas; selecione uma para editar nome, URL ID, descrição, ícone,
highlights, fatos e informações importantes. Os botões **+** criam categorias,
páginas e níveis aninhados. Use as setas ao lado de cada item para mudar a
ordem; a árvore define a ordem do menu.

O painel salva esses dados em `content/wiki-data.json`.

```js
{
  id: 'crystals',              // usado na URL: #/main/crystals (sem espaços, tudo minúsculo)
  name: 'Crystals',            // nome que aparece
  icon: 'gem',                 // nome de ícone do Lucide (ver seção ÍCONES abaixo)
  desc: 'Uma frase curta descrevendo a página.',   // descrição única
  highlights: [],              // cards de destaque (opcional)
  facts: [                     // chips de informação no topo (opcional)
    { label: 'Ores', value: '26' },
  ],
  vitals: [{ label: 'Key', value: 'info' }],   // painel "Key info" no hero (opcional)
  children: [                  // sub-páginas de dentro (opcional)
    { id: 'crystal-upgrades', name: 'Crystal Upgrades', icon: 'gem',
      desc: 'A track de upgrades.', highlights: [], facts: [] },
  ],
},
```

Regras importantes:

- `desc` é a ÚNICA descrição — não existe mais `blurb`/`intro` separados.
- O `id` vira a URL. Para uma página de upgrades funcionar, o `id` precisa
  bater com a chave do `FORMULA_PAGE_MAP` (seção 2 abaixo).
- A ordem no arquivo é a ordem no menu.
- Copie um bloco existente e mude os valores — é o jeito mais fácil.

---

## 2. UPGRADES COM SLIDER — `js/data/formulas.js`

Cada página de upgrades é uma "seção". Um upgrade é sempre:

```js
u(numero, 'Nome', cap, 'formula do preço', 'formula do multi')
```

Exemplo real:

```js
'crystal-upgrades': {
  name: 'Crystal Upgrades',
  upgrades: [
    u(1, 'Crystal Boost', 25, '10*1.5^L', '1+0.2*L'),
    u(2, 'Crystal Cap',   50, '5*L^2+100', '1.1^L'),
  ],
},
```

- **cap** — nível máximo. Se não tiver limite, escreva `null`
  (o slider vai até 499 sozinho).
- **L** — o nível atual (o que a pessoa colocou no slider).
  Price = custo do PRÓXIMO nível; Multi = efeito no nível L.
- Operadores: `+ - * / ^` (potência), parênteses, `math.floor`, `1e15`,
  multiplicação implícita (`0.08L`) — escreva como no jogo que funciona.
- Preço em lista (um valor por nível): `'100/250/500/1000'`.
- Preço fixo: `'5000 (fixo)'`.
- Fórmula que não dá pra calcular vira texto pequeno no card — nada quebra.

### Ligando a página à seção

No final do arquivo tem o `FORMULA_PAGE_MAP`. Ele diz qual seção abre em qual página:

```js
'main/crystal-upgrades': 'crystal-upgrades',
```

A chave é `categoria/id-da-subcategoria` (igual ao `id` da página no painel).
Sem essa linha a página existe mas não mostra os upgrades.

### Passo a passo para criar uma página nova de upgrades

1. Painel — crie a subcategoria com URL ID, nome, ícone e descrição.
2. `formulas.js` — crie a seção com os `u(...)`.
3. `formulas.js` (final do arquivo) — adicione a linha no `FORMULA_PAGE_MAP`.
4. Salve e abra `#/categoria/id` no site.

Filhos com nome terminado em `Upgrades` e entrada no `FORMULA_PAGE_MAP` são
incorporados à página principal automaticamente. Eles não aparecem separados
no menu ou nas sugestões de busca; outros filhos, como `Golden Research`,
continuam separados.

### Caso especial: preços por nível de mineração

Se a seção usar `priceTable: 'mining'`, o preço de cada nível vem do
`mining-prices.js` (custos com várias moedas tipo `'Tin:125 + Iron:5'`),
e o campo de preço do `u()` é ignorado.

---

## 3. STAGES, BARNS, RANKS, ASCENSIONS, LIFE RANKS E CORE RANKS — `js/data/progress.js`

**Tudo fica neste único arquivo.** Todos usam o mesmo visual de card
(requisitos / boosts / unlocks), só muda a lista onde você coloca os dados:

| Página | Lista | Chave |
|---|---|---|
| Stages (Main) | `STAGE_DATA` | `'main/stages'` |
| Barns (Main › Crystal Barn) | `BARN_DATA` | `'main/barn'` |
| Ranks (Dungeon › Training) | `RANK_DATA` | `'dungeon/ranks'` |
| Ascensions (Money Island) | `ASCENSION_DATA` | `'money-island/ascensions'` |
| Life Ranks (Life › Terraform) | `LIFE_RANK_DATA` | `'life/terra-life'` |
| Core Ranks (Mining › Cores) | `CORE_DATA` | `'mining/cores'` |

Como adicionar um card novo (exemplo: Barn VI):

```js
{
  num: 'VI',                       // aparece no hexágono (pode ser 'VI', '3' etc)
  title: 'Barn VI',                // título do card (Stages não precisam)
  requirements: ['50B Opal', '129 Eternal Shards (No Reset)'],
  boosts: [
    '20x Crystal',
    '10x Jewels',
  ],
  unlocks: {
    features: [
      { name: 'Adamantium' },                        // unlock simples
      { name: 'Mining', subs: ['Mining Perks'] },    // com sub-itens
    ],
  },
},
```

Campos opcionais: `title`, `boostsNote` (textinho do lado de Boosts),
`unlocks.area` e `unlocks.places` (para "Island: Life Island" nos Stages).

A chave (`'main/barn'` etc.) é `categoria/id-da-subcategoria` — o mesmo
`id` que existe na árvore da Wiki. Nada mais precisa ser configurado:
a página detecta sozinha e desenha os cards (Barns/Ranks/Ascensions/Life
Ranks/Core Ranks mostram 2 cards por linha; Stages ficam em coluna única).

### Como adicionar Core Ranks

1. No painel, confirme que existe a subcategoria `cores` dentro de
  Mining. O ID precisa ser `cores`, pois a chave dos dados é `'mining/cores'`.
2. Em `progress.js`, adicione os cards dentro da lista `CORE_DATA['mining/cores'].ranks`.
  Cada item segue o mesmo formato dos outros ranks: `num`, `title`,
  `requirements`, `boosts` e `unlocks`.
3. Salve e abra `#/mining/cores`. A página seleciona e desenha os Core Ranks
  automaticamente; não é necessário criar uma rota ou alterar `views.js`.

Para incluir outro core, acrescente mais um objeto à lista `ranks`, mantendo
os anteriores. Para usar Core Ranks em outra subcategoria, adicione uma
entrada com a chave `'categoria/id-da-subcategoria'` em `CORE_DATA`; o getter
e o renderer já atendem essas entradas automaticamente.

---

## 4. ÍCONES (Lucide)

Os ícones vêm da biblioteca **Lucide** (https://lucide.dev), já incluída no
projeto (`js/lib/lucide-data.js`) — funciona offline, sem CDN, sem SVG à mão.

- Qualquer nome de https://lucide.dev/icons funciona direto:
  `pickaxe`, `sword`, `swords`, `shield`, `gem`, `flame`, `clock`, `search`,
  `settings`, `star`, `zap`, `compass`, `leaf`, `git-branch`, `castle`,
  `coins`, `magnet`, `drill`, `factory`, `chart-no-axes-column`...
- Só use o nome: `icon: 'pickaxe'`.
- Nome inválido ou digitado errado não quebra nada — cai num círculo cinza.
- Nomes antigos do projeto continuam funcionando (apontam para um Lucide):
  `rune`, `hex`, `ingot`, `branch`, `spark`, `coin`, `card`, `refresh`,
  `flask`, `drop`, `chart`, `alert`, `sort`.

Para escolher: abra https://lucide.dev/icons, ache o ícone, copie o nome
(ex.: `pickaxe`) e cole no campo **Icon name** do painel.

---

## 5. CORES DOS RECURSOS — `js/data/resource-colors.js`

- `RESOURCE_COLORS`: `'Energy': '#57F287'` — todo "Energy" no site fica
  colorido. Funciona no singular/plural e em qualquer maiúscula.
- `PAGE_LINKS`: `'energy': '#/main/energy'` — o nome colorido vira **link
  clicável** para a página (que pisca ao abrir). Não linka na própria página.

---

## 6. PUBLICAR UMA UPDATE

1. Abra **Update log** no painel e crie uma release.
2. Adicione entradas e escolha o contexto: `Feature`, `UI`, `Bugs` ou `Changes`.
3. Salve. A primeira release na lista é tratada como a mais recente.
   Quem já visitou vê o **(!) vermelho** até abrir a página de updates.

---

## 7. TEMAS E SETTINGS

Botão de engrenagem no topo: Dark/Light, Reduce motion, Resource colors,
Background textures. Tudo salvo no navegador (localStorage) e aplicado
antes do CSS carregar. Cores dos temas: `css/tokens.css`.

---

## 8. CHECKLIST RÁPIDO

Criar página nova com upgrades:

1. Painel Wiki pages → subcategoria com URL ID, nome, ícone e descrição.
2. `formulas.js` → seção com os `u(...)` + linha no `FORMULA_PAGE_MAP`.
3. Teste a URL `#/categoria/id`.

Adicionar um Stage/Barn/Rank novo:

1. `progress.js` → adicione o card na lista certa.
2. Pronto — não existe passo 2.

Trocar um ícone:

1. Escolha o nome em https://lucide.dev/icons.
2. No painel Wiki pages, altere o campo Icon name.

Editar as calculadoras de reset layer:

1. `reset-layers.js` → altere os bônus e curvas de Dungeon Level, Special Gears
  ou Bone Dust.
2. A calculadora recebe o bônus desejado e busca a menor quantidade necessária.
  No Bone Dust, `p = 1 + nível de Souls Upgrade 11 / 10` (níveis 0 a 6).
