import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require('../../outputs/jobmatch/node_modules/playwright-core');
const base=process.env.PREVIEW_URL||'http://localhost:5173';
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
const context=await browser.newContext(),page=await context.newPage(),errors=[],warnings=[];
const workerUrls=[];page.on('worker',worker=>workerUrls.push(worker.url()));
await page.addInitScript(()=>{window.qaWorkerErrors=[];const NativeWorker=window.Worker;window.Worker=class extends NativeWorker{constructor(...args){super(...args);this.addEventListener('error',event=>window.qaWorkerErrors.push({message:event.message,filename:event.filename}));}};});
page.on('pageerror',e=>errors.push(e.message));page.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text());if(msg.type()==='warning')warnings.push(msg.text());});
function pdf(){const stream='BT /F1 18 Tf 50 750 Td (Synthetic Python resume) Tj ET';const objs=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`];let s='%PDF-1.4\n',offsets=[0];objs.forEach((o,i)=>{offsets.push(Buffer.byteLength(s));s+=`${i+1} 0 obj\n${o}\nendobj\n`;});const x=Buffer.byteLength(s);s+=`xref\n0 6\n0000000000 65535 f \n`+offsets.slice(1).map(o=>String(o).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${x}\n%%EOF`;return Buffer.from(s);}
try{
 await page.goto(base);const login=page.getByRole('link',{name:'使用 ChatGPT 登入'});if(await login.count())await login.click();
 await page.getByRole('button',{name:'履歷與搜尋條件',exact:true}).click();
 const upload=page.locator('#resume'),text=page.getByLabel('履歷確認文字');
 for(let i=0;i<2;i++){
  await text.fill('');await upload.setInputFiles({name:'synthetic.pdf',mimeType:'application/pdf',buffer:pdf()});
  await page.waitForFunction(()=>document.querySelector('textarea')?.value.includes('Synthetic Python resume'),{},{timeout:15000});
  assert.deepEqual(errors,[],'PDF parsing must not trigger window errors or a dev error overlay');
  assert.deepEqual(await page.evaluate(()=>window.qaWorkerErrors),[],'PDF worker must not throw script errors');
  assert.equal(warnings.some(s=>s.includes('fake worker')),false,'PDF must use a real Web Worker: '+JSON.stringify({workerUrls,workerErrors:await page.evaluate(()=>window.qaWorkerErrors)}));
 }
 assert.equal(workerUrls.length,2,'Each PDF upload must start a real worker');
 assert.equal(await page.locator('#__vinext_dev_error_overlay_root').count(),0);
 await page.keyboard.press('Escape');console.log('PASS: local Preview PDF parses twice using a real worker without window errors, fake worker fallback or error overlay.');
}finally{await browser.close();}
