import { createRequire } from 'node:module';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { unzipSync, strFromU8 } from 'fflate';
const require=createRequire(import.meta.url),{chromium}=require('../../outputs/jobmatch/node_modules/playwright-core');
const base='http://localhost:5173',executablePath='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const browser=await chromium.launch({executablePath,headless:true});let context;
try{
 const page=await browser.newPage();await page.goto(base);
 const login=page.getByRole('link',{name:'使用 ChatGPT 登入'});if(await login.count())await login.click();
 const response=await page.request.get(base+'/api/extension');assert.equal(response.status(),200);
 const files=unzipSync(await response.body()),manifest=JSON.parse(strFromU8(files['manifest.json']));
 assert.deepEqual(manifest.content_scripts[0].matches,[base+'/*'],'Downloaded assistant must match the current Preview origin');
 assert.equal(manifest.version,'2.0.1');assert.deepEqual(manifest.host_permissions,['https://www.104.com.tw/*']);
 assert.ok(strFromU8(files['安裝說明.txt']).includes(base));
 const temp=await mkdtemp(path.join(tmpdir(),'compass-extension-'));
 const extensionDir=path.join(temp,'extension');await mkdir(extensionDir);
 for(const [name,data] of Object.entries(files))await writeFile(path.join(extensionDir,name),data);
 await browser.close();
 context=await chromium.launchPersistentContext(path.join(temp,'profile'),{executablePath,headless:true,ignoreDefaultArgs:['--disable-extensions'],args:['--disable-extensions-except='+extensionDir,'--load-extension='+extensionDir]});
 const worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker',{timeout:15000});
 assert.ok(worker.url().startsWith('chrome-extension://'),'Real extension service worker must load');
 await context.route(base+'/api/profile',route=>route.fulfill({json:{configured:true,profile:{skills:['Python'],titles:['Python 工程師'],locations:[],exclude:[],years:1,min_salary:0,resume_text:'Synthetic resume'}}}));
 const site=await context.newPage(),errors=[];site.on('pageerror',e=>errors.push(e.message));
 await site.goto(base);const signIn=site.getByRole('link',{name:'使用 ChatGPT 登入'});if(await signIn.count())await signIn.click();
 await site.waitForLoadState('load');await site.reload();
 await site.getByRole('button',{name:'更新 104 職缺',exact:true}).waitFor();
 // Stop at the API boundary after the real UI handshake, without creating a user batch or opening 104.
 await site.route(base+'/api/batches',route=>route.fulfill({status:409,json:{error:'QA_EXTENSION_CONNECTED'}}));
 await site.getByRole('button',{name:'更新 104 職缺',exact:true}).click();
 await site.getByRole('alert').filter({hasText:'QA_EXTENSION_CONNECTED'}).waitFor({timeout:10000});
 assert.deepEqual(errors,[]);
 console.log('PASS: downloaded Preview ZIP loads in real Edge; actual website update button completes page → bridge → service worker detection, without user-data changes or opening 104.');
}finally{await context?.close();await browser.close();}
