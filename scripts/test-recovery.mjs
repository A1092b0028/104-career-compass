import { createRequire } from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('../../outputs/jobmatch/node_modules/playwright-core');
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
const context=await browser.newContext({extraHTTPHeaders:{'oai-authenticated-user-id':'qa-recovery','oai-authenticated-user-email':'qa@example.test'}}),page=await context.newPage();
let first=true;await page.route('**/api/profile',async route=>{if(first){first=false;await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'合成短暫讀取錯誤'})});}else await route.continue();});
try{await page.goto('http://127.0.0.1:8788/');await page.getByText('合成短暫讀取錯誤').waitFor();await page.getByRole('button',{name:'重新讀取'}).click();await page.getByRole('button',{name:'履歷與搜尋條件',exact:true}).click({timeout:4000});await page.getByRole('dialog').waitFor();console.log('PASS: initial profile failure recovers using visible retry.');}finally{await browser.close();}
