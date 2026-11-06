# RI Wiki

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
