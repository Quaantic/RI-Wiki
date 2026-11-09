import { REDESIGN_TEST, testLive } from '../redesign-test.js';
// Live draft: versioned, server-authorized shared state. No GitHub commits.
let editorAccessDenied=false;
export async function live(action,extra={}){
 if(editorAccessDenied){const e=new Error('Private editor access expired. Reopen your private editor URL and sign in again. Local draft is preserved.');e.status=403;throw e;}
 if (REDESIGN_TEST) return testLive(action,extra);
 let response;
 try{response=await fetch('/api/live',{method:'POST',credentials:'include',cache:'no-store',headers:{'Content-Type':'application/json','X-RI-Editor':'1'},body:JSON.stringify({action,...extra})});}
 catch{throw new Error('Shared editor is offline. Your local recovery copy is preserved.');}
 const raw=await response.text();let data;
 try{data=raw?JSON.parse(raw):{};}catch{throw new Error(`Shared editor returned HTTP ${response.status}. Your changes are preserved locally.`);}
 if(!response.ok){if(response.status===403)editorAccessDenied=true;const e=new Error(response.status===403?'Private editor access required. Reopen your private editor URL; local changes are preserved.':(data.message||`Shared editor error HTTP ${response.status}`));e.status=response.status;throw e;}
 return data;
}
