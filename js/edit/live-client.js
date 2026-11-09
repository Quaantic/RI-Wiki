import { REDESIGN_TEST, testLive } from '../redesign-test.js';
// Live draft: versioned, server-authorized shared state. No GitHub commits.
export async function live(action,extra={}){
 if (REDESIGN_TEST) return testLive(action,extra);
 let response;
 try{response=await fetch('/api/live',{method:'POST',credentials:'include',cache:'no-store',headers:{'Content-Type':'application/json','X-RI-Editor':'1'},body:JSON.stringify({action,...extra})});}
 catch{throw new Error('Shared editor is offline. Your local recovery copy is preserved.');}
 const raw=await response.text();let data;
 try{data=raw?JSON.parse(raw):{};}catch{throw new Error(`Shared editor returned HTTP ${response.status}. Your changes are preserved locally.`);}
 if(!response.ok){const e=new Error(data.message||`Shared editor error HTTP ${response.status}`);e.status=response.status;throw e;}
 return data;
}
