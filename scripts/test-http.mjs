import assert from 'node:assert/strict';
import { unzipSync, strFromU8 } from 'fflate';
import { Miniflare } from 'miniflare';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
const base='http://127.0.0.1:8788';
// Exercise the built Worker directly, avoiding Wrangler's live-reload proxy.
const moduleFiles=['index.js',...readdirSync('dist/server',{recursive:true}).filter(x=>/\.m?js$/.test(x)&&x!=='index.js')];
const runtime=new Miniflare({modules:moduleFiles.map(file=>({type:'ESModule',path:path.resolve('dist/server',file)})),modulesRoot:path.resolve('dist/server'),compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB']});
const db=await runtime.getD1Database('DB');
for(const sql of readFileSync('drizzle/0000_absent_polaris.sql','utf8').split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean))await db.prepare(sql).run();
const localFetch=(url,options)=>runtime.dispatchFetch(url,options);
const prefix='qa-'+crypto.randomUUID(),a=prefix+'-a',b=prefix+'-b';
async function request(owner,path,method='GET',body,origin=base){
 const headers={Connection:'close',...(owner?{'oai-authenticated-user-id':owner,'oai-authenticated-user-email':owner+'@example.test'}:{}),...(method==='GET'?{}:{Origin:origin,'Content-Type':'application/json'})};
 const response=await localFetch(base+'/api/'+path,{method,headers,...(body===undefined?{}:{body:JSON.stringify(body)})});
 const text=await response.text();let data;try{data=JSON.parse(text);}catch{throw Error(`${method} ${path} returned ${response.status}: ${text}`);}return {status:response.status,data};
}
const profile={skills:['Python'],locations:['台北市'],titles:['Python 工程師'],exclude:[],years:2,min_salary:40000,resume_text:'合成履歷，無私人資料'};
try{
 assert.equal((await request(null,'profile')).status,401);
 assert.equal((await request(a,'profile','PUT',{...profile,user_id:b})).status,400);
 assert.equal((await request(a,'profile','PUT',profile)).status,200);assert.equal((await request(b,'profile','PUT',{...profile,resume_text:'B'})).status,200);
 assert.equal((await request(a,'batches','POST',{count:51})).status,400);
 const batch=(await request(a,'batches','POST',{count:50})).data;
 assert.equal((await request(b,'batches/'+batch.id)).status,404);
 const jobs=Array.from({length:50},(_,i)=>({title:'Python 工程師',company:'合成測試公司 '+i,location:'台北市',description:'Python 開發',url:'https://www.104.com.tw/job/test'+i,salary_text:'月薪 45000',salary_min:45000,salary_max:60000,years_required:1,publish_time:''}));
 assert.equal((await request(b,'batches/'+batch.id+'/finish','POST',{jobs,raw:50})).status,404);
 const finished=await request(a,'batches/'+batch.id+'/finish','POST',{jobs,raw:50});assert.equal(finished.status,200,JSON.stringify(finished));assert.equal(finished.data.imported,50);
 assert.equal((await request(a,'jobs')).data.total,10);assert.equal((await request(b,'jobs')).data.total,0);
 assert.equal((await request(b,'jobs/test0','PATCH',{status:'已投遞'})).status,404);
 assert.equal((await request(a,'jobs/test0','PATCH',{status:'已投遞',note:'synthetic note'})).status,200);
 assert.equal((await request(a,'jobs?tab=history')).data.total,1);assert.equal((await request(b,'jobs/test0/history')).data.results.length,0);
 const zipResponse=await localFetch(base+'/api/extension',{headers:{'oai-authenticated-user-id':a,'oai-authenticated-user-email':a+'@example.test'}});assert.equal(zipResponse.status,200);
 const zip=unzipSync(new Uint8Array(await zipResponse.arrayBuffer())),manifest=JSON.parse(strFromU8(zip['manifest.json']));assert.equal(manifest.content_scripts[0].matches[0],'https://career-compass-104.noble-goat-8482.chatgpt.site/*');assert.equal(manifest.permissions.includes('cookies'),false);
 assert.equal((await localFetch(base+'/api/extension')).status,401);
 assert.equal((await request(a,'profile','PUT',profile,'https://evil.example')).status,403);
 await request(a,'profile');
 console.log('PASS: built Worker + real local D1: auth, CSRF, ownership, 50 rows, top 10, history and protected ZIP.');
}finally{
 for(const owner of [a,b])await request(owner,'account','DELETE',{confirm:'DELETE'});
 assert.equal((await request(a,'profile')).data.configured,false);assert.equal((await request(a,'jobs?tab=history')).data.total,0);
 console.log('PASS: account deletion and test-data cleanup.');
 await runtime.dispose();
}
