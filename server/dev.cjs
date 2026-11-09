// Local dev: node server/dev.cjs. Browse /api/icons rescans the actual folder.
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const {iconFiles}=require('./icon-files.cjs');
const root=path.resolve(__dirname,'..');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.txt':'text/plain; charset=utf-8','.woff2':'font/woff2'};
const port=Number(process.env.PORT)||4173;
http.createServer((req,res)=>{
  const url=new URL(req.url||'/',`http://localhost:${port}`);
  res.setHeader('Cache-Control','no-store');
  if(url.pathname==='/api/icons'){
    res.setHeader('Content-Type','application/json; charset=utf-8');
    res.end(JSON.stringify(iconFiles(root)||[]));return;
  }
  let pathname;
  try{pathname=decodeURIComponent(url.pathname);}catch{res.writeHead(400).end();return;}
  const filename=path.resolve(root,'.'+pathname,(pathname.endsWith('/')?'index.html':''));
  if((filename!==root && !filename.startsWith(root+path.sep)) || /(?:^|\/)(?:\.git|\.env[^/]*|server|api|setup)(?:\/|$)/.test(filename)){res.writeHead(403).end();return;}
  fs.stat(filename,(err,stat)=>{
    if(err||!stat.isFile()){res.writeHead(404).end('Not found');return;}
    res.setHeader('Content-Type',types[path.extname(filename).toLowerCase()]||'application/octet-stream');
    fs.createReadStream(filename).pipe(res);
  });
}).listen(port,()=>console.log(`RI Wiki dev: http://localhost:${port}`));
