import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { zipSync,strToU8 } from 'fflate';
const require=createRequire(import.meta.url);
// Reuse the workspace's existing test runtime; no personal browser profile is opened.
const {chromium}=require('../../outputs/jobmatch/node_modules/playwright-core');
const base='http://127.0.0.1:8788',id='browser-qa-'+crypto.randomUUID();
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
const context=await browser.newContext({viewport:{width:1365,height:1000},extraHTTPHeaders:{'oai-authenticated-user-id':id,'oai-authenticated-user-email':id+'@example.test'}});
const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{window.qaTools={};Object.defineProperty(document,'modelContext',{value:{registerTool(tool){window.qaTools[tool.name]=tool;}}});});
function pdf(){const stream='BT /F1 18 Tf 50 750 Td (Python Engineer resume) Tj ET';const objs=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`];let s='%PDF-1.4\n',offsets=[0];objs.forEach((o,i)=>{offsets.push(Buffer.byteLength(s));s+=`${i+1} 0 obj\n${o}\nendobj\n`;});const x=Buffer.byteLength(s);s+=`xref\n0 6\n0000000000 65535 f \n`+offsets.slice(1).map(o=>String(o).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${x}\n%%EOF`;return Buffer.from(s);}
try{
 await page.goto(base);await page.getByRole('button',{name:'履歷與搜尋條件',exact:true}).click();
 const upload=page.locator('#resume'),text=page.getByLabel('履歷確認文字');
 await upload.setInputFiles({name:'resume.txt',mimeType:'text/plain',buffer:Buffer.from('TXT Python resume')});await page.waitForFunction(()=>document.querySelector('textarea')?.value.includes('TXT Python'));
 const docx=zipSync({'[Content_Types].xml':strToU8('<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'),'_rels/.rels':strToU8('<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'),'word/document.xml':strToU8('<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>DOCX Python resume</w:t></w:r></w:p></w:body></w:document>')});
 await upload.setInputFiles({name:'resume.docx',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',buffer:Buffer.from(docx)});await page.waitForFunction(()=>document.querySelector('textarea')?.value.includes('DOCX Python'));
 await upload.setInputFiles({name:'resume.pdf',mimeType:'application/pdf',buffer:pdf()});await page.waitForFunction(()=>document.querySelector('textarea')?.value.includes('Python Engineer'),{},{timeout:30000});
 await upload.setInputFiles({name:'too-big.txt',mimeType:'text/plain',buffer:Buffer.alloc(20*1024*1024+1,65)});await page.getByRole('alert').filter({hasText:'20 MiB'}).waitFor();
 await text.fill('Confirmed synthetic resume');await page.getByLabel('期望職稱',{exact:true}).fill('Python 工程師');await page.getByLabel('技能',{exact:true}).fill('Python');await page.getByRole('button',{name:'確認並儲存文字與條件'}).click();await page.getByRole('dialog').waitFor({state:'hidden'});
 await page.reload();await page.getByRole('button',{name:'履歷與搜尋條件',exact:true}).click();assert.equal(await text.inputValue(),'Confirmed synthetic resume');await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});
 const read=await page.evaluate(()=>window.qaTools.list_my_jobs.execute({tab:'latest'}));assert.equal(read.total,0);const invalid=await page.evaluate(async()=>{try{await window.qaTools.list_my_jobs.execute({tab:'nope'});return false;}catch{return true;}});assert.equal(invalid,true);
 await page.evaluate(async()=>{const call=async(path,data)=>{const r=await fetch('/api/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});return r.json();};const b=await call('batches',{count:1});await call('batches/'+b.id+'/finish',{raw:1,jobs:[{title:'Python 工程師｜測試職缺',company:'合成測試公司',location:'台北市',description:'Python 開發，資料分析與 API 維護。這是驗收用合成職缺。',url:'https://www.104.com.tw/job/qatest',salary_text:'月薪 45,000–60,000',salary_min:45000,salary_max:60000,years_required:1,publish_time:''}]});});
 await page.reload();await page.getByRole('heading',{name:'Python 工程師｜測試職缺'}).waitFor();
 await page.getByRole('combobox',{name:'Python 工程師｜測試職缺狀態'}).click();await page.getByRole('option',{name:'已投遞',exact:true}).click();await page.getByRole('tab',{name:'歷史應徵紀錄'}).click();await page.getByRole('heading',{name:'Python 工程師｜測試職缺'}).waitFor();
 await page.getByLabel('Python 工程師｜測試職缺備註').fill('面試前確認工作內容');await page.getByRole('button',{name:'儲存備註'}).click();await page.getByRole('button',{name:'儲存備註'}).waitFor();
 await mkdir('.sites-runtime/qa',{recursive:true});await page.screenshot({path:'.sites-runtime/qa/desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'.sites-runtime/qa/mobile.png',fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 assert.deepEqual(errors,[]);console.log('PASS: browser TXT/DOCX/PDF, 20 MiB rejection, save/reload, manual application/history/note, WebMCP contract and mobile overflow.');
}finally{
 await context.request.delete(base+'/api/account',{headers:{Origin:base,'Content-Type':'application/json'},data:{confirm:'DELETE'}});await browser.close();
}
