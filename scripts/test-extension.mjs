import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require('../../outputs/jobmatch/node_modules/playwright-core');
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
const context=await browser.newContext();const page=await context.newPage();let mode='jobs',removed=false,listener,progress=[];
await page.route('https://www.104.com.tw/**',async route=>{
 const url=new URL(route.request().url()),pageNumber=Number(url.searchParams.get('page')||1);
 const cards=Array.from({length:20},(_,i)=>{const n=(pageNumber-1)*20+i;return `<article><h2><a href="/job/qa${n}">Python 工程師 ${n}</a></h2><a href="/company/testcompany">測試公司</a><a href="?area=6001001000">台北市</a><a href="?jobexp=1">1年以上</a><a href="?sctp=M&scmin=45000&scmax=60000">月薪 45,000</a><p>Python SQL</p><p>01/01</p></article>`;}).join('');
 await route.fulfill({contentType:'text/html; charset=utf-8',body:mode==='verify'?'<title>請稍候</title><p>驗證您是人類</p>':mode==='empty'?'<title>104 搜尋</title><p>沒有符合條件的工作</p>':`<title>104 搜尋</title>${cards}`});
});
const chrome={runtime:{getManifest:()=>({content_scripts:[{matches:['https://career-compass-104.noble-goat-8482.chatgpt.site/*']}]}),onMessage:{addListener:fn=>listener=fn}},tabs:{create:async({url})=>{await page.goto(url);return {id:10};},get:async()=>({status:'complete'}),update:async(id,opts)=>{if(opts.url)await page.goto(opts.url);},remove:async()=>{removed=true;},sendMessage:async(id,data)=>progress.push(data.state)},scripting:{executeScript:async(opts)=>[{result:opts.func?await page.evaluate(opts.func):await page.evaluate(readFileSync('extension/collector.js','utf8'))}]}};
const sandbox=vm.createContext({chrome,URL,Set,Map,Date,Error,Number,Array,String,Promise,setTimeout:fn=>setTimeout(fn,1)});vm.runInContext(readFileSync('extension/background.js','utf8'),sandbox);const refresh=vm.runInContext('refresh',sandbox);
try{
 const input={count:50,titles:['Python 工程師'],locations:['台北市']};
 let replyResolve;const reply=new Promise(resolve=>replyResolve=resolve);
 const accepted=listener({type:'COMPASS_REFRESH',profile:{...input,count:1},id:'bridge'}, {url:'https://career-compass-104.noble-goat-8482.chatgpt.site/',frameId:0,tab:{id:1}},replyResolve);
 assert.equal(accepted,true,'合法 sender.url 且缺少 Tab.url 時仍須接收更新');assert.equal((await reply).jobs.length,1);
 const result=await refresh(input,1,'batch');assert.equal(result.jobs.length,50);assert.equal(result.raw,60);assert.equal(result.jobs[49].url,'https://www.104.com.tw/job/qa49');assert.equal(result.jobs[0].publish_time,'');assert.equal(removed,true);
 removed=false;mode='verify';await page.goto('https://www.104.com.tw/jobs/search/');assert.equal(await page.title(),'請稍候','合成驗證頁必須使用正確文字編碼');await assert.rejects(()=>refresh(input,1,'batch2'),/完成驗證/);assert.equal(removed,false);assert.ok(progress.includes('等待使用者完成驗證'));
 mode='empty';const empty=await refresh(input,1,'batch3');assert.equal(empty.emptyConfirmed,true);assert.equal(empty.jobs.length,0);
 let called=false;listener({type:'COMPASS_REFRESH',profile:input,id:'forged'},{url:'https://evil.example/',frameId:0,tab:{id:1}},()=>called=true);assert.equal(called,false);
 console.log('PASS: actual extension scripts against synthetic browser pages: three pages / 50 jobs, unknown date, verification stop, empty results, exact origin rejection.');
}finally{await browser.close();}
