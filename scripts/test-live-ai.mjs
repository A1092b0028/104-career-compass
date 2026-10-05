// Real Gemini + built Worker + temporary D1. Key enters only through hidden stdin.
import assert from 'node:assert/strict';
import { Miniflare } from 'miniflare';
import { readFileSync,readdirSync } from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';
async function readKey(){
 console.log('Ready for hidden GEMINI_API_KEY input.');
 if(process.stdin.isTTY)process.stdin.setRawMode(true);
 process.stdin.setEncoding('utf8');process.stdin.resume();
 return new Promise(resolve=>{let input='';const read=chunk=>{input+=chunk;if(/[\r\n]/.test(input)){process.stdin.off('data',read);if(process.stdin.isTTY)process.stdin.setRawMode(false);process.stdin.pause();resolve(input.trim());}};process.stdin.on('data',read);});
}
const key=await readKey();assert.ok(key,'Missing server key');
const bundle=await build({entryPoints:['tests/ai-fixture.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {aiProfile,aiJob}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].contents).toString('base64'));
const files=['index.js',...readdirSync('dist/server',{recursive:true}).filter(f=>/\.m?js$/.test(f)&&f!=='index.js')];
const runtime=new Miniflare({modules:files.map(f=>({type:'ESModule',path:path.resolve('dist/server',f)})),modulesRoot:path.resolve('dist/server'),compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],bindings:{GEMINI_API_KEY:key}});
try{
 const db=await runtime.getD1Database('DB');for(const file of readdirSync('drizzle').filter(name=>/^\d+_.*\.sql$/.test(name)).sort())for(const sql of readFileSync('drizzle/'+file,'utf8').split('--> statement-breakpoint').filter(s=>s.trim()))await db.prepare(sql).run();
 const base='http://localhost',headers={Origin:base,'Content-Type':'application/json','oai-authenticated-user-id':'live-ai-synthetic','oai-authenticated-user-email':'synthetic@example.test'};
 async function call(route,method,body){return runtime.dispatchFetch(base+'/api/'+route,{method,headers,body:JSON.stringify(body)});}
 assert.equal((await call('profile','PUT',{...aiProfile,titles:['Python 工程師']})).status,200);
 const batch=await (await call('batches','POST',{count:1})).json();const {id,...job}=aiJob;
 assert.equal((await call('batches/'+batch.id+'/finish','POST',{jobs:[job],raw:1})).status,200);
 const before=await (await runtime.dispatchFetch(base+'/api/jobs',{headers})).json();
 const response=await call('jobs/'+id+'/analysis','POST',{}),result=await response.json();
 assert.equal(response.status,200,JSON.stringify({status:response.status,error:result.error}));
 assert.ok(result.resume_score>=0&&result.resume_score<=100);assert.ok(result.match_score>=0&&result.match_score<=100);assert.ok(Array.isArray(result.recommendations));assert.ok(!JSON.stringify(result).includes(key));
 const after=await (await runtime.dispatchFetch(base+'/api/jobs',{headers})).json();assert.deepEqual(after.jobs,before.jobs,'AI must not modify existing scores or status');
 console.log(JSON.stringify({passed:true,workerStatus:response.status,resume_score:result.resume_score,match_score:result.match_score,matchedSkills:result.matched_skills.map(s=>s.skill),missingSkills:result.missing_skills.map(s=>s.skill),recommendations:result.recommendations.length,originalJobsUnchanged:true}));
}finally{await runtime.dispose();}
