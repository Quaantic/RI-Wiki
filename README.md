# RI Wiki — Redesign Test v9

**Isolated test build, not production.** Based on the uploaded v8 and the latest draft exported 2026-11-09.

## Changes

- Integrated the submitted draft and 208 SVGs from the updated icons ZIP.
- Money Island → Prestige: 37 documented upgrades with formulas, caps and integer-floor prices from `Prestige_Upgrades(1).txt`. Better Silver has a Silver Energy (S) input.
- Empty upgrade, milestone and rune sections no longer show orphan headings; editing controls remain available.
- Rune cards use larger artwork without the redundant hexagon, with a simpler Recommended Luck row.
- Dungeon Bones no longer resolves to Rune Bones.
- Factory Automator [GEARS] is indexed under Gears in the Explorer, using the explicit tagged target.
- Added icons to milestone and bonus headings/cards, and a fixed, low-profile Yes/No Go back prompt that disappears after ten seconds or navigation.
- Kept original user draft in `docs/USER-DRAFT-ORIGINAL-2026-11-09.json`; the content JSON files contain the changes.

## Local preview

Open a terminal in this folder and run `node server/dev.cjs`, then visit `http://localhost:4173`. Use the built-in server rather than Live Server to have newly added SVGs detected immediately. On static hosting regenerate the fallback with `node server/generate-icon-index.cjs` or deploy through the configured build.

The v9 preview uses a new isolated browser test-state key, so drafts from v8 will not silently override the bundled v9 content when you run on the same local port. Export and import any later v8 edits explicitly.

## Testing

All JavaScript syntax, content validation, route/mapping checks, Prestige formulas, and standalone module-based HTML page rendering were checked. Headless Chromium requests were blocked by this environment, so *visual and interactive end-to-end browser QA remains unverified*. Check desktop/mobile and in-editor flows before publishing.

## Funcionalidades herdadas da v7

- **Browse sem catálogo manual:** lê `images/icons/custom/` diretamente a cada abertura (API `/api/icons`). Compatível com pastas internas; o `icons.zip` atualizado foi incorporado ao pacote (93 SVGs). Desenvolvimento local: `node server/dev.cjs`.
- **Uma categoria principal aberta por vez:** estados restaurados e alternância da sidebar agora se comportam como accordion exclusivo.
- **Hierarquia discreta:** sem setas; apenas linhas finas de indentação. Ramos abertos mas não selecionados ficam neutros; ancestral do item atual mantém destaque leve.
- **Go back universal:** aparece depois de seguir links da wiki, do Explorer ou da busca; restaura a página e o scroll anterior. O controle agora fica fixo e discreto no canto inferior esquerdo, sem bloquear a leitura.
- **Milestones:** requisito e título separados dos bônus por uma linha sutil; grid 4/3/2/1 colunas e títulos sem quebras incorretas.
- **Verificação:** JavaScript e SVGs validados; o componente das milestones foi renderizado em páginas isoladas de desktop e mobile, sem overflow. A navegação completa do site não pôde ser testada em navegador devido ao bloqueio de acesso local neste ambiente.

## Funcionalidades mantidas da v6

**Explorer único:** o menu superior agora mostra apenas **Explorer**, com duas abas internas: **Currencies** (catálogo das 39 moedas/recursos) e **Bonus Explorer** (fontes e filtros). Os endereços antigos `#/currencies` e `#/currency-explorer` ainda abrem como atalhos de compatibilidade.

**Navegação até o bônus:** clicar em uma fonte abre seu artigo, rola até a entrada encontrada e aplica uma borda vermelha temporária. A busca global e a página de resultados também utilizam links de destino específicos. Para nomes sem uma correspondência suficientemente clara, o artigo continua acessível, mas o destaque não é garantido.

**Upgrades detectados automaticamente:** o Bonus Explorer consulta diretamente os upgrades cadastrados no `content/game-data.json` e associa moedas quando o próprio nome do upgrade indica claramente o alvo. As fórmulas são lidas do cadastro original; nenhum multiplicador é inventado. Nomes apenas relacionados continuam sem confirmação automática. Na versão padrão, há **605 relações cadastradas** e **639 relações efetivas** após incorporar os novos upgrades reconhecíveis (números sujeitos a alterações no editor). Em vez de cadastrar um upgrade no Explorer novamente, edite o upgrade original. Para fontes excepcionais não representadas por upgrades, use **Add exceptional source**.

**Edição mais simples:** fontes manuais não exigem digitação do ID na edição convencional; moedas afetadas são escolhidas por nome com uma lista pesquisável. Todas as edições seguem rascunho, Undo e Publish test do editor atual.

**Ícones por nome:** elementos como Life Island e Sap reutilizam o mesmo ícone em menus, cartões e componentes suportados. Se houver um arquivo de nome correspondente em `images/icons/custom/` (extensões `.svg`, `.png` ou `.webp`), esse arquivo é usado automaticamente. O nome é comparado sem distinção entre espaços, hífens e maiúsculas. No Explorer, entre em **Settings → Edit test wiki** e abra **Icons by name** para configurar exceções ou substituir uma correspondência. Essas regras são armazenadas em `content/game-data.json` sob `iconNameRules` e são aplicadas ao site inteiro onde há ícones com nomes.

**Sidebar e estágios:** a cor permanece também no fundo da categoria principal e dos ancestrais abertos/selecionados. Os números redundantes ao lado do título dos cards de estágios, ranks e milestones foram removidos, pois já constam do nome.

**Mobile:** abas, filtros, seletor de moeda, cards, lista de bônus e calculadora receberam ajustes de largura, quebra e áreas clicáveis para telas estreitas. Essas adaptações foram inspecionadas pelo código, mas **o navegador automatizado não permitiu validar visualmente a renderização** neste ambiente; revise em um aparelho antes de publicar.

## Como executar e editar

Abra o projeto com o servidor local que também oferece a descoberta de ícones:

```powershell
node server/dev.cjs
```

Depois, acesse http://127.0.0.1:4173 e abra **Explorer** no menu superior. Para editar, use **Settings → Edit test wiki**. O botão **Publish test** publica apenas na cópia local do navegador; não substitua a produção.

### Ícones: leitura direta da pasta (sem catálogo)

Os ícones são lidos diretamente de `images/icons/custom/` **incluindo as subpastas**, pelo endpoint `GET /api/icons`. Não existe uma lista manual para atualizar. O seletor **Browse** faz uma nova leitura ao abrir. Se você colocar um SVG com nome novo, basta atualizar a página ou reabrir Browse.

**Desenvolvimento local**: execute `node server/dev.cjs` na raiz do projeto e acesse `http://localhost:4173`. Esse servidor lê o diretório de ícones em cada solicitação, sem build, catálogo ou comando extra. Um servidor estático genérico (incluindo VS Code Live Server) não consegue oferecer o conteúdo de uma pasta via API, portanto **não o utilize para testar descoberta de ícones**.

**Vercel**: o endpoint `api/icons.js` lê os arquivos incluídos no deploy. Ao adicionar ou mudar SVGs, envie os arquivos ao repositório e publique um novo deploy; ícones novos não ficam disponíveis num deploy já publicado. `vercel.json` inclui a pasta customizada no bundle da função. Arquivos com nomes idênticos em subpastas diferentes continuam disponíveis no Browse; para referência global automática pelo nome, escolha o ícone correto em **Icons by name**.

### Limites de identificação automática

O script reconhece upgrades cujo nome mapeia de forma não ambígua para uma moeda já cadastrada; uma fórmula sozinha não informa qual moeda é multiplicada. Se um upgrade usar nomenclatura diferente, ajuste o nome na fonte original ou cadastre uma fonte excepcional devidamente documentada. Os bônus que não têm alvo explícito não são apresentados como confirmados.

---

Wiki de Regrowth Incremental em HTML, CSS e JavaScript, com editor via GitHub OAuth.

## Arquivos necessários para o upload

- `index.html`: entrada do site.
- `css/`: estilos do site e do editor.
- `js/`: páginas, calculadoras, navegação e ferramentas de edição.
- `images/`: imagens, fundos e catálogos de ícones. Preserve os arquivos de licença.
- `content/`: páginas, configurações, releases, rascunhos e backups.
- `api/`: endpoints do login, acesso ao GitHub e publicação.
- `server/`: autenticação, permissões e filtro de deploy do Vercel.
- `vercel.json`: configuração do filtro de deploy; precisa de `server/vercel-ignore.cjs`.
- `.gitignore`: impede o envio acidental de credenciais e arquivos temporários.

`api/`, `server/` e `vercel.json` fazem parte do funcionamento do site.
Os arquivos de teste, auditoria e geração de conteúdo não são necessários no upload.

## Conteúdo

- `content/wiki-data.json`: páginas e créditos.
- `content/game-data.json`: cores, links e calculadoras.
- `content/update-log.json`: releases.
- `content/drafts/inline-draft.json`: rascunho compartilhado, quando existir.
- `content/backups/`: versões anteriores; não remova para fazer limpeza de código.

No editor, **Apply** aplica a edição ao rascunho; **Save for everyone** compartilha
o rascunho; **Publish** atualiza os arquivos públicos. **Download draft** guarda
uma cópia local. **Discard** descarta o rascunho compartilhado, portanto não deve
ser usado para limpar arquivos de desenvolvimento.

## Créditos e ícones

Nos créditos, escreva `nath` no campo de imagem e envie manualmente
`images/credits/nath.png`. Caminhos de imagem já cadastrados continuam aceitos.

O seletor de ícones oferece Game-icons.net e Lucide, com buscas como `fire`,
`fogo`, `espada` e `cristal`. Envie também `images/icons/game-icons/` e
`js/lib/game-icon-names.js` ao atualizar o catálogo.

## Configuração do servidor

Mantenha `OAUTH_CLIENT_ID` e `OAUTH_CLIENT_SECRET` nas variáveis de ambiente do
Vercel. Nunca coloque tokens ou segredos nos arquivos públicos do projeto.
O código de publicação valida os IDs GitHub de Quaantic e zzinss no servidor.
O funcionamento do deploy também depende da conexão GitHub/Vercel e das
permissões da branch configuradas nessas plataformas.

## v8 — fixes

- Removed the unused Key info and Referenced resources widgets (including their draft edit controls). Page content editor remains available.
- Icon picker discovers actual files from `/api/icons`; a build-generated fallback `content/custom-icon-index.json` supports plain static previews. The fallback is generated automatically from the icon directory, never maintained by hand. A *plain static preview* cannot enumerate server folders live: to see newly added icons it must be rebuilt; local Node preview and Vercel API discover from disk directly.
- Calculator uses the actual `Upgrade Calculator` resource color, fills page width, and the Level Breakdown is a collapsible section below the Target Effect Calculator.
- Milestone grid fills page width, sidebar uses individual item colors and Go back stays visible as a small fixed chip at the bottom-left.