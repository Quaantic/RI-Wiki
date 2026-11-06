// Backend-only Supabase REST access. Never send the server key to browsers.
const configured=()=>Boolean(process.env.SUPABASE_URL && (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY));
function bad(message,status=503){return Object.assign(new Error(message),{status,storage:true});}
async function request(path,{method='GET',body,prefer}={}) {
 if(!configured()) throw bad('Live collaboration needs Supabase configuration. Follow setup/LIVE-COLLABORATION.md. No edits were committed.');
 const origin=new URL(process.env.SUPABASE_URL);
 if(origin.protocol!=='https:' || origin.username || origin.password || origin.search || origin.hash) throw bad('Invalid SUPABASE_URL.');
 const key=process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
 const response=await fetch(`${origin.origin}/rest/v1/${path}`,{
  method, signal:AbortSignal.timeout(15000), cache:'no-store',
  headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json',Accept:'application/json',...(prefer?{Prefer:prefer}:{})},
  ...(body===undefined?{}:{body:JSON.stringify(body)})
 });
 const raw=await response.text();let data;
 try{data=raw?JSON.parse(raw):null;}catch{throw bad(`Collaboration database returned invalid data (HTTP ${response.status}).`,502);}
 if(!response.ok) {console.error('[ri-live] Supabase HTTP',response.status,JSON.stringify(data).slice(0,400));throw bad(response.status===404?'Collaboration tables are missing. Run setup/live-collaboration.sql.':'Collaboration storage failed. No changes were lost; please retry.',502);}
 return data;
}
async function row(fields='revision,documents,published_revision,updated_at,updated_by') {
 const data=await request(`ri_wiki_live?select=${fields}&id=eq.1&limit=1`);
 if(!Array.isArray(data)||!data[0])throw bad('Collaboration tables are missing. Run setup/live-collaboration.sql.');
 return data[0];
}
async function save(expected,docs,actor,summary){
 const result=await request('rpc/ri_wiki_save',{method:'POST',body:{expected_revision:expected,next_documents:docs,editor_name:actor,change_summary:summary}});
 const v=Array.isArray(result)?result[0]:result;
 if(!v||typeof v.saved!=='boolean')throw bad('Collaboration storage did not confirm save.',502);
 return {saved:v.saved,revision:Number(v.current_revision)};
}
async function published(revision){return request('rpc/ri_wiki_publish_ack',{method:'POST',body:{published_up_to:revision}});}
async function versions(){return request('ri_wiki_versions?select=id,revision,created_at,created_by,action&order=id.desc&limit=50');}
async function version(id){const list=await request(`ri_wiki_versions?select=documents&id=eq.${id}&limit=1`);return list?.[0]||null;}
async function snapshot(revision,docs,actor,action){const list=await request('ri_wiki_versions?select=id',{method:'POST',prefer:'return=representation',body:{revision,documents:docs,created_by:actor,action}});return list?.[0]?.id;}
async function activities(){return request('ri_wiki_activity?select=id,revision,created_at,editor,description,published&order=id.desc&limit=200');}
module.exports={configured,row,save,published,versions,version,snapshot,activities};
