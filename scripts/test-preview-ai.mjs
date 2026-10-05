// Local Sites preview only; seed synthetic demo data only if this local account is empty.
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { build } from 'esbuild';
const require=createRequire(import.meta.url),{chromium}=require('../../outputs/jobmatch/node_modules/playwright-core');
const compiled=await build({entryPoints:['tests/ai-fixture.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {aiProfile,aiJob}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].contents).toString('base64'));
const base='http://localhost:5173';
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
const context=await browser.newContext({viewport:{width:1365,height:1000}}),page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(base);await page.getByRole('link',{name:'使用 ChatGPT 登入'}).click();await page.getByRole('button',{name:'履歷與搜尋條件',exact:true}).waitFor();
 const profile=await (await context.request.get(base+'/api/profile')).json();
 const jobs=await (await context.request.get(base+'/api/jobs?tab=inbox')).json();
 assert.equal(typeof profile.configured,'boolean','Preview D1 must be initialized');
 if(!profile.configured&&jobs.total===0){
  const headers={Origin:base,'Content-Type':'application/json'};
  assert.equal((await context.request.put(base+'/api/profile',{headers,data:{...aiProfile,titles:['Python 工程師']}})).status(),200);
  const batch=await (await context.request.post(base+'/api/batches',{headers,data:{count:1}})).json();const {id,...job}=aiJob;
  assert.equal((await context.request.post(base+'/api/batches/'+batch.id+'/finish',{headers,data:{raw:1,jobs:[job]}})).status(),200);
 }
 await page.reload();await page.getByRole('tab',{name:'未讀取與已讀',exact:true}).click();
 const card=page.locator('.job-card').filter({has:page.getByRole('heading',{name:'Python 工程師',exact:true})});
 await card.getByRole('button',{name:'匹配說明與紀錄'}).click();
 await page.getByRole('dialog').getByRole('button',{name:'AI 分析',exact:true}).click();
 await page.getByRole('region',{name:'AI 分析結果'}).waitFor({timeout:70000});
 const result=await page.getByRole('region',{name:'AI 分析結果'}).innerText();assert.ok(result.includes('履歷分數'));assert.ok(result.includes('AI 改善建議'));assert.ok(result.includes('AWS'));
 await mkdir('.sites-runtime/qa',{recursive:true});await page.screenshot({path:'.sites-runtime/qa/ai-preview.png'});
 assert.deepEqual(errors,[]);console.log('PASS: local Preview real sign-in simulation + saved resume/job + real Gemini response rendered. Synthetic demo kept only in local D1.');
}finally{await browser.close();}
