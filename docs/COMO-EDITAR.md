# Como editar a wiki

Tudo que aparece no site vem de **arquivos de dados** em `js/data/`.
Edita o dado, salva, e dá F5 no navegador.

## Os arquivos

| Arquivo | O que faz |
|---|---|
| `wiki-data.js` | **Categorias, subseções e sub-subs** (a árvore do sidebar inteira) |
| `runes.js` | Runas de cada família (cards com luck, chance, boosts) |
| `ores.js` | Mining: `ORE_DATA` (Ores), `MASTERY_DATA` (Mastery), `LAYER_DATA` (Layers) |
| `dungeon.js` | Dungeons: `TRAINING_AREAS`, `DUST_UNLOCK`, `GEARS` (swords/shield/items) |
| `formulas.js` | **Todas as fórmulas de upgrade** e o mapa seção → página |
| `mining-prices.js` | Tabela de preços por nível dos Mining Upgrades |
| `stages.js` | Stages II–VI (Main) |
| `progress.js` | Ranks (Dungeons › Training) e Ascensions (Money Island › Upgrade Tree) |
| `update-log.js` | Update Log + `LATEST_UPDATE_ID` |
| `resource-colors.js` | Cores dos recursos + links dos smart references |

## Árvore de páginas (wiki-data.js)

```
CATEGORIES = [
  { id, name, icon, tagline, vitals, subcategories: [
    { id, name, icon, blurb, intro, highlights, facts,
      vitals, note,                  <- opcionais
      children: [ ...mesma coisa ] } <- sub-subs, pode aninhar
  ]}
]
```

- Nova página = novo objeto com `id` unico (a rota vira `#/categoria/id`).
- `vitals: [{ label, value }]` = painel Key info no hero.
- `note: { variant, title, text }` = aviso logo abaixo das abas.
- Campos que você NÃO precisa: `highlights: []` e `facts: []` podem ficar vazios.

## Fórmulas de upgrade (formulas.js)

Cada seção:

```js
mining: {
  name: 'Mining Upgrades',
  priceTable: 'mining',   // opcional: preco vem da tabela (mining-prices.js)
  note: 'observacao no topo da pagina',
  upgrades: [
    u(1, 'Pick Damage', 50, 'FORMULA_PRICE', 'FORMULA_MULTI'),
  ],
},
```

- `L` = nivel atual. Price = custo do proximo nivel. Multi = efeito no nivel L.
- Escreve a formula EXATAMENTE como no jogo (`^`, `math.floor`, `1e12`, `0.08L`...).
  O site converte e calcula sozinho quando o visitante move o slider.
- Para ligar a seção a uma página: `'money-island/gold-upgrades': 'gold'`
  em `FORMULA_PAGE_MAP`.
- Se o preço for tabela (sem formula): usa `priceTable` (ver `mining-prices.js`).

## Publicar uma update

1. Adicione a entrada em `UPDATE_LOG` (o de cima é o mais recente).
   Contextos: `Feature`, `UI`, `Bugs`, `Changes`.
2. Suba o `LATEST_UPDATE_ID`.
3. Quem já visitou vê o **(!) vermelho** até abrir a página.

## Cores e links (resource-colors.js)

- `RESOURCE_COLORS`: `'Nome': '#cor'` — todo nome aparece colorido no site.
- Funciona no singular/plural e em qualquer maiúscula.
- `PAGE_LINKS`: `'nome': '#/rota'` — o nome colorido vira **link clicável**
  para a página, e a página de destino pisca ao abrir.

## Temas e Settings

Botão de engrenagem no topo: Dark/Light, Reduce motion, Resource colors,
Background textures. Tudo salvo no navegador (localStorage) e aplicado
antes do CSS carregar. Cores dos temas: `css/tokens.css`.
