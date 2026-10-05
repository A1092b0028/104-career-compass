import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
const bundle=await build({entryPoints:['tests/ai-fixture.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {aiResult}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].contents).toString('base64'));
const require=createRequire(import.meta.url),{chromium}=require('../../outputs/jobmatch/node_modules/playwright-core');
const base='http://127.0.0.1:8788',owner='ai-ui-'+crypto.randomUUID();
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
const context=await browser.newContext({viewport:{width:1365,height:1000},extraHTTPHeaders:{'oai-authenticated-user-id':owner,'oai-authenticated-user-email':owner+'@example.test'}});
const page=await context.newPage(),errors=[];let calls=0,fail=false,release;
page.on('pageerror',e=>errors.push(e.message));
try{
 const headers={Origin:base,'Content-Type':'application/json'};
 await context.request.put(base+'/api/profile',{headers,data:{skills:['Python'],titles:['Python 工程師'],locations:[],exclude:[],years:2,min_salary:0,resume_text:'Python 開發工程師，2 年 API 維護經驗。'}});
 const batch=await (await context.request.post(base+'/api/batches',{headers,data:{count:1}})).json();
 await context.request.post(base+'/api/batches/'+batch.id+'/finish',{headers,data:{raw:1,jobs:[{title:'Python 工程師｜AI 測試',company:'合成測試公司',location:'台北市',description:'Python、SQL、AWS 開發',url:'https://www.104.com.tw/job/aitest',salary_text:'月薪 45,000',salary_min:45000,salary_max:60000,years_required:2,publish_time:''}]}});
 await page.route('**/api/jobs/aitest/analysis',async route=>{calls++;assert.equal(route.request().method(),'POST');assert.deepEqual(route.request().postDataJSON(),{});await new Promise(resolve=>release=resolve);await route.fulfill({status:fail?502:200,contentType:'application/json',body:JSON.stringify(fail?{error:'AI 結果含無法核對的證據，請重新分析。'}:{...aiResult,match_score:58})});});
 await page.goto(base);await page.getByRole('button',{name:'匹配說明與紀錄'}).click();
 const dialog=page.getByRole('dialog'),button=dialog.getByRole('button',{name:'AI 分析',exact:true});await button.waitFor({timeout:5000});assert.equal(calls,0,'Opening details must not call Gemini');
 await button.click();await page.waitForFunction(()=>document.querySelector('button[disabled]')?.textContent?.includes('分析中')||Array.from(document.querySelectorAll('button[disabled]')).some(e=>e.textContent.includes('分析中')));assert.equal(calls,1);release();
 const result=dialog.getByRole('region',{name:'AI 分析結果'});await result.waitFor();assert.match(await result.innerText(),/75\s*\/\s*100/);assert.match(await result.innerText(),/58\s*\/\s*100/);assert.ok((await result.innerText()).includes('AWS'));assert.ok((await result.innerText()).includes('履歷未呈現'));assert.ok((await result.innerText()).includes('量化數據'));
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 fail=true;await dialog.getByRole('button',{name:'重新分析'}).click();await page.waitForFunction(()=>Array.from(document.querySelectorAll('button[disabled]')).some(e=>e.textContent.includes('分析中')));release();await dialog.getByRole('alert').waitFor();assert.ok((await dialog.getByRole('alert').innerText()).includes('無法核對'));assert.equal(await result.count(),0);
 await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});await page.getByRole('button',{name:'匹配說明與紀錄'}).click();assert.equal(await page.getByRole('region',{name:'AI 分析結果'}).count(),0);assert.equal(calls,2);
 assert.deepEqual(errors,[]);console.log('PASS: AI UI click-only POST, loading, score/skills/advice rendering, retry failure, result reset and mobile layout.');
}finally{await context.request.delete(base+'/api/account',{headers:{Origin:base,'Content-Type':'application/json'},data:{confirm:'DELETE'}});await browser.close();}
