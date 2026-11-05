// Manual UI check: node tests/admin-preview.cjs, then http://127.0.0.1:4173/
// All GitHub requests are mocked in memory. No credentials or remote writes.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const files = new Map(['wiki-data', 'game-data', 'update-log'].map((name) => {
  const file = `content/${name}.json`;
  return [file, { type: 'file', sha: name, content: fs.readFileSync(path.join(root, file)).toString('base64') }];
}));
let revision = 0;
// Regression fixture: these pages exist only in the shared draft. The public
// JSON stays untouched, so a premature public-only boot cannot find them.
if(process.argv.includes('--shared-regression')){
  const read=name=>JSON.parse(Buffer.from(files.get(`content/${name}.json`).content,'base64').toString());
  const wiki=read('wiki-data'),game=read('game-data'),updates=read('update-log');
  for(const [id,name]of [['faq','FAQ'],['miscellaneous','Miscellaneous'],['draft-test','Draft test']]){
    if(!wiki.categories.some(category=>category.id===id))wiki.categories.push({id,name,desc:'Shared draft regression fixture',tagline:'Preview fixture',icon:'sprout',subcategories:[]});
  }
  const tree=wiki.categories.find(category=>category.id==='life').subcategories.find(page=>page.id==='tree');
  tree.children=(tree.children||[]).filter(page=>!['tree-milestones','tree-tier'].includes(page.id));
  tree.children.push({id:'tree-tier',name:'Tree Tier',desc:'Local layout fixture with differently sized rewards. No live content is modified.',icon:'arrow-up',children:[]});
  game.progression.stages['life/tree-tier']={title:'Tiers',itemLabel:'Tier',stages:Array.from({length:8},(_,index)=>({
    num:String(index+1),title:`Tier ${index+1}`,requirements:[['25K XP','75K XP','400K XP','1.25M XP','5M XP','25M XP','125M XP','500M XP'][index]],
    boosts:['More Damage Multi (+/tier)','More Log Multi (+/tier)',...(index>1?['More Roots Multi (+/tier)']:[]),...(index>4?['More First 3 Apples Multi (+/tier)']:[])],
    unlocks:{area:'',places:[],features:[{name:['New Tree Every Tier','New Log Upgrade','Tree Tier Multiplies Roots','1.25x Normal, Golden and Diamond Apple','0.25% Passive Roots per Second','Tree Tier Multiplies Normal, Golden and Diamond Apples','2% Passive Roots per Second','Unlocks Void Apple'][index],subs:[]},...(index===3?[{name:'Expand Tree Upgrades',subs:[]}]:[])]}
  }))};
  files.set('content/drafts/inline-draft.json',{type:'file',sha:'shared-regression',content:Buffer.from(JSON.stringify({wiki,game,updates,_baseShas:{wiki:'wiki-data',game:'game-data',updates:'update-log'}})).toString('base64')});
}
http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1:4173');
  const json = (value, status = 200) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(value)); };
  if (url.pathname === '/__mobile') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    return res.end('<!doctype html><meta name="viewport" content="width=device-width"><body style="margin:0;background:#161b17;display:grid;justify-content:center"><iframe title="390px mobile admin preview" src="/#/life/frost-conversion" style="width:390px;height:100dvh;border:0;max-width:100vw"></iframe>');
  }
  if (url.pathname.startsWith('/__github/')) {
    const api = url.pathname.slice('/__github'.length);
    if (api === '/user') return json({ login: req.headers['x-preview-editor'] || 'preview-editor', avatar_url: '' });
    if (api.endsWith('/commits')) return json([{ sha: 'preview-baseline' }]);
    if (api.endsWith('/permission')) return json({ permission: 'write' });
    const file = decodeURIComponent(api.split('/contents/')[1] || '');
    if (req.method === 'PUT' || req.method === 'DELETE') {
      let raw = ''; for await (const chunk of req) raw += chunk;
      const body = JSON.parse(raw);
      if (files.get(file)?.sha !== body.sha) return json({ message: 'Revision changed' }, 409);
      if (req.method === 'DELETE') { files.delete(file); return json({}); }
      const next = { type: 'file', sha: `preview-${++revision}`, content: body.content };
      files.set(file, next);
      return json({ content: next });
    }
    return json(files.get(file) || { message: 'Not found' }, files.has(file) ? 200 : 404);
  }
  const filename = path.resolve(root, `.${decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname)}`);
  if (!filename.startsWith(root + path.sep)) return json({}, 403);
  try {
    let data = fs.readFileSync(filename);
    if (filename.endsWith('index.html')) {
      const mock = `<script>
        const previewEditor=(new URLSearchParams(location.search).get('editor') || 'preview-editor').replace(/[^a-z0-9-]/gi,'').slice(0,39);
        sessionStorage.setItem('ri-edit-token', 'local-preview-only:'+previewEditor);
        const originalFetch = window.fetch.bind(window);
        window.fetch = (input, options) => {
          const url = new URL(input, location.href);
          return url.hostname === 'api.github.com'
            ? originalFetch('/__github'+url.pathname+url.search,{...options,headers:{...options?.headers,'X-Preview-Editor':previewEditor}})
            : originalFetch(input,options);
        };
        if (!location.hash) location.hash = '#/life/monster-evolution';
      </script>`;
      data = data.toString().replace('<script type="module"', mock + '<script type="module"');
    }
    const type = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg':'image/jpeg' }[path.extname(filename)] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' }); res.end(data);
  } catch { json({}, 404); }
}).listen(4173, '127.0.0.1', () => console.log('Local admin preview: http://127.0.0.1:4173/ (memory only)'));
