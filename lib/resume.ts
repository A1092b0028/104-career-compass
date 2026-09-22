export const MAX_RESUME_BYTES=20*1024*1024;
export async function parseResume(file:File):Promise<string>{
 if(file.size>MAX_RESUME_BYTES)throw Error('檔案超過 20 MiB，請縮小後再上傳。');
 const ext=file.name.split('.').pop()?.toLowerCase();if(!['pdf','docx','txt'].includes(ext||''))throw Error('請選擇 PDF、DOCX 或 TXT。');
 const data=await file.arrayBuffer();let text='';
 if(ext==='txt')text=new TextDecoder('utf-8',{fatal:true}).decode(data);
 if(ext==='docx'){
  const {unzipSync}=await import('fflate');let expanded=0;
  unzipSync(new Uint8Array(data),{filter:entry=>{expanded+=entry.originalSize;if(expanded>40*1024*1024)throw Error('DOCX 解壓縮內容過大，請改貼履歷文字。');return false;}});
  const mammoth=await import('mammoth/mammoth.browser.js');text=(await mammoth.extractRawText({arrayBuffer:data})).value;
 }
 if(ext==='pdf'){
  const pdfjs=await import('pdfjs-dist'); const worker=await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc=worker.default;
  const task=pdfjs.getDocument({data,disableFontFace:true,useSystemFonts:true});
  try{const doc=await task.promise;if(doc.numPages>200)throw Error('PDF 超過 200 頁，請改用精簡履歷。');
   for(let i=1;i<=doc.numPages;i++){const p=await doc.getPage(i),content=await p.getTextContent();text+=content.items.map(item=>'str'in item?item.str+('hasEOL'in item&&item.hasEOL?'\n':' '):'').join('')+'\n';if(text.length>100000)throw Error('履歷文字超過 100,000 字，請先精簡。');}
  }finally{await task.destroy();}
 }
 text=text.trim();if(!text)throw Error('未辨識出文字；掃描圖片或加密文件請改貼履歷文字。');if(text.length>100000)throw Error('履歷文字超過 100,000 字，請先精簡。');return text;
}
